import express, { Response } from "express";
import { google } from "googleapis";
import { authenticate, AuthRequest } from "../middleware/auth";
import EmailIntegration from "../models/EmailIntegration";
import CalendarIntegration from "../models/CalendarIntegration";
import Project from "../models/Project";
import Contact from "../models/Contact";
import Activity from "../models/Activity";
import Opportunity from "../models/Opportunity";

const router = express.Router();

// Gmail OAuth configuration - includes BOTH email AND calendar scopes
const GMAIL_SCOPES = [
    // Email scopes
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    // Calendar scopes - integrated with Gmail OAuth
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
];

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
    );
};

/**
 * GET /api/email/connect/gmail
 * Start Gmail OAuth flow
 */
router.get("/connect/gmail", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        // Validate workspace
        const workspace = await Project.findById(workspaceId);
        if (!workspace || workspace.userId.toString() !== (req.user?._id as any).toString()) {
            return res.status(403).json({
                success: false,
                error: "Invalid workspace",
            });
        }

        const oauth2Client = getOAuth2Client();

        // Store state for callback validation
        const state = Buffer.from(
            JSON.stringify({
                userId: req.user?._id,
                workspaceId,
            })
        ).toString("base64");

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: GMAIL_SCOPES,
            state,
            prompt: "consent", // Force consent to get refresh token
        });

        res.json({
            success: true,
            data: { authUrl },
        });
    } catch (error: any) {
        console.error("Gmail connect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to start Gmail connection",
        });
    }
});

/**
 * GET /api/email/callback/gmail
 * Gmail OAuth callback
 */
router.get("/callback/gmail", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            console.error("Gmail OAuth error:", error);
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=oauth_denied`
            );
        }

        if (!code || !state) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=invalid_callback`
            );
        }

        // Decode state
        let stateData: { userId: string; workspaceId: string };
        try {
            stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
        } catch (e) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=invalid_state`
            );
        }

        const oauth2Client = getOAuth2Client();

        // Exchange code for tokens
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
        const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

        // Create or update integration
        let integration = await EmailIntegration.findOne({
            userId: stateData.userId,
            workspaceId: stateData.workspaceId,
            provider: "gmail",
        });

        if (integration) {
            // Update existing
            integration.email = userInfo.email;
            integration.setTokens(tokens.access_token, tokens.refresh_token);
            integration.expiresAt = expiresAt;
            integration.isActive = true;
            integration.syncError = undefined;
        } else {
            // Create new
            integration = new EmailIntegration({
                userId: stateData.userId,
                workspaceId: stateData.workspaceId,
                provider: "gmail",
                email: userInfo.email,
                accessToken: "temp", // Will be set by setTokens
                refreshToken: "temp",
                expiresAt,
                isActive: true,
            });
            integration.setTokens(tokens.access_token, tokens.refresh_token);
        }

        await integration.save();

        // ALSO create/update Calendar integration with same tokens
        let calendarIntegration = await CalendarIntegration.findOne({
            userId: stateData.userId,
            workspaceId: stateData.workspaceId,
            email: userInfo.email,
            provider: "google",
        }).select("+accessToken +refreshToken");

        if (calendarIntegration) {
            // Update existing
            calendarIntegration.setTokens(tokens.access_token, tokens.refresh_token);
            calendarIntegration.expiresAt = expiresAt;
            calendarIntegration.isActive = true;
            calendarIntegration.syncError = undefined;
        } else {
            // Create new
            calendarIntegration = new CalendarIntegration({
                userId: stateData.userId,
                workspaceId: stateData.workspaceId,
                provider: "google",
                email: userInfo.email,
                expiresAt,
                isActive: true,
            });
            calendarIntegration.setTokens(tokens.access_token, tokens.refresh_token);
        }

        await calendarIntegration.save();
        console.log("✅ Gmail + Calendar integration saved for:", userInfo.email);

        // Redirect to success
        res.redirect(
            `${process.env.FRONTEND_URL}/projects/${stateData.workspaceId}/settings/integrations?success=gmail_connected`
        );
    } catch (error: any) {
        console.error("Gmail callback error:", error);
        res.redirect(
            `${process.env.FRONTEND_URL}/settings/integrations?error=callback_failed`
        );
    }
});

/**
 * GET /api/email/integrations
 * Get all email integrations for a workspace
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

        // Validate workspace
        const workspace = await Project.findById(workspaceId);
        if (!workspace || workspace.userId.toString() !== (req.user?._id as any).toString()) {
            return res.status(403).json({
                success: false,
                error: "Invalid workspace",
            });
        }

        const integrations = await EmailIntegration.find({
            workspaceId,
            userId: req.user?._id,
        }).select("-accessToken -refreshToken"); // Don't return tokens

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
 * DELETE /api/email/:integrationId/disconnect
 * Disconnect an email integration
 */
router.delete("/:integrationId/disconnect", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;

        const integration = await EmailIntegration.findOneAndDelete({
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
            message: "Email integration disconnected",
        });
    } catch (error: any) {
        console.error("Disconnect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to disconnect",
        });
    }
});

/**
 * POST /api/email/:integrationId/sync
 * Sync emails from Gmail
 */
router.post("/:integrationId/sync", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;

        // Get integration with tokens
        const integration = await EmailIntegration.findOne({
            _id: integrationId,
            userId: req.user?._id,
        }).select("+accessToken +refreshToken");

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: "Integration not found",
            });
        }

        if (!integration.isActive) {
            return res.status(400).json({
                success: false,
                error: "Integration is not active",
            });
        }

        // Set up OAuth client with tokens
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: integration.getAccessToken(),
            refresh_token: integration.getRefreshToken(),
        });

        // Handle token refresh
        oauth2Client.on("tokens", async (tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) => {
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

        // Get Gmail client
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Fetch recent emails (last 7 days)
        const lastSync = integration.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const query = `after:${Math.floor(lastSync.getTime() / 1000)}`;

        const messagesResponse = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 50,
        });

        const messages = messagesResponse.data.messages || [];
        let syncedCount = 0;

        // Get contacts for matching
        const contacts = await Contact.find({ workspaceId: integration.workspaceId });
        const contactEmails = new Map(
            contacts.map((c) => [c.email?.toLowerCase(), c])
        );

        // Process each message
        for (const msg of messages) {
            try {
                const fullMessage = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "metadata",
                    metadataHeaders: ["From", "To", "Subject", "Date"],
                });

                const headers = fullMessage.data.payload?.headers || [];
                const getHeader = (name: string) =>
                    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

                const from = getHeader("From");
                const to = getHeader("To");
                const subject = getHeader("Subject");
                const dateStr = getHeader("Date");

                // Extract email addresses
                const fromEmail = from.match(/<(.+?)>/)?.[1] || from.split(" ")[0];
                const toEmail = to.match(/<(.+?)>/)?.[1] || to.split(" ")[0];

                // Check if either email matches a contact
                const matchedContact =
                    contactEmails.get(fromEmail.toLowerCase()) ||
                    contactEmails.get(toEmail.toLowerCase());

                if (matchedContact) {
                    // Find opportunity for this contact
                    const opportunity = await Opportunity.findOne({
                        workspaceId: integration.workspaceId,
                        contactId: matchedContact._id,
                        status: "open",
                    });

                    if (opportunity) {
                        // Check if activity already exists (by email subject + date)
                        const existingActivity = await Activity.findOne({
                            opportunityId: opportunity._id,
                            type: "email",
                            emailSubject: subject,
                        });

                        if (!existingActivity) {
                            // Create activity
                            const isInbound = fromEmail.toLowerCase() !== integration.email.toLowerCase();

                            await Activity.create({
                                workspaceId: integration.workspaceId,
                                userId: integration.userId,
                                opportunityId: opportunity._id,
                                type: "email",
                                title: isInbound ? `Email from ${fromEmail}` : `Email to ${toEmail}`,
                                emailSubject: subject,
                                direction: isInbound ? "inbound" : "outbound",
                                isAutoLogged: true,
                                createdAt: new Date(dateStr),
                            });

                            // Update opportunity
                            await Opportunity.findByIdAndUpdate(opportunity._id, {
                                lastActivityAt: new Date(),
                                $inc: { activityCount: 1, emailCount: 1 },
                            });

                            syncedCount++;
                        }
                    }
                }
            } catch (msgError) {
                console.error("Error processing message:", msgError);
            }
        }

        // Update last sync time
        integration.lastSyncAt = new Date();
        integration.syncError = undefined;
        await integration.save();

        res.json({
            success: true,
            data: {
                messagesProcessed: messages.length,
                activitiesCreated: syncedCount,
                lastSyncAt: integration.lastSyncAt,
            },
        });
    } catch (error: any) {
        console.error("Sync error:", error);

        // Update integration with error
        try {
            await EmailIntegration.findByIdAndUpdate(req.params.integrationId, {
                syncError: error.message,
            });
        } catch (e) { }

        res.status(500).json({
            success: false,
            error: error.message || "Failed to sync emails",
        });
    }
});

export default router;
