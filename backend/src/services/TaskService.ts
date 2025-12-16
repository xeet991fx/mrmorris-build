import { Types } from "mongoose";
import Task, { ITask, TaskStatus, TaskPriority } from "../models/Task";
import Notification from "../models/Notification";

/**
 * Task Service
 * 
 * Handles business logic for task management including
 * CRUD operations, reminders, and overdue detection.
 */

interface CreateTaskInput {
    workspaceId: string;
    createdBy: string;
    title: string;
    description?: string;
    type?: string;
    priority?: TaskPriority;
    dueDate?: Date;
    dueTime?: string;
    assigneeId?: string;
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
    reminders?: Array<{ reminderAt: Date; type?: string }>;
    isRecurring?: boolean;
    recurrence?: {
        frequency: string;
        interval: number;
        endDate?: Date;
        daysOfWeek?: number[];
    };
    tags?: string[];
    estimatedMinutes?: number;
}

interface UpdateTaskInput {
    title?: string;
    description?: string;
    type?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
    dueTime?: string;
    assigneeId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    opportunityId?: string | null;
    notes?: string;
    tags?: string[];
    estimatedMinutes?: number;
    actualMinutes?: number;
}

interface TaskFilters {
    status?: TaskStatus | TaskStatus[];
    priority?: TaskPriority | TaskPriority[];
    assigneeId?: string;
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
    dueBefore?: Date;
    dueAfter?: Date;
    type?: string;
    search?: string;
}

interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

class TaskService {
    /**
     * Create a new task
     */
    async createTask(input: CreateTaskInput): Promise<ITask> {
        const task = new Task({
            workspaceId: new Types.ObjectId(input.workspaceId),
            createdBy: new Types.ObjectId(input.createdBy),
            title: input.title,
            description: input.description,
            type: input.type || "other",
            priority: input.priority || "medium",
            status: "pending",
            dueDate: input.dueDate,
            dueTime: input.dueTime,
            assigneeId: input.assigneeId ? new Types.ObjectId(input.assigneeId) : undefined,
            contactId: input.contactId ? new Types.ObjectId(input.contactId) : undefined,
            companyId: input.companyId ? new Types.ObjectId(input.companyId) : undefined,
            opportunityId: input.opportunityId ? new Types.ObjectId(input.opportunityId) : undefined,
            reminders: input.reminders?.map(r => ({
                reminderAt: r.reminderAt,
                type: r.type || "in_app",
                sent: false,
            })) || [],
            isRecurring: input.isRecurring || false,
            recurrence: input.recurrence,
            tags: input.tags || [],
            estimatedMinutes: input.estimatedMinutes,
        });

        await task.save();
        return task;
    }

    /**
     * Get task by ID
     */
    async getTaskById(taskId: string, workspaceId: string): Promise<ITask | null> {
        return Task.findOne({
            _id: new Types.ObjectId(taskId),
            workspaceId: new Types.ObjectId(workspaceId),
        })
            .populate("assigneeId", "name email")
            .populate("contactId", "firstName lastName email")
            .populate("companyId", "name")
            .populate("opportunityId", "title");
    }

    /**
     * Get tasks with filters and pagination
     */
    async getTasks(
        workspaceId: string,
        filters: TaskFilters = {},
        options: PaginationOptions = {}
    ): Promise<{ tasks: ITask[]; total: number; page: number; totalPages: number }> {
        const { page = 1, limit = 20, sortBy = "dueDate", sortOrder = "asc" } = options;
        const skip = (page - 1) * limit;

        // Build query
        const query: any = {
            workspaceId: new Types.ObjectId(workspaceId),
        };

        // Status filter
        if (filters.status) {
            query.status = Array.isArray(filters.status)
                ? { $in: filters.status }
                : filters.status;
        }

        // Priority filter
        if (filters.priority) {
            query.priority = Array.isArray(filters.priority)
                ? { $in: filters.priority }
                : filters.priority;
        }

        // Assignee filter
        if (filters.assigneeId) {
            query.assigneeId = new Types.ObjectId(filters.assigneeId);
        }

        // Entity filters
        if (filters.contactId) {
            query.contactId = new Types.ObjectId(filters.contactId);
        }
        if (filters.companyId) {
            query.companyId = new Types.ObjectId(filters.companyId);
        }
        if (filters.opportunityId) {
            query.opportunityId = new Types.ObjectId(filters.opportunityId);
        }

        // Date filters
        if (filters.dueBefore || filters.dueAfter) {
            query.dueDate = {};
            if (filters.dueBefore) {
                query.dueDate.$lte = filters.dueBefore;
            }
            if (filters.dueAfter) {
                query.dueDate.$gte = filters.dueAfter;
            }
        }

        // Type filter
        if (filters.type) {
            query.type = filters.type;
        }

        // Text search
        if (filters.search) {
            query.$text = { $search: filters.search };
        }

        // Execute query
        const [tasks, total] = await Promise.all([
            Task.find(query)
                .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
                .skip(skip)
                .limit(limit)
                .populate("assigneeId", "name email")
                .populate("contactId", "firstName lastName email")
                .populate("companyId", "name")
                .populate("opportunityId", "title"),
            Task.countDocuments(query),
        ]);

        return {
            tasks,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Update a task
     */
    async updateTask(
        taskId: string,
        workspaceId: string,
        updates: UpdateTaskInput
    ): Promise<ITask | null> {
        const updateData: any = { ...updates };

        // Convert string IDs to ObjectIds
        if (updates.assigneeId) {
            updateData.assigneeId = new Types.ObjectId(updates.assigneeId);
        } else if (updates.assigneeId === null) {
            updateData.assigneeId = null;
        }

        if (updates.contactId) {
            updateData.contactId = new Types.ObjectId(updates.contactId);
        } else if (updates.contactId === null) {
            updateData.contactId = null;
        }

        if (updates.companyId) {
            updateData.companyId = new Types.ObjectId(updates.companyId);
        } else if (updates.companyId === null) {
            updateData.companyId = null;
        }

        if (updates.opportunityId) {
            updateData.opportunityId = new Types.ObjectId(updates.opportunityId);
        } else if (updates.opportunityId === null) {
            updateData.opportunityId = null;
        }

        return Task.findOneAndUpdate(
            {
                _id: new Types.ObjectId(taskId),
                workspaceId: new Types.ObjectId(workspaceId),
            },
            updateData,
            { new: true }
        )
            .populate("assigneeId", "name email")
            .populate("contactId", "firstName lastName email")
            .populate("companyId", "name")
            .populate("opportunityId", "title");
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string, workspaceId: string): Promise<boolean> {
        const result = await Task.deleteOne({
            _id: new Types.ObjectId(taskId),
            workspaceId: new Types.ObjectId(workspaceId),
        });
        return result.deletedCount === 1;
    }

    /**
     * Complete a task
     */
    async completeTask(
        taskId: string,
        workspaceId: string,
        actualMinutes?: number
    ): Promise<ITask | null> {
        return this.updateTask(taskId, workspaceId, {
            status: "completed",
            actualMinutes,
        });
    }

    /**
     * Get overdue tasks
     */
    async getOverdueTasks(workspaceId: string, assigneeId?: string): Promise<ITask[]> {
        const query: any = {
            workspaceId: new Types.ObjectId(workspaceId),
            status: { $in: ["pending", "in_progress"] },
            dueDate: { $lt: new Date() },
        };

        if (assigneeId) {
            query.assigneeId = new Types.ObjectId(assigneeId);
        }

        return Task.find(query)
            .sort({ dueDate: 1 })
            .populate("assigneeId", "name email")
            .populate("contactId", "firstName lastName email");
    }

    /**
     * Get tasks due today
     */
    async getTasksDueToday(workspaceId: string, assigneeId?: string): Promise<ITask[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const query: any = {
            workspaceId: new Types.ObjectId(workspaceId),
            status: { $in: ["pending", "in_progress"] },
            dueDate: { $gte: today, $lt: tomorrow },
        };

        if (assigneeId) {
            query.assigneeId = new Types.ObjectId(assigneeId);
        }

        return Task.find(query)
            .sort({ dueTime: 1, priority: -1 })
            .populate("assigneeId", "name email")
            .populate("contactId", "firstName lastName email");
    }

    /**
     * Get task counts by status for a workspace
     */
    async getTaskCounts(workspaceId: string, assigneeId?: string): Promise<Record<string, number>> {
        const match: any = { workspaceId: new Types.ObjectId(workspaceId) };
        if (assigneeId) {
            match.assigneeId = new Types.ObjectId(assigneeId);
        }

        const result = await Task.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const counts: Record<string, number> = {
            pending: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
            total: 0,
        };

        for (const item of result) {
            counts[item._id] = item.count;
            counts.total += item.count;
        }

        // Add overdue count
        const overdueCount = await Task.countDocuments({
            workspaceId: new Types.ObjectId(workspaceId),
            ...(assigneeId ? { assigneeId: new Types.ObjectId(assigneeId) } : {}),
            status: { $in: ["pending", "in_progress"] },
            dueDate: { $lt: new Date() },
        });
        counts.overdue = overdueCount;

        return counts;
    }

    /**
     * Process pending reminders (called by scheduler)
     */
    async processPendingReminders(): Promise<number> {
        const now = new Date();

        // Find tasks with pending reminders
        const tasks = await Task.find({
            "reminders.reminderAt": { $lte: now },
            "reminders.sent": false,
            status: { $in: ["pending", "in_progress"] },
        }).populate("assigneeId", "name email");

        let processedCount = 0;

        for (const task of tasks) {
            for (const reminder of task.reminders) {
                if (reminder.reminderAt <= now && !reminder.sent) {
                    // Create notification for assignee
                    if (task.assigneeId) {
                        try {
                            await Notification.create({
                                userId: task.assigneeId._id,
                                workspaceId: task.workspaceId,
                                type: "task_reminder",
                                title: "Task Reminder",
                                message: `Reminder: ${task.title}`,
                                actionUrl: `/projects/${task.workspaceId}/tasks?taskId=${task._id}`,
                                metadata: {
                                    taskId: task._id,
                                    taskTitle: task.title,
                                    dueDate: task.dueDate,
                                },
                            });
                        } catch (error) {
                            console.error("Failed to create task reminder notification:", error);
                        }
                    }

                    reminder.sent = true;
                    processedCount++;
                }
            }
            await task.save();
        }

        return processedCount;
    }

    /**
     * Create next recurring task instance
     */
    async createNextRecurringInstance(task: ITask): Promise<ITask | null> {
        if (!task.isRecurring || !task.recurrence) {
            return null;
        }

        const { frequency, interval, endDate, daysOfWeek } = task.recurrence;

        // Calculate next due date
        let nextDueDate = new Date(task.dueDate || new Date());

        switch (frequency) {
            case "daily":
                nextDueDate.setDate(nextDueDate.getDate() + interval);
                break;
            case "weekly":
                nextDueDate.setDate(nextDueDate.getDate() + (7 * interval));
                break;
            case "monthly":
                nextDueDate.setMonth(nextDueDate.getMonth() + interval);
                break;
            case "yearly":
                nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
                break;
        }

        // Check if past end date
        if (endDate && nextDueDate > endDate) {
            return null;
        }

        // Create new task instance
        const newTask = new Task({
            workspaceId: task.workspaceId,
            createdBy: task.createdBy,
            assigneeId: task.assigneeId,
            title: task.title,
            description: task.description,
            type: task.type,
            priority: task.priority,
            status: "pending",
            dueDate: nextDueDate,
            dueTime: task.dueTime,
            contactId: task.contactId,
            companyId: task.companyId,
            opportunityId: task.opportunityId,
            isRecurring: true,
            recurrence: task.recurrence,
            tags: task.tags,
            estimatedMinutes: task.estimatedMinutes,
        });

        await newTask.save();
        return newTask;
    }
}

export const taskService = new TaskService();
export default taskService;
