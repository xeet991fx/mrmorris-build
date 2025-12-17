import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

const ticketLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests, please try again later.",
});

// ============================================
// VALIDATION
// ============================================

const createTicketSchema = z.object({
    subject: z.string().min(1).max(500),
    description: z.string().min(1).max(10000),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    category: z.enum(["support", "billing", "technical", "feature_request", "bug", "other"]).optional(),
    requesterEmail: z.string().email(),
    requesterName: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

const updateTicketSchema = createTicketSchema.partial().extend({
    status: z.enum(["open", "in_progress", "waiting_on_customer", "resolved", "closed"]).optional(),
});

const addCommentSchema = z.object({
    message: z.string().min(1).max(10000),
    isInternal: z.boolean().optional(),
});

// ============================================
// HELPER
// ============================================

async function validateWorkspaceAccess(workspaceId: string, userId: string, res: Response): Promise<boolean> {
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
        res.status(404).json({ success: false, error: "Workspace not found." });
        return false;
    }
    if (workspace.userId.toString() !== userId) {
        res.status(403).json({ success: false, error: "Access denied." });
        return false;
    }
    return true;
}

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/tickets
 * @desc    Get all tickets
 */
router.get(
    "/:workspaceId/tickets",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { status, priority, assignedTo, search, page = "1", limit = "50" } = req.query;

            const filter: any = { workspaceId };
            if (status && status !== "all") filter.status = status;
            if (priority && priority !== "all") filter.priority = priority;
            if (assignedTo) filter.assignedTo = assignedTo;
            if (search) {
                filter.$or = [
                    { subject: { $regex: search, $options: "i" } },
                    { ticketNumber: { $regex: search, $options: "i" } },
                    { requesterEmail: { $regex: search, $options: "i" } },
                ];
            }

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const [tickets, total] = await Promise.all([
                Ticket.find(filter)
                    .populate("assignedTo", "name email")
                    .populate("relatedContactId", "firstName lastName email")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit as string)),
                Ticket.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: {
                    tickets,
                    pagination: {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string),
                        total,
                        pages: Math.ceil(total / parseInt(limit as string)),
                    },
                },
            });
        } catch (error: any) {
            console.error("Get tickets error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch tickets." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/tickets
 * @desc    Create a new ticket
 */
router.post(
    "/:workspaceId/tickets",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const result = createTicketSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            // Try to link to existing contact
            const contact = await Contact.findOne({
                workspaceId,
                email: result.data.requesterEmail,
            });

            const ticket = await Ticket.create({
                ...result.data,
                workspaceId,
                createdBy: req.user?._id,
                requesterId: contact?._id,
                relatedContactId: contact?._id,
                dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
                source: "web",
            });

            res.status(201).json({
                success: true,
                message: "Ticket created!",
                data: { ticket },
            });
        } catch (error: any) {
            console.error("Create ticket error:", error);
            res.status(500).json({ success: false, error: "Failed to create ticket." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/tickets/:id
 * @desc    Get single ticket
 */
router.get(
    "/:workspaceId/tickets/:id",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const ticket = await Ticket.findOne({ _id: id, workspaceId })
                .populate("assignedTo", "name email")
                .populate("relatedContactId", "firstName lastName email company")
                .populate("comments.userId", "name email");

            if (!ticket) {
                return res.status(404).json({ success: false, error: "Ticket not found." });
            }

            res.json({ success: true, data: { ticket } });
        } catch (error: any) {
            console.error("Get ticket error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch ticket." });
        }
    }
);

/**
 * @route   PUT /api/workspaces/:workspaceId/tickets/:id
 * @desc    Update ticket
 */
router.put(
    "/:workspaceId/tickets/:id",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const result = updateTicketSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                });
            }

            const updateData: any = { ...result.data };

            // Track resolution time
            if (result.data.status === "resolved" || result.data.status === "closed") {
                const ticket = await Ticket.findById(id);
                if (ticket && !ticket.resolvedAt) {
                    updateData.resolvedAt = new Date();
                    updateData.resolutionTimeMinutes = Math.round(
                        (Date.now() - ticket.createdAt.getTime()) / 60000
                    );
                }
            }

            const ticket = await Ticket.findOneAndUpdate(
                { _id: id, workspaceId },
                updateData,
                { new: true, runValidators: true }
            );

            if (!ticket) {
                return res.status(404).json({ success: false, error: "Ticket not found." });
            }

            res.json({
                success: true,
                message: "Ticket updated!",
                data: { ticket },
            });
        } catch (error: any) {
            console.error("Update ticket error:", error);
            res.status(500).json({ success: false, error: "Failed to update ticket." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/tickets/:id/comments
 * @desc    Add comment to ticket
 */
router.post(
    "/:workspaceId/tickets/:id/comments",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const result = addCommentSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                });
            }

            const ticket = await Ticket.findOne({ _id: id, workspaceId });
            if (!ticket) {
                return res.status(404).json({ success: false, error: "Ticket not found." });
            }

            // Track first response time
            if (!ticket.firstResponseAt && !result.data.isInternal) {
                ticket.firstResponseAt = new Date();
                ticket.responseTimeMinutes = Math.round(
                    (Date.now() - ticket.createdAt.getTime()) / 60000
                );
            }

            ticket.comments.push({
                userId: req.user?._id,
                message: result.data.message,
                isInternal: result.data.isInternal || false,
            } as any);

            await ticket.save();

            res.json({
                success: true,
                message: "Comment added!",
                data: { ticket },
            });
        } catch (error: any) {
            console.error("Add comment error:", error);
            res.status(500).json({ success: false, error: "Failed to add comment." });
        }
    }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/tickets/:id
 * @desc    Delete ticket
 */
router.delete(
    "/:workspaceId/tickets/:id",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const ticket = await Ticket.findOneAndDelete({ _id: id, workspaceId });

            if (!ticket) {
                return res.status(404).json({ success: false, error: "Ticket not found." });
            }

            res.json({ success: true, message: "Ticket deleted!" });
        } catch (error: any) {
            console.error("Delete ticket error:", error);
            res.status(500).json({ success: false, error: "Failed to delete ticket." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/tickets-stats
 * @desc    Get ticket statistics
 */
router.get(
    "/:workspaceId/tickets-stats",
    authenticate,
    ticketLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const mongoose = require("mongoose");
            const workspaceObjId = mongoose.Types.ObjectId.createFromHexString(workspaceId);

            const [statusCounts, priorityCounts, avgResponseTime, avgResolutionTime] = await Promise.all([
                Ticket.aggregate([
                    { $match: { workspaceId: workspaceObjId } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ]),
                Ticket.aggregate([
                    { $match: { workspaceId: workspaceObjId } },
                    { $group: { _id: "$priority", count: { $sum: 1 } } },
                ]),
                Ticket.aggregate([
                    { $match: { workspaceId: workspaceObjId, responseTimeMinutes: { $exists: true } } },
                    { $group: { _id: null, avg: { $avg: "$responseTimeMinutes" } } },
                ]),
                Ticket.aggregate([
                    { $match: { workspaceId: workspaceObjId, resolutionTimeMinutes: { $exists: true } } },
                    { $group: { _id: null, avg: { $avg: "$resolutionTimeMinutes" } } },
                ]),
            ]);

            res.json({
                success: true,
                data: {
                    byStatus: statusCounts.reduce((acc: any, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    byPriority: priorityCounts.reduce((acc: any, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    avgResponseTimeMinutes: avgResponseTime[0]?.avg || null,
                    avgResolutionTimeMinutes: avgResolutionTime[0]?.avg || null,
                },
            });
        } catch (error: any) {
            console.error("Get ticket stats error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch stats." });
        }
    }
);

export default router;
