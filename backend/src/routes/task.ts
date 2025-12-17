import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Task from "../models/Task";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Rate limiter
const taskLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests, please try again later.",
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createTaskSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    status: z.enum(["todo", "in_progress", "completed", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.string().optional(),
    reminderDate: z.string().optional(),
    relatedContactId: z.string().optional(),
    relatedCompanyId: z.string().optional(),
    relatedOpportunityId: z.string().optional(),
    assignedTo: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

const updateTaskSchema = createTaskSchema.partial();

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
 * @route   GET /api/workspaces/:workspaceId/tasks
 * @desc    Get all tasks for a workspace
 */
router.get(
    "/:workspaceId/tasks",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { status, priority, assignedTo, search, page = "1", limit = "50" } = req.query;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (assignedTo) filter.assignedTo = assignedTo;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ];
            }

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const [tasks, total] = await Promise.all([
                Task.find(filter)
                    .populate("relatedContactId", "firstName lastName email")
                    .populate("relatedCompanyId", "name")
                    .populate("relatedOpportunityId", "name value")
                    .populate("assignedTo", "firstName lastName email")
                    .sort({ dueDate: 1, priority: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit as string)),
                Task.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: {
                    tasks,
                    pagination: {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string),
                        total,
                        pages: Math.ceil(total / parseInt(limit as string)),
                    },
                },
            });
        } catch (error: any) {
            console.error("Get tasks error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch tasks." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/tasks
 * @desc    Create a new task
 */
router.post(
    "/:workspaceId/tasks",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const result = createTaskSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            const task = await Task.create({
                ...result.data,
                workspaceId,
                userId: req.user?._id,
                createdBy: req.user?._id,
                dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
                reminderDate: result.data.reminderDate ? new Date(result.data.reminderDate) : undefined,
            });

            res.status(201).json({
                success: true,
                message: "Task created successfully!",
                data: { task },
            });
        } catch (error: any) {
            console.error("Create task error:", error);
            res.status(500).json({ success: false, error: "Failed to create task." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/tasks/:id
 * @desc    Get a single task
 */
router.get(
    "/:workspaceId/tasks/:id",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const task = await Task.findOne({ _id: id, workspaceId })
                .populate("relatedContactId", "firstName lastName email")
                .populate("relatedCompanyId", "name")
                .populate("relatedOpportunityId", "name value")
                .populate("assignedTo", "firstName lastName email");

            if (!task) {
                return res.status(404).json({ success: false, error: "Task not found." });
            }

            res.json({ success: true, data: { task } });
        } catch (error: any) {
            console.error("Get task error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch task." });
        }
    }
);

/**
 * @route   PUT /api/workspaces/:workspaceId/tasks/:id
 * @desc    Update a task
 */
router.put(
    "/:workspaceId/tasks/:id",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const result = updateTaskSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            const updateData: any = { ...result.data };
            if (result.data.dueDate) updateData.dueDate = new Date(result.data.dueDate);
            if (result.data.reminderDate) updateData.reminderDate = new Date(result.data.reminderDate);

            // Set completedAt if status changed to completed
            if (result.data.status === "completed") {
                updateData.completedAt = new Date();
            }

            const task = await Task.findOneAndUpdate(
                { _id: id, workspaceId },
                updateData,
                { new: true, runValidators: true }
            );

            if (!task) {
                return res.status(404).json({ success: false, error: "Task not found." });
            }

            res.json({
                success: true,
                message: "Task updated successfully!",
                data: { task },
            });
        } catch (error: any) {
            console.error("Update task error:", error);
            res.status(500).json({ success: false, error: "Failed to update task." });
        }
    }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/tasks/:id
 * @desc    Delete a task
 */
router.delete(
    "/:workspaceId/tasks/:id",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const task = await Task.findOneAndDelete({ _id: id, workspaceId });

            if (!task) {
                return res.status(404).json({ success: false, error: "Task not found." });
            }

            res.json({ success: true, message: "Task deleted successfully!" });
        } catch (error: any) {
            console.error("Delete task error:", error);
            res.status(500).json({ success: false, error: "Failed to delete task." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/tasks/:id/complete
 * @desc    Quick complete a task
 */
router.post(
    "/:workspaceId/tasks/:id/complete",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const task = await Task.findOneAndUpdate(
                { _id: id, workspaceId },
                { status: "completed", completedAt: new Date() },
                { new: true }
            );

            if (!task) {
                return res.status(404).json({ success: false, error: "Task not found." });
            }

            res.json({
                success: true,
                message: "Task completed!",
                data: { task },
            });
        } catch (error: any) {
            console.error("Complete task error:", error);
            res.status(500).json({ success: false, error: "Failed to complete task." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/tasks/stats
 * @desc    Get task statistics
 */
router.get(
    "/:workspaceId/tasks-stats",
    authenticate,
    taskLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const [statusCounts, priorityCounts, overdue, dueToday] = await Promise.all([
                Task.aggregate([
                    { $match: { workspaceId: require("mongoose").Types.ObjectId.createFromHexString(workspaceId) } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ]),
                Task.aggregate([
                    { $match: { workspaceId: require("mongoose").Types.ObjectId.createFromHexString(workspaceId) } },
                    { $group: { _id: "$priority", count: { $sum: 1 } } },
                ]),
                Task.countDocuments({
                    workspaceId,
                    status: { $nin: ["completed", "cancelled"] },
                    dueDate: { $lt: new Date() },
                }),
                Task.countDocuments({
                    workspaceId,
                    status: { $nin: ["completed", "cancelled"] },
                    dueDate: {
                        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                }),
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
                    overdue,
                    dueToday,
                },
            });
        } catch (error: any) {
            console.error("Get task stats error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch task stats." });
        }
    }
);

export default router;
