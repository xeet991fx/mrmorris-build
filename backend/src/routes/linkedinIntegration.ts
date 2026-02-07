import express, { Response } from "express";
import axios from "axios";
import { authenticate, AuthRequest } from "../middleware/auth";
import IntegrationCredential from "../models/IntegrationCredential";
import Contact from "../models/Contact";
import mongoose from "mongoose";

const router = express.Router();

// LinkedIn OAuth configuration
const LINKEDIN_SCOPES = [
    "openid",
    "profile",
    "email",
    "w_member_social", // For posting (optional)
];

/**
 * Get LinkedIn OAuth2 configuration
 */
function getLinkedInConfig() {
    return {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: `${process.env.BACKEND_URL}/api/linkedin/callback`,
        authUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        profileUrl: "https://api.linkedin.com/v2/userinfo",
    };
}

/**
 * GET /api/linkedin/connect
 * Start LinkedIn OAuth flow
 */
router.get("/connect", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const config = getLinkedInConfig();

        if (!config.clientId || !config.clientSecret) {
            return res.status(500).json({
                success: false,
                error: "LinkedIn integration not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.",
            });
        }

        // Store state for callback verification
        const state = Buffer.from(
            JSON.stringify({
                userId: req.user?._id.toString(),
                workspaceId: workspaceId,
            })
        ).toString("base64");

        const authUrl = new URL(config.authUrl);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", config.clientId);
        authUrl.searchParams.set("redirect_uri", config.redirectUri);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));

        res.json({
            success: true,
            data: { authUrl: authUrl.toString() },
        });
    } catch (error: any) {
        console.error("LinkedIn connect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to start LinkedIn connection",
        });
    }
});

/**
 * GET /api/linkedin/callback
 * LinkedIn OAuth callback
 */
router.get("/callback", async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.error("LinkedIn OAuth error:", error, error_description);
            return res.send(`
                <html>
                    <head>
                        <title>Authorization Canceled</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h2 { color: #dc3545; }
                            p { color: #6c757d; }
                        </style>
                    </head>
                    <body>
                        <h2>Authorization Canceled</h2>
                        <p>${error_description || "You denied access to LinkedIn."}</p>
                        <p>You can close this window now.</p>
                        <script>setTimeout(() => window.close(), 3000);</script>
                    </body>
                </html>
            `);
        }

        if (!code || !state) {
            return res.send(`
                <html>
                    <head>
                        <title>Authorization Failed</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h2 { color: #dc3545; }
                        </style>
                    </head>
                    <body>
                        <h2>Missing Parameters</h2>
                        <p>Authorization code or state is missing.</p>
                        <p>Please try again.</p>
                        <script>setTimeout(() => window.close(), 3000);</script>
                    </body>
                </html>
            `);
        }

        // Decode state
        const stateData = JSON.parse(
            Buffer.from(state as string, "base64").toString("utf-8")
        );

        const config = getLinkedInConfig();

        // Exchange code for tokens
        const tokenResponse = await axios.post(
            config.tokenUrl,
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code as string,
                redirect_uri: config.redirectUri,
                client_id: config.clientId!,
                client_secret: config.clientSecret!,
            }).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const tokens = tokenResponse.data;

        if (!tokens.access_token) {
            return res.send(`
                <html>
                    <head>
                        <title>Token Error</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h2 { color: #dc3545; }
                        </style>
                    </head>
                    <body>
                        <h2>Token Error</h2>
                        <p>Failed to get access token from LinkedIn.</p>
                        <p>Please try again.</p>
                        <script>setTimeout(() => window.close(), 3000);</script>
                    </body>
                </html>
            `);
        }

        // Get user profile from LinkedIn
        const profileResponse = await axios.get(config.profileUrl, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        const profile = profileResponse.data;

        // Calculate expiry (LinkedIn tokens typically expire in 60 days)
        const expiresAt = tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days default

        // Create or update integration credential
        let credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(stateData.workspaceId),
            type: "linkedin",
        }).select("+encryptedData");

        const credentialData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            expires_in: tokens.expires_in,
            id_token: tokens.id_token || null,
        };

        if (credential) {
            // Update existing credential
            credential.setCredentialData(credentialData);
            credential.status = "Connected";
            credential.expiresAt = expiresAt;
            credential.lastValidated = new Date();
            credential.isValid = true;
            credential.validationError = undefined;
            credential.profileInfo = {
                email: profile.email,
                name: profile.name || `${profile.given_name} ${profile.family_name}`,
                avatarUrl: profile.picture,
            };
            credential.scopes = LINKEDIN_SCOPES;
        } else {
            // Create new credential
            credential = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(stateData.workspaceId),
                type: "linkedin",
                name: `LinkedIn - ${profile.email || profile.name}`,
                status: "Connected",
                expiresAt,
                isValid: true,
                lastValidated: new Date(),
                scopes: LINKEDIN_SCOPES,
                profileInfo: {
                    email: profile.email,
                    name: profile.name || `${profile.given_name} ${profile.family_name}`,
                    avatarUrl: profile.picture,
                },
            });
            credential.setCredentialData(credentialData);
        }

        await credential.save();
        console.log(`[LinkedIn OAuth] Connected for workspace ${stateData.workspaceId}`);

        // Return success HTML with auto-close script
        res.send(`
            <html>
                <head>
                    <title>LinkedIn Connected</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        h2 { color: #0077b5; margin-bottom: 20px; }
                        .success-icon { font-size: 48px; margin-bottom: 20px; }
                        p { color: #6c757d; line-height: 1.6; }
                        strong { color: #212529; }
                        .linkedin-logo { width: 48px; height: 48px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">&#10003;</div>
                        <h2>LinkedIn Connected</h2>
                        <p>Account: <strong>${profile.email || profile.name}</strong></p>
                        ${profile.name ? `<p>Name: ${profile.name}</p>` : ""}
                        <p style="margin-top: 20px;">This window will close automatically...</p>
                    </div>
                    <script>
                        // Auto-close popup after 2 seconds
                        setTimeout(() => {
                            window.close();
                            // If window.close() doesn't work (not a popup), redirect to dashboard
                            setTimeout(() => {
                                window.location.href = '${process.env.FRONTEND_URL}/projects/${stateData.workspaceId}';
                            }, 500);
                        }, 2000);
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        console.error("LinkedIn callback error:", error);
        res.send(`
            <html>
                <head>
                    <title>Connection Failed</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h2 { color: #dc3545; }
                        pre { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left; max-width: 600px; margin: 20px auto; overflow-x: auto; }
                    </style>
                </head>
                <body>
                    <h2>Connection Failed</h2>
                    <p>An error occurred while connecting your LinkedIn account.</p>
                    <pre>${error.message}</pre>
                    <p>Please try again. If the problem persists, contact support.</p>
                    <script>setTimeout(() => window.close(), 5000);</script>
                </body>
            </html>
        `);
    }
});

/**
 * GET /api/linkedin/status
 * Get LinkedIn connection status for workspace
 */
router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
            type: "linkedin",
        });

        if (!credential) {
            return res.json({
                success: true,
                data: {
                    connected: false,
                    status: "Not Connected",
                },
            });
        }

        // Check if token is expired
        const isExpired = credential.expiresAt && new Date() > credential.expiresAt;

        res.json({
            success: true,
            data: {
                connected: !isExpired && credential.status === "Connected",
                status: isExpired ? "Expired" : credential.status,
                profileInfo: credential.profileInfo,
                expiresAt: credential.expiresAt,
                lastValidated: credential.lastValidated,
            },
        });
    } catch (error: any) {
        console.error("LinkedIn status error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get LinkedIn status",
        });
    }
});

/**
 * DELETE /api/linkedin/disconnect
 * Disconnect LinkedIn integration
 */
router.delete("/disconnect", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const result = await IntegrationCredential.findOneAndDelete({
            workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
            type: "linkedin",
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                error: "LinkedIn integration not found",
            });
        }

        console.log(`[LinkedIn] Disconnected for workspace ${workspaceId}`);

        res.json({
            success: true,
            message: "LinkedIn disconnected successfully",
        });
    } catch (error: any) {
        console.error("LinkedIn disconnect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to disconnect LinkedIn",
        });
    }
});

/**
 * GET /api/linkedin/profile
 * Get current user's LinkedIn profile (connected account)
 */
router.get("/profile", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        const credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
            type: "linkedin",
        }).select("+encryptedData");

        if (!credential) {
            return res.status(404).json({
                success: false,
                error: "LinkedIn not connected",
            });
        }

        const credentialData = credential.getCredentialData();

        // Check if token is expired
        if (credential.expiresAt && new Date() > credential.expiresAt) {
            credential.status = "Expired";
            await credential.save();
            return res.status(401).json({
                success: false,
                error: "LinkedIn token expired. Please reconnect.",
            });
        }

        // Fetch fresh profile from LinkedIn
        const config = getLinkedInConfig();
        const profileResponse = await axios.get(config.profileUrl, {
            headers: {
                Authorization: `Bearer ${credentialData.access_token}`,
            },
        });

        // Update last used
        credential.lastUsed = new Date();
        await credential.save();

        res.json({
            success: true,
            data: {
                profile: profileResponse.data,
            },
        });
    } catch (error: any) {
        console.error("LinkedIn profile fetch error:", error);

        // Handle token expiration
        if (error.response?.status === 401) {
            return res.status(401).json({
                success: false,
                error: "LinkedIn token expired. Please reconnect.",
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch LinkedIn profile",
        });
    }
});

/**
 * POST /api/linkedin/sync-contact/:contactId
 * Sync LinkedIn profile data to a CRM contact
 * Note: This uses the connected user's profile data, not arbitrary profile lookup
 * (LinkedIn API doesn't allow arbitrary profile lookups without special access)
 */
router.post("/sync-contact/:contactId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { contactId } = req.params;
        const { workspaceId } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        // Get the contact
        const contact = await Contact.findOne({
            _id: contactId,
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: "Contact not found",
            });
        }

        // For now, we can only use the connected user's profile
        // For arbitrary profile enrichment, you'd need LinkedIn Recruiter API or Sales Navigator API
        const credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "linkedin",
        }).select("+encryptedData");

        if (!credential) {
            return res.status(400).json({
                success: false,
                error: "LinkedIn not connected. Please connect LinkedIn first.",
            });
        }

        // Note: Basic LinkedIn API only allows fetching the authenticated user's profile
        // For enriching other contacts, you would need:
        // 1. LinkedIn Sales Navigator API
        // 2. Third-party enrichment service (like Apollo, which you already have)
        // 3. Manual LinkedIn URL provided by user

        // If contact has a LinkedIn URL, we can at least validate/store it
        if (contact.linkedin) {
            // Normalize the LinkedIn URL
            let linkedinUrl = contact.linkedin;
            if (!linkedinUrl.startsWith("http")) {
                linkedinUrl = `https://linkedin.com/in/${linkedinUrl}`;
            }

            contact.linkedin = linkedinUrl;
            contact.socialProfiles = {
                ...contact.socialProfiles,
                linkedin: linkedinUrl,
            };
            await contact.save();

            return res.json({
                success: true,
                message: "LinkedIn URL normalized and saved",
                data: {
                    contact: {
                        _id: contact._id,
                        firstName: contact.firstName,
                        lastName: contact.lastName,
                        linkedin: contact.linkedin,
                    },
                },
            });
        }

        res.json({
            success: true,
            message: "No LinkedIn URL found for this contact. Add a LinkedIn profile URL to enrich.",
            data: {
                contact: {
                    _id: contact._id,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                },
            },
        });
    } catch (error: any) {
        console.error("LinkedIn sync contact error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to sync LinkedIn data",
        });
    }
});

/**
 * POST /api/linkedin/enrich-from-apollo/:contactId
 * Use Apollo.io to enrich contact with LinkedIn data (if contact has LinkedIn URL)
 */
router.post("/enrich-from-apollo/:contactId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { contactId } = req.params;
        const { workspaceId } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        // Get the contact
        const contact = await Contact.findOne({
            _id: contactId,
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: "Contact not found",
            });
        }

        if (!contact.linkedin) {
            return res.status(400).json({
                success: false,
                error: "Contact does not have a LinkedIn URL. Add one first.",
            });
        }

        // Use Apollo service to enrich from LinkedIn
        const ApolloService = (await import("../services/ApolloService")).default;

        if (!ApolloService.isConfigured()) {
            return res.status(400).json({
                success: false,
                error: "Apollo.io not configured. Please set APOLLO_API_KEY.",
            });
        }

        const enrichResult = await ApolloService.findEmailFromLinkedIn(contact.linkedin);

        if (!enrichResult.success) {
            return res.status(400).json({
                success: false,
                error: enrichResult.error || "Failed to enrich from Apollo",
            });
        }

        // Update contact with enriched data
        const apolloData = enrichResult.data;
        const updates: any = {};

        if (apolloData.email && !contact.email) {
            updates.email = apolloData.email;
        }
        if (apolloData.title) {
            updates.jobTitle = apolloData.title;
        }
        if (apolloData.organization?.name) {
            updates.company = apolloData.organization.name;
        }
        if (apolloData.phone_numbers?.[0]?.raw_number && !contact.phone) {
            updates.phone = apolloData.phone_numbers[0].raw_number;
        }
        if (apolloData.city) {
            updates.city = apolloData.city;
        }
        if (apolloData.state) {
            updates.state = apolloData.state;
        }
        if (apolloData.country) {
            updates.country = apolloData.country;
        }

        // Update Apollo enrichment metadata
        updates.apolloEnrichment = {
            enrichedAt: new Date(),
            apolloId: apolloData.id,
            confidence: 1,
            dataSource: "apollo",
            fieldsEnriched: Object.keys(updates),
            creditsUsed: enrichResult.creditsUsed || 1,
        };

        await Contact.findByIdAndUpdate(contactId, { $set: updates });

        res.json({
            success: true,
            message: "Contact enriched from LinkedIn via Apollo",
            data: {
                fieldsUpdated: Object.keys(updates),
                creditsUsed: enrichResult.creditsUsed,
            },
        });
    } catch (error: any) {
        console.error("LinkedIn Apollo enrich error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to enrich contact",
        });
    }
});

// ============================================
// LINKEDIN ACTIVITY LOGGING (For Inbox Integration)
// ============================================

import LinkedInActivity, { LinkedInActivityType } from "../models/LinkedInActivity";

/**
 * POST /api/linkedin/activities
 * Log a new LinkedIn activity (message, connection request, note, etc.)
 */
router.post("/activities", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, contactId, type, subject, content, linkedinUrl, direction, activityDate } = req.body;

        if (!workspaceId || !contactId || !type || !content) {
            return res.status(400).json({
                success: false,
                error: "workspaceId, contactId, type, and content are required",
            });
        }

        // Validate contact exists
        const contact = await Contact.findOne({
            _id: contactId,
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: "Contact not found",
            });
        }

        const activity = new LinkedInActivity({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            contactId: new mongoose.Types.ObjectId(contactId),
            userId: req.user?._id,
            type,
            subject,
            content,
            linkedinUrl: linkedinUrl || contact.linkedin,
            direction: direction || "outbound",
            activityDate: activityDate ? new Date(activityDate) : new Date(),
            isRead: direction === "outbound", // Outbound activities are auto-read
        });

        await activity.save();

        // Populate for response
        const populatedActivity = await LinkedInActivity.findById(activity._id)
            .populate("contactId", "firstName lastName email linkedin")
            .populate("userId", "firstName lastName email");

        res.status(201).json({
            success: true,
            data: { activity: populatedActivity },
        });
    } catch (error: any) {
        console.error("Log LinkedIn activity error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to log LinkedIn activity",
        });
    }
});

/**
 * GET /api/linkedin/activities
 * Get LinkedIn activities for inbox view
 */
router.get("/activities", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, contactId, type, isRead, page = 1, limit = 50 } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "workspaceId is required",
            });
        }

        const query: any = {
            workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
        };

        if (contactId) {
            query.contactId = new mongoose.Types.ObjectId(contactId as string);
        }

        if (type) {
            query.type = type;
        }

        if (isRead !== undefined) {
            query.isRead = isRead === "true";
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [activities, total] = await Promise.all([
            LinkedInActivity.find(query)
                .populate("contactId", "firstName lastName email linkedin company")
                .populate("userId", "firstName lastName email")
                .sort({ activityDate: -1 })
                .skip(skip)
                .limit(Number(limit)),
            LinkedInActivity.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                activities,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error("Get LinkedIn activities error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get LinkedIn activities",
        });
    }
});

/**
 * GET /api/linkedin/activities/grouped
 * Get LinkedIn activities grouped by contact for inbox view
 */
router.get("/activities/grouped", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "workspaceId is required",
            });
        }

        // Aggregate activities by contact
        const grouped = await LinkedInActivity.aggregate([
            {
                $match: {
                    workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
                },
            },
            {
                $sort: { activityDate: -1 },
            },
            {
                $group: {
                    _id: "$contactId",
                    activities: { $push: "$$ROOT" },
                    activityCount: { $sum: 1 },
                    unreadCount: {
                        $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
                    },
                    latestActivity: { $first: "$$ROOT" },
                },
            },
            {
                $lookup: {
                    from: "contacts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "contact",
                },
            },
            {
                $unwind: "$contact",
            },
            {
                $project: {
                    contactId: "$_id",
                    contactName: {
                        $concat: [
                            { $ifNull: ["$contact.firstName", ""] },
                            " ",
                            { $ifNull: ["$contact.lastName", ""] },
                        ],
                    },
                    contactEmail: "$contact.email",
                    contactLinkedIn: "$contact.linkedin",
                    contactCompany: "$contact.company",
                    activityCount: 1,
                    unreadCount: 1,
                    latestActivity: 1,
                    activities: { $slice: ["$activities", 5] }, // Only return last 5
                },
            },
            {
                $sort: { "latestActivity.activityDate": -1 },
            },
        ]);

        res.json({
            success: true,
            data: { conversations: grouped },
        });
    } catch (error: any) {
        console.error("Get grouped LinkedIn activities error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get grouped activities",
        });
    }
});

/**
 * GET /api/linkedin/activities/stats
 * Get LinkedIn activity statistics
 */
router.get("/activities/stats", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "workspaceId is required",
            });
        }

        const [total, unread, byType] = await Promise.all([
            LinkedInActivity.countDocuments({
                workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
            }),
            LinkedInActivity.countDocuments({
                workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
                isRead: false,
            }),
            LinkedInActivity.aggregate([
                {
                    $match: {
                        workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
                    },
                },
                {
                    $group: {
                        _id: "$type",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const typeStats: Record<string, number> = {};
        byType.forEach((item: any) => {
            typeStats[item._id] = item.count;
        });

        res.json({
            success: true,
            data: {
                total,
                unread,
                byType: typeStats,
            },
        });
    } catch (error: any) {
        console.error("Get LinkedIn activity stats error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get activity stats",
        });
    }
});

/**
 * PUT /api/linkedin/activities/:id/read
 * Mark a LinkedIn activity as read
 */
router.put("/activities/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const activity = await LinkedInActivity.findByIdAndUpdate(
            id,
            { isRead: true },
            { new: true }
        );

        if (!activity) {
            return res.status(404).json({
                success: false,
                error: "Activity not found",
            });
        }

        res.json({
            success: true,
            data: { activity },
        });
    } catch (error: any) {
        console.error("Mark activity read error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to mark activity as read",
        });
    }
});

/**
 * DELETE /api/linkedin/activities/:id
 * Delete a LinkedIn activity
 */
router.delete("/activities/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const activity = await LinkedInActivity.findByIdAndDelete(id);

        if (!activity) {
            return res.status(404).json({
                success: false,
                error: "Activity not found",
            });
        }

        res.json({
            success: true,
            message: "Activity deleted",
        });
    } catch (error: any) {
        console.error("Delete activity error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete activity",
        });
    }
});

export default router;

