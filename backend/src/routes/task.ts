import express, { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { taskService } from "../services/TaskService";

const router: Router = express.Router();

/**
 * Task Routes
 * 
 * CRUD operations for task management
 * Base path: /api/workspaces/:workspaceId/tasks
 */

// Get task counts (summary)
router.get(
    "/:workspaceId/tasks/counts",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { assigneeId } = req.query;

            const counts = await taskService.getTaskCounts(
                workspaceId,
                assigneeId as string | undefined
            );

            res.json({
                success: true,
                data: counts,
            });
        } catch (error: any) {
            console.error("Error getting task counts:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get task counts",
            });
        }
    }
);

// Get overdue tasks
router.get(
    "/:workspaceId/tasks/overdue",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { assigneeId } = req.query;

            const tasks = await taskService.getOverdueTasks(
                workspaceId,
                assigneeId as string | undefined
            );

            res.json({
                success: true,
                data: tasks,
            });
        } catch (error: any) {
            console.error("Error getting overdue tasks:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get overdue tasks",
            });
        }
    }
);

// Get tasks due today
router.get(
    "/:workspaceId/tasks/today",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { assigneeId } = req.query;

            const tasks = await taskService.getTasksDueToday(
                workspaceId,
                assigneeId as string | undefined
            );

            res.json({
                success: true,
                data: tasks,
            });
        } catch (error: any) {
            console.error("Error getting today's tasks:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get today's tasks",
            });
        }
    }
);

// Get all tasks with filters
router.get(
    "/:workspaceId/tasks",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const {
                status,
                priority,
                assigneeId,
                contactId,
                companyId,
                opportunityId,
                dueBefore,
                dueAfter,
                type,
                search,
                page,
                limit,
                sortBy,
                sortOrder,
            } = req.query;

            const filters: any = {};

            if (status) {
                filters.status = (status as string).includes(",")
                    ? (status as string).split(",")
                    : status;
            }
            if (priority) {
                filters.priority = (priority as string).includes(",")
                    ? (priority as string).split(",")
                    : priority;
            }
            if (assigneeId) filters.assigneeId = assigneeId;
            if (contactId) filters.contactId = contactId;
            if (companyId) filters.companyId = companyId;
            if (opportunityId) filters.opportunityId = opportunityId;
            if (dueBefore) filters.dueBefore = new Date(dueBefore as string);
            if (dueAfter) filters.dueAfter = new Date(dueAfter as string);
            if (type) filters.type = type;
            if (search) filters.search = search;

            const options = {
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 20,
                sortBy: sortBy as string,
                sortOrder: sortOrder as "asc" | "desc",
            };

            const result = await taskService.getTasks(workspaceId, filters, options);

            res.json({
                success: true,
                data: result.tasks,
                pagination: {
                    page: result.page,
                    limit: options.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        } catch (error: any) {
            console.error("Error getting tasks:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get tasks",
            });
        }
    }
);

// Get single task
router.get(
    "/:workspaceId/tasks/:taskId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, taskId } = req.params;

            const task = await taskService.getTaskById(taskId, workspaceId);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: "Task not found",
                });
            }

            res.json({
                success: true,
                data: task,
            });
        } catch (error: any) {
            console.error("Error getting task:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get task",
            });
        }
    }
);

// Create task
router.post(
    "/:workspaceId/tasks",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
            }

            const task = await taskService.createTask({
                workspaceId,
                createdBy: userId,
                ...req.body,
            });

            res.status(201).json({
                success: true,
                data: task,
                message: "Task created successfully",
            });
        } catch (error: any) {
            console.error("Error creating task:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create task",
            });
        }
    }
);

// Update task
router.put(
    "/:workspaceId/tasks/:taskId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, taskId } = req.params;

            const task = await taskService.updateTask(taskId, workspaceId, req.body);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: "Task not found",
                });
            }

            res.json({
                success: true,
                data: task,
                message: "Task updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating task:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update task",
            });
        }
    }
);

// Complete task
router.post(
    "/:workspaceId/tasks/:taskId/complete",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, taskId } = req.params;
            const { actualMinutes } = req.body;

            const task = await taskService.completeTask(taskId, workspaceId, actualMinutes);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: "Task not found",
                });
            }

            res.json({
                success: true,
                data: task,
                message: "Task completed successfully",
            });
        } catch (error: any) {
            console.error("Error completing task:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to complete task",
            });
        }
    }
);

// Delete task
router.delete(
    "/:workspaceId/tasks/:taskId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, taskId } = req.params;

            const deleted = await taskService.deleteTask(taskId, workspaceId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: "Task not found",
                });
            }

            res.json({
                success: true,
                message: "Task deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting task:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete task",
            });
        }
    }
);

export default router;
