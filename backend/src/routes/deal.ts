import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Deal from "../models/Deal";
import Project from "../models/Project";
import Company from "../models/Company";
import Contact from "../models/Contact";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createDealSchema, updateDealSchema } from "../validations/deal";

const router = express.Router();

// Rate limiter
const dealLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Helper function to verify workspace access
 */
async function verifyWorkspaceAccess(
    workspaceId: string,
    userId: string,
    res: Response
): Promise<boolean> {
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
        res.status(404).json({ success: false, error: "Workspace not found." });
        return false;
    }
    if (workspace.userId.toString() !== userId) {
        res.status(403).json({ success: false, error: "Access denied." });
        return false;
    }
    return true;
}

/**
 * @route   GET /api/workspaces/:workspaceId/deals
 * @desc    Get all deals for a workspace
 */
router.get(
    "/:workspaceId/deals",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();
            const { stage, companyId, assignedTo, search, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query;

            const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
            if (!hasAccess) return;

            // Build query
            const query: any = { workspaceId };
            if (stage) query.stage = stage;
            if (companyId) query.companyId = companyId;
            if (assignedTo) query.assignedTo = assignedTo;
            if (search) {
                query.$text = { $search: search as string };
            }

            // Pagination
            const skip = (Number(page) - 1) * Number(limit);
            const sortDir = sortOrder === "asc" ? 1 : -1;

            const [deals, total] = await Promise.all([
                Deal.find(query)
                    .populate("companyId", "name website")
                    .populate("contacts", "firstName lastName email")
                    .populate("assignedTo", "name email")
                    .sort({ [sortBy as string]: sortDir })
                    .skip(skip)
                    .limit(Number(limit)),
                Deal.countDocuments(query),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    deals,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit)),
                    },
                },
            });
        } catch (error: any) {
            console.error("Error fetching deals:", error);
            res.status(500).json({ success: false, error: "Failed to fetch deals." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/deals/:dealId
 * @desc    Get a single deal
 */
router.get(
    "/:workspaceId/deals/:dealId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, dealId } = req.params;
            const userId = (req.user?._id as any).toString();

            const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
            if (!hasAccess) return;

            const deal = await Deal.findOne({ _id: dealId, workspaceId })
                .populate("companyId", "name website industry")
                .populate("contacts", "firstName lastName email phone")
                .populate("assignedTo", "name email");

            if (!deal) {
                return res.status(404).json({ success: false, error: "Deal not found." });
            }

            res.status(200).json({ success: true, data: { deal } });
        } catch (error: any) {
            console.error("Error fetching deal:", error);
            res.status(500).json({ success: false, error: "Failed to fetch deal." });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/deals
 * @desc    Create a new deal
 */
router.post(
    "/:workspaceId/deals",
    authenticate,
    dealLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
            if (!hasAccess) return;

            const validation = createDealSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    error: validation.error.errors[0].message,
                    details: validation.error.errors,
                });
            }

            const data = validation.data;

            // Verify company exists if provided
            if (data.companyId) {
                const company = await Company.findOne({ _id: data.companyId, workspaceId });
                if (!company) {
                    return res.status(400).json({ success: false, error: "Company not found." });
                }
            }

            // Verify contacts exist if provided
            if (data.contacts && data.contacts.length > 0) {
                const contactCount = await Contact.countDocuments({
                    _id: { $in: data.contacts },
                    workspaceId,
                });
                if (contactCount !== data.contacts.length) {
                    return res.status(400).json({ success: false, error: "One or more contacts not found." });
                }
            }

            const deal = new Deal({
                ...data,
                workspaceId,
                userId,
                stageChangedAt: new Date(),
                stageHistory: [{ stage: data.stage || "lead", changedAt: new Date(), changedBy: userId }],
            });

            await deal.save();

            const populatedDeal = await Deal.findById(deal._id)
                .populate("companyId", "name website")
                .populate("contacts", "firstName lastName email")
                .populate("assignedTo", "name email");

            res.status(201).json({
                success: true,
                data: { deal: populatedDeal },
                message: "Deal created successfully.",
            });
        } catch (error: any) {
            console.error("Error creating deal:", error);
            res.status(500).json({ success: false, error: "Failed to create deal." });
        }
    }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/deals/:dealId
 * @desc    Update a deal
 */
router.patch(
    "/:workspaceId/deals/:dealId",
    authenticate,
    dealLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, dealId } = req.params;
            const userId = (req.user?._id as any).toString();

            const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
            if (!hasAccess) return;

            const validation = updateDealSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    error: validation.error.errors[0].message,
                    details: validation.error.errors,
                });
            }

            const deal = await Deal.findOne({ _id: dealId, workspaceId });
            if (!deal) {
                return res.status(404).json({ success: false, error: "Deal not found." });
            }

            const data = validation.data;

            // Track stage changes
            if (data.stage && data.stage !== deal.stage) {
                deal.stageHistory = deal.stageHistory || [];
                deal.stageHistory.push({
                    stage: data.stage,
                    changedAt: new Date(),
                    changedBy: userId as any,
                });
                deal.stageChangedAt = new Date();

                // Handle closed stages
                if (data.stage === "closed_won" || data.stage === "closed_lost") {
                    deal.closeDate = new Date();
                }
            }

            // Update fields
            Object.assign(deal, data);
            await deal.save();

            const updatedDeal = await Deal.findById(deal._id)
                .populate("companyId", "name website")
                .populate("contacts", "firstName lastName email")
                .populate("assignedTo", "name email");

            res.status(200).json({
                success: true,
                data: { deal: updatedDeal },
                message: "Deal updated successfully.",
            });
        } catch (error: any) {
            console.error("Error updating deal:", error);
            res.status(500).json({ success: false, error: "Failed to update deal." });
        }
    }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/deals/:dealId
 * @desc    Delete a deal
 */
router.delete(
    "/:workspaceId/deals/:dealId",
    authenticate,
    dealLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, dealId } = req.params;
            const userId = (req.user?._id as any).toString();

            const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
            if (!hasAccess) return;

            const deal = await Deal.findOneAndDelete({ _id: dealId, workspaceId });
            if (!deal) {
                return res.status(404).json({ success: false, error: "Deal not found." });
            }

            res.status(200).json({
                success: true,
                message: "Deal deleted successfully.",
            });
        } catch (error: any) {
            console.error("Error deleting deal:", error);
            res.status(500).json({ success: false, error: "Failed to delete deal." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/companies/:companyId/deals
 * @desc    Get deals associated with a company
 */
router.get(
    "/:workspaceId/companies/:companyId/deals",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, companyId } = req.params;
            const userId = (req.user?._id as any).toString();

            const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
            if (!hasAccess) return;

            const deals = await Deal.find({ workspaceId, companyId })
                .populate("contacts", "firstName lastName email")
                .populate("assignedTo", "name email")
                .sort({ createdAt: -1 });

            // Calculate totals
            const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
            const openDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage));
            const wonDeals = deals.filter(d => d.stage === "closed_won");

            res.status(200).json({
                success: true,
                data: {
                    deals,
                    summary: {
                        totalDeals: deals.length,
                        openDeals: openDeals.length,
                        wonDeals: wonDeals.length,
                        totalValue,
                        wonValue: wonDeals.reduce((sum, d) => sum + (d.value || 0), 0),
                    },
                },
            });
        } catch (error: any) {
            console.error("Error fetching company deals:", error);
            res.status(500).json({ success: false, error: "Failed to fetch company deals." });
        }
    }
);

export default router;
