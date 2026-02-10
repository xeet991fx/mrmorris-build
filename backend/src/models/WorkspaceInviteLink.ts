import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export interface IWorkspaceInviteLink extends Document {
    workspaceId: Types.ObjectId;
    token: string;
    role: "member" | "viewer";
    createdBy: Types.ObjectId;
    isActive: boolean;
    expiresAt?: Date;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const workspaceInviteLinkSchema = new Schema<IWorkspaceInviteLink>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["member", "viewer"],
            default: "member",
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
        },
        usageCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Only one active link per workspace
workspaceInviteLinkSchema.index(
    { workspaceId: 1, isActive: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

// ============================================
// MODEL
// ============================================

const WorkspaceInviteLink = mongoose.model<IWorkspaceInviteLink>(
    "WorkspaceInviteLink",
    workspaceInviteLinkSchema
);

export default WorkspaceInviteLink;
