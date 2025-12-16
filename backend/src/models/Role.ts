import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Role Model
 * 
 * Defines permissions for different user roles.
 * Permissions are granular and can be combined.
 */

// Permission categories
export type PermissionCategory =
    | "contacts"
    | "companies"
    | "opportunities"
    | "tasks"
    | "workflows"
    | "campaigns"
    | "reports"
    | "settings"
    | "team"
    | "billing";

// Permission actions
export type PermissionAction = "read" | "write" | "delete" | "manage";

// Full permission string format: "category:action"
export type Permission = `${PermissionCategory}:${PermissionAction}`;

// Built-in role types
export type RoleType = "owner" | "admin" | "manager" | "sales_rep" | "viewer" | "custom";

export interface IRole extends Document {
    workspaceId?: Types.ObjectId; // null for system roles
    name: string;
    description?: string;
    type: RoleType;
    permissions: string[]; // Array of permission strings
    isSystem: boolean; // System roles cannot be modified
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, string[]> = {
    owner: [
        "contacts:read", "contacts:write", "contacts:delete", "contacts:manage",
        "companies:read", "companies:write", "companies:delete", "companies:manage",
        "opportunities:read", "opportunities:write", "opportunities:delete", "opportunities:manage",
        "tasks:read", "tasks:write", "tasks:delete", "tasks:manage",
        "workflows:read", "workflows:write", "workflows:delete", "workflows:manage",
        "campaigns:read", "campaigns:write", "campaigns:delete", "campaigns:manage",
        "reports:read", "reports:write", "reports:delete", "reports:manage",
        "settings:read", "settings:write", "settings:delete", "settings:manage",
        "team:read", "team:write", "team:delete", "team:manage",
        "billing:read", "billing:write", "billing:delete", "billing:manage",
    ],
    admin: [
        "contacts:read", "contacts:write", "contacts:delete", "contacts:manage",
        "companies:read", "companies:write", "companies:delete", "companies:manage",
        "opportunities:read", "opportunities:write", "opportunities:delete", "opportunities:manage",
        "tasks:read", "tasks:write", "tasks:delete", "tasks:manage",
        "workflows:read", "workflows:write", "workflows:delete", "workflows:manage",
        "campaigns:read", "campaigns:write", "campaigns:delete", "campaigns:manage",
        "reports:read", "reports:write", "reports:delete", "reports:manage",
        "settings:read", "settings:write",
        "team:read", "team:write", "team:manage",
    ],
    manager: [
        "contacts:read", "contacts:write", "contacts:delete",
        "companies:read", "companies:write", "companies:delete",
        "opportunities:read", "opportunities:write", "opportunities:delete",
        "tasks:read", "tasks:write", "tasks:delete", "tasks:manage",
        "workflows:read", "workflows:write",
        "campaigns:read", "campaigns:write",
        "reports:read", "reports:write",
        "team:read",
    ],
    sales_rep: [
        "contacts:read", "contacts:write",
        "companies:read", "companies:write",
        "opportunities:read", "opportunities:write",
        "tasks:read", "tasks:write",
        "workflows:read",
        "campaigns:read",
        "reports:read",
    ],
    viewer: [
        "contacts:read",
        "companies:read",
        "opportunities:read",
        "tasks:read",
        "workflows:read",
        "campaigns:read",
        "reports:read",
    ],
    custom: [],
};

const roleSchema = new Schema<IRole>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            index: true,
        },
        name: {
            type: String,
            required: [true, "Role name is required"],
            trim: true,
            maxlength: [50, "Role name must be less than 50 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [200, "Description must be less than 200 characters"],
        },
        type: {
            type: String,
            enum: ["owner", "admin", "manager", "sales_rep", "viewer", "custom"],
            required: true,
        },
        permissions: [{
            type: String,
            validate: {
                validator: function (v: string) {
                    return /^[a-z_]+:[a-z]+$/.test(v);
                },
                message: "Permission must be in format 'category:action'",
            },
        }],
        isSystem: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
roleSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
roleSchema.index({ type: 1 });

// Static method to check permission
roleSchema.statics.hasPermission = function (permissions: string[], required: string): boolean {
    // Owner has all permissions
    if (permissions.includes("*")) return true;

    // Check exact match
    if (permissions.includes(required)) return true;

    // Check if they have manage permission for the category (implies all actions)
    const [category] = required.split(":");
    if (permissions.includes(`${category}:manage`)) return true;

    return false;
};

const Role = mongoose.model<IRole>("Role", roleSchema);

export default Role;
