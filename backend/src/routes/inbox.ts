/**
 * Inbox Routes (Unibox)
 * 
 * API routes for managing unified inbox
 */

import express from "express";
import InboxService from "../services/InboxService";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/inbox
 * Get all inbox messages (campaigns, workflows, direct)
 */
router.get("/", async (req: any, res) => {
    try {
        const { workspaceId, source, campaign, workflow, sentiment, assignedTo, isRead, search, page = 1, limit = 50 } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        console.log(`📥 Fetching inbox for workspace: ${workspaceId}, source: ${source || 'all'}`);

        const result = await InboxService.getInboxMessages(
            workspaceId,
            {
                source: source as any,
                campaign,
                workflow,
                sentiment,
                assignedTo,
                isRead: isRead ? isRead === "true" : undefined,
                search,
            },
            parseInt(page),
            parseInt(limit)
        );

        console.log(`📥 Found ${result.messages?.length || 0} inbox messages`);

        res.json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        console.error("Get inbox error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * GET /api/inbox/stats
 * Get inbox statistics by source
 */
router.get("/stats", async (req: any, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        const stats = await InboxService.getStats(workspaceId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        console.error("Get inbox stats error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/inbox/sync
 * Manually trigger inbox sync to fetch new replies
 */
router.post("/sync", async (req: any, res) => {
    try {
        const { workspaceId } = req.body.workspaceId ? req.body : req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        console.log(`📥 Manual sync triggered for workspace: ${workspaceId}`);
        const count = await InboxService.fetchNewReplies(workspaceId);

        res.json({
            success: true,
            message: `Synced ${count} new replies`,
            repliesFound: count,
        });
    } catch (error: any) {
        console.error("Sync inbox error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * PUT /api/inbox/:id/read
 * Mark message as read
 */
router.put("/:id/read", async (req: any, res) => {
    try {
        const { id } = req.params;

        await InboxService.markAsRead(id);

        res.json({
            success: true,
            message: "Message marked as read",
        });
    } catch (error: any) {
        console.error("Mark as read error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * PUT /api/inbox/:id/assign
 * Assign message to user
 */
router.put("/:id/assign", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }

        await InboxService.assignToUser(id, userId);

        res.json({
            success: true,
            message: "Message assigned",
        });
    } catch (error: any) {
        console.error("Assign message error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * PUT /api/inbox/:id/label
 * Add label to message
 */
router.put("/:id/label", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { label } = req.body;

        if (!label) {
            return res.status(400).json({
                success: false,
                message: "label is required",
            });
        }

        await InboxService.labelMessage(id, label);

        res.json({
            success: true,
            message: "Label added",
        });
    } catch (error: any) {
        console.error("Label message error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/inbox/:id/reply
 * Send manual reply to message
 * NOTE: This is a placeholder for manual reply functionality
 */
router.post("/:id/reply", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { body, subject } = req.body;

        if (!body) {
            return res.status(400).json({
                success: false,
                message: "body is required",
            });
        }

        // TODO: Implement actual reply sending
        // This would involve:
        // 1. Get original EmailMessage
        // 2. Get fromAccount
        // 3. Send reply email via nodemailer
        // 4. Track sent reply

        res.json({
            success: true,
            message: "Reply sent (TODO: Implement actual sending)",
        });
    } catch (error: any) {
        console.error("Send reply error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/inbox/:id/draft
 * Generate AI draft response for a message
 */
router.post("/:id/draft", async (req: any, res) => {
    try {
        const { id } = req.params;

        const result = await InboxService.generateAIDraft(id);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error,
            });
        }

        res.json({
            success: true,
            draft: result.draft,
        });
    } catch (error: any) {
        console.error("Generate AI draft error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * GET /api/inbox/:id/draft
 * Get existing AI draft for a message
 */
router.get("/:id/draft", async (req: any, res) => {
    try {
        const { id } = req.params;

        const result = await InboxService.getAIDraft(id);

        res.json({
            success: true,
            draft: result.draft,
            generatedAt: result.generatedAt,
        });
    } catch (error: any) {
        console.error("Get AI draft error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
