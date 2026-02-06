/**
 * Google Meet Service
 *
 * Handles Google Meet integration for meeting scheduling
 * - Create Google Calendar events with Meet links
 * - Manage meeting conference settings
 * - Handle recordings via Google Drive
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Types } from 'mongoose';
import Meeting, { IGoogleMeetData } from '../models/Meeting';
import MeetingScheduler from '../models/MeetingScheduler';
import User from '../models/User';
import { logger } from '../utils/logger';

// Types
interface CreateMeetingParams {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: { email: string; displayName?: string }[];
    organizerEmail: string;
    recordingEnabled?: boolean;
    calendarId?: string;
}

interface GoogleMeetResult {
    eventId: string;
    meetingCode: string;
    conferenceId: string;
    hangoutLink: string;
    entryPoints: {
        uri: string;
        label?: string;
        entryPointType: 'video' | 'phone' | 'sip' | 'more';
    }[];
}

export class GoogleMeetService {
    private oauth2Client: OAuth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL}/api/auth/google/callback`
        );
    }

    /**
     * Set OAuth tokens for authenticated requests
     */
    setCredentials(tokens: {
        access_token?: string | null;
        refresh_token?: string | null;
        expiry_date?: number | null;
    }) {
        this.oauth2Client.setCredentials(tokens);
    }

    /**
     * Get a new OAuth2 client with specific tokens
     */
    private getAuthenticatedClient(tokens: {
        access_token?: string | null;
        refresh_token?: string | null;
        expiry_date?: number | null;
    }): OAuth2Client {
        const client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL}/api/auth/google/callback`
        );
        client.setCredentials(tokens);
        return client;
    }

    /**
     * Generate OAuth URL for user consent
     */
    generateAuthUrl(state?: string): string {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/drive.readonly',
            'openid',
            'email',
            'profile',
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state,
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code: string): Promise<{
        access_token: string | null | undefined;
        refresh_token: string | null | undefined;
        expiry_date: number | null | undefined;
        id_token: string | null | undefined;
    }> {
        const { tokens } = await this.oauth2Client.getToken(code);
        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            id_token: tokens.id_token,
        };
    }

    /**
     * Create a Google Calendar event with Google Meet conference
     */
    async createMeetingWithMeet(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        params: CreateMeetingParams
    ): Promise<GoogleMeetResult> {
        const authClient = this.getAuthenticatedClient(tokens);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const event: calendar_v3.Schema$Event = {
            summary: params.summary,
            description: params.description || '',
            start: {
                dateTime: params.startTime.toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: params.endTime.toISOString(),
                timeZone: 'UTC',
            },
            attendees: params.attendees.map((a) => ({
                email: a.email,
                displayName: a.displayName,
            })),
            conferenceData: {
                createRequest: {
                    requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet',
                    },
                },
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 24 hours
                    { method: 'popup', minutes: 30 }, // 30 minutes
                ],
            },
        };

        try {
            const response = await calendar.events.insert({
                calendarId: params.calendarId || 'primary',
                requestBody: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all', // Send email invitations to attendees
            });

            const createdEvent = response.data;
            const conferenceData = createdEvent.conferenceData;

            if (!conferenceData?.conferenceId || !conferenceData?.entryPoints) {
                throw new Error('Google Meet conference was not created');
            }

            const hangoutLink = conferenceData.entryPoints.find(
                (ep) => ep.entryPointType === 'video'
            )?.uri;

            if (!hangoutLink) {
                throw new Error('Could not find Google Meet link');
            }

            // Extract meeting code from hangout link
            const meetingCode = hangoutLink.split('/').pop() || '';

            logger.info('Google Meet created successfully', {
                eventId: createdEvent.id,
                meetingCode,
                conferenceId: conferenceData.conferenceId,
            });

            return {
                eventId: createdEvent.id!,
                meetingCode,
                conferenceId: conferenceData.conferenceId,
                hangoutLink,
                entryPoints: (conferenceData.entryPoints || []).map((ep) => ({
                    uri: ep.uri || '',
                    label: ep.label,
                    entryPointType: (ep.entryPointType as 'video' | 'phone' | 'sip' | 'more') || 'video',
                })),
            };
        } catch (error: any) {
            logger.error('Failed to create Google Meet', {
                error: error.message,
                params: { summary: params.summary, startTime: params.startTime },
            });
            throw new Error(`Failed to create Google Meet: ${error.message}`);
        }
    }

    /**
     * Update a Google Calendar event
     */
    async updateMeeting(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        eventId: string,
        updates: {
            summary?: string;
            description?: string;
            startTime?: Date;
            endTime?: Date;
        },
        calendarId: string = 'primary'
    ): Promise<void> {
        const authClient = this.getAuthenticatedClient(tokens);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const updateData: calendar_v3.Schema$Event = {};

        if (updates.summary) updateData.summary = updates.summary;
        if (updates.description) updateData.description = updates.description;
        if (updates.startTime) {
            updateData.start = {
                dateTime: updates.startTime.toISOString(),
                timeZone: 'UTC',
            };
        }
        if (updates.endTime) {
            updateData.end = {
                dateTime: updates.endTime.toISOString(),
                timeZone: 'UTC',
            };
        }

        try {
            await calendar.events.patch({
                calendarId,
                eventId,
                requestBody: updateData,
                sendUpdates: 'all',
            });

            logger.info('Google Calendar event updated', { eventId });
        } catch (error: any) {
            logger.error('Failed to update Google Calendar event', {
                error: error.message,
                eventId,
            });
            throw new Error(`Failed to update meeting: ${error.message}`);
        }
    }

    /**
     * Delete a Google Calendar event (and associated Meet)
     */
    async deleteMeeting(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        eventId: string,
        calendarId: string = 'primary'
    ): Promise<void> {
        const authClient = this.getAuthenticatedClient(tokens);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        try {
            await calendar.events.delete({
                calendarId,
                eventId,
                sendUpdates: 'all',
            });

            logger.info('Google Calendar event deleted', { eventId });
        } catch (error: any) {
            logger.error('Failed to delete Google Calendar event', {
                error: error.message,
                eventId,
            });
            throw new Error(`Failed to delete meeting: ${error.message}`);
        }
    }

    /**
     * Get Google Calendar event details
     */
    async getMeetingDetails(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        eventId: string,
        calendarId: string = 'primary'
    ): Promise<calendar_v3.Schema$Event | null> {
        const authClient = this.getAuthenticatedClient(tokens);
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        try {
            const response = await calendar.events.get({
                calendarId,
                eventId,
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to get Google Calendar event', {
                error: error.message,
                eventId,
            });
            return null;
        }
    }

    /**
     * Create Google Meet for an existing meeting
     */
    async createMeetForMeeting(
        meetingId: string,
        hostTokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }
    ): Promise<IGoogleMeetData> {
        const meeting = await Meeting.findById(meetingId)
            .populate('schedulerId')
            .populate('hostUserId');

        if (!meeting) {
            throw new Error('Meeting not found');
        }

        const scheduler = meeting.schedulerId as any;
        const host = meeting.hostUserId as any;

        // Create the Google Meet
        const endTime = new Date(meeting.scheduledAt);
        endTime.setMinutes(endTime.getMinutes() + meeting.duration);

        const result = await this.createMeetingWithMeet(hostTokens, {
            summary: `${scheduler.name} with ${meeting.attendee.name}`,
            description: scheduler.description || `Meeting scheduled via ${scheduler.name}`,
            startTime: meeting.scheduledAt,
            endTime,
            attendees: [
                { email: meeting.attendee.email, displayName: meeting.attendee.name },
                { email: host.email, displayName: host.name },
            ],
            organizerEmail: host.email,
            recordingEnabled: scheduler.recordingSettings?.enabled || false,
            calendarId: scheduler.googleCalendarIntegration?.calendarId || 'primary',
        });

        // Update the meeting with Google Meet data
        const googleMeetData: IGoogleMeetData = {
            meetingCode: result.meetingCode,
            conferenceId: result.conferenceId,
            hangoutLink: result.hangoutLink,
            entryPoints: result.entryPoints,
            recordingEnabled: scheduler.recordingSettings?.enabled || false,
        };

        await Meeting.findByIdAndUpdate(meetingId, {
            googleMeet: googleMeetData,
            calendarEventId: result.eventId,
            calendarProvider: 'google',
            'location.details': result.hangoutLink,
        });

        logger.info('Google Meet added to meeting', {
            meetingId,
            meetingCode: result.meetingCode,
        });

        return googleMeetData;
    }

    /**
     * List recordings from Google Drive (for meetings recorded via Google Meet)
     * Note: This requires the recording to be automatically saved to Google Drive
     */
    async listRecordings(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        options: {
            startDate?: Date;
            endDate?: Date;
            pageSize?: number;
            pageToken?: string;
        } = {}
    ): Promise<{
        recordings: any[];
        nextPageToken?: string;
    }> {
        const authClient = this.getAuthenticatedClient(tokens);
        const drive = google.drive({ version: 'v3', auth: authClient });

        try {
            // Query for video files in Google Drive that are Google Meet recordings
            let query = "mimeType contains 'video/' and name contains 'Meet Recording'";

            if (options.startDate) {
                query += ` and createdTime >= '${options.startDate.toISOString()}'`;
            }
            if (options.endDate) {
                query += ` and createdTime <= '${options.endDate.toISOString()}'`;
            }

            const response = await drive.files.list({
                q: query,
                pageSize: options.pageSize || 20,
                pageToken: options.pageToken,
                fields: 'nextPageToken, files(id, name, mimeType, createdTime, webViewLink, webContentLink, size, videoMediaMetadata)',
                orderBy: 'createdTime desc',
            });

            return {
                recordings: response.data.files || [],
                nextPageToken: response.data.nextPageToken || undefined,
            };
        } catch (error: any) {
            logger.error('Failed to list recordings from Google Drive', {
                error: error.message,
            });
            throw new Error(`Failed to list recordings: ${error.message}`);
        }
    }

    /**
     * Get recording details from Google Drive
     */
    async getRecordingDetails(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        fileId: string
    ): Promise<any> {
        const authClient = this.getAuthenticatedClient(tokens);
        const drive = google.drive({ version: 'v3', auth: authClient });

        try {
            const response = await drive.files.get({
                fileId,
                fields: 'id, name, mimeType, createdTime, webViewLink, webContentLink, size, videoMediaMetadata, permissions',
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to get recording details', {
                error: error.message,
                fileId,
            });
            throw new Error(`Failed to get recording: ${error.message}`);
        }
    }

    /**
     * Update meeting recording status
     */
    async updateRecordingStatus(
        meetingId: string,
        status: 'not_started' | 'recording' | 'completed' | 'failed',
        recordingData?: {
            driveFileId?: string;
            driveFileUrl?: string;
            duration?: number;
        }
    ): Promise<void> {
        const updateData: any = {
            'googleMeet.recording.status': status,
        };

        if (recordingData?.driveFileId) {
            updateData['googleMeet.recording.driveFileId'] = recordingData.driveFileId;
        }
        if (recordingData?.driveFileUrl) {
            updateData['googleMeet.recording.driveFileUrl'] = recordingData.driveFileUrl;
        }
        if (recordingData?.duration) {
            updateData['googleMeet.recording.duration'] = recordingData.duration;
        }
        if (status === 'completed') {
            updateData['googleMeet.recording.recordedAt'] = new Date();
        }

        await Meeting.findByIdAndUpdate(meetingId, { $set: updateData });

        logger.info('Meeting recording status updated', {
            meetingId,
            status,
        });
    }

    /**
     * Share recording with specific users
     */
    async shareRecording(
        tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
        fileId: string,
        emails: string[],
        role: 'reader' | 'commenter' | 'writer' = 'reader'
    ): Promise<void> {
        const authClient = this.getAuthenticatedClient(tokens);
        const drive = google.drive({ version: 'v3', auth: authClient });

        try {
            const permissions = emails.map((email) => ({
                type: 'user',
                role,
                emailAddress: email,
            }));

            await Promise.all(
                permissions.map((permission) =>
                    drive.permissions.create({
                        fileId,
                        requestBody: permission as any,
                        sendNotificationEmail: true,
                    })
                )
            );

            logger.info('Recording shared successfully', {
                fileId,
                emails,
            });
        } catch (error: any) {
            logger.error('Failed to share recording', {
                error: error.message,
                fileId,
            });
            throw new Error(`Failed to share recording: ${error.message}`);
        }
    }
}

export const googleMeetService = new GoogleMeetService();
