import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import TeamMember, { Role, ROLE_PERMISSIONS } from "../models/TeamMember";
import Project from "../models/Project";

// ============================================
// PERMISSION CHECK MIDDLEWARE
// ============================================

/**
 * Check if user has required permission for the workspace
 */
export function requirePermission(permission: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = (req.user?._id as any)?.toString();
            const workspaceId = req.params.workspaceId || req.params.id;

            if (!userId) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            if (!workspaceId) {
                return res.status(400).json({ success: false, error: "Workspace ID required" });
            }

            // Check if user is workspace owner (legacy - owner has all permissions)
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ success: false, error: "Workspace not found" });
            }

            // Workspace creator has owner permissions
            if (workspace.userId.toString() === userId) {
                return next();
            }

            // Check team membership
            const teamMember = await TeamMember.findOne({
                workspaceId,
                userId,
                status: "active",
            });

            if (!teamMember) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have access to this workspace"
                });
            }

            // Check permission
            const hasPermission = checkPermission(teamMember.role, permission, teamMember.permissions);

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: `Permission denied: ${permission}`
                });
            }

            // Attach team member info to request
            (req as any).teamMember = teamMember;
            next();
        } catch (error: any) {
            console.error("Permission check error:", error);
            res.status(500).json({ success: false, error: "Permission check failed" });
        }
    };
}

/**
 * Check if role has permission
 */
export function checkPermission(
    role: Role,
    permission: string,
    customPermissions?: string[]
): boolean {
    // Check custom permissions first
    if (customPermissions && customPermissions.includes(permission)) {
        return true;
    }

    // Check role-based permissions
    const rolePerms = ROLE_PERMISSIONS[role] || [];

    // Check exact match
    if (rolePerms.includes(permission)) {
        return true;
    }

    // Check wildcard permissions (e.g., "contacts:all" covers "contacts:view")
    const [resource] = permission.split(":");
    if (rolePerms.includes(`${resource}:all`)) {
        return true;
    }

    return false;
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: Role[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = (req.user?._id as any)?.toString();
            const workspaceId = req.params.workspaceId || req.params.id;

            if (!userId || !workspaceId) {
                return res.status(401).json({ success: false, error: "Unauthorized" });
            }

            // Check if user is workspace owner
            const workspace = await Project.findById(workspaceId);
            if (workspace && workspace.userId.toString() === userId) {
                if (roles.includes("owner")) {
                    return next();
                }
            }

            // Check team membership
            const teamMember = await TeamMember.findOne({
                workspaceId,
                userId,
                status: "active",
            });

            if (!teamMember || !roles.includes(teamMember.role)) {
                return res.status(403).json({
                    success: false,
                    error: `Requires role: ${roles.join(" or ")}`
                });
            }

            (req as any).teamMember = teamMember;
            next();
        } catch (error: any) {
            console.error("Role check error:", error);
            res.status(500).json({ success: false, error: "Role check failed" });
        }
    };
}

/**
 * Get user's role in workspace
 */
export async function getUserRole(userId: string, workspaceId: string): Promise<Role | null> {
    // Check if workspace owner
    const workspace = await Project.findById(workspaceId);
    if (workspace && workspace.userId.toString() === userId) {
        return "owner";
    }

    // Check team membership
    const teamMember = await TeamMember.findOne({
        workspaceId,
        userId,
        status: "active",
    });

    return teamMember?.role || null;
}
