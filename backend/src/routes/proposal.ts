import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import Proposal, { IProposal } from "../models/Proposal";
import Opportunity from "../models/Opportunity";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/proposals
 * Get all proposals for workspace
 */
router.get("/:workspaceId/proposals", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { status, opportunityId, search, limit = 50, offset = 0 } = req.query;

        const query: any = { workspaceId };

        if (status) {
            query.status = status;
        }

        if (opportunityId) {
            query.opportunityId = opportunityId;
        }

        if (search) {
            query.$text = { $search: search as string };
        }

        const proposals = await Proposal.find(query)
            .populate("opportunityId", "name value stage")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const total = await Proposal.countDocuments(query);

        res.json({
            success: true,
            data: {
                proposals,
                total,
                limit: Number(limit),
                offset: Number(offset),
            },
        });
    } catch (error: any) {
        console.error("Get proposals error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch proposals",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/proposals/:id
 * Get proposal by ID
 */
router.get("/:workspaceId/proposals/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;

        const proposal = await Proposal.findOne({
            _id: id,
            workspaceId,
        }).populate("opportunityId", "name value stage contactId companyId");

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: "Proposal not found",
            });
        }

        res.json({
            success: true,
            data: proposal,
        });
    } catch (error: any) {
        console.error("Get proposal error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch proposal",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/proposals
 * Create new proposal
 */
router.post("/:workspaceId/proposals", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user!._id;

        const {
            opportunityId,
            title,
            templateType,
            executiveSummary,
            problemStatement,
            proposedSolution,
            deliverables,
            timeline,
            whyUs,
            terms,
            pricing,
        } = req.body;

        // Validate opportunity exists
        const opportunity = await Opportunity.findOne({
            _id: opportunityId,
            workspaceId,
        });

        if (!opportunity) {
            return res.status(404).json({
                success: false,
                error: "Opportunity not found",
            });
        }

        // Calculate pricing totals
        const items = pricing?.items || [];
        const subtotal = items.reduce((sum: number, item: any) => {
            const itemTotal = item.quantity * item.unitPrice;
            const discount = item.discount || 0;
            return sum + (itemTotal - (itemTotal * discount / 100));
        }, 0);

        const discountAmount = pricing?.discountType === "percentage"
            ? subtotal * (pricing.discount || 0) / 100
            : pricing?.discount || 0;

        const taxAmount = pricing?.tax || 0;
        const total = subtotal - discountAmount + taxAmount;

        const proposal = await Proposal.create({
            workspaceId,
            userId,
            opportunityId,
            title,
            templateType: templateType || "standard",
            executiveSummary,
            problemStatement,
            proposedSolution,
            deliverables,
            timeline,
            whyUs,
            terms,
            pricing: {
                items: items.map((item: any) => ({
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount || 0,
                    total: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100),
                })),
                subtotal,
                discount: pricing?.discount || 0,
                discountType: pricing?.discountType || "fixed",
                tax: taxAmount,
                total,
                currency: pricing?.currency || "USD",
                validUntil: pricing?.validUntil,
            },
            status: "draft",
            version: 1,
        });

        res.status(201).json({
            success: true,
            data: proposal,
            message: "Proposal created successfully",
        });
    } catch (error: any) {
        console.error("Create proposal error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create proposal",
        });
    }
});

/**
 * PUT /api/workspaces/:workspaceId/proposals/:id
 * Update proposal
 */
router.put("/:workspaceId/proposals/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const updates = req.body;

        // Recalculate pricing if items changed
        if (updates.pricing?.items) {
            const items = updates.pricing.items;
            const subtotal = items.reduce((sum: number, item: any) => {
                const itemTotal = item.quantity * item.unitPrice;
                const discount = item.discount || 0;
                return sum + (itemTotal - (itemTotal * discount / 100));
            }, 0);

            const discountAmount = updates.pricing.discountType === "percentage"
                ? subtotal * (updates.pricing.discount || 0) / 100
                : updates.pricing.discount || 0;

            const taxAmount = updates.pricing.tax || 0;
            const total = subtotal - discountAmount + taxAmount;

            updates.pricing = {
                ...updates.pricing,
                items: items.map((item: any) => ({
                    ...item,
                    total: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100),
                })),
                subtotal,
                total,
            };
        }

        const proposal = await Proposal.findOneAndUpdate(
            { _id: id, workspaceId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: "Proposal not found",
            });
        }

        res.json({
            success: true,
            data: proposal,
            message: "Proposal updated successfully",
        });
    } catch (error: any) {
        console.error("Update proposal error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to update proposal",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/proposals/:id/send
 * Mark proposal as sent
 */
router.post("/:workspaceId/proposals/:id/send", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const { sentTo } = req.body;

        const proposal = await Proposal.findOneAndUpdate(
            { _id: id, workspaceId },
            {
                $set: {
                    status: "sent",
                    sentAt: new Date(),
                    sentTo,
                },
            },
            { new: true }
        );

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: "Proposal not found",
            });
        }

        res.json({
            success: true,
            data: proposal,
            message: "Proposal marked as sent",
        });
    } catch (error: any) {
        console.error("Send proposal error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to send proposal",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/proposals/:id/track-view
 * Track proposal view (for public links)
 */
router.post("/:workspaceId/proposals/:id/track-view", async (req: Request, res: Response) => {
    try {
        const { workspaceId, id } = req.params;

        const proposal = await Proposal.findOneAndUpdate(
            { _id: id, workspaceId },
            {
                $set: {
                    viewedAt: new Date(),
                    status: "viewed",
                },
                $inc: { viewCount: 1 },
            },
            { new: true }
        );

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: "Proposal not found",
            });
        }

        res.json({
            success: true,
            message: "View tracked",
        });
    } catch (error: any) {
        console.error("Track view error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to track view",
        });
    }
});

/**
 * DELETE /api/workspaces/:workspaceId/proposals/:id
 * Delete proposal
 */
router.delete("/:workspaceId/proposals/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;

        const proposal = await Proposal.findOneAndDelete({
            _id: id,
            workspaceId,
        });

        if (!proposal) {
            return res.status(404).json({
                success: false,
                error: "Proposal not found",
            });
        }

        res.json({
            success: true,
            message: "Proposal deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete proposal error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete proposal",
        });
    }
});

export default router;
