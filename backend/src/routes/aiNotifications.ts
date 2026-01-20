import express from 'express';
import { Types } from 'mongoose';
import AINotification from '../models/AINotification';
import { authenticate, AuthRequest } from '../middleware/auth';
import Project from '../models/Project';

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/ai-notifications
 * Get pending AI notifications for the current user
 */
router.get('/workspaces/:workspaceId/ai-notifications', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user!._id;
        const { type, priority, page = "1", limit = "20", includeShown } = req.query;

        // Build query
        const query: any = {
            workspaceId: new Types.ObjectId(workspaceId),
            userId: new Types.ObjectId(userId.toString()),
            status: includeShown ? { $in: ['pending', 'shown'] } : 'pending',
        };

        if (type) query.type = type;
        if (priority) query.priority = priority;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        // Fetch notifications with pagination
        const [notifications, total] = await Promise.all([
            AINotification.find(query)
                .sort({ priority: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit as string))
                .lean(),
            AINotification.countDocuments(query),
        ]);

        // Get counts by type
        const counts = await AINotification.aggregate([
            {
                $match: {
                    workspaceId: new Types.ObjectId(workspaceId),
                    userId: new Types.ObjectId(userId.toString()),
                    status: 'pending',
                },
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                },
            },
        ]);

        const countsByType = counts.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
        }, {} as Record<string, number>);

        res.json({
            success: true,
            data: {
                notifications,
                totalPending: notifications.filter(n => n.status === 'pending').length,
                countsByType,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    pages: Math.ceil(total / parseInt(limit as string)),
                },
            },
        });
    } catch (error: any) {
        console.error('Error fetching AI notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/ai-notifications/:id/mark-shown
 * Mark notification as shown (when user sees it)
 */
router.patch('/ai-notifications/:id/mark-shown', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        await AINotification.findByIdAndUpdate(id, {
            status: 'shown',
            shownAt: new Date(),
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/ai-notifications/:id/dismiss
 * Dismiss a notification
 */
router.patch('/ai-notifications/:id/dismiss', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        await AINotification.findByIdAndUpdate(id, {
            status: 'dismissed',
            dismissedAt: new Date(),
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/ai-notifications/:id/acted
 * Mark notification as acted upon
 */
router.patch('/ai-notifications/:id/acted', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { actionType } = req.body;

        await AINotification.findByIdAndUpdate(id, {
            status: 'acted',
            actedAt: new Date(),
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai-notifications/:id/feedback
 * Submit feedback on an AI notification
 */
router.post('/ai-notifications/:id/feedback', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { helpful, comment } = req.body;

        await AINotification.findByIdAndUpdate(id, {
            feedback: {
                helpful,
                comment,
            },
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/ai-notifications/clear-all
 * Clear all notifications for the user in a workspace
 */
router.delete('/workspaces/:workspaceId/ai-notifications/clear-all', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user!._id;

        await AINotification.updateMany(
            {
                workspaceId: new Types.ObjectId(workspaceId),
                userId: new Types.ObjectId(userId.toString()),
                status: 'pending',
            },
            {
                status: 'dismissed',
                dismissedAt: new Date(),
            }
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
