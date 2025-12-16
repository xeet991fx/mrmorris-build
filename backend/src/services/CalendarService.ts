import { google, calendar_v3 } from "googleapis";
import { Types } from "mongoose";
import EmailIntegration from "../models/EmailIntegration";
import Meeting from "../models/Meeting";

/**
 * CalendarService
 * 
 * Syncs meetings between CRM and Google Calendar
 * Uses the same Gmail OAuth tokens from EmailIntegration
 */

class CalendarService {
    /**
     * Get OAuth2 client with credentials from integration
     */
    private getOAuth2Client() {
        return new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
        );
    }

    /**
     * Get authenticated Calendar API client
     */
    private async getCalendarClient(integration: any): Promise<calendar_v3.Calendar> {
        const oauth2Client = this.getOAuth2Client();

        oauth2Client.setCredentials({
            access_token: integration.getAccessToken(),
            refresh_token: integration.getRefreshToken(),
        });

        // Handle token refresh
        oauth2Client.on("tokens", async (tokens) => {
            if (tokens.access_token) {
                integration.setTokens(
                    tokens.access_token,
                    tokens.refresh_token || integration.getRefreshToken()
                );
                if (tokens.expiry_date) {
                    integration.expiresAt = new Date(tokens.expiry_date);
                }
                await integration.save();
            }
        });

        return google.calendar({ version: "v3", auth: oauth2Client });
    }

    /**
     * Find Gmail integration for a workspace
     */
    async getIntegration(workspaceId: string | Types.ObjectId): Promise<any | null> {
        const integration = await EmailIntegration.findOne({
            workspaceId: new Types.ObjectId(workspaceId),
            provider: "gmail",
            isActive: true,
        }).select("+accessToken +refreshToken");

        return integration;
    }

    /**
     * Create a Google Calendar event from a CRM meeting
     */
    async createCalendarEvent(
        workspaceId: string | Types.ObjectId,
        meeting: any
    ): Promise<{ success: boolean; eventId?: string; eventLink?: string; error?: string }> {
        try {
            const integration = await this.getIntegration(workspaceId);

            if (!integration) {
                return {
                    success: false,
                    error: "No Gmail integration found. Please connect your Gmail account first."
                };
            }

            const calendar = await this.getCalendarClient(integration);

            // Build attendees list
            const attendees: calendar_v3.Schema$EventAttendee[] = [];

            if (meeting.attendees && Array.isArray(meeting.attendees)) {
                for (const attendee of meeting.attendees) {
                    if (attendee.email) {
                        attendees.push({
                            email: attendee.email,
                            displayName: attendee.name,
                        });
                    }
                }
            }

            // Create event
            const event: calendar_v3.Schema$Event = {
                summary: meeting.title,
                description: meeting.description || "",
                start: {
                    dateTime: new Date(meeting.startTime).toISOString(),
                    timeZone: meeting.timezone || "UTC",
                },
                end: {
                    dateTime: new Date(meeting.endTime).toISOString(),
                    timeZone: meeting.timezone || "UTC",
                },
                attendees: attendees.length > 0 ? attendees : undefined,
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: "email", minutes: 60 },
                        { method: "popup", minutes: 15 },
                    ],
                },
            };

            // Add location or meeting URL
            if (meeting.meetingUrl) {
                event.conferenceData = {
                    entryPoints: [{
                        entryPointType: "video",
                        uri: meeting.meetingUrl,
                    }],
                };
            } else if (meeting.location) {
                event.location = meeting.location;
            }

            const result = await calendar.events.insert({
                calendarId: "primary",
                requestBody: event,
                sendUpdates: "all", // Send email invites to attendees
            });

            console.log(`📅 Created Google Calendar event: ${result.data.id}`);

            return {
                success: true,
                eventId: result.data.id || undefined,
                eventLink: result.data.htmlLink || undefined,
            };

        } catch (error: any) {
            console.error("Error creating calendar event:", error.message);

            if (error.code === 401 || error.code === 403) {
                return {
                    success: false,
                    error: "Calendar access expired. Please reconnect your Gmail account.",
                };
            }

            return {
                success: false,
                error: error.message || "Failed to create calendar event",
            };
        }
    }

    /**
     * Update a Google Calendar event
     */
    async updateCalendarEvent(
        workspaceId: string | Types.ObjectId,
        eventId: string,
        meeting: any
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const integration = await this.getIntegration(workspaceId);

            if (!integration) {
                return { success: false, error: "No Gmail integration found" };
            }

            const calendar = await this.getCalendarClient(integration);

            // Build attendees list
            const attendees: calendar_v3.Schema$EventAttendee[] = [];

            if (meeting.attendees && Array.isArray(meeting.attendees)) {
                for (const attendee of meeting.attendees) {
                    if (attendee.email) {
                        attendees.push({
                            email: attendee.email,
                            displayName: attendee.name,
                        });
                    }
                }
            }

            const event: calendar_v3.Schema$Event = {
                summary: meeting.title,
                description: meeting.description || "",
                start: {
                    dateTime: new Date(meeting.startTime).toISOString(),
                    timeZone: meeting.timezone || "UTC",
                },
                end: {
                    dateTime: new Date(meeting.endTime).toISOString(),
                    timeZone: meeting.timezone || "UTC",
                },
                attendees: attendees.length > 0 ? attendees : undefined,
            };

            if (meeting.location) {
                event.location = meeting.location;
            }

            await calendar.events.update({
                calendarId: "primary",
                eventId,
                requestBody: event,
                sendUpdates: "all",
            });

            console.log(`📅 Updated Google Calendar event: ${eventId}`);

            return { success: true };

        } catch (error: any) {
            console.error("Error updating calendar event:", error.message);
            return {
                success: false,
                error: error.message || "Failed to update calendar event",
            };
        }
    }

    /**
     * Delete a Google Calendar event
     */
    async deleteCalendarEvent(
        workspaceId: string | Types.ObjectId,
        eventId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const integration = await this.getIntegration(workspaceId);

            if (!integration) {
                return { success: false, error: "No Gmail integration found" };
            }

            const calendar = await this.getCalendarClient(integration);

            await calendar.events.delete({
                calendarId: "primary",
                eventId,
                sendUpdates: "all",
            });

            console.log(`📅 Deleted Google Calendar event: ${eventId}`);

            return { success: true };

        } catch (error: any) {
            console.error("Error deleting calendar event:", error.message);
            return {
                success: false,
                error: error.message || "Failed to delete calendar event",
            };
        }
    }

    /**
     * Fetch upcoming events from Google Calendar
     */
    async getUpcomingEvents(
        workspaceId: string | Types.ObjectId,
        maxResults: number = 10
    ): Promise<{ success: boolean; events?: any[]; error?: string }> {
        try {
            const integration = await this.getIntegration(workspaceId);

            if (!integration) {
                return { success: false, error: "No Gmail integration found" };
            }

            const calendar = await this.getCalendarClient(integration);

            const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: new Date().toISOString(),
                maxResults,
                singleEvents: true,
                orderBy: "startTime",
            });

            const events = response.data.items?.map((event) => ({
                id: event.id,
                title: event.summary,
                description: event.description,
                startTime: event.start?.dateTime || event.start?.date,
                endTime: event.end?.dateTime || event.end?.date,
                location: event.location,
                meetingUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
                attendees: event.attendees?.map((a) => ({
                    email: a.email,
                    name: a.displayName,
                    status: a.responseStatus,
                })),
                htmlLink: event.htmlLink,
            })) || [];

            return { success: true, events };

        } catch (error: any) {
            console.error("Error fetching calendar events:", error.message);
            return {
                success: false,
                error: error.message || "Failed to fetch calendar events",
            };
        }
    }

    /**
     * Check if calendar is connected for a workspace
     */
    async isCalendarConnected(workspaceId: string | Types.ObjectId): Promise<boolean> {
        const integration = await this.getIntegration(workspaceId);
        return !!integration;
    }
}

export default new CalendarService();
