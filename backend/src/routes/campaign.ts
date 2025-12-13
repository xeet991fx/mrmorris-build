/**
 * Campaign Routes
 * 
 * API routes for managing cold email campaigns
 */

import express from "express";
import { google } from "googleapis";
import CampaignService from "../services/CampaignService";
import Campaign from "../models/Campaign";
import { authenticate } from "../middleware/auth";

// OAuth2 client helper for Gmail API
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
    );
};

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/campaigns
 * Get all campaigns for workspace
 */
router.get("/", async (req: any, res) => {
    try {
        const userId = req.user._id;
        const { workspaceId, status } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        const query: any = { workspaceId };
        if (status) query.status = status;

        // Get campaigns with basic populate
        const campaigns = await Campaign.find(query)
            .populate("fromAccounts", "email provider status")
            .sort({ createdAt: -1 })
            .lean();

        // For campaigns with empty fromAccounts after populate, try EmailIntegration
        const EmailIntegration = (await import("../models/EmailIntegration")).default;

        for (const campaign of campaigns) {
            // Filter out null populated entries and check for missing accounts
            const populatedAccounts: any[] = ((campaign as any).fromAccounts || []).filter((a: any) => a && a._id);
            const originalIds = (campaign as any).fromAccounts?.map((a: any) => a?._id?.toString() || a?.toString()) || [];

            // If some accounts didn't populate (they might be EmailIntegrations)
            if (populatedAccounts.length < originalIds.length) {
                // Get the IDs that didn't populate
                const populatedIds = populatedAccounts.map((a: any) => a._id.toString());
                const missingIds = originalIds.filter((id: string) => id && !populatedIds.includes(id));

                if (missingIds.length > 0) {
                    // Try to find these in EmailIntegration
                    const integrations = await EmailIntegration.find({
                        _id: { $in: missingIds },
                    }).select("email provider isActive").lean();

                    // Add integrations as accounts
                    for (const integration of integrations) {
                        populatedAccounts.push({
                            _id: integration._id,
                            email: integration.email,
                            provider: integration.provider || "gmail",
                            status: integration.isActive ? "active" : "inactive",
                        });
                    }
                }
            }

            campaign.fromAccounts = populatedAccounts;
        }

        res.json({
            success: true,
            campaigns,
        });
    } catch (error: any) {
        console.error("Get campaigns error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }

});

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get("/:id", async (req: any, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id)
            .populate("fromAccounts", "email provider status");

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        res.json({
            success: true,
            campaign,
        });
    } catch (error: any) {
        console.error("Get campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post("/", async (req: any, res) => {
    try {
        const userId = req.user._id;
        const { workspaceId, name, description, fromAccounts, dailyLimit, sendingSchedule, steps } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        if (!name || !fromAccounts || !steps || steps.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        // Ensure each step has required fields (order, id)
        const processedSteps = steps.map((step: any, index: number) => ({
            ...step,
            id: step.id || `step-${Date.now()}-${index}`,
            order: typeof step.order === 'number' ? step.order : index,
            type: step.type || 'email',
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
            useAIPersonalization: step.useAIPersonalization || false,
        }));

        const campaign = await CampaignService.createCampaign(workspaceId, userId, {
            name,
            description,
            fromAccounts,
            dailyLimit: dailyLimit || 50,
            sendingSchedule,
            steps: processedSteps,
        });

        res.json({
            success: true,
            campaign,
            message: "Campaign created successfully",
        });
    } catch (error: any) {
        console.error("Create campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * PUT /api/campaigns/:id
 * Update a campaign
 */
router.put("/:id", async (req: any, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const campaign = await Campaign.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        res.json({
            success: true,
            campaign,
            message: "Campaign updated successfully",
        });
    } catch (error: any) {
        console.error("Update campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign and all associated data
 */
router.delete("/:id", async (req: any, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        // Import models for cleanup
        const CampaignEnrollment = (await import("../models/CampaignEnrollment")).default;
        const EmailMessage = (await import("../models/EmailMessage")).default;

        // Delete all enrollments for this campaign
        const enrollmentResult = await CampaignEnrollment.deleteMany({ campaignId: id });
        console.log(`🗑️ Deleted ${enrollmentResult.deletedCount} enrollments for campaign ${id}`);

        // Delete all email messages for this campaign
        const messageResult = await EmailMessage.deleteMany({ campaignId: id });
        console.log(`🗑️ Deleted ${messageResult.deletedCount} email messages for campaign ${id}`);

        // Delete the campaign itself
        await Campaign.findByIdAndDelete(id);

        res.json({
            success: true,
            message: "Campaign and all associated data deleted successfully",
            deleted: {
                enrollments: enrollmentResult.deletedCount,
                messages: messageResult.deletedCount,
            },
        });
    } catch (error: any) {
        console.error("Delete campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/campaigns/:id/enroll
 * Enroll contacts into a campaign
 */
router.post("/:id/enroll", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { contactIds } = req.body;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "contactIds array is required",
            });
        }

        const result = await CampaignService.enrollContacts(id, contactIds);

        res.json({
            success: true,
            ...result,
            message: `Enrolled ${result.enrolled} contacts`,
        });
    } catch (error: any) {
        console.error("Enroll contacts error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/campaigns/:id/start
 * Activate a campaign
 */
router.post("/:id/start", async (req: any, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        campaign.status = "active";
        await campaign.save();

        res.json({
            success: true,
            campaign,
            message: "Campaign started",
        });
    } catch (error: any) {
        console.error("Start campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/campaigns/:id/pause
 * Pause a campaign
 */
router.post("/:id/pause", async (req: any, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        campaign.status = "paused";
        await campaign.save();

        res.json({
            success: true,
            campaign,
            message: "Campaign paused",
        });
    } catch (error: any) {
        console.error("Pause campaign error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * GET /api/campaigns/:id/enrollments
 * Get enrollments for a campaign
 */
router.get("/:id/enrollments", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;

        const CampaignEnrollment = (await import("../models/CampaignEnrollment")).default;

        const query: any = { campaignId: id };
        if (status) query.status = status;

        const enrollments = await CampaignEnrollment.find(query)
            .populate("contactId", "name email company")
            .sort({ enrolledAt: -1 })
            .limit(100);

        res.json({
            success: true,
            enrollments,
        });
    } catch (error: any) {
        console.error("Get enrollments error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/campaigns/:id/test
 * Send a test email for a campaign
 */
router.post("/:id/test", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { testEmail, workspaceId } = req.body;

        if (!testEmail) {
            return res.status(400).json({
                success: false,
                message: "testEmail is required",
            });
        }

        // Get the campaign
        const campaign = await Campaign.findById(id).populate("fromAccounts");
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        if (!campaign.steps || campaign.steps.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Campaign has no email steps",
            });
        }

        const firstStep = campaign.steps[0];
        const subject = `[TEST] ${firstStep.subject || "Test Email"}`;
        const body = `<div style="padding: 20px; font-family: Arial, sans-serif;">
            <p style="color: #666; font-size: 12px; margin-bottom: 20px;">
                📧 This is a test email for campaign: <strong>${campaign.name}</strong>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            ${firstStep.body || "This is a test email from your campaign."}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 11px;">
                Sent as a test - no tracking enabled
            </p>
        </div>`;

        // Send via Gmail integration
        try {
            const EmailIntegration = (await import("../models/EmailIntegration")).default;

            // Find a Gmail integration for this workspace (include encrypted tokens)
            const integration = await EmailIntegration.findOne({
                workspaceId,
                provider: "gmail",
                isActive: true,
            }).select("+accessToken +refreshToken");

            if (!integration) {
                return res.status(400).json({
                    success: false,
                    message: "No active Gmail integration found. Connect Gmail in Settings > Integrations.",
                });
            }

            // Setup OAuth client
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({
                access_token: integration.getAccessToken(),
                refresh_token: integration.getRefreshToken(),
            });

            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            // Create email message in RFC 2822 format
            const emailLines = [
                `From: ${integration.email}`,
                `To: ${testEmail}`,
                `Subject: ${subject}`,
                "Content-Type: text/html; charset=utf-8",
                "",
                body,
            ];

            const rawMessage = emailLines.join("\r\n");
            const encodedMessage = Buffer.from(rawMessage)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

            const response = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedMessage,
                },
            });

            console.log(`✅ Test email sent from ${integration.email} to ${testEmail}`);

            res.json({
                success: true,
                message: `Test email sent from ${integration.email} to ${testEmail}`,
                messageId: response.data.id,
            });
        } catch (emailError: any) {
            console.error("Failed to send test email:", emailError);
            res.status(500).json({
                success: false,
                message: `Email sending failed: ${emailError.message}`,
            });
        }
    } catch (error: any) {
        console.error("Test email error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;

