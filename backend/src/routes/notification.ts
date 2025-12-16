import express, { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import Notification from "../models/Notification";

const router: Router = express.Router();

/**
 * Notification Routes
 * 
 * Endpoints for managing user notifications
 * Base path: /api/notifications
 */

// Get notifications for current user
router.get(
    "/",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            const { page = 1, limit = 20, unreadOnly } = req.query;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
            }

            const query: any = { userId: new Types.ObjectId(userId) };
            if (unreadOnly === "true") {
                query.read = false;
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [notifications, total, unreadCount] = await Promise.all([
                Notification.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Notification.countDocuments(query),
                Notification.countDocuments({ userId: new Types.ObjectId(userId), read: false }),
            ]);

            res.json({
                success: true,
                data: notifications,
                unreadCount,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error: any) {
            console.error("Error getting notifications:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get notifications",
            });
        }
    }
);

// Get unread count
router.get(
    "/unread-count",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
            }

            const count = await Notification.countDocuments({
                userId: new Types.ObjectId(userId),
                read: false,
            });

            res.json({
                success: true,
                data: { count },
            });
        } catch (error: any) {
            console.error("Error getting unread count:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get unread count",
            });
        }
    }
);

// Mark notification as read
router.put(
    "/:notificationId/read",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            const { notificationId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
            }

            const notification = await Notification.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(notificationId),
                    userId: new Types.ObjectId(userId),
                },
                { read: true, readAt: new Date() },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: "Notification not found",
                });
            }

            res.json({
                success: true,
                data: notification,
            });
        } catch (error: any) {
            console.error("Error marking notification as read:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to mark notification as read",
            });
        }
    }
);

// Mark all notifications as read
router.put(
    "/read-all",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
            }

            const result = await Notification.updateMany(
                { userId: new Types.ObjectId(userId), read: false },
                { read: true, readAt: new Date() }
            );

            res.json({
                success: true,
                message: `Marked ${result.modifiedCount} notifications as read`,
            });
        } catch (error: any) {
            console.error("Error marking all notifications as read:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to mark all notifications as read",
            });
        }
    }
);

// Delete a notification
router.delete(
    "/:notificationId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            const { notificationId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
            }

            const result = await Notification.deleteOne({
                _id: new Types.ObjectId(notificationId),
                userId: new Types.ObjectId(userId),
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Notification not found",
                });
            }

            res.json({
                success: true,
                message: "Notification deleted",
            });
        } catch (error: any) {
            console.error("Error deleting notification:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete notification",
            });
        }
    }
);

export default router;
