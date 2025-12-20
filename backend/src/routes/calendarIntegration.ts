import express, { Response } from "express";
import { google } from "googleapis";
import { authenticate, AuthRequest } from "../middleware/auth";
import CalendarIntegration from "../models/CalendarIntegration";
import CalendarEvent from "../models/CalendarEvent";
import Contact from "../models/Contact";

const router = express.Router();

// Google Calendar OAuth configuration
const CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL}/api/calendar/callback/google`
    );
}

/**
 * GET /api/calendar/connect/google
 * Start Google Calendar OAuth flow
 */
router.get("/connect/google", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const oauth2Client = getOAuth2Client();

        // Store state for callback verification
        const state = Buffer.from(
            JSON.stringify({
                userId: req.user?._id.toString(),
                workspaceId: workspaceId,
            })
        ).toString("base64");

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: CALENDAR_SCOPES,
            state,
            prompt: "consent", // Force consent to get refresh token
        });

        res.json({
            success: true,
            data: { authUrl },
        });
    } catch (error: any) {
        console.error("Calendar connect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to start Calendar connection",
        });
    }
});

/**
 * GET /api/calendar/callback/google
 * Google Calendar OAuth callback
 */
router.get("/callback/google", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            console.error("Calendar OAuth error:", error);
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=calendar_denied`
            );
        }

        if (!code || !state) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=missing_params`
            );
        }

        // Decode state
        const stateData = JSON.parse(
            Buffer.from(state as string, "base64").toString("utf-8")
        );

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code as string);

        if (!tokens.access_token || !tokens.refresh_token) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=no_tokens`
            );
        }

        // Get user email from Google
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();

        if (!userInfo.email) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=no_email`
            );
        }

        // Calculate expiry
        const expiresAt = tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : new Date(Date.now() + 3600 * 1000);

        // Create or update integration
        let integration = await CalendarIntegration.findOne({
            userId: stateData.userId,
            workspaceId: stateData.workspaceId,
            email: userInfo.email,
            provider: "google",
        }).select("+accessToken +refreshToken");

        if (integration) {
            integration.setTokens(tokens.access_token, tokens.refresh_token);
            integration.expiresAt = expiresAt;
            integration.isActive = true;
            integration.syncError = undefined;
        } else {
            integration = new CalendarIntegration({
                userId: stateData.userId,
                workspaceId: stateData.workspaceId,
                provider: "google",
                email: userInfo.email,
                expiresAt,
                isActive: true,
            });
            integration.setTokens(tokens.access_token, tokens.refresh_token);
        }

        await integration.save();

        // Redirect to success
        res.redirect(
            `${process.env.FRONTEND_URL}/projects/${stateData.workspaceId}/settings/integrations?success=calendar_connected`
        );
    } catch (error: any) {
        console.error("Calendar callback error:", error);
        res.redirect(
            `${process.env.FRONTEND_URL}/settings/integrations?error=callback_failed`
        );
    }
});

/**
 * GET /api/calendar/integrations
 * Get all calendar integrations for a workspace
 */
router.get("/integrations", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const integrations = await CalendarIntegration.find({
            userId: req.user?._id,
            workspaceId,
        });

        res.json({
            success: true,
            data: { integrations },
        });
    } catch (error: any) {
        console.error("Get integrations error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch integrations",
        });
    }
});

/**
 * DELETE /api/calendar/:integrationId/disconnect
 * Disconnect a calendar integration
 */
router.delete("/:integrationId/disconnect", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;

        const integration = await CalendarIntegration.findOneAndDelete({
            _id: integrationId,
            userId: req.user?._id,
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: "Integration not found",
            });
        }

        res.json({
            success: true,
            message: "Calendar disconnected successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to disconnect",
        });
    }
});

/**
 * POST /api/calendar/:integrationId/sync
 * Sync events from Google Calendar
 */
router.post("/:integrationId/sync", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;

        const integration = await CalendarIntegration.findOne({
            _id: integrationId,
            userId: req.user?._id,
        }).select("+accessToken +refreshToken");

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: "Integration not found",
            });
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: integration.getAccessToken(),
            refresh_token: integration.getRefreshToken(),
        });

        // Refresh token if expired
        if (integration.isTokenExpired()) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            if (credentials.access_token) {
                integration.setTokens(
                    credentials.access_token,
                    credentials.refresh_token || integration.getRefreshToken()
                );
                if (credentials.expiry_date) {
                    integration.expiresAt = new Date(credentials.expiry_date);
                }
                await integration.save();
            }
        }

        // Get calendar events
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const now = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        const eventsResponse = await calendar.events.list({
            calendarId: integration.calendarId || "primary",
            timeMin: now.toISOString(),
            timeMax: oneMonthLater.toISOString(),
            maxResults: 50,
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = eventsResponse.data.items || [];
        let syncedCount = 0;

        // Get workspace contacts for matching
        const contacts = await Contact.find({
            workspaceId: integration.workspaceId,
            email: { $exists: true, $ne: "" },
        }).lean();

        const contactEmails = new Map(
            contacts.map((c: any) => [c.email?.toLowerCase(), c])
        );

        for (const event of events) {
            // Check if event already exists
            const existing = await CalendarEvent.findOne({
                workspaceId: integration.workspaceId,
                externalId: event.id,
                provider: "google",
            });

            if (existing) continue;

            // Find matching contacts from attendees
            let contactId = null;
            const attendees = event.attendees || [];
            for (const attendee of attendees) {
                const match = contactEmails.get(attendee.email?.toLowerCase());
                if (match) {
                    contactId = (match as any)._id;
                    break;
                }
            }

            // Create calendar event in CRM
            await CalendarEvent.create({
                workspaceId: integration.workspaceId,
                userId: integration.userId,
                title: event.summary || "Untitled Event",
                description: event.description,
                location: event.location,
                startTime: new Date(event.start?.dateTime || event.start?.date || now),
                endTime: new Date(event.end?.dateTime || event.end?.date || now),
                timezone: event.start?.timeZone || "UTC",
                attendees: attendees.map((a) => ({
                    email: a.email,
                    name: a.displayName,
                    status: a.responseStatus === "accepted" ? "accepted" :
                        a.responseStatus === "declined" ? "declined" : "pending",
                })),
                externalId: event.id,
                provider: "google",
                meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
                contactId,
                status: event.status === "cancelled" ? "cancelled" : "confirmed",
            });

            syncedCount++;
        }

        integration.lastSyncAt = new Date();
        integration.syncError = undefined;
        await integration.save();

        res.json({
            success: true,
            data: {
                eventsFound: events.length,
                eventsSynced: syncedCount,
            },
        });
    } catch (error: any) {
        console.error("Calendar sync error:", error);

        // Update integration with error
        try {
            await CalendarIntegration.findByIdAndUpdate(req.params.integrationId, {
                syncError: error.message,
            });
        } catch (e) { }

        res.status(500).json({
            success: false,
            error: error.message || "Sync failed",
        });
    }
});

/**
 * GET /api/calendar/events
 * Get calendar events for workspace
 */
router.get("/events", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, startDate, endDate } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const filter: any = {
            workspaceId,
            status: { $ne: "cancelled" },
        };

        if (startDate) {
            filter.startTime = { $gte: new Date(startDate as string) };
        }
        if (endDate) {
            filter.endTime = { ...(filter.endTime || {}), $lte: new Date(endDate as string) };
        }

        const events = await CalendarEvent.find(filter)
            .populate("contactId", "firstName lastName email")
            .sort({ startTime: 1 })
            .lean();

        res.json({
            success: true,
            data: { events },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch events",
        });
    }
});

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post("/events", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const {
            workspaceId,
            title,
            description,
            location,
            startTime,
            endTime,
            attendees,
            contactId,
            syncToGoogle,
        } = req.body;

        if (!workspaceId || !title || !startTime) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID, title, and start time are required",
            });
        }

        // Create event in CRM
        const event = await CalendarEvent.create({
            workspaceId,
            userId: req.user?._id,
            title,
            description,
            location,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 30 * 60000),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            attendees: attendees || [],
            contactId,
            status: "confirmed",
            provider: "internal",
        });

        // Optionally sync to Google Calendar
        if (syncToGoogle) {
            const integration = await CalendarIntegration.findOne({
                workspaceId,
                userId: req.user?._id,
                provider: "google",
                isActive: true,
            }).select("+accessToken +refreshToken");

            if (integration) {
                try {
                    const oauth2Client = getOAuth2Client();
                    oauth2Client.setCredentials({
                        access_token: integration.getAccessToken(),
                        refresh_token: integration.getRefreshToken(),
                    });

                    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

                    const googleEvent = await calendar.events.insert({
                        calendarId: "primary",
                        requestBody: {
                            summary: title,
                            description,
                            location,
                            start: {
                                dateTime: new Date(startTime).toISOString(),
                            },
                            end: {
                                dateTime: (endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 30 * 60000)).toISOString(),
                            },
                            attendees: attendees?.map((a: any) => ({ email: a.email })),
                        },
                    });

                    // Update CRM event with Google ID
                    event.externalId = googleEvent.data.id;
                    event.provider = "google";
                    await event.save();
                } catch (e) {
                    console.error("Failed to sync to Google Calendar:", e);
                }
            }
        }

        res.status(201).json({
            success: true,
            data: { event },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create event",
        });
    }
});

/**
 * DELETE /api/calendar/events/:eventId
 * Delete a calendar event
 */
router.delete("/events/:eventId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { eventId } = req.params;

        const event = await CalendarEvent.findByIdAndDelete(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                error: "Event not found",
            });
        }

        res.json({
            success: true,
            message: "Event deleted",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete event",
        });
    }
});

export default router;
