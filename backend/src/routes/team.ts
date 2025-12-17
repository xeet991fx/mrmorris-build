import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import TeamMember, { Role, ROLE_PERMISSIONS } from "../models/TeamMember";
import User from "../models/User";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/permission";
import { z } from "zod";

const router = express.Router();

const teamLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const inviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member", "viewer"]),
});

const updateRoleSchema = z.object({
    role: z.enum(["admin", "member", "viewer"]),
});

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/team
 * @desc    Get all team members for a workspace
 */
router.get(
    "/:workspaceId/team",
    authenticate,
    teamLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            // Check workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ success: false, error: "Workspace not found" });
            }

            const isOwner = workspace.userId.toString() === userId;

            // Get team members
            const teamMembers = await TeamMember.find({
                workspaceId,
                status: { $ne: "removed" }
            })
                .populate("userId", "name email profilePicture")
                .populate("invitedBy", "name email")
                .sort({ role: 1, createdAt: -1 });

            // Add owner to list
            const owner = await User.findById(workspace.userId).select("name email profilePicture");

            res.json({
                success: true,
                data: {
                    owner: {
                        _id: owner?._id,
                        name: owner?.name,
                        email: owner?.email,
                        profilePicture: owner?.profilePicture,
                        role: "owner",
                        status: "active",
                    },
                    members: teamMembers,
                    isOwner,
                    currentUserRole: isOwner ? "owner" : (
                        teamMembers.find(m => m.userId && (m.userId as any)._id.toString() === userId)?.role || null
                    ),
                },
            });
        } catch (error: any) {
            console.error("Get team error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch team." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/team/invite
 * @desc    Invite a new team member
 */
router.post(
    "/:workspaceId/team/invite",
    authenticate,
    teamLimiter,
    requireRole("owner", "admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            const result = inviteSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            const { email, role } = result.data;

            // Check if already a member
            const existingMember = await TeamMember.findOne({
                workspaceId,
                $or: [
                    { inviteEmail: email },
                    { userId: { $exists: true } }
                ],
                status: { $ne: "removed" },
            }).populate("userId", "email");

            if (existingMember) {
                const memberEmail = (existingMember.userId as any)?.email || existingMember.inviteEmail;
                if (memberEmail === email) {
                    return res.status(400).json({
                        success: false,
                        error: "User is already a team member or has a pending invite"
                    });
                }
            }

            // Check if user exists
            const existingUser = await User.findOne({ email });

            // Generate invite token
            const inviteToken = crypto.randomBytes(32).toString("hex");

            const teamMember = await TeamMember.create({
                workspaceId,
                userId: existingUser?._id,
                role,
                invitedBy: userId,
                invitedAt: new Date(),
                status: existingUser ? "active" : "pending",
                joinedAt: existingUser ? new Date() : undefined,
                inviteToken: existingUser ? undefined : inviteToken,
                inviteEmail: email,
            });

            // TODO: Send invite email

            res.status(201).json({
                success: true,
                message: existingUser
                    ? "Team member added successfully!"
                    : "Invite sent successfully!",
                data: { teamMember },
            });
        } catch (error: any) {
            console.error("Invite team member error:", error);
            res.status(500).json({ success: false, error: "Failed to invite team member." });
        }
    }
);

/**
 * @route   PUT /api/workspaces/:workspaceId/team/:memberId/role
 * @desc    Update team member role
 */
router.put(
    "/:workspaceId/team/:memberId/role",
    authenticate,
    teamLimiter,
    requireRole("owner", "admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, memberId } = req.params;

            const result = updateRoleSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                });
            }

            const teamMember = await TeamMember.findOneAndUpdate(
                { _id: memberId, workspaceId },
                { role: result.data.role },
                { new: true }
            ).populate("userId", "name email profilePicture");

            if (!teamMember) {
                return res.status(404).json({ success: false, error: "Team member not found" });
            }

            res.json({
                success: true,
                message: "Role updated successfully!",
                data: { teamMember },
            });
        } catch (error: any) {
            console.error("Update role error:", error);
            res.status(500).json({ success: false, error: "Failed to update role." });
        }
    }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/team/:memberId
 * @desc    Remove team member
 */
router.delete(
    "/:workspaceId/team/:memberId",
    authenticate,
    teamLimiter,
    requireRole("owner", "admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, memberId } = req.params;

            const teamMember = await TeamMember.findOneAndUpdate(
                { _id: memberId, workspaceId },
                { status: "removed" },
                { new: true }
            );

            if (!teamMember) {
                return res.status(404).json({ success: false, error: "Team member not found" });
            }

            res.json({ success: true, message: "Team member removed." });
        } catch (error: any) {
            console.error("Remove team member error:", error);
            res.status(500).json({ success: false, error: "Failed to remove team member." });
        }
    }
);

/**
 * @route   GET /api/team/accept/:token
 * @desc    Accept team invite
 */
router.get(
    "/accept/:token",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { token } = req.params;
            const userId = (req.user?._id as any).toString();

            const teamMember = await TeamMember.findOne({
                inviteToken: token,
                status: "pending",
            });

            if (!teamMember) {
                return res.status(404).json({ success: false, error: "Invalid or expired invite" });
            }

            // Verify email matches
            const user = await User.findById(userId);
            if (user?.email !== teamMember.inviteEmail) {
                return res.status(403).json({
                    success: false,
                    error: "This invite was sent to a different email address"
                });
            }

            // Accept invite
            teamMember.userId = user?._id as any;
            teamMember.status = "active";
            teamMember.joinedAt = new Date();
            teamMember.inviteToken = undefined;
            await teamMember.save();

            res.json({
                success: true,
                message: "You've joined the team!",
                data: { workspaceId: teamMember.workspaceId },
            });
        } catch (error: any) {
            console.error("Accept invite error:", error);
            res.status(500).json({ success: false, error: "Failed to accept invite." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/team/permissions
 * @desc    Get permission definitions
 */
router.get(
    "/:workspaceId/team/permissions",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        res.json({
            success: true,
            data: { permissions: ROLE_PERMISSIONS },
        });
    }
);

export default router;
