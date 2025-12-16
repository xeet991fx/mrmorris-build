import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Role, { DEFAULT_ROLE_PERMISSIONS, RoleType } from "../models/Role";
import Team from "../models/Team";

/**
 * Permission Middleware
 * 
 * Checks if the authenticated user has the required permission
 * for the current workspace.
 */

export interface AuthRequest extends Request {
    user?: any; // User object from authentication
    workspaceRole?: RoleType;
    workspacePermissions?: string[];
}

/**
 * Get user's role and permissions for a workspace
 */
async function getUserWorkspacePermissions(
    userId: string,
    workspaceId: string
): Promise<{ role: RoleType; permissions: string[] }> {
    // Find user's team membership in this workspace
    const team = await Team.findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        "members.userId": new Types.ObjectId(userId),
    });

    if (!team) {
        // User not in any team - no access by default
        // For backwards compatibility, grant owner access to workspace creators
        // This should be updated once proper membership is established
        return { role: "viewer", permissions: DEFAULT_ROLE_PERMISSIONS.viewer };
    }

    // Find user's role in the team
    const member = team.members.find(
        (m) => m.userId.toString() === userId
    );

    if (!member) {
        return { role: "viewer", permissions: DEFAULT_ROLE_PERMISSIONS.viewer };
    }

    const role = member.role as RoleType;
    const permissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.viewer;

    return { role, permissions };
}

/**
 * Middleware factory to require specific permission
 */
export function requirePermission(requiredPermission: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id || req.user?._id?.toString();
            const workspaceId = req.params.workspaceId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
            }

            if (!workspaceId) {
                return res.status(400).json({
                    success: false,
                    error: "Workspace ID is required",
                });
            }

            // Get user's permissions for this workspace
            const { role, permissions } = await getUserWorkspacePermissions(userId, workspaceId);

            // Store on request for later use
            req.workspaceRole = role;
            req.workspacePermissions = permissions;

            // Check if user has required permission
            if (!hasPermission(permissions, requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have permission to perform this action",
                    requiredPermission,
                });
            }

            next();
        } catch (error: any) {
            console.error("Permission check error:", error);
            res.status(500).json({
                success: false,
                error: "Permission check failed",
            });
        }
    };
}

/**
 * Check if permissions array includes required permission
 */
export function hasPermission(permissions: string[], required: string): boolean {
    // Check exact match
    if (permissions.includes(required)) return true;

    // Check if they have manage permission for the category (implies all actions)
    const [category] = required.split(":");
    if (permissions.includes(`${category}:manage`)) return true;

    return false;
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: RoleType[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id || req.user?._id?.toString();
            const workspaceId = req.params.workspaceId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
            }

            if (!workspaceId) {
                return res.status(400).json({
                    success: false,
                    error: "Workspace ID is required",
                });
            }

            const { role, permissions } = await getUserWorkspacePermissions(userId, workspaceId);

            req.workspaceRole = role;
            req.workspacePermissions = permissions;

            if (!allowedRoles.includes(role)) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have the required role to perform this action",
                    requiredRoles: allowedRoles,
                    yourRole: role,
                });
            }

            next();
        } catch (error: any) {
            console.error("Role check error:", error);
            res.status(500).json({
                success: false,
                error: "Role check failed",
            });
        }
    };
}

/**
 * Middleware to load permissions (optional - doesn't block)
 */
export async function loadPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id || req.user?._id?.toString();
        const workspaceId = req.params.workspaceId;

        if (userId && workspaceId) {
            const { role, permissions } = await getUserWorkspacePermissions(userId, workspaceId);
            req.workspaceRole = role;
            req.workspacePermissions = permissions;
        }

        next();
    } catch (error) {
        // Don't block, just continue without permissions
        next();
    }
}
