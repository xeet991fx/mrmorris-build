import express, { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import { requireRole, requirePermission } from "../middleware/permission";
import Team from "../models/Team";
import User from "../models/User";
import { DEFAULT_ROLE_PERMISSIONS, RoleType } from "../models/Role";

const router: Router = express.Router();

/**
 * Team Routes
 * 
 * Team and member management
 * Base path: /api/workspaces/:workspaceId/team
 */

// Get teams in workspace
router.get(
    "/:workspaceId/teams",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const teams = await Team.find({
                workspaceId: new Types.ObjectId(workspaceId),
            })
                .populate("members.userId", "name email profilePicture")
                .populate("createdBy", "name email");

            res.json({
                success: true,
                data: teams,
            });
        } catch (error: any) {
            console.error("Error getting teams:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get teams",
            });
        }
    }
);

// Get single team
router.get(
    "/:workspaceId/teams/:teamId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, teamId } = req.params;

            const team = await Team.findOne({
                _id: new Types.ObjectId(teamId),
                workspaceId: new Types.ObjectId(workspaceId),
            })
                .populate("members.userId", "name email profilePicture")
                .populate("createdBy", "name email");

            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: "Team not found",
                });
            }

            res.json({
                success: true,
                data: team,
            });
        } catch (error: any) {
            console.error("Error getting team:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get team",
            });
        }
    }
);

// Create team
router.post(
    "/:workspaceId/teams",
    authenticate,
    requirePermission("team:write"),
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: "Team name is required",
                });
            }

            // Check if team with same name exists
            const existing = await Team.findOne({
                workspaceId: new Types.ObjectId(workspaceId),
                name,
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: "A team with this name already exists",
                });
            }

            const team = new Team({
                workspaceId: new Types.ObjectId(workspaceId),
                name,
                description,
                createdBy: new Types.ObjectId(userId),
                members: [{
                    userId: new Types.ObjectId(userId),
                    role: "owner",
                    joinedAt: new Date(),
                }],
            });

            await team.save();
            await team.populate("members.userId", "name email profilePicture");

            res.status(201).json({
                success: true,
                data: team,
                message: "Team created successfully",
            });
        } catch (error: any) {
            console.error("Error creating team:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create team",
            });
        }
    }
);

// Update team
router.put(
    "/:workspaceId/teams/:teamId",
    authenticate,
    requirePermission("team:write"),
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, teamId } = req.params;
            const { name, description } = req.body;

            const team = await Team.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(teamId),
                    workspaceId: new Types.ObjectId(workspaceId),
                },
                { name, description },
                { new: true }
            ).populate("members.userId", "name email profilePicture");

            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: "Team not found",
                });
            }

            res.json({
                success: true,
                data: team,
                message: "Team updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating team:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update team",
            });
        }
    }
);

// Delete team
router.delete(
    "/:workspaceId/teams/:teamId",
    authenticate,
    requirePermission("team:delete"),
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, teamId } = req.params;

            const team = await Team.findOne({
                _id: new Types.ObjectId(teamId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: "Team not found",
                });
            }

            if (team.isDefault) {
                return res.status(400).json({
                    success: false,
                    error: "Cannot delete the default team",
                });
            }

            await Team.deleteOne({ _id: team._id });

            res.json({
                success: true,
                message: "Team deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting team:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete team",
            });
        }
    }
);

// Add member to team
router.post(
    "/:workspaceId/teams/:teamId/members",
    authenticate,
    requirePermission("team:manage"),
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, teamId } = req.params;
            const { userId, role = "member" } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: "User ID is required",
                });
            }

            // Verify user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }

            const team = await Team.findOne({
                _id: new Types.ObjectId(teamId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: "Team not found",
                });
            }

            // Check if user already in team
            const existingMember = team.members.find(
                (m) => m.userId.toString() === userId
            );

            if (existingMember) {
                return res.status(400).json({
                    success: false,
                    error: "User is already a member of this team",
                });
            }

            team.members.push({
                userId: new Types.ObjectId(userId),
                role: role as "owner" | "admin" | "manager" | "member",
                joinedAt: new Date(),
            });

            await team.save();
            await team.populate("members.userId", "name email profilePicture");

            res.json({
                success: true,
                data: team,
                message: "Member added successfully",
            });
        } catch (error: any) {
            console.error("Error adding member:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to add member",
            });
        }
    }
);

// Update member role
router.put(
    "/:workspaceId/teams/:teamId/members/:memberId",
    authenticate,
    requirePermission("team:manage"),
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, teamId, memberId } = req.params;
            const { role } = req.body;

            if (!role) {
                return res.status(400).json({
                    success: false,
                    error: "Role is required",
                });
            }

            const team = await Team.findOne({
                _id: new Types.ObjectId(teamId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: "Team not found",
                });
            }

            const member = team.members.find(
                (m) => m.userId.toString() === memberId
            );

            if (!member) {
                return res.status(404).json({
                    success: false,
                    error: "Member not found in team",
                });
            }

            // Cannot change owner role
            if (member.role === "owner") {
                return res.status(400).json({
                    success: false,
                    error: "Cannot change the owner's role",
                });
            }

            member.role = role;
            await team.save();
            await team.populate("members.userId", "name email profilePicture");

            res.json({
                success: true,
                data: team,
                message: "Member role updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating member role:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update member role",
            });
        }
    }
);

// Remove member from team
router.delete(
    "/:workspaceId/teams/:teamId/members/:memberId",
    authenticate,
    requirePermission("team:manage"),
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, teamId, memberId } = req.params;

            const team = await Team.findOne({
                _id: new Types.ObjectId(teamId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: "Team not found",
                });
            }

            const memberIndex = team.members.findIndex(
                (m) => m.userId.toString() === memberId
            );

            if (memberIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: "Member not found in team",
                });
            }

            // Cannot remove owner
            if (team.members[memberIndex].role === "owner") {
                return res.status(400).json({
                    success: false,
                    error: "Cannot remove the team owner",
                });
            }

            team.members.splice(memberIndex, 1);
            await team.save();

            res.json({
                success: true,
                message: "Member removed successfully",
            });
        } catch (error: any) {
            console.error("Error removing member:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to remove member",
            });
        }
    }
);

// Get available roles and permissions
router.get(
    "/:workspaceId/roles",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const roles = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([type, permissions]) => ({
                type,
                name: type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
                permissions,
            }));

            res.json({
                success: true,
                data: roles,
            });
        } catch (error: any) {
            console.error("Error getting roles:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get roles",
            });
        }
    }
);

export default router;
