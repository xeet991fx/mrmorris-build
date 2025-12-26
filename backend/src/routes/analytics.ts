import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import EmailMessage from "../models/EmailMessage";
import Task from "../models/Task";
import LeadScore from "../models/LeadScore";
import Activity from "../models/Activity";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/analytics/pipeline
 * Pipeline analytics - deals by stage, value, probability
 */
router.get("/:workspaceId/analytics/pipeline", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { pipelineId, dateFrom, dateTo } = req.query;

        const query: any = { workspaceId };
        if (pipelineId) query.pipelineId = pipelineId;
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
            if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
        }

        // Deals by stage
        const dealsByStage = await Opportunity.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$stage",
                    count: { $sum: 1 },
                    totalValue: { $sum: "$value" },
                    avgValue: { $avg: "$value" },
                },
            },
            { $sort: { totalValue: -1 } },
        ]);

        // Deals by status
        const dealsByStatus = await Opportunity.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalValue: { $sum: "$value" },
                },
            },
        ]);

        // Win rate
        const winRate = await Opportunity.aggregate([
            { $match: { ...query, status: { $in: ["won", "lost"] } } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const totalClosed = winRate.reduce((sum, item) => sum + item.count, 0);
        const won = winRate.find((item) => item._id === "won")?.count || 0;
        const winRatePercent = totalClosed > 0 ? (won / totalClosed) * 100 : 0;

        res.json({
            success: true,
            data: {
                dealsByStage,
                dealsByStatus,
                winRate: winRatePercent.toFixed(2),
                totalDeals: dealsByStage.reduce((sum, item) => sum + item.count, 0),
                totalValue: dealsByStage.reduce((sum, item) => sum + item.totalValue, 0),
            },
        });
    } catch (error: any) {
        console.error("Pipeline analytics error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch pipeline analytics" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/revenue-trend
 * Revenue trend over time
 */
router.get("/:workspaceId/analytics/revenue-trend", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo, interval = "month" } = req.query;

        const match: any = { workspaceId, status: "won" };
        if (dateFrom || dateTo) {
            match.closedAt = {};
            if (dateFrom) match.closedAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.closedAt.$lte = new Date(dateTo as string);
        }

        const groupBy = interval === "day"
            ? { year: { $year: "$closedAt" }, month: { $month: "$closedAt" }, day: { $dayOfMonth: "$closedAt" } }
            : interval === "week"
            ? { year: { $year: "$closedAt" }, week: { $week: "$closedAt" } }
            : { year: { $year: "$closedAt" }, month: { $month: "$closedAt" } };

        const trend = await Opportunity.aggregate([
            { $match: match },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: "$value" },
                    dealsWon: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);

        res.json({ success: true, data: trend });
    } catch (error: any) {
        console.error("Revenue trend error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch revenue trend" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/email-performance
 * Email campaign performance metrics
 */
router.get("/:workspaceId/analytics/email-performance", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const match: any = { workspaceId };
        if (dateFrom || dateTo) {
            match.sentAt = {};
            if (dateFrom) match.sentAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.sentAt.$lte = new Date(dateTo as string);
        }

        const performance = await EmailMessage.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: 1 },
                    totalOpened: {
                        $sum: { $cond: [{ $gt: ["$openedAt", null] }, 1, 0] },
                    },
                    totalClicked: {
                        $sum: { $cond: [{ $gt: ["$clickedAt", null] }, 1, 0] },
                    },
                    totalReplied: {
                        $sum: { $cond: [{ $gt: ["$repliedAt", null] }, 1, 0] },
                    },
                    totalBounced: {
                        $sum: { $cond: [{ $eq: ["$status", "bounced"] }, 1, 0] },
                    },
                },
            },
        ]);

        const stats = performance[0] || {
            totalSent: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalReplied: 0,
            totalBounced: 0,
        };

        const openRate = stats.totalSent > 0 ? (stats.totalOpened / stats.totalSent) * 100 : 0;
        const clickRate = stats.totalSent > 0 ? (stats.totalClicked / stats.totalSent) * 100 : 0;
        const replyRate = stats.totalSent > 0 ? (stats.totalReplied / stats.totalSent) * 100 : 0;
        const bounceRate = stats.totalSent > 0 ? (stats.totalBounced / stats.totalSent) * 100 : 0;

        res.json({
            success: true,
            data: {
                ...stats,
                openRate: openRate.toFixed(2),
                clickRate: clickRate.toFixed(2),
                replyRate: replyRate.toFixed(2),
                bounceRate: bounceRate.toFixed(2),
            },
        });
    } catch (error: any) {
        console.error("Email performance error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch email performance" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/lead-sources
 * Lead sources breakdown
 */
router.get("/:workspaceId/analytics/lead-sources", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const sources = await Contact.aggregate([
            { $match: { workspaceId } },
            {
                $group: {
                    _id: "$source",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        res.json({ success: true, data: sources });
    } catch (error: any) {
        console.error("Lead sources error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch lead sources" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/activity-timeline
 * Activity timeline (tasks, emails, calls by day)
 */
router.get("/:workspaceId/analytics/activity-timeline", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const match: any = { workspaceId };
        if (dateFrom || dateTo) {
            match.createdAt = {};
            if (dateFrom) match.createdAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.createdAt.$lte = new Date(dateTo as string);
        }

        const activities = await Activity.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                        type: "$type",
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);

        res.json({ success: true, data: activities });
    } catch (error: any) {
        console.error("Activity timeline error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch activity timeline" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/top-performers
 * Top performing team members by deals closed, revenue
 */
router.get("/:workspaceId/analytics/top-performers", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const match: any = { workspaceId, status: "won" };
        if (dateFrom || dateTo) {
            match.closedAt = {};
            if (dateFrom) match.closedAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.closedAt.$lte = new Date(dateTo as string);
        }

        const performers = await Opportunity.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$assignedTo",
                    dealsWon: { $sum: 1 },
                    revenue: { $sum: "$value" },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        ]);

        res.json({ success: true, data: performers });
    } catch (error: any) {
        console.error("Top performers error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch top performers" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/lead-score-distribution
 * Lead score distribution
 */
router.get("/:workspaceId/analytics/lead-score-distribution", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const distribution = await LeadScore.aggregate([
            { $match: { workspaceId } },
            {
                $bucket: {
                    groupBy: "$score",
                    boundaries: [0, 25, 50, 75, 90, 100],
                    default: "100+",
                    output: {
                        count: { $sum: 1 },
                        avgScore: { $avg: "$score" },
                    },
                },
            },
        ]);

        res.json({ success: true, data: distribution });
    } catch (error: any) {
        console.error("Lead score distribution error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch lead score distribution" });
    }
});

export default router;
