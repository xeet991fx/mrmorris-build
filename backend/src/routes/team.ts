import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import TeamMember, { Role, ROLE_PERMISSIONS } from "../models/TeamMember";
import WorkspaceInviteLink from "../models/WorkspaceInviteLink";
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

            // Get workspace and inviter info for email
            const workspace = await Project.findById(workspaceId);
            const inviter = await User.findById(userId);

            if (!workspace || !inviter) {
                return res.status(400).json({ success: false, error: "Workspace or user not found" });
            }

            // Check if user exists (they still need to accept)
            const existingUser = await User.findOne({ email });

            // Check for ANY existing record (including removed ones) to handle unique index
            const existingMember = await TeamMember.findOne({
                workspaceId,
                $or: [
                    { inviteEmail: email },
                    ...(existingUser ? [{ userId: existingUser._id }] : [])
                ],
            }).populate("userId", "email");

            // Generate invite token
            const inviteToken = crypto.randomBytes(32).toString("hex");

            let teamMember;

            if (existingMember) {
                const memberEmail = (existingMember.userId as any)?.email || existingMember.inviteEmail;

                // If the member was removed, we can re-invite them
                if (existingMember.status === "removed") {
                    // Reactivate the removed member as a new pending invite
                    existingMember.role = role;
                    existingMember.status = "pending";
                    existingMember.invitedBy = userId as any;
                    existingMember.invitedAt = new Date();
                    existingMember.inviteToken = inviteToken;
                    existingMember.inviteEmail = email;
                    existingMember.inviteExpiresAt = getInviteExpiryDate();
                    existingMember.joinedAt = undefined;
                    await existingMember.save();
                    teamMember = existingMember;
                } else if (memberEmail === email) {
                    // Active or pending member with same email
                    return res.status(400).json({
                        success: false,
                        error: "User is already a team member or has a pending invite"
                    });
                }
            }

            // Only create new record if no existing record was found/reactivated
            if (!teamMember) {
                teamMember = await TeamMember.create({
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
            }

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
                message: existingUser
                    ? "Invite sent successfully! They'll receive an email to accept."
                    : "Invite sent! This email isn't registered on Clianta yet — they'll need to create an account to accept.",
                data: { teamMember, userExists: !!existingUser },
            });
        } catch (error: any) {
            console.error("Invite team member error:", error);
            res.status(500).json({ success: false, error: "Failed to invite team member." });
        }
    }
);


// ============================================
// SHAREABLE INVITE LINK ROUTES
// ============================================

const inviteLinkSchema = z.object({
    role: z.enum(["member", "viewer"]).default("member"),
});

/**
 * @route   POST /api/workspaces/:workspaceId/team/invite-link
 * @desc    Generate a shareable invite link for the workspace
 */
router.post(
    "/:workspaceId/team/invite-link",
    authenticate,
    teamLimiter,
    requireRole("owner", "admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            const result = inviteLinkSchema.safeParse(req.body);
            const role = result.success ? result.data.role : "member";

            // Check if there's already an active link
            const existingLink = await WorkspaceInviteLink.findOne({
                workspaceId,
                isActive: true,
            });

            if (existingLink) {
                // Update role if different
                if (existingLink.role !== role) {
                    existingLink.role = role;
                    await existingLink.save();
                }

                const inviteUrl = `${process.env.FRONTEND_URL}/join/${existingLink.token}`;
                return res.json({
                    success: true,
                    data: {
                        token: existingLink.token,
                        url: inviteUrl,
                        role: existingLink.role,
                        usageCount: existingLink.usageCount,
                        createdAt: existingLink.createdAt,
                    },
                });
            }

            // Generate new invite link
            const token = crypto.randomBytes(24).toString("hex");
            const inviteLink = await WorkspaceInviteLink.create({
                workspaceId,
                token,
                role,
                createdBy: userId,
                isActive: true,
            });

            const inviteUrl = `${process.env.FRONTEND_URL}/join/${token}`;

            res.status(201).json({
                success: true,
                message: "Invite link created!",
                data: {
                    token: inviteLink.token,
                    url: inviteUrl,
                    role: inviteLink.role,
                    usageCount: 0,
                    createdAt: inviteLink.createdAt,
                },
            });
        } catch (error: any) {
            console.error("Generate invite link error:", error);
            res.status(500).json({ success: false, error: "Failed to generate invite link." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/team/invite-link
 * @desc    Get current active invite link
 */
router.get(
    "/:workspaceId/team/invite-link",
    authenticate,
    teamLimiter,
    requireRole("owner", "admin"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const inviteLink = await WorkspaceInviteLink.findOne({
                workspaceId,
                isActive: true,
            });

            if (!inviteLink) {
                return res.json({
                    success: true,
                    data: null,
                });
            }

            const inviteUrl = `${process.env.FRONTEND_URL}/join/${inviteLink.token}`;

            res.json({
                success: true,
                data: {
                    token: inviteLink.token,
                    url: inviteUrl,
                    role: inviteLink.role,
                    usageCount: inviteLink.usageCount,
                    createdAt: inviteLink.createdAt,
                },
            });
        } catch (error: any) {
            console.error("Get invite link error:", error);
            res.status(500).json({ success: false, error: "Failed to get invite link." });
        }
    }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/team/invite-link
 * @desc    Revoke the current invite link
 */
router.delete(
    "/:workspaceId/team/invite-link",
    (req: any, res: any, next: any) => { console.log(`>>> HIT DELETE ${req.originalUrl}`); next(); },
    authenticate,
    // teamLimiter, // DISABLED DEBUG
    // requireRole("owner", "admin"), // DISABLED TO DEBUG 500 ERROR
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();

            console.log(`[Team] Revoking link for workspace: ${workspaceId} by user: ${userId}`);

            // Manual Role Check (Debugging 500 error)
            const workspace = await Project.findById(workspaceId);
            if (!workspace) return res.status(404).json({ error: "Workspace not found" });

            let hasPermission = false;
            // 1. Owner check
            if (workspace.userId.toString() === userId) {
                hasPermission = true;
            } else {
                // 2. Admin check
                const member = await TeamMember.findOne({ workspaceId, userId, status: "active" });
                if (member && ["owner", "admin"].includes(member.role)) {
                    hasPermission = true;
                }
            }

            if (!hasPermission) {
                return res.status(403).json({ success: false, error: "Requires owner or admin role" });
            }

            // Proceed with revoke
            const result = await WorkspaceInviteLink.findOneAndUpdate(
                { workspaceId, isActive: true },
                { isActive: false },
                { new: true }
            );

            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: "No active invite link found",
                });
            }

            res.json({
                success: true,
                message: "Invite link revoked. Anyone with the old link can no longer join.",
            });
        } catch (error: any) {
            console.error("Revoke invite link error:", error);
            res.status(500).json({
                success: false,
                error: `Revoke failed: ${error.message}`,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
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

/**
 * @route   GET /api/team/join/:token/validate
 * @desc    Validate a shareable invite link token (no auth required)
 */
router.get(
    "/join/:token/validate",
    async (req: AuthRequest, res: Response) => {
        try {
            const { token } = req.params;

            const inviteLink = await WorkspaceInviteLink.findOne({
                token,
                isActive: true,
            });

            if (!inviteLink) {
                return res.status(404).json({
                    success: false,
                    error: "This invite link is invalid or has been revoked.",
                });
            }

            // Check expiry if set
            if (inviteLink.expiresAt && new Date() > inviteLink.expiresAt) {
                return res.status(410).json({
                    success: false,
                    error: "This invite link has expired.",
                });
            }

            const workspace = await Project.findById(inviteLink.workspaceId);

            res.json({
                success: true,
                data: {
                    workspaceName: workspace?.name || "Unknown Workspace",
                    role: inviteLink.role,
                },
            });
        } catch (error: any) {
            console.error("Validate invite link error:", error);
            res.status(500).json({ success: false, error: "Failed to validate invite link." });
        }
    }
);

/**
 * @route   POST /api/team/join/:token
 * @desc    Join a workspace via shareable invite link (requires auth)
 */
router.post(
    "/join/:token",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { token } = req.params;
            const userId = (req.user?._id as any).toString();

            const inviteLink = await WorkspaceInviteLink.findOne({
                token,
                isActive: true,
            });

            if (!inviteLink) {
                return res.status(404).json({
                    success: false,
                    error: "This invite link is invalid or has been revoked.",
                });
            }

            // Check expiry if set
            if (inviteLink.expiresAt && new Date() > inviteLink.expiresAt) {
                return res.status(410).json({
                    success: false,
                    error: "This invite link has expired.",
                });
            }

            const workspace = await Project.findById(inviteLink.workspaceId);
            if (!workspace) {
                return res.status(404).json({ success: false, error: "Workspace not found" });
            }

            // Check if user is the workspace owner
            if (workspace.userId.toString() === userId) {
                return res.status(400).json({
                    success: false,
                    error: "You are the owner of this workspace.",
                });
            }

            // Check if user is already a team member
            const existingMember = await TeamMember.findOne({
                workspaceId: inviteLink.workspaceId,
                userId,
                status: { $in: ["active", "pending"] },
            });

            if (existingMember) {
                return res.status(400).json({
                    success: false,
                    error: "You are already a member of this workspace.",
                    data: { workspaceId: inviteLink.workspaceId },
                });
            }

            // Check for removed member — reactivate them
            const removedMember = await TeamMember.findOne({
                workspaceId: inviteLink.workspaceId,
                userId,
                status: "removed",
            });

            if (removedMember) {
                removedMember.role = inviteLink.role;
                removedMember.status = "active";
                removedMember.joinedAt = new Date();
                removedMember.inviteToken = undefined;
                removedMember.inviteExpiresAt = undefined;
                await removedMember.save();
            } else {
                // Create new team member record
                await TeamMember.create({
                    workspaceId: inviteLink.workspaceId,
                    userId,
                    role: inviteLink.role,
                    invitedBy: inviteLink.createdBy,
                    invitedAt: new Date(),
                    joinedAt: new Date(),
                    status: "active",
                });
            }

            // Increment usage count
            inviteLink.usageCount += 1;
            await inviteLink.save();

            res.json({
                success: true,
                message: `You've joined ${workspace.name}!`,
                data: { workspaceId: inviteLink.workspaceId },
            });
        } catch (error: any) {
            console.error("Join via link error:", error);
            res.status(500).json({ success: false, error: "Failed to join workspace." });
        }
    }
);

export default router;
