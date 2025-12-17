import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Notification from "../models/Notification";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

const notificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests, please try again later.",
});

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 */
router.get(
    "/",
    authenticate,
    notificationLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = (req.user?._id as any).toString();
            const { unreadOnly, limit = "50", page = "1" } = req.query;

            const filter: any = { userId };
            if (unreadOnly === "true") {
                filter.isRead = false;
            }

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const [notifications, total, unreadCount] = await Promise.all([
                Notification.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit as string)),
                Notification.countDocuments(filter),
                Notification.countDocuments({ userId, isRead: false }),
            ]);

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string),
                        total,
                    },
                    unreadCount,
                },
            });
        } catch (error: any) {
            console.error("Get notifications error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch notifications." });
        }
    }
);

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark a notification as read
 */
router.post(
    "/:id/read",
    authenticate,
    notificationLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = (req.user?._id as any).toString();
            const { id } = req.params;

            const notification = await Notification.findOneAndUpdate(
                { _id: id, userId },
                { isRead: true, readAt: new Date() },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({ success: false, error: "Notification not found." });
            }

            res.json({ success: true, data: { notification } });
        } catch (error: any) {
            console.error("Mark notification read error:", error);
            res.status(500).json({ success: false, error: "Failed to update notification." });
        }
    }
);

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read
 */
router.post(
    "/read-all",
    authenticate,
    notificationLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = (req.user?._id as any).toString();

            await Notification.updateMany(
                { userId, isRead: false },
                { isRead: true, readAt: new Date() }
            );

            res.json({ success: true, message: "All notifications marked as read." });
        } catch (error: any) {
            console.error("Mark all notifications read error:", error);
            res.status(500).json({ success: false, error: "Failed to update notifications." });
        }
    }
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 */
router.delete(
    "/:id",
    authenticate,
    notificationLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = (req.user?._id as any).toString();
            const { id } = req.params;

            const notification = await Notification.findOneAndDelete({ _id: id, userId });

            if (!notification) {
                return res.status(404).json({ success: false, error: "Notification not found." });
            }

            res.json({ success: true, message: "Notification deleted." });
        } catch (error: any) {
            console.error("Delete notification error:", error);
            res.status(500).json({ success: false, error: "Failed to delete notification." });
        }
    }
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 */
router.get(
    "/unread-count",
    authenticate,
    notificationLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = (req.user?._id as any).toString();

            const count = await Notification.countDocuments({ userId, isRead: false });

            res.json({ success: true, data: { count } });
        } catch (error: any) {
            console.error("Get unread count error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch count." });
        }
    }
);

export default router;
