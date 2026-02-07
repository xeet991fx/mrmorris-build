import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import EmailMessage from "../models/EmailMessage";
import Task from "../models/Task";
import LeadScore from "../models/LeadScore";
import Activity from "../models/Activity";
import TrackingEvent from "../models/TrackingEvent";
import Visitor from "../models/Visitor";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

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

// ============================================
// WEBSITE TRACKING ANALYTICS (Google Analytics style)
// ============================================

/**
 * GET /api/workspaces/:workspaceId/analytics/website/overview
 * Main dashboard metrics for website tracking
 */
router.get("/:workspaceId/analytics/website/overview", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

        // Date range filter
        const dateFilter: any = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate as string);
        } else {
            dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate as string);
        } else {
            dateFilter.$lte = new Date();
        }

        const [
            totalVisitors,
            totalSessions,
            totalPageViews,
            totalEvents,
            uniqueVisitorsInRange,
            averageSessionDuration,
            bounceRate,
        ] = await Promise.all([
            Visitor.countDocuments({ workspaceId: workspaceObjectId }),
            TrackingEvent.aggregate([
                { $match: { workspaceId: workspaceObjectId, createdAt: dateFilter } },
                { $group: { _id: "$sessionId" } },
                { $count: "count" },
            ]).then(r => r[0]?.count || 0),
            TrackingEvent.countDocuments({
                workspaceId: workspaceObjectId,
                eventType: "page_view",
                createdAt: dateFilter,
            }),
            TrackingEvent.countDocuments({
                workspaceId: workspaceObjectId,
                createdAt: dateFilter,
            }),
            TrackingEvent.aggregate([
                { $match: { workspaceId: workspaceObjectId, createdAt: dateFilter } },
                { $group: { _id: "$visitorId" } },
                { $count: "count" },
            ]).then(r => r[0]?.count || 0),
            TrackingEvent.aggregate([
                {
                    $match: {
                        workspaceId: workspaceObjectId,
                        eventType: "time_on_page",
                        createdAt: dateFilter,
                    }
                },
                {
                    $group: {
                        _id: "$sessionId",
                        totalDuration: { $sum: { $ifNull: ["$properties.seconds", "$properties.value1", 0] } },
                    }
                },
                { $group: { _id: null, avgDuration: { $avg: "$totalDuration" } } },
            ]).then(r => Math.round(r[0]?.avgDuration || 0)),
            TrackingEvent.aggregate([
                {
                    $match: {
                        workspaceId: workspaceObjectId,
                        eventType: "page_view",
                        createdAt: dateFilter,
                    }
                },
                { $group: { _id: "$sessionId", pageViews: { $sum: 1 } } },
                {
                    $group: {
                        _id: null,
                        totalSessions: { $sum: 1 },
                        bouncedSessions: { $sum: { $cond: [{ $eq: ["$pageViews", 1] }, 1, 0] } },
                    }
                },
            ]).then(r => {
                if (!r[0] || r[0].totalSessions === 0) return 0;
                return Math.round((r[0].bouncedSessions / r[0].totalSessions) * 100);
            }),
        ]);

        const minutes = Math.floor(averageSessionDuration / 60);
        const seconds = averageSessionDuration % 60;

        res.json({
            success: true,
            data: {
                totalVisitors,
                uniqueVisitorsInRange,
                totalSessions,
                totalPageViews,
                totalEvents,
                averageSessionDuration,
                avgSessionDurationFormatted: `${minutes}m ${seconds}s`,
                bounceRate,
                dateRange: { start: dateFilter.$gte, end: dateFilter.$lte },
            },
        });
    } catch (error: any) {
        logger.error("Website overview error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get website overview" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/website/visitors-over-time
 * Visitors grouped by day/hour for charts
 */
router.get("/:workspaceId/analytics/website/visitors-over-time", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate, groupBy = "day" } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        else dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (endDate) dateFilter.$lte = new Date(endDate as string);
        else dateFilter.$lte = new Date();

        const dateFormat = groupBy === "hour"
            ? { $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" } }
            : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

        const data = await TrackingEvent.aggregate([
            { $match: { workspaceId: workspaceObjectId, createdAt: dateFilter } },
            { $group: { _id: { date: dateFormat, visitorId: "$visitorId" } } },
            { $group: { _id: "$_id.date", visitors: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", visitors: 1 } },
        ]);

        res.json({ success: true, data });
    } catch (error: any) {
        logger.error("Visitors over time error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get visitors over time" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/website/traffic-sources
 * Traffic breakdown by source/medium
 */
router.get("/:workspaceId/analytics/website/traffic-sources", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        else dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (endDate) dateFilter.$lte = new Date(endDate as string);
        else dateFilter.$lte = new Date();

        const data = await TrackingEvent.aggregate([
            {
                $match: {
                    workspaceId: workspaceObjectId,
                    eventType: "page_view",
                    createdAt: dateFilter,
                }
            },
            {
                $group: {
                    _id: {
                        source: {
                            $cond: [
                                { $and: [{ $ne: ["$utmSource", null] }, { $ne: ["$utmSource", ""] }] },
                                "$utmSource",
                                {
                                    $cond: [
                                        { $or: [{ $eq: ["$referrer", ""] }, { $eq: ["$referrer", null] }] },
                                        "Direct",
                                        {
                                            $cond: [
                                                { $regexMatch: { input: { $ifNull: ["$referrer", ""] }, regex: /google|bing|yahoo|duckduckgo/i } },
                                                "Organic Search",
                                                {
                                                    $cond: [
                                                        { $regexMatch: { input: { $ifNull: ["$referrer", ""] }, regex: /facebook|twitter|linkedin|instagram/i } },
                                                        "Social",
                                                        "Referral"
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                    },
                    sessions: { $addToSet: "$sessionId" },
                    visitors: { $addToSet: "$visitorId" },
                },
            },
            {
                $project: {
                    _id: 0,
                    source: "$_id.source",
                    sessions: { $size: "$sessions" },
                    visitors: { $size: "$visitors" },
                },
            },
            { $sort: { sessions: -1 } },
            { $limit: 10 },
        ]);

        const totalSessions = data.reduce((sum, item) => sum + item.sessions, 0);
        const dataWithPercentage = data.map(item => ({
            ...item,
            percentage: totalSessions > 0 ? Math.round((item.sessions / totalSessions) * 100) : 0,
        }));

        res.json({ success: true, data: dataWithPercentage });
    } catch (error: any) {
        logger.error("Traffic sources error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get traffic sources" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/website/devices
 * Device and browser breakdown
 */
router.get("/:workspaceId/analytics/website/devices", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        else dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (endDate) dateFilter.$lte = new Date(endDate as string);
        else dateFilter.$lte = new Date();

        const data = await TrackingEvent.aggregate([
            {
                $match: {
                    workspaceId: workspaceObjectId,
                    eventType: "page_view",
                    createdAt: dateFilter,
                }
            },
            { $group: { _id: "$visitorId", userAgent: { $first: "$device.userAgent" } } },
            {
                $project: {
                    deviceType: {
                        $cond: [
                            { $regexMatch: { input: { $ifNull: ["$userAgent", ""] }, regex: /Mobile|Android|iPhone|iPad/i } },
                            { $cond: [{ $regexMatch: { input: { $ifNull: ["$userAgent", ""] }, regex: /iPad|Tablet/i } }, "Tablet", "Mobile"] },
                            "Desktop"
                        ]
                    },
                    browser: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: { $ifNull: ["$userAgent", ""] }, regex: /Chrome/i } }, then: "Chrome" },
                                { case: { $regexMatch: { input: { $ifNull: ["$userAgent", ""] }, regex: /Firefox/i } }, then: "Firefox" },
                                { case: { $regexMatch: { input: { $ifNull: ["$userAgent", ""] }, regex: /Safari/i } }, then: "Safari" },
                                { case: { $regexMatch: { input: { $ifNull: ["$userAgent", ""] }, regex: /Edge/i } }, then: "Edge" },
                            ],
                            default: "Other"
                        }
                    },
                },
            },
            {
                $facet: {
                    byDevice: [{ $group: { _id: "$deviceType", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                    byBrowser: [{ $group: { _id: "$browser", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                },
            },
        ]);

        const result = data[0] || { byDevice: [], byBrowser: [] };
        const totalDevices = result.byDevice.reduce((sum: number, item: any) => sum + item.count, 0);
        const totalBrowsers = result.byBrowser.reduce((sum: number, item: any) => sum + item.count, 0);

        res.json({
            success: true,
            data: {
                devices: result.byDevice.map((item: any) => ({
                    device: item._id,
                    count: item.count,
                    percentage: totalDevices > 0 ? Math.round((item.count / totalDevices) * 100) : 0,
                })),
                browsers: result.byBrowser.map((item: any) => ({
                    browser: item._id,
                    count: item.count,
                    percentage: totalBrowsers > 0 ? Math.round((item.count / totalBrowsers) * 100) : 0,
                })),
            },
        });
    } catch (error: any) {
        logger.error("Devices analytics error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get device analytics" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/website/top-pages
 * Most viewed pages
 */
router.get("/:workspaceId/analytics/website/top-pages", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate, limit = "10" } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        else dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (endDate) dateFilter.$lte = new Date(endDate as string);
        else dateFilter.$lte = new Date();

        const data = await TrackingEvent.aggregate([
            {
                $match: {
                    workspaceId: workspaceObjectId,
                    eventType: "page_view",
                    createdAt: dateFilter,
                }
            },
            {
                $group: {
                    _id: "$url",
                    pageViews: { $sum: 1 },
                    uniqueVisitors: { $addToSet: "$visitorId" },
                },
            },
            {
                $project: {
                    _id: 0,
                    url: "$_id",
                    path: { $arrayElemAt: [{ $split: ["$_id", "?"] }, 0] },
                    pageViews: 1,
                    uniqueVisitors: { $size: "$uniqueVisitors" },
                },
            },
            { $sort: { pageViews: -1 } },
            { $limit: parseInt(limit as string) },
        ]);

        res.json({ success: true, data });
    } catch (error: any) {
        logger.error("Top pages error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get top pages" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/website/realtime
 * Real-time active visitors (last 5 minutes)
 */
router.get("/:workspaceId/analytics/website/realtime", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const [activeVisitors, activePages, recentEvents] = await Promise.all([
            TrackingEvent.aggregate([
                { $match: { workspaceId: workspaceObjectId, createdAt: { $gte: fiveMinutesAgo } } },
                { $group: { _id: "$visitorId" } },
                { $count: "count" },
            ]).then(r => r[0]?.count || 0),
            TrackingEvent.aggregate([
                { $match: { workspaceId: workspaceObjectId, eventType: "page_view", createdAt: { $gte: fiveMinutesAgo } } },
                { $group: { _id: "$url", visitors: { $addToSet: "$visitorId" } } },
                { $project: { _id: 0, url: "$_id", activeVisitors: { $size: "$visitors" } } },
                { $sort: { activeVisitors: -1 } },
                { $limit: 5 },
            ]),
            TrackingEvent.find({ workspaceId: workspaceObjectId, createdAt: { $gte: fiveMinutesAgo } })
                .sort({ createdAt: -1 })
                .limit(20)
                .select("eventType eventName url visitorId createdAt")
                .lean(),
        ]);

        res.json({
            success: true,
            data: { activeVisitors, activePages, recentEvents, timestamp: new Date() },
        });
    } catch (error: any) {
        logger.error("Realtime analytics error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get realtime analytics" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/website/geographic
 * Geographic breakdown based on browser language
 */
router.get("/:workspaceId/analytics/website/geographic", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate, endDate } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        else dateFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (endDate) dateFilter.$lte = new Date(endDate as string);
        else dateFilter.$lte = new Date();

        const data = await TrackingEvent.aggregate([
            { $match: { workspaceId: workspaceObjectId, createdAt: dateFilter } },
            { $group: { _id: "$visitorId", language: { $first: "$device.language" } } },
            {
                $group: {
                    _id: { $cond: [{ $ne: ["$language", null] }, { $substr: ["$language", 0, 2] }, "Unknown"] },
                    count: { $sum: 1 },
                },
            },
            { $project: { _id: 0, language: "$_id", visitors: "$count" } },
            { $sort: { visitors: -1 } },
            { $limit: 10 },
        ]);

        const languageNames: Record<string, string> = {
            en: "English", es: "Spanish", fr: "French", de: "German",
            pt: "Portuguese", zh: "Chinese", ja: "Japanese", ko: "Korean",
            ru: "Russian", ar: "Arabic", hi: "Hindi", it: "Italian", nl: "Dutch",
        };

        res.json({
            success: true,
            data: data.map(item => ({ ...item, languageName: languageNames[item.language] || item.language })),
            note: "For IP-based geolocation, integrate MaxMind GeoLite2 or ipinfo.io",
        });
    } catch (error: any) {
        logger.error("Geographic analytics error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get geographic analytics" });
    }
});

// ============================================
// COMMAND CENTER ENDPOINTS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/command-center/kpis
 * Today's key performance indicators
 */
router.get("/:workspaceId/command-center/kpis", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter = startDate
            ? { $gte: new Date(startDate as string) }
            : { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };

        const [newLeads, pageViews, formSubmissions, emailsSent, meetingsBooked] = await Promise.all([
            // New leads (contacts created today)
            Contact.countDocuments({
                workspaceId: workspaceObjectId,
                createdAt: dateFilter,
            }),
            // Page views
            TrackingEvent.countDocuments({
                workspaceId: workspaceObjectId,
                eventType: "page_view",
                createdAt: dateFilter,
            }),
            // Form submissions
            TrackingEvent.countDocuments({
                workspaceId: workspaceObjectId,
                eventType: "form_submit",
                createdAt: dateFilter,
            }),
            // Emails sent
            EmailMessage.countDocuments({
                workspaceId: workspaceObjectId,
                sentAt: dateFilter,
            }),
            // Meetings (from tasks with type meeting)
            Task.countDocuments({
                workspaceId: workspaceObjectId,
                type: "meeting",
                createdAt: dateFilter,
            }),
        ]);

        res.json({
            success: true,
            data: { newLeads, pageViews, formSubmissions, emailsSent, meetingsBooked },
        });
    } catch (error: any) {
        logger.error("Command center KPIs error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get KPIs" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/command-center/sources
 * Lead sources breakdown
 */
router.get("/:workspaceId/command-center/sources", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { startDate } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        else dateFilter.$gte = new Date(new Date().setHours(0, 0, 0, 0));

        const data = await Contact.aggregate([
            { $match: { workspaceId: workspaceObjectId, createdAt: dateFilter } },
            {
                $group: {
                    _id: { $ifNull: ["$source", "Direct"] },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        const total = data.reduce((sum, item) => sum + item.count, 0);
        const formatted = data.map(item => ({
            source: item._id,
            count: item.count,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
        }));

        res.json({ success: true, data: formatted });
    } catch (error: any) {
        logger.error("Command center sources error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get sources" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/command-center/activity
 * Recent lead activity feed
 */
router.get("/:workspaceId/command-center/activity", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { limit = "15" } = req.query;

        const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

        // Get recent tracking events and contact creations
        const [events, contacts] = await Promise.all([
            TrackingEvent.find({
                workspaceId: workspaceObjectId,
                eventType: { $in: ["form_submit", "identify", "page_view"] },
            })
                .sort({ createdAt: -1 })
                .limit(parseInt(limit as string))
                .select("eventType eventName url visitorId contactId createdAt")
                .populate("contactId", "email firstName lastName")
                .lean(),
            Contact.find({ workspaceId: workspaceObjectId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("email firstName lastName createdAt")
                .lean(),
        ]);

        // Merge and format
        const activity = [
            ...events.map((e: any) => ({
                _id: e._id,
                type: e.eventType,
                source: "tracking",
                email: e.contactId?.email,
                name: e.contactId ? `${e.contactId.firstName || ""} ${e.contactId.lastName || ""}`.trim() : null,
                url: e.url,
                timestamp: e.createdAt,
            })),
            ...contacts.map((c: any) => ({
                _id: c._id,
                type: "contact_created",
                source: c.source || "direct",
                email: c.email,
                name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
                timestamp: c.createdAt,
            })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, parseInt(limit as string));

        res.json({ success: true, data: activity });
    } catch (error: any) {
        logger.error("Command center activity error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get activity" });
    }
});

// ============================================
// EMAIL TRACKING ANALYTICS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/analytics/email/device-breakdown
 * Device, browser, and OS breakdown for email opens
 */
router.get("/:workspaceId/analytics/email/device-breakdown", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const match: any = { workspaceId };
        if (dateFrom || dateTo) {
            match.sentAt = {};
            if (dateFrom) match.sentAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.sentAt.$lte = new Date(dateTo as string);
        }

        const result = await EmailMessage.aggregate([
            { $match: match },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true }, "opens.isApplePrivacy": { $ne: true } } },
            {
                $facet: {
                    byDevice: [
                        { $group: { _id: { $ifNull: ["$opens.device", "unknown"] }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    byBrowser: [
                        { $group: { _id: { $ifNull: ["$opens.browser", "unknown"] }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    byOS: [
                        { $group: { _id: { $ifNull: ["$opens.os", "unknown"] }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                },
            },
        ]);

        const data = result[0] || { byDevice: [], byBrowser: [], byOS: [] };

        // Calculate percentages
        const totalDevice = data.byDevice.reduce((sum: number, i: any) => sum + i.count, 0);
        const totalBrowser = data.byBrowser.reduce((sum: number, i: any) => sum + i.count, 0);
        const totalOS = data.byOS.reduce((sum: number, i: any) => sum + i.count, 0);

        res.json({
            success: true,
            data: {
                devices: data.byDevice.map((i: any) => ({
                    name: i._id, count: i.count,
                    percentage: totalDevice > 0 ? Math.round((i.count / totalDevice) * 100) : 0,
                })),
                browsers: data.byBrowser.map((i: any) => ({
                    name: i._id, count: i.count,
                    percentage: totalBrowser > 0 ? Math.round((i.count / totalBrowser) * 100) : 0,
                })),
                os: data.byOS.map((i: any) => ({
                    name: i._id, count: i.count,
                    percentage: totalOS > 0 ? Math.round((i.count / totalOS) * 100) : 0,
                })),
            },
        });
    } catch (error: any) {
        logger.error("Email device breakdown error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get email device breakdown" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/email/location-breakdown
 * Geographic breakdown for email opens
 */
router.get("/:workspaceId/analytics/email/location-breakdown", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const match: any = { workspaceId };
        if (dateFrom || dateTo) {
            match.sentAt = {};
            if (dateFrom) match.sentAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.sentAt.$lte = new Date(dateTo as string);
        }

        const result = await EmailMessage.aggregate([
            { $match: match },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true }, "opens.country": { $ne: null } } },
            {
                $facet: {
                    byCountry: [
                        { $group: { _id: "$opens.country", countryCode: { $first: "$opens.countryCode" }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 15 },
                    ],
                    byCity: [
                        { $group: { _id: { city: "$opens.city", country: "$opens.country" }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                    ],
                    byTimezone: [
                        { $group: { _id: "$opens.timezone", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                    ],
                },
            },
        ]);

        const data = result[0] || { byCountry: [], byCity: [], byTimezone: [] };
        const totalCountry = data.byCountry.reduce((sum: number, i: any) => sum + i.count, 0);

        res.json({
            success: true,
            data: {
                countries: data.byCountry.map((i: any) => ({
                    country: i._id, countryCode: i.countryCode, count: i.count,
                    percentage: totalCountry > 0 ? Math.round((i.count / totalCountry) * 100) : 0,
                })),
                cities: data.byCity.map((i: any) => ({
                    city: i._id.city, country: i._id.country, count: i.count,
                })),
                timezones: data.byTimezone.map((i: any) => ({
                    timezone: i._id, count: i.count,
                })),
            },
        });
    } catch (error: any) {
        logger.error("Email location breakdown error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get email location breakdown" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/analytics/email/time-breakdown
 * Opens by hour of day and day of week
 */
router.get("/:workspaceId/analytics/email/time-breakdown", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const match: any = { workspaceId };
        if (dateFrom || dateTo) {
            match.sentAt = {};
            if (dateFrom) match.sentAt.$gte = new Date(dateFrom as string);
            if (dateTo) match.sentAt.$lte = new Date(dateTo as string);
        }

        const result = await EmailMessage.aggregate([
            { $match: match },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true }, "opens.isApplePrivacy": { $ne: true } } },
            {
                $facet: {
                    byHour: [
                        { $group: { _id: { $hour: "$opens.openedAt" }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    byDayOfWeek: [
                        { $group: { _id: { $dayOfWeek: "$opens.openedAt" }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    trend: [
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$opens.openedAt" } },
                                opens: { $sum: 1 },
                            },
                        },
                        { $sort: { _id: 1 } },
                        { $limit: 30 },
                    ],
                },
            },
        ]);

        const data = result[0] || { byHour: [], byDayOfWeek: [], trend: [] };
        const dayNames = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        res.json({
            success: true,
            data: {
                byHour: Array.from({ length: 24 }, (_, h) => ({
                    hour: h,
                    label: `${h.toString().padStart(2, "0")}:00`,
                    count: data.byHour.find((i: any) => i._id === h)?.count || 0,
                })),
                byDayOfWeek: data.byDayOfWeek.map((i: any) => ({
                    day: i._id,
                    dayName: dayNames[i._id] || "Unknown",
                    count: i.count,
                })),
                trend: data.trend.map((i: any) => ({
                    date: i._id,
                    opens: i.opens,
                })),
            },
        });
    } catch (error: any) {
        logger.error("Email time breakdown error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get email time breakdown" });
    }
});

export default router;
