import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export interface ITask extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
    reminderDate?: Date;

    // Related entities
    relatedContactId?: Types.ObjectId;
    relatedCompanyId?: Types.ObjectId;
    relatedOpportunityId?: Types.ObjectId;

    // Assignment
    assignedTo?: Types.ObjectId;
    createdBy: Types.ObjectId;

    // Metadata
    tags?: string[];
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const taskSchema = new Schema<ITask>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 5000,
        },
        status: {
            type: String,
            enum: ["todo", "in_progress", "completed", "cancelled"],
            default: "todo",
            index: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
            index: true,
        },
        dueDate: {
            type: Date,
            index: true,
        },
        reminderDate: {
            type: Date,
        },
        relatedContactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
        },
        relatedCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
        },
        relatedOpportunityId: {
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
taskSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });
taskSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
taskSchema.index({ workspaceId: 1, priority: 1, status: 1 });

// ============================================
// MODEL
// ============================================

const Task = mongoose.model<ITask>("Task", taskSchema);
export default Task;
