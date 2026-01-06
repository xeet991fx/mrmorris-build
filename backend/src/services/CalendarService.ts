/**
 * Calendar Service
 *
 * Handles Google Calendar integration for meeting scheduling
 * - Check for conflicts
 * - Create calendar events
 * - Update/cancel events
 */

import { google } from 'googleapis';
import EmailAccount from '../models/EmailAccount';
import { decryptCredentials as decrypt } from '../utils/encryption';

interface CalendarEvent {
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string; // ISO 8601 format
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: {
        email: string;
        displayName?: string;
    }[];
    conferenceData?: any; // For Google Meet links
    reminders?: {
        useDefault: boolean;
        overrides?: {
            method: 'email' | 'popup';
            minutes: number;
        }[];
    };
}

interface TimeSlot {
    start: Date;
    end: Date;
}

export class CalendarService {
    /**
     * Get Google Calendar client for a connected email account
     */
    private async getCalendarClient(accountId: string) {
        const account = await EmailAccount.findById(accountId);

        if (!account || account.provider !== 'gmail') {
            throw new Error('Gmail account not found or invalid provider');
        }

        if (!account.accessToken || !account.refreshToken) {
            throw new Error('Calendar access tokens not found. Please reconnect your account');
        }

        // Decrypt tokens
        const accessToken = decrypt(account.accessToken, account.workspaceId.toString());
        const refreshToken = decrypt(account.refreshToken, account.workspaceId.toString());

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        // Auto-refresh access token if needed
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                // Update stored refresh token if we got a new one
                // (Usually doesn't happen unless re-authenticated)
            }
            if (tokens.access_token) {
                // Token was refreshed - save it
                // Note: In production, you'd want to update the database here
                console.log('🔄 Access token refreshed for calendar');
            }
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        return calendar;
    }

    /**
     * Check if a time slot has conflicts with existing calendar events
     */
    async checkConflicts(
        accountId: string,
        timeSlot: TimeSlot
    ): Promise<{ hasConflict: boolean; conflicts: any[] }> {
        try {
            const calendar = await this.getCalendarClient(accountId);

            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: timeSlot.start.toISOString(),
                timeMax: timeSlot.end.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items || [];

            // Filter out declined events
            const conflicts = events.filter((event) => {
                // Ignore declined or cancelled events
                if (event.status === 'cancelled') return false;

                const attendee = event.attendees?.find(
                    (a: any) => a.self === true
                );
                if (attendee && attendee.responseStatus === 'declined') return false;

                return true;
            });

            return {
                hasConflict: conflicts.length > 0,
                conflicts,
            };
        } catch (error: any) {
            console.error('❌ Error checking calendar conflicts:', error.message);
            // If calendar check fails, assume no conflicts to avoid blocking bookings
            return { hasConflict: false, conflicts: [] };
        }
    }

    /**
     * Create a calendar event
     */
    async createEvent(
        accountId: string,
        eventData: CalendarEvent,
        addConferenceLink: boolean = false
    ): Promise<{ eventId: string; meetLink?: string }> {
        try {
            const calendar = await this.getCalendarClient(accountId);

            const requestBody: any = {
                summary: eventData.summary,
                description: eventData.description,
                location: eventData.location,
                start: eventData.start,
                end: eventData.end,
                attendees: eventData.attendees,
                reminders: eventData.reminders || {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 24 hours
                        { method: 'popup', minutes: 30 }, // 30 minutes
                    ],
                },
            };

            // Add Google Meet link if requested
            if (addConferenceLink) {
                requestBody.conferenceData = {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                };
            }

            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody,
                conferenceDataVersion: addConferenceLink ? 1 : undefined,
                sendUpdates: 'all', // Send email notifications to attendees
            });

            console.log(`✅ Calendar event created: ${response.data.id}`);

            return {
                eventId: response.data.id!,
                meetLink: response.data.hangoutLink,
            };
        } catch (error: any) {
            console.error('❌ Error creating calendar event:', error.message);
            throw new Error(`Failed to create calendar event: ${error.message}`);
        }
    }

    /**
     * Update a calendar event
     */
    async updateEvent(
        accountId: string,
        eventId: string,
        updates: Partial<CalendarEvent>
    ): Promise<void> {
        try {
            const calendar = await this.getCalendarClient(accountId);

            await calendar.events.patch({
                calendarId: 'primary',
                eventId,
                requestBody: updates as any,
                sendUpdates: 'all',
            });

            console.log(`✅ Calendar event updated: ${eventId}`);
        } catch (error: any) {
            console.error('❌ Error updating calendar event:', error.message);
            throw new Error(`Failed to update calendar event: ${error.message}`);
        }
    }

    /**
     * Cancel/delete a calendar event
     */
    async cancelEvent(accountId: string, eventId: string): Promise<void> {
        try {
            const calendar = await this.getCalendarClient(accountId);

            await calendar.events.delete({
                calendarId: 'primary',
                eventId,
                sendUpdates: 'all', // Notify attendees
            });

            console.log(`✅ Calendar event cancelled: ${eventId}`);
        } catch (error: any) {
            console.error('❌ Error cancelling calendar event:', error.message);
            throw new Error(`Failed to cancel calendar event: ${error.message}`);
        }
    }

    /**
     * Get available time slots for a given date range
     */
    async getAvailableSlots(
        accountId: string,
        startDate: Date,
        endDate: Date,
        slotDuration: number, // in minutes
        availabilityWindows: { start: string; end: string }[] // Array of time windows like [{start: "09:00", end: "17:00"}]
    ): Promise<TimeSlot[]> {
        try {
            // Get all busy times from calendar
            const calendar = await this.getCalendarClient(accountId);

            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    items: [{ id: 'primary' }],
                },
            });

            const busyTimes = response.data.calendars?.primary?.busy || [];

            // Generate potential slots based on availability windows
            const potentialSlots: TimeSlot[] = [];

            // For each day in the range
            let currentDate = new Date(startDate);
            while (currentDate < endDate) {
                // For each availability window
                for (const window of availabilityWindows) {
                    const [startHour, startMinute] = window.start.split(':').map(Number);
                    const [endHour, endMinute] = window.end.split(':').map(Number);

                    let slotStart = new Date(currentDate);
                    slotStart.setHours(startHour, startMinute, 0, 0);

                    const windowEnd = new Date(currentDate);
                    windowEnd.setHours(endHour, endMinute, 0, 0);

                    // Generate slots within this window
                    while (slotStart < windowEnd) {
                        const slotEnd = new Date(slotStart);
                        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

                        if (slotEnd <= windowEnd) {
                            potentialSlots.push({
                                start: new Date(slotStart),
                                end: new Date(slotEnd),
                            });
                        }

                        slotStart.setMinutes(slotStart.getMinutes() + slotDuration);
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Filter out slots that conflict with busy times
            const availableSlots = potentialSlots.filter((slot) => {
                return !busyTimes.some((busy: any) => {
                    const busyStart = new Date(busy.start);
                    const busyEnd = new Date(busy.end);

                    // Check if slot overlaps with busy time
                    return slot.start < busyEnd && slot.end > busyStart;
                });
            });

            return availableSlots;
        } catch (error: any) {
            console.error('❌ Error getting available slots:', error.message);
            return []; // Return empty array on error
        }
    }
}

export const calendarService = new CalendarService();
