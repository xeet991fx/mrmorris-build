import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Task Model
 * 
 * Comprehensive task management for CRM activities.
 * Tasks can be linked to contacts, companies, or opportunities.
 */

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType = "call" | "email" | "meeting" | "follow_up" | "review" | "other";

export interface ITaskReminder {
    reminderAt: Date;
    sent: boolean;
    type: "email" | "in_app" | "both";
}

export interface ITask extends Document {
    workspaceId: Types.ObjectId;
    createdBy: Types.ObjectId;
    assigneeId?: Types.ObjectId;

    // Core fields
    title: string;
    description?: string;
    type: TaskType;
    status: TaskStatus;
    priority: TaskPriority;

    // Due date and time
    dueDate?: Date;
    dueTime?: string; // "14:00" format
    completedAt?: Date;

    // Entity linking (can link to multiple)
    contactId?: Types.ObjectId;
    companyId?: Types.ObjectId;
    opportunityId?: Types.ObjectId;

    // Reminders
    reminders: ITaskReminder[];

    // Recurrence
    isRecurring: boolean;
    recurrence?: {
        frequency: "daily" | "weekly" | "monthly" | "yearly";
        interval: number; // every X days/weeks/etc
        endDate?: Date;
        daysOfWeek?: number[]; // 0-6 for weekly
    };

    // Notes and attachments
    notes?: string;
    attachmentIds?: Types.ObjectId[];

    // Metadata
    tags?: string[];
    estimatedMinutes?: number;
    actualMinutes?: number;

    createdAt: Date;
    updatedAt: Date;
}

const taskReminderSchema = new Schema<ITaskReminder>(
    {
        reminderAt: { type: Date, required: true },
        sent: { type: Boolean, default: false },
        type: {
            type: String,
            enum: ["email", "in_app", "both"],
            default: "in_app",
        },
    },
    { _id: false }
);

const taskSchema = new Schema<ITask>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Creator ID is required"],
        },
        assigneeId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        // Core fields
        title: {
            type: String,
            required: [true, "Task title is required"],
            trim: true,
            maxlength: [200, "Title must be less than 200 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, "Description must be less than 2000 characters"],
        },
        type: {
            type: String,
            enum: ["call", "email", "meeting", "follow_up", "review", "other"],
            default: "other",
        },
        status: {
            type: String,
            enum: ["pending", "in_progress", "completed", "cancelled"],
            default: "pending",
            index: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },

        // Due date
        dueDate: {
            type: Date,
            index: true,
        },
        dueTime: {
            type: String, // "14:00" format
        },
        completedAt: {
            type: Date,
        },

        // Entity linking
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            index: true,
        },
        opportunityId: {
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
            index: true,
        },

        // Reminders
        reminders: {
            type: [taskReminderSchema],
            default: [],
        },

        // Recurrence
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurrence: {
            frequency: {
                type: String,
                enum: ["daily", "weekly", "monthly", "yearly"],
            },
            interval: {
                type: Number,
                min: 1,
                default: 1,
            },
            endDate: Date,
            daysOfWeek: [Number],
        },

        // Notes
        notes: {
            type: String,
            maxlength: [5000, "Notes must be less than 5000 characters"],
        },
        attachmentIds: [{
            type: Schema.Types.ObjectId,
            ref: "Attachment",
        }],

        // Metadata
        tags: [{ type: String }],
        estimatedMinutes: {
            type: Number,
            min: 0,
        },
        actualMinutes: {
            type: Number,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
taskSchema.index({ workspaceId: 1, assigneeId: 1, status: 1 }); // My tasks
taskSchema.index({ workspaceId: 1, dueDate: 1, status: 1 }); // Due soon
taskSchema.index({ workspaceId: 1, contactId: 1 }); // Contact tasks
taskSchema.index({ workspaceId: 1, opportunityId: 1 }); // Deal tasks
taskSchema.index({ workspaceId: 1, createdAt: -1 }); // Recent tasks
taskSchema.index({ "reminders.reminderAt": 1, "reminders.sent": 1 }); // Pending reminders

// Text index for search
taskSchema.index({
    title: "text",
    description: "text",
    notes: "text",
});

// Pre-save hook to set completedAt
taskSchema.pre("save", function (next) {
    if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

const Task = mongoose.model<ITask>("Task", taskSchema);

export default Task;
