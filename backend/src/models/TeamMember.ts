import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export type Role = "owner" | "admin" | "member" | "viewer";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
    owner: [
        "workspace:manage",
        "team:manage",
        "contacts:all",
        "companies:all",
        "deals:all",
        "workflows:all",
        "campaigns:all",
        "tasks:all",
        "settings:all",
        "billing:manage",
        "integrations:manage",
    ],
    admin: [
        "team:view",
        "team:invite",
        "contacts:all",
        "companies:all",
        "deals:all",
        "workflows:all",
        "campaigns:all",
        "tasks:all",
        "settings:view",
        "integrations:manage",
    ],
    member: [
        "team:view",
        "contacts:view",
        "contacts:create",
        "contacts:edit",
        "companies:view",
        "companies:create",
        "companies:edit",
        "deals:view",
        "deals:create",
        "deals:edit",
        "workflows:view",
        "campaigns:view",
        "tasks:all",
    ],
    viewer: [
        "team:view",
        "contacts:view",
        "companies:view",
        "deals:view",
        "workflows:view",
        "campaigns:view",
        "tasks:view",
    ],
};

// ============================================
// INTERFACES
// ============================================

export interface ITeamMember extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    role: Role;
    invitedBy?: Types.ObjectId;
    invitedAt?: Date;
    joinedAt?: Date;
    status: "pending" | "active" | "removed";
    inviteToken?: string;
    inviteEmail?: string; // For pending invites
    inviteExpiresAt?: Date; // 7-day expiry for invites
    permissions?: string[]; // Custom permissions override
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const teamMemberSchema = new Schema<ITeamMember>(
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
            sparse: true, // Can be null for pending invites
            index: true,
        },
        role: {
            type: String,
            enum: ["owner", "admin", "member", "viewer"],
            default: "member",
            index: true,
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        invitedAt: {
            type: Date,
            default: Date.now,
        },
        joinedAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["pending", "active", "removed"],
            default: "pending",
            index: true,
        },
        inviteToken: {
            type: String,
            sparse: true,
        },
        inviteEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        inviteExpiresAt: {
            type: Date,
        },
        permissions: [{
            type: String,
        }],
    },
    {
        timestamps: true,
    }
);

// Compound indexes
teamMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true, sparse: true });
teamMemberSchema.index({ workspaceId: 1, status: 1 });

// ============================================
// HELPER METHODS
// ============================================

teamMemberSchema.methods.hasPermission = function (permission: string): boolean {
    const member = this as ITeamMember;

    // Check custom permissions first
    if (member.permissions && member.permissions.includes(permission)) {
        return true;
    }

    // Check role-based permissions
    const rolePerms = ROLE_PERMISSIONS[member.role] || [];

    // Check exact match
    if (rolePerms.includes(permission)) {
        return true;
    }

    // Check wildcard permissions (e.g., "contacts:all" covers "contacts:view")
    const [resource, action] = permission.split(":");
    if (rolePerms.includes(`${resource}:all`)) {
        return true;
    }

    return false;
};

// ============================================
// MODEL
// ============================================

const TeamMember = mongoose.model<ITeamMember>("TeamMember", teamMemberSchema);
export default TeamMember;
