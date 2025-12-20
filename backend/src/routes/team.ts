import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import TeamMember, { Role, ROLE_PERMISSIONS } from "../models/TeamMember";
import User from "../models/User";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/permission";
import { z } from "zod";
import emailService from "../services/email";

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
// HELPER FUNCTIONS
// ============================================

const INVITE_EXPIRY_DAYS = 7;

function getInviteExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + INVITE_EXPIRY_DAYS);
    return expiryDate;
}

function isInviteExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
}

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
 * @desc    Invite a new team member (always requires explicit acceptance)
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

            // Check if already a member or has pending invite
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

            // Get workspace and inviter info for email
            const workspace = await Project.findById(workspaceId);
            const inviter = await User.findById(userId);

            if (!workspace || !inviter) {
                return res.status(400).json({ success: false, error: "Workspace or user not found" });
            }

            // Check if user exists (they still need to accept)
            const existingUser = await User.findOne({ email });

            // Generate invite token
            const inviteToken = crypto.randomBytes(32).toString("hex");

            // Always create as pending - users must explicitly accept
            const teamMember = await TeamMember.create({
                workspaceId,
                userId: existingUser?._id, // Link to existing user if they exist
                role,
                invitedBy: userId,
                invitedAt: new Date(),
                status: "pending", // Always pending until explicit acceptance
                inviteToken,
                inviteEmail: email,
                inviteExpiresAt: getInviteExpiryDate(),
            });

            // Send invite email
            try {
                await emailService.sendTeamInviteEmail(
                    email,
                    inviter.name,
                    workspace.name,
                    inviteToken
                );
                console.log(`✅ Team invite email sent to ${email}`);
            } catch (emailError: any) {
                console.error("Failed to send invite email:", emailError.message);
                // Don't fail the invite if email fails - just log it
            }

            res.status(201).json({
                success: true,
                message: "Invite sent successfully! They'll receive an email to accept.",
                data: { teamMember },
            });
        } catch (error: any) {
            console.error("Invite team member error:", error);
            res.status(500).json({ success: false, error: "Failed to invite team member." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/team/:memberId/resend
 * @desc    Resend invite email
 */
router.post(
    "/:workspaceId/team/:memberId/resend",
    authenticate,
    teamLimiter,
    requireRole("owner", "admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, memberId } = req.params;

            const teamMember = await TeamMember.findOne({
                _id: memberId,
                workspaceId,
                status: "pending",
            });

            if (!teamMember) {
                return res.status(404).json({
                    success: false,
                    error: "Pending invite not found"
                });
            }

            // Get workspace and inviter info
            const workspace = await Project.findById(workspaceId);
            const inviter = await User.findById(teamMember.invitedBy);

            if (!workspace || !inviter) {
                return res.status(400).json({ success: false, error: "Workspace or inviter not found" });
            }

            // Regenerate token and reset expiry
            const newToken = crypto.randomBytes(32).toString("hex");
            teamMember.inviteToken = newToken;
            teamMember.inviteExpiresAt = getInviteExpiryDate();
            teamMember.invitedAt = new Date();
            await teamMember.save();

            // Send new invite email
            await emailService.sendTeamInviteEmail(
                teamMember.inviteEmail!,
                inviter.name,
                workspace.name,
                newToken
            );

            res.json({
                success: true,
                message: "Invite resent successfully!",
            });
        } catch (error: any) {
            console.error("Resend invite error:", error);
            res.status(500).json({ success: false, error: "Failed to resend invite." });
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
 * @route   GET /api/team/invite/:token/validate
 * @desc    Validate invite token (public - no auth required)
 */
router.get(
    "/invite/:token/validate",
    async (req: AuthRequest, res: Response) => {
        try {
            const { token } = req.params;

            const teamMember = await TeamMember.findOne({
                inviteToken: token,
                status: "pending",
            }).populate("invitedBy", "name email");

            if (!teamMember) {
                return res.status(404).json({
                    success: false,
                    error: "Invalid invite link"
                });
            }

            // Check if invite is expired
            if (isInviteExpired(teamMember.inviteExpiresAt)) {
                return res.status(410).json({
                    success: false,
                    error: "This invite has expired. Please ask the team admin to resend the invitation."
                });
            }

            // Get workspace name
            const workspace = await Project.findById(teamMember.workspaceId);

            res.json({
                success: true,
                data: {
                    workspaceName: workspace?.name || "Unknown Workspace",
                    inviterName: (teamMember.invitedBy as any)?.name || "A team member",
                    email: teamMember.inviteEmail,
                    role: teamMember.role,
                    expiresAt: teamMember.inviteExpiresAt?.toISOString(),
                },
            });
        } catch (error: any) {
            console.error("Validate invite error:", error);
            res.status(500).json({ success: false, error: "Failed to validate invite." });
        }
    }
);

/**
 * @route   POST /api/team/accept/:token
 * @desc    Accept team invite (requires authentication)
 */
router.post(
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

            // Check if invite is expired
            if (isInviteExpired(teamMember.inviteExpiresAt)) {
                return res.status(410).json({
                    success: false,
                    error: "This invite has expired. Please ask the team admin to resend the invitation."
                });
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
            teamMember.inviteExpiresAt = undefined;
            await teamMember.save();

            // Get workspace name for response
            const workspace = await Project.findById(teamMember.workspaceId);

            res.json({
                success: true,
                message: `You've joined ${workspace?.name || "the workspace"}!`,
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

