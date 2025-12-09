/**
 * Campaign Routes
 * 
 * API routes for managing cold email campaigns
 */

import express from "express";
import CampaignService from "../services/CampaignService";
import Campaign from "../models/Campaign";
import { authenticate } from "../middleware/auth";

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

        const campaigns = await Campaign.find(query)
            .populate("fromAccounts", "email provider status")
            .sort({ createdAt: -1 });

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

        const campaign = await CampaignService.createCampaign(workspaceId, userId, {
            name,
            description,
            fromAccounts,
            dailyLimit: dailyLimit || 50,
            sendingSchedule,
            steps,
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
 * Delete a campaign
 */
router.delete("/:id", async (req: any, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findByIdAndDelete(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        res.json({
            success: true,
            message: "Campaign deleted successfully",
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

export default router;
