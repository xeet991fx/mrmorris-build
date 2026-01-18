/**
 * Inbox Routes (Unibox)
 *
 * API routes for managing unified inbox
 */

import express from "express";
import InboxService from "../services/InboxService";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";

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

        logger.debug("Fetching inbox", { workspaceId, source: source || "all" });

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

        logger.debug("Found inbox messages", { count: result.messages?.length || 0 });

        res.json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        logger.error("Get inbox error", { error });
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
        logger.error("Get inbox stats error", { error });
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * GET /api/inbox/grouped
 * Get inbox messages grouped by source with subdivisions
 */
router.get("/grouped", async (req: any, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        const grouped = await InboxService.getGroupedInbox(workspaceId);

        res.json({
            success: true,
            data: grouped,
        });
    } catch (error: any) {
        logger.error("Get grouped inbox error", { error });
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

        logger.info("Manual sync triggered", { workspaceId });
        const count = await InboxService.fetchNewReplies(workspaceId);

        res.json({
            success: true,
            message: `Synced ${count} new replies`,
            repliesFound: count,
        });
    } catch (error: any) {
        logger.error("Sync inbox error", { error });
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
        logger.error("Mark as read error", { error });
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
        logger.error("Assign message error", { error });
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
        logger.error("Label message error", { error });
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * GET /api/inbox/:id/thread
 * Get all messages in a conversation thread
 */
router.get("/:id/thread", async (req: any, res) => {
    try {
        const { id } = req.params;
        logger.debug("Getting thread messages", { messageId: id });

        const result = await InboxService.getThreadMessages(id);

        if (!result.success) {
            logger.warn("Thread fetch failed", { error: result.error });
            return res.status(400).json({
                success: false,
                message: result.error,
            });
        }

        logger.debug("Found thread messages", { count: result.messages.length });
        res.json({
            success: true,
            messages: result.messages,
        });
    } catch (error: any) {
        logger.error("Get thread messages error", { error });
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/inbox/:id/reply
 * Send manual reply to message
 */
router.post("/:id/reply", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { body, subject } = req.body;

        logger.debug("Reply request received", { messageId: id });
        logger.debug("Reply details", { subject, bodyLength: body?.length || 0 });

        if (!body) {
            return res.status(400).json({
                success: false,
                message: "body is required",
            });
        }

        // Use InboxService to send the reply
        const result = await InboxService.sendReply(id, body, subject);

        logger.info("Reply result", { success: result.success, error: result.error });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || "Failed to send reply",
            });
        }

        res.json({
            success: true,
            message: result.message,
            sentReply: result.sentReply,
        });
    } catch (error: any) {
        logger.error("Send reply error", { error });
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
        logger.debug("Generating AI draft", { messageId: id });

        const result = await InboxService.generateAIDraft(id);

        if (!result.success) {
            logger.warn("AI draft generation failed", { error: result.error });
            return res.status(400).json({
                success: false,
                message: result.error,
            });
        }

        logger.debug("AI draft generated successfully");
        res.json({
            success: true,
            draft: result.draft,
        });
    } catch (error: any) {
        logger.error("Generate AI draft error", { error });
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
        logger.error("Get AI draft error", { error });
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
