/**
 * Unified Report Data Endpoint
 * 
 * Production-grade analytics engine.
 * Each report type computes real metrics with period-over-period comparisons,
 * conversion rates, trend analysis, moving averages, risk scoring, and forecasting.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import Opportunity from "../models/Opportunity";
import Deal from "../models/Deal";
import Contact from "../models/Contact";
import Company from "../models/Company";
import EmailMessage from "../models/EmailMessage";
import Task from "../models/Task";
import Ticket from "../models/Ticket";
import Activity from "../models/Activity";
import Campaign from "../models/Campaign";
import CampaignEnrollment from "../models/CampaignEnrollment";
import Sequence from "../models/Sequence";
import Attribution from "../models/Attribution";
import ContactLifecycleHistory from "../models/ContactLifecycleHistory";
import CallRecording from "../models/CallRecording";
import FormSubmission from "../models/FormSubmission";
import { Types } from "mongoose";
import { ReportQueryEngine } from "../services/ReportQueryEngine";
import Project from "../models/Project";

const router = Router();

// ─── Access Control ───────────────────────────────────────────────────

async function validateAccess(workspaceId: string, userId: string, res: Response): Promise<boolean> {
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
 * Validate report definition structure and sanitize inputs
 * Returns error string or null if valid
 */
function validateReportDefinition(definition: any): string | null {
    const validTypes = ["insight", "funnel", "time_in_stage", "historical", "stage_changed"];
    const validSources = ["opportunity", "contact", "company", "task", "ticket", "email", "deal", "activity", "campaign", "lifecycle", "call", "form"];
    const validAggregations = ["sum", "avg", "count", "min", "max"];
    const validOperators = ["eq", "ne", "gt", "lt", "gte", "lte", "in", "nin", "contains", "exists"];

    if (!validTypes.includes(definition.type)) {
        return `Invalid report type: ${definition.type}`;
    }
    if (!validSources.includes(definition.source)) {
        return `Invalid source: ${definition.source}`;
    }
    if (!definition.metric || !validAggregations.includes(definition.metric.aggregation)) {
        return "Invalid metric aggregation";
    }
    if (definition.filters) {
        for (const filter of definition.filters) {
            if (!validOperators.includes(filter.operator)) {
                return `Invalid filter operator: ${filter.operator}`;
            }
            // Sanitize regex patterns
            if (filter.operator === "contains" && typeof filter.value === "string") {
                filter.value = filter.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        }
    }
    return null;
}

// ─── Helpers ───────────────────────────────────────────────────

function getDateRange(period: string = "30days"): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    switch (period) {
        case "7days": case "7d": start.setDate(end.getDate() - 7); break;
        case "30days": case "30d": start.setDate(end.getDate() - 30); break;
        case "90days": case "90d": start.setDate(end.getDate() - 90); break;
        case "6months": start.setMonth(end.getMonth() - 6); break;
        case "1year": start.setFullYear(end.getFullYear() - 1); break;
        case "quarter":
            const q = Math.floor(end.getMonth() / 3);
            start.setMonth(q * 3, 1); start.setHours(0, 0, 0, 0);
            break;
        case "ytd":
            start.setMonth(0, 1); start.setHours(0, 0, 0, 0);
            break;
        case "all":
            start.setFullYear(2000, 0, 1); start.setHours(0, 0, 0, 0);
            break;
        default:
            // Support custom date range: "custom_2025-01-01_2025-06-30"
            if (period.startsWith("custom_")) {
                const parts = period.replace("custom_", "").split("_");
                if (parts.length === 2) {
                    const customStart = new Date(parts[0]);
                    const customEnd = new Date(parts[1]);
                    if (!isNaN(customStart.getTime()) && !isNaN(customEnd.getTime())) {
                        return { start: customStart, end: customEnd };
                    }
                }
            }
            start.setDate(end.getDate() - 30);
    }
    return { start, end };
}

/**
 * Returns the previous period of same length for comparison
 * Fixes C5: Use exact boundaries, rely on query operators ($lt vs $lte) for precision
 */
function getPreviousPeriod(start: Date, end: Date): { prevStart: Date; prevEnd: Date } {
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime()); // Exact boundary (use $lt in queries)
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    return { prevStart, prevEnd };
}

/** Calculate % change between two values */
function percentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/** Simple moving average over an array of values */
function movingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
        const windowStart = Math.max(0, i - windowSize + 1);
        const window = values.slice(windowStart, i + 1);
        result.push(Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 100) / 100);
    }
    return result;
}

/** Calculate linear trend slope from data points */
function trendSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += (i - xMean) ** 2;
    }
    return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100) / 100;
}

/** Determine trend direction from slope */
function trendDirection(slope: number): "up" | "down" | "flat" {
    if (slope > 0.5) return "up";
    if (slope < -0.5) return "down";
    return "flat";
}

// ─── Dashboard Filter → MongoDB Match ──────────────────────────

/**
 * Convert dashboard-level filters into MongoDB $match conditions.
 * Filters come from the UI filter bar: pipeline, owner, status, source.
 * Each filter has { key, value, label }.
 */
function buildDashboardFilterMatch(filters: { key: string; value: string }[]): Record<string, any> {
    if (!filters || !Array.isArray(filters) || filters.length === 0) return {};

    const match: Record<string, any> = {};

    for (const f of filters) {
        if (!f.key || !f.value) continue;
        switch (f.key) {
            case "pipeline":
                match.pipelineId = new Types.ObjectId(f.value);
                break;
            case "owner":
                // Owner can appear as assigneeId, ownerId, or userId depending on model
                match.$or = [
                    ...(match.$or || []),
                    { assigneeId: new Types.ObjectId(f.value) },
                    { ownerId: new Types.ObjectId(f.value) },
                    { userId: new Types.ObjectId(f.value) },
                ];
                break;
            case "status":
                match.status = f.value;
                break;
            case "source":
                match.source = f.value;
                break;
            case "stage":
                match.stage = f.value;
                break;
            case "priority":
                match.priority = f.value;
                break;
            default:
                // Generic field match for custom filters
                match[f.key] = f.value;
                break;
        }
    }

    return match;
}

/**
 * Inject dashboard-level overrides into the config before passing to report functions.
 * This ensures every legacy report function respects dashboard controls.
 */
function applyDashboardOverrides(config: any): any {
    const enriched = { ...config };

    // Build MongoDB $match from dashboardFilters
    if (config.dashboardFilters && Array.isArray(config.dashboardFilters)) {
        enriched._dashboardMatch = buildDashboardFilterMatch(config.dashboardFilters);
    }

    return enriched;
}

// ─── INSIGHT — Real-time KPIs with period comparison ───────────

async function getInsightData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const metric = config.metric || "pipeline_value";
    const period = config.period || "30days";
    const { start, end } = getDateRange(period);
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const dm = config._dashboardMatch || {}; // dashboard-level filters


    switch (metric) {
        case "pipeline_value": {
            const [current, previous] = await Promise.all([
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: { $ne: "lost" }, ...dm } },
                    { $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 }, avgDeal: { $avg: "$value" } } },
                ]),
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: { $ne: "lost" }, createdAt: { $lte: prevEnd }, ...dm } },
                    { $group: { _id: null, total: { $sum: "$value" } } },
                ]),
            ]);
            const val = current[0]?.total || 0;
            const prev = previous[0]?.total || 0;
            return {
                value: val, label: "Pipeline Value", format: "currency",
                change: percentChange(val, prev),
                dealCount: current[0]?.count || 0,
                avgDealSize: Math.round(current[0]?.avgDeal || 0),
            };
        }
        case "win_rate": {
            const [curWon, curTotal, prevWon, prevTotal] = await Promise.all([
                Opportunity.countDocuments({ workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end }, ...dm }),
                Opportunity.countDocuments({ workspaceId: wId, status: { $in: ["won", "lost"] }, updatedAt: { $gte: start, $lte: end }, ...dm }),
                Opportunity.countDocuments({ workspaceId: wId, status: "won", updatedAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
                Opportunity.countDocuments({ workspaceId: wId, status: { $in: ["won", "lost"] }, updatedAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
            ]);
            const curRate = curTotal > 0 ? Math.round((curWon / curTotal) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevWon / prevTotal) * 100) : 0;
            return {
                value: curRate, label: "Win Rate", format: "percent",
                change: curRate - prevRate, // absolute point change
                wonDeals: curWon, totalDecided: curTotal,
            };
        }
        case "open_deals": {
            const [current, previous] = await Promise.all([
                Opportunity.countDocuments({ workspaceId: wId, status: { $nin: ["won", "lost"] }, ...dm }),
                Opportunity.countDocuments({ workspaceId: wId, status: { $nin: ["won", "lost"] }, createdAt: { $lte: prevEnd }, ...dm }),
            ]);
            return {
                value: current, label: "Open Deals", format: "number",
                change: percentChange(current, previous),
            };
        }
        case "revenue_won": {
            const [curRevenue, prevRevenue] = await Promise.all([
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end }, ...dm } },
                    { $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 } } },
                ]),
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: prevStart, $lte: prevEnd }, ...dm } },
                    { $group: { _id: null, total: { $sum: "$value" } } },
                ]),
            ]);
            const val = curRevenue[0]?.total || 0;
            const prev = prevRevenue[0]?.total || 0;
            return {
                value: val, label: "Revenue Won", format: "currency",
                change: percentChange(val, prev),
                dealsWon: curRevenue[0]?.count || 0,
            };
        }
        case "total_contacts": {
            const [cur, prev, newThisPeriod] = await Promise.all([
                Contact.countDocuments({ workspaceId: wId, ...dm }),
                Contact.countDocuments({ workspaceId: wId, createdAt: { $lte: prevEnd }, ...dm }),
                Contact.countDocuments({ workspaceId: wId, createdAt: { $gte: start, $lte: end }, ...dm }),
            ]);
            return {
                value: cur, label: "Total Contacts", format: "number",
                change: percentChange(cur, prev),
                newThisPeriod,
            };
        }
        case "total_companies": {
            const [cur, prev] = await Promise.all([
                Company.countDocuments({ workspaceId: wId, ...dm }),
                Company.countDocuments({ workspaceId: wId, createdAt: { $lte: prevEnd }, ...dm }),
            ]);
            return { value: cur, label: "Total Companies", format: "number", change: percentChange(cur, prev) };
        }
        case "emails_sent": {
            const [cur, prev] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
            ]);
            return { value: cur, label: "Emails Sent", format: "number", change: percentChange(cur, prev) };
        }
        case "open_rate": {
            const [opened, total, prevOpened, prevTotal] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.opened": true, sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.opened": true, sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
            ]);
            const curRate = total > 0 ? Math.round((opened / total) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevOpened / prevTotal) * 100) : 0;
            return { value: curRate, label: "Open Rate", format: "percent", change: curRate - prevRate };
        }
        case "click_rate": {
            const [clicked, total, prevClicked, prevTotal] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.clicked": true, sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.clicked": true, sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
            ]);
            const curRate = total > 0 ? Math.round((clicked / total) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevClicked / prevTotal) * 100) : 0;
            return { value: curRate, label: "Click Rate", format: "percent", change: curRate - prevRate };
        }
        case "reply_rate": {
            const [replied, total, prevReplied, prevTotal] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.replied": true, sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.replied": true, sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm }),
            ]);
            const curRate = total > 0 ? Math.round((replied / total) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevReplied / prevTotal) * 100) : 0;
            return { value: curRate, label: "Reply Rate", format: "percent", change: curRate - prevRate };
        }
        case "open_tasks": {
            const [cur, prev] = await Promise.all([
                Task.countDocuments({ workspaceId: wId, status: { $ne: "completed" }, ...dm }),
                Task.countDocuments({ workspaceId: wId, status: { $ne: "completed" }, createdAt: { $lte: prevEnd }, ...dm }),
            ]);
            return { value: cur, label: "Open Tasks", format: "number", change: percentChange(cur, prev) };
        }
        case "open_tickets": {
            const [cur, prev] = await Promise.all([
                Ticket.countDocuments({ workspaceId: wId, status: { $in: ["open", "in_progress"] }, ...dm }),
                Ticket.countDocuments({ workspaceId: wId, status: { $in: ["open", "in_progress"] }, createdAt: { $lte: prevEnd }, ...dm }),
            ]);
            return { value: cur, label: "Open Tickets", format: "number", change: percentChange(cur, prev) };
        }
        default:
            return { value: 0, label: metric, format: "number", change: 0 };
    }
}

// ─── HISTORICAL — Time-series with trend + moving average ──────

async function getHistoricalData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const { start, end } = getDateRange(config.period || "6months");
    const metric = config.metric || "revenue";
    const dm = config._dashboardMatch || {};

    let rawData: any[] = [];

    if (metric === "revenue") {
        rawData = await Opportunity.aggregate([
            { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$updatedAt" } },
                    value: { $sum: "$value" },
                    count: { $sum: 1 },
                    avgDeal: { $avg: "$value" },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    } else if (metric === "deals_created") {
        rawData = await Opportunity.aggregate([
            { $match: { workspaceId: wId, createdAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    value: { $sum: 1 },
                    totalValue: { $sum: "$value" },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    } else if (metric === "contacts_created") {
        rawData = await Contact.aggregate([
            { $match: { workspaceId: wId, createdAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    value: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    const values = rawData.map((d) => d.value);
    const ma = movingAverage(values, 3);
    const slope = trendSlope(values);
    const trend = trendDirection(slope);

    // Cumulative running total
    let cumulative = 0;
    const periods = rawData.map((d, i) => {
        cumulative += d.value;
        return {
            period: d._id,
            value: d.value,
            count: d.count,
            avgDeal: d.avgDeal ? Math.round(d.avgDeal) : undefined,
            totalValue: d.totalValue,
            movingAvg: ma[i],
            cumulative,
        };
    });

    // Period-over-period summary
    const totalCurrent = values.reduce((a, b) => a + b, 0);
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    let prevTotal = 0;
    if (metric === "revenue") {
        const prev = await Opportunity.aggregate([
            { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: prevStart, $lte: prevEnd }, ...dm } },
            { $group: { _id: null, total: { $sum: "$value" } } },
        ]);
        prevTotal = prev[0]?.total || 0;
    } else if (metric === "deals_created") {
        prevTotal = await Opportunity.countDocuments({ workspaceId: wId, createdAt: { $gte: prevStart, $lte: prevEnd }, ...dm });
    } else if (metric === "contacts_created") {
        prevTotal = await Contact.countDocuments({ workspaceId: wId, createdAt: { $gte: prevStart, $lte: prevEnd }, ...dm });
    }

    return {
        periods,
        summary: {
            total: totalCurrent,
            previousTotal: prevTotal,
            change: percentChange(totalCurrent, prevTotal),
            trend,
            trendSlope: slope,
            avgPerPeriod: periods.length > 0 ? Math.round(totalCurrent / periods.length) : 0,
        },
    };
}

// ─── FUNNEL — Conversion rates + velocity ──────────────────────
// Fixed C1: Now uses dynamic pipeline stages instead of hardcoded strings

async function getFunnelData(workspaceId: string, _config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = _config._dashboardMatch || {};

    // Get actual pipeline data with stage lookups (fixes C1)
    const pipeline = await Opportunity.aggregate([
        { $match: { workspaceId: wId, ...dm } },
        {
            $lookup: {
                from: "pipelines",
                localField: "pipelineId",
                foreignField: "_id",
                as: "pipeline",
            },
        },
        { $unwind: { path: "$pipeline", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                currentStage: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$pipeline.stages",
                                cond: { $eq: ["$$this._id", "$stageId"] },
                            },
                        },
                        0,
                    ],
                },
            },
        },
        {
            $group: {
                _id: "$currentStage.name",
                count: { $sum: 1 },
                value: { $sum: "$value" },
                avgValue: { $avg: "$value" },
                avgProbability: { $avg: "$probability" },
                order: { $first: "$currentStage.order" },
            },
        },
        { $sort: { order: 1 } },
    ]);

    const stageMap = new Map(pipeline.map((s) => [s._id, s]));

    // Also count lost deals separately
    const lostCount = await Opportunity.countDocuments({ workspaceId: wId, status: "lost", ...dm });
    const totalDeals = pipeline.reduce((s, p) => s + p.count, 0) + lostCount;

    // Use actual stage names from pipeline (not hardcoded)
    const stages = pipeline.map((p) => p._id).filter(Boolean);

    const funnel = stages.map((stage, i) => {
        const data = stageMap.get(stage);
        const count = data?.count || 0;
        const prevStageCount = i === 0 ? totalDeals : (stageMap.get(stages[i - 1])?.count || 0);
        const conversionRate = prevStageCount > 0 ? Math.round((count / prevStageCount) * 100) : 0;

        return {
            stage,
            count,
            value: data?.value || 0,
            avgDealSize: Math.round(data?.avgValue || 0),
            avgProbability: Math.round(data?.avgProbability || 0),
            conversionRate,
            dropoff: prevStageCount - count,
        };
    });

    // Overall conversion (first stage → won status)
    const firstStageCount = stages.length > 0 ? (stageMap.get(stages[0])?.count || 0) : 0;
    const wonCount = await Opportunity.countDocuments({ workspaceId: wId, status: "won", ...dm });
    const overallConversion = firstStageCount > 0 ? Math.round((wonCount / firstStageCount) * 100) : 0;

    return {
        stages: funnel,
        summary: {
            totalDeals,
            lostCount,
            overallConversion,
            totalPipelineValue: pipeline.reduce((s, p) => s + (p.value || 0), 0),
        },
    };
}

// ─── TIME IN STAGE — With percentiles + bottleneck detection ───
// Updated to use Opportunity model (unified approach, fixes A1)

async function getTimeInStageData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const aggregation = config.metric || "avg";

    // Query both Opportunity (primary) and Deal (legacy fallback) during transition
    const [opportunities, legacyDeals] = await Promise.all([
        Opportunity.find({
            workspaceId: wId,
            stageHistory: { $exists: true, $not: { $size: 0 } },
            ...dm
        }).select("stageHistory value").lean(),
        Deal.find({
            workspaceId: wId,
            stageHistory: { $exists: true, $not: { $size: 0 } },
            ...dm
        }).select("stageHistory value").lean(),
    ]);

    const stageTimings: Record<string, number[]> = {};
    const stageValues: Record<string, number[]> = {};

    // Process Opportunity records (preferred - has duration pre-calculated)
    for (const opp of opportunities) {
        if (!opp.stageHistory || opp.stageHistory.length === 0) continue;
        for (const stage of opp.stageHistory) {
            if (!stage.duration || !stage.exitedAt) continue; // Skip incomplete/current stage
            const durationHours = stage.duration / (1000 * 60 * 60); // Convert ms to hours
            const stageName = stage.stageName || "Unknown";
            if (!stageTimings[stageName]) {
                stageTimings[stageName] = [];
                stageValues[stageName] = [];
            }
            stageTimings[stageName].push(durationHours);
            stageValues[stageName].push(opp.value || 0);
        }
    }

    // Process legacy Deal records (fallback)
    for (const deal of legacyDeals) {
        if (!deal.stageHistory || deal.stageHistory.length < 2) continue;
        for (let i = 0; i < deal.stageHistory.length - 1; i++) {
            const current = deal.stageHistory[i];
            const next = deal.stageHistory[i + 1];
            const durationHours = (new Date(next.changedAt).getTime() - new Date(current.changedAt).getTime()) / (1000 * 60 * 60);
            if (!stageTimings[current.stage]) {
                stageTimings[current.stage] = [];
                stageValues[current.stage] = [];
            }
            stageTimings[current.stage].push(durationHours);
            stageValues[current.stage].push(deal.value || 0);
        }
    }

    const stages = Object.entries(stageTimings).map(([stage, times]) => {
        const sorted = [...times].sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        const totalValueAtStake = stageValues[stage].reduce((a, b) => a + b, 0);

        let displayValue = avg;
        if (aggregation === "min") displayValue = Math.min(...times);
        else if (aggregation === "max") displayValue = Math.max(...times);
        else if (aggregation === "median") displayValue = median;

        return {
            stage,
            value: Math.round(displayValue * 10) / 10,
            avg: Math.round(avg * 10) / 10,
            median: Math.round(median * 10) / 10,
            min: Math.round(Math.min(...times) * 10) / 10,
            max: Math.round(Math.max(...times) * 10) / 10,
            p90: Math.round(p90 * 10) / 10,
            count: times.length,
            totalValue: totalValueAtStake,
            unit: "hours",
        };
    });

    // Identify bottleneck (stage with highest avg time)
    const bottleneck = stages.reduce((max, s) => (s.avg > (max?.avg || 0) ? s : max), stages[0]);

    return {
        stages,
        bottleneck: bottleneck?.stage || null,
        totalAvgCycleTime: Math.round(stages.reduce((s, st) => s + st.avg, 0) * 10) / 10,
    };
}

// ─── STAGE CHANGED — Transitions with velocity ────────────────
// Updated to use Opportunity model (unified approach, fixes A1)

async function getStageChangedData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    // Query both Opportunity (primary) and Deal (legacy fallback) during transition
    const [currentOpps, previousOpps, currentDeals, previousDeals] = await Promise.all([
        Opportunity.find({
            workspaceId: wId,
            "stageHistory.enteredAt": { $gte: start, $lte: end },
            ...dm
        }).select("stageHistory value").lean(),
        Opportunity.find({
            workspaceId: wId,
            "stageHistory.enteredAt": { $gte: prevStart, $lte: prevEnd },
            ...dm
        }).select("stageHistory value").lean(),
        Deal.find({
            workspaceId: wId,
            "stageHistory.changedAt": { $gte: start, $lte: end },
            ...dm
        }).select("stageHistory value").lean(),
        Deal.find({
            workspaceId: wId,
            "stageHistory.changedAt": { $gte: prevStart, $lte: prevEnd },
            ...dm
        }).select("stageHistory value").lean(),
    ]);

    function countTransitions(records: any[], rangeStart: Date, rangeEnd: Date, isOpportunity = false) {
        const transitions: Record<string, { count: number; value: number }> = {};
        for (const record of records) {
            if (!record.stageHistory) continue;
            for (const entry of record.stageHistory) {
                // Handle Opportunity format (enteredAt, stageName) vs Deal format (changedAt, stage)
                const dt = isOpportunity ? new Date(entry.enteredAt) : new Date(entry.changedAt);
                const stageName = isOpportunity ? (entry.stageName || "Unknown") : entry.stage;

                if (dt >= rangeStart && dt <= rangeEnd) {
                    if (!transitions[stageName]) transitions[stageName] = { count: 0, value: 0 };
                    transitions[stageName].count++;
                    transitions[stageName].value += record.value || 0;
                }
            }
        }
        return transitions;
    }

    // Combine data from both sources
    const currentOppTransitions = countTransitions(currentOpps, start, end, true);
    const previousOppTransitions = countTransitions(previousOpps, prevStart, prevEnd, true);
    const currentDealTransitions = countTransitions(currentDeals, start, end, false);
    const previousDealTransitions = countTransitions(previousDeals, prevStart, prevEnd, false);

    // Merge transitions from both sources
    const mergeTransitions = (opp: any, deal: any) => {
        const merged: Record<string, { count: number; value: number }> = { ...opp };
        for (const [stage, data] of Object.entries(deal)) {
            if (!merged[stage]) merged[stage] = { count: 0, value: 0 };
            merged[stage].count += (data as any).count;
            merged[stage].value += (data as any).value;
        }
        return merged;
    };

    const current = mergeTransitions(currentOppTransitions, currentDealTransitions);
    const previous = mergeTransitions(previousOppTransitions, previousDealTransitions);

    const allStages = new Set([...Object.keys(current), ...Object.keys(previous)]);
    const transitions = Array.from(allStages).map((stage) => ({
        stage,
        count: current[stage]?.count || 0,
        value: current[stage]?.value || 0,
        previousCount: previous[stage]?.count || 0,
        change: percentChange(current[stage]?.count || 0, previous[stage]?.count || 0),
    }));

    const totalCurrent = transitions.reduce((s, t) => s + t.count, 0);
    const totalPrevious = transitions.reduce((s, t) => s + t.previousCount, 0);

    return {
        transitions,
        summary: {
            totalTransitions: totalCurrent,
            previousTransitions: totalPrevious,
            change: percentChange(totalCurrent, totalPrevious),
            velocity: transitions.length > 0 ? Math.round(totalCurrent / transitions.length) : 0,
        },
    };
}

// ─── EMAIL — Engagement rates + trend analysis ─────────────────

async function getEmailData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");
    const groupBy = config.groupBy || "day";
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    const format = groupBy === "day" ? "%Y-%m-%d" : groupBy === "week" ? "%Y-W%V" : "%Y-%m";

    const [currentData, prevData] = await Promise.all([
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: { $dateToString: { format, date: "$sentAt" } },
                    sent: { $sum: 1 },
                    opened: { $sum: { $cond: [{ $eq: ["$tracking.opened", true] }, 1, 0] } },
                    clicked: { $sum: { $cond: [{ $eq: ["$tracking.clicked", true] }, 1, 0] } },
                    replied: { $sum: { $cond: [{ $eq: ["$tracking.replied", true] }, 1, 0] } },
                    bounced: { $sum: { $cond: [{ $eq: ["$tracking.bounced", true] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd }, ...dm } },
            {
                $group: {
                    _id: null,
                    sent: { $sum: 1 },
                    opened: { $sum: { $cond: [{ $eq: ["$tracking.opened", true] }, 1, 0] } },
                    clicked: { $sum: { $cond: [{ $eq: ["$tracking.clicked", true] }, 1, 0] } },
                    replied: { $sum: { $cond: [{ $eq: ["$tracking.replied", true] }, 1, 0] } },
                },
            },
        ]),
    ]);

    // Calculate rates per period
    const periods = currentData.map((d) => ({
        period: d._id,
        sent: d.sent,
        opened: d.opened,
        clicked: d.clicked,
        replied: d.replied,
        bounced: d.bounced || 0,
        openRate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0,
        clickRate: d.sent > 0 ? Math.round((d.clicked / d.sent) * 100) : 0,
        replyRate: d.sent > 0 ? Math.round((d.replied / d.sent) * 100) : 0,
    }));

    // Summary with comparison
    const totalSent = periods.reduce((s, p) => s + p.sent, 0);
    const totalOpened = periods.reduce((s, p) => s + p.opened, 0);
    const totalClicked = periods.reduce((s, p) => s + p.clicked, 0);
    const totalReplied = periods.reduce((s, p) => s + p.replied, 0);
    const prev = prevData[0] || { sent: 0, opened: 0, clicked: 0, replied: 0 };

    // Trend on sent volume
    const sentValues = periods.map((p) => p.sent);
    const sentTrend = trendDirection(trendSlope(sentValues));

    return {
        periods,
        summary: {
            totalSent,
            totalOpened,
            totalClicked,
            totalReplied,
            openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
            clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
            replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
            sentChange: percentChange(totalSent, prev.sent),
            openRateChange: (() => {
                const curR = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
                const prevR = prev.sent > 0 ? Math.round((prev.opened / prev.sent) * 100) : 0;
                return curR - prevR;
            })(),
            trend: sentTrend,
        },
    };
}

// ─── EMAIL ENGAGEMENT DEEP DIVE — Geo, device, response time, open frequency ──
// Covers: reply geo-location, open count distribution, device breakdown, response time

async function getEmailEngagementDeepDive(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");

    const baseMatch = { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm };

    const [geoData, deviceData, openFrequency, responseTimeData, replySummary] = await Promise.all([
        // 1. Geo heatmap — where opens come from (country + city)
        EmailMessage.aggregate([
            { $match: baseMatch },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true }, "opens.country": { $ne: null } } },
            {
                $group: {
                    _id: { country: "$opens.country", countryCode: "$opens.countryCode", city: "$opens.city" },
                    opens: { $sum: 1 },
                    uniqueEmails: { $addToSet: "$_id" },
                },
            },
            {
                $project: {
                    _id: 0,
                    country: "$_id.country",
                    countryCode: "$_id.countryCode",
                    city: "$_id.city",
                    opens: 1,
                    uniqueEmails: { $size: "$uniqueEmails" },
                }
            },
            { $sort: { opens: -1 } },
            { $limit: 20 },
        ]),

        // 2. Device / browser / OS breakdown
        EmailMessage.aggregate([
            { $match: baseMatch },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true } } },
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
        ]),

        // 3. Open frequency distribution (how many times each email was opened)
        EmailMessage.aggregate([
            { $match: { ...baseMatch, opened: true } },
            {
                $bucket: {
                    groupBy: "$openCount",
                    boundaries: [1, 2, 4, 7, 11, 10000],
                    default: "other",
                    output: {
                        count: { $sum: 1 },
                        avgOpenCount: { $avg: "$openCount" },
                    },
                },
            },
        ]),

        // 4. Response time — time from sentAt to first open & repliedAt
        EmailMessage.aggregate([
            { $match: { ...baseMatch, opened: true, openedAt: { $ne: null } } },
            {
                $project: {
                    _id: 0,
                    timeToOpenMs: { $subtract: ["$openedAt", "$sentAt"] },
                    timeToReplyMs: {
                        $cond: [
                            { $and: [{ $eq: ["$replied", true] }, { $ne: ["$repliedAt", null] }] },
                            { $subtract: ["$repliedAt", "$sentAt"] },
                            null,
                        ],
                    },
                },
            },
            // Filter out negative or zero time-to-open (data integrity guard)
            { $match: { timeToOpenMs: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    avgTimeToOpenMs: { $avg: "$timeToOpenMs" },
                    avgTimeToReplyMs: { $avg: "$timeToReplyMs" },
                    totalWithOpen: { $sum: 1 },
                    totalWithReply: { $sum: { $cond: [{ $ne: ["$timeToReplyMs", null] }, 1, 0] } },
                    openWithin1h: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 3600000] }, 1, 0] } },
                    openWithin24h: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 86400000] }, 1, 0] } },
                    replyWithin1h: { $sum: { $cond: [{ $and: [{ $ne: ["$timeToReplyMs", null] }, { $lte: ["$timeToReplyMs", 3600000] }] }, 1, 0] } },
                    replyWithin24h: { $sum: { $cond: [{ $and: [{ $ne: ["$timeToReplyMs", null] }, { $lte: ["$timeToReplyMs", 86400000] }] }, 1, 0] } },
                },
            },
        ]),

        // 5. Overall reply summary
        EmailMessage.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: 1 },
                    totalOpened: { $sum: { $cond: ["$opened", 1, 0] } },
                    totalReplied: { $sum: { $cond: ["$replied", 1, 0] } },
                    totalClicked: { $sum: { $cond: ["$clicked", 1, 0] } },
                    avgOpenCount: { $avg: { $cond: ["$opened", "$openCount", 0] } },
                },
            },
        ]),
    ]);

    // Format device data with percentages
    const devices = deviceData[0] || { byDevice: [], byBrowser: [], byOS: [] };
    const addPercentages = (items: any[]) => {
        const total = items.reduce((s: number, i: any) => s + i.count, 0);
        return items.map((i: any) => ({
            name: i._id,
            count: i.count,
            percentage: total > 0 ? Math.round((i.count / total) * 100) : 0,
        }));
    };

    // Format open frequency buckets
    const bucketLabels: Record<string, string> = { "1": "Opened once", "2": "2-3 times", "4": "4-6 times", "7": "7-10 times", "11": "11+ times", "other": "Uncategorized" };
    const openDist = openFrequency
        .filter((b: any) => b._id !== "other")
        .map((b: any) => ({
            bucket: bucketLabels[String(b._id)] || `${b._id}+`,
            count: b.count,
            avgOpenCount: Math.round((b.avgOpenCount || 0) * 10) / 10,
        }));

    // Format response time
    const rt = responseTimeData[0] || {};
    const msToHours = (ms: number) => Math.round((ms / 3600000) * 10) / 10;
    const summary = replySummary[0] || { totalSent: 0, totalOpened: 0, totalReplied: 0, totalClicked: 0, avgOpenCount: 0 };

    return {
        geoBreakdown: geoData,
        deviceBreakdown: {
            devices: addPercentages(devices.byDevice),
            browsers: addPercentages(devices.byBrowser),
            os: addPercentages(devices.byOS),
        },
        openFrequency: openDist,
        responseTime: {
            avgTimeToOpenHrs: msToHours(rt.avgTimeToOpenMs || 0),
            avgTimeToReplyHrs: msToHours(rt.avgTimeToReplyMs || 0),
            openWithin1hPct: rt.totalWithOpen > 0 ? Math.round((rt.openWithin1h / rt.totalWithOpen) * 100) : 0,
            openWithin24hPct: rt.totalWithOpen > 0 ? Math.round((rt.openWithin24h / rt.totalWithOpen) * 100) : 0,
            replyWithin1hPct: rt.totalWithReply > 0 ? Math.round((rt.replyWithin1h / rt.totalWithReply) * 100) : 0,
            replyWithin24hPct: rt.totalWithReply > 0 ? Math.round((rt.replyWithin24h / rt.totalWithReply) * 100) : 0,
        },
        summary: {
            totalSent: summary.totalSent,
            totalOpened: summary.totalOpened,
            totalReplied: summary.totalReplied,
            totalClicked: summary.totalClicked,
            avgOpenCount: Math.round((summary.avgOpenCount || 0) * 10) / 10,
            openRate: summary.totalSent > 0 ? Math.round((summary.totalOpened / summary.totalSent) * 100) : 0,
            replyRate: summary.totalSent > 0 ? Math.round((summary.totalReplied / summary.totalSent) * 100) : 0,
        },
    };
}

// ─── EMAIL REPLY ANALYSIS — Reply geo-location, timing, sentiment ──────
// Covers: where replies come from, when replies happen, time-to-reply, sentiment

async function getEmailReplyAnalysis(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");

    const baseMatch = { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, replied: true, ...dm };

    const [replyGeo, replyTiming, timeToReply, replySentiment, recentReplies] = await Promise.all([
        // 1. Reply geo-location — where replies originated from
        // Uses the last open event of replied emails as a proxy for reply location
        EmailMessage.aggregate([
            { $match: baseMatch },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true }, "opens.country": { $ne: null } } },
            // Take the most recent open per email (closest to reply time)
            { $sort: { "opens.openedAt": -1 } },
            {
                $group: {
                    _id: "$_id",
                    country: { $first: "$opens.country" },
                    countryCode: { $first: "$opens.countryCode" },
                    city: { $first: "$opens.city" },
                    timezone: { $first: "$opens.timezone" },
                    repliedAt: { $first: "$repliedAt" },
                },
            },
            // Now group by location
            {
                $group: {
                    _id: { country: "$country", countryCode: "$countryCode", city: "$city" },
                    replies: { $sum: 1 },
                    timezone: { $first: "$timezone" },
                },
            },
            {
                $project: {
                    _id: 0,
                    country: "$_id.country",
                    countryCode: "$_id.countryCode",
                    city: "$_id.city",
                    timezone: 1,
                    replies: 1,
                }
            },
            { $sort: { replies: -1 } },
            { $limit: 15 },
        ]),

        // 2. Reply timing patterns — when people reply (hour of day, day of week)
        EmailMessage.aggregate([
            { $match: { ...baseMatch, repliedAt: { $ne: null } } },
            {
                $facet: {
                    byHour: [
                        { $group: { _id: { $hour: "$repliedAt" }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    byDayOfWeek: [
                        { $group: { _id: { $dayOfWeek: "$repliedAt" }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    byDate: [
                        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$repliedAt" } }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                        { $limit: 30 },
                    ],
                },
            },
        ]),

        // 3. Time to reply distribution
        EmailMessage.aggregate([
            { $match: { ...baseMatch, repliedAt: { $ne: null } } },
            {
                $project: {
                    timeToReplyMs: { $subtract: ["$repliedAt", "$sentAt"] },
                    repliedAt: 1,
                    sentAt: 1,
                },
            },
            // Filter out negative times (data integrity guard)
            { $match: { timeToReplyMs: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    avgMs: { $avg: "$timeToReplyMs" },
                    minMs: { $min: "$timeToReplyMs" },
                    maxMs: { $max: "$timeToReplyMs" },
                    total: { $sum: 1 },
                    // Exclusive buckets for proper distribution
                    within30min: { $sum: { $cond: [{ $lte: ["$timeToReplyMs", 1800000] }, 1, 0] } },
                    from30mTo1h: { $sum: { $cond: [{ $and: [{ $gt: ["$timeToReplyMs", 1800000] }, { $lte: ["$timeToReplyMs", 3600000] }] }, 1, 0] } },
                    from1hTo4h: { $sum: { $cond: [{ $and: [{ $gt: ["$timeToReplyMs", 3600000] }, { $lte: ["$timeToReplyMs", 14400000] }] }, 1, 0] } },
                    from4hTo24h: { $sum: { $cond: [{ $and: [{ $gt: ["$timeToReplyMs", 14400000] }, { $lte: ["$timeToReplyMs", 86400000] }] }, 1, 0] } },
                    from24hTo48h: { $sum: { $cond: [{ $and: [{ $gt: ["$timeToReplyMs", 86400000] }, { $lte: ["$timeToReplyMs", 172800000] }] }, 1, 0] } },
                    after48h: { $sum: { $cond: [{ $gt: ["$timeToReplyMs", 172800000] }, 1, 0] } },
                },
            },
        ]),

        // 4. Reply sentiment breakdown
        EmailMessage.aggregate([
            { $match: { ...baseMatch, replySentiment: { $ne: null } } },
            {
                $group: {
                    _id: "$replySentiment",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]),

        // 5. Recent replies with detail
        EmailMessage.find(baseMatch)
            .sort({ repliedAt: -1 })
            .limit(20)
            .select("toEmail subject repliedAt replySentiment openCount sentAt opens")
            .lean(),
    ]);

    // Format timing data
    const dayNames = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timingData = replyTiming[0] || { byHour: [], byDayOfWeek: [], byDate: [] };

    const byHour = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${h.toString().padStart(2, "0")}:00`,
        count: timingData.byHour.find((i: any) => i._id === h)?.count || 0,
    }));

    const byDayOfWeek = timingData.byDayOfWeek.map((i: any) => ({
        day: i._id,
        dayName: dayNames[i._id] || "Unknown",
        count: i.count,
    }));

    // Peak reply times
    const peakHour = byHour.reduce((max, h) => h.count > max.count ? h : max, byHour[0]);
    const peakDay = byDayOfWeek.reduce((max: any, d: any) => d.count > max.count ? d : max, byDayOfWeek[0] || { dayName: "N/A", count: 0 });

    // Time-to-reply distribution
    const ttr = timeToReply[0] || { total: 0 };
    const msToReadable = (ms: number) => {
        if (!ms) return "N/A";
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 24) return `${Math.round(hours / 24)}d ${hours % 24}h`;
        return `${hours}h ${minutes}m`;
    };

    // Recent replies with geo info from opens array
    const recentRepliesFormatted = (recentReplies as any[]).map((r: any) => {
        const lastOpen = r.opens?.filter((o: any) => !o.isBot && o.country)?.sort((a: any, b: any) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
        )[0];
        return {
            email: r.toEmail,
            subject: r.subject,
            repliedAt: r.repliedAt,
            sentAt: r.sentAt,
            timeToReply: r.repliedAt && r.sentAt ? msToReadable(new Date(r.repliedAt).getTime() - new Date(r.sentAt).getTime()) : "N/A",
            sentiment: r.replySentiment || "unknown",
            openCount: r.openCount || 0,
            location: lastOpen ? { country: lastOpen.country, city: lastOpen.city, countryCode: lastOpen.countryCode } : null,
        };
    });

    // Sentiment with percentages
    const totalSentiment = replySentiment.reduce((s: number, i: any) => s + i.count, 0);

    return {
        replyGeoLocation: replyGeo,
        replyTiming: {
            byHour,
            byDayOfWeek,
            trend: timingData.byDate.map((i: any) => ({ date: i._id, replies: i.count })),
            peakHour: peakHour?.label || "N/A",
            peakDay: peakDay?.dayName || "N/A",
        },
        timeToReply: {
            avgTime: msToReadable(ttr.avgMs),
            fastestTime: msToReadable(ttr.minMs),
            slowestTime: msToReadable(ttr.maxMs),
            totalReplies: ttr.total || 0,
            distribution: [
                { label: "< 30 min", count: ttr.within30min || 0, pct: ttr.total > 0 ? Math.round(((ttr.within30min || 0) / ttr.total) * 100) : 0 },
                { label: "30m – 1h", count: ttr.from30mTo1h || 0, pct: ttr.total > 0 ? Math.round(((ttr.from30mTo1h || 0) / ttr.total) * 100) : 0 },
                { label: "1h – 4h", count: ttr.from1hTo4h || 0, pct: ttr.total > 0 ? Math.round(((ttr.from1hTo4h || 0) / ttr.total) * 100) : 0 },
                { label: "4h – 24h", count: ttr.from4hTo24h || 0, pct: ttr.total > 0 ? Math.round(((ttr.from4hTo24h || 0) / ttr.total) * 100) : 0 },
                { label: "24h – 48h", count: ttr.from24hTo48h || 0, pct: ttr.total > 0 ? Math.round(((ttr.from24hTo48h || 0) / ttr.total) * 100) : 0 },
                { label: "> 48h", count: ttr.after48h || 0, pct: ttr.total > 0 ? Math.round(((ttr.after48h || 0) / ttr.total) * 100) : 0 },
            ],
        },
        sentiment: {
            data: replySentiment.map((i: any) => ({
                sentiment: i._id,
                count: i.count,
                percentage: totalSentiment > 0 ? Math.round((i.count / totalSentiment) * 100) : 0,
            })),
            total: totalSentiment,
        },
        recentReplies: recentRepliesFormatted,
    };
}

// ─── EMAIL OPEN HEATMAP — Hour×Day grid, open velocity, re-openers ─────
// Covers: when emails are opened (heatmap), how many times (open count), best send time

async function getEmailOpenHeatmap(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");

    const baseMatch = { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm };

    const [heatmapData, openVelocity, reOpeners, totalStats] = await Promise.all([
        // 1. Hour × Day of Week heatmap
        EmailMessage.aggregate([
            { $match: baseMatch },
            { $unwind: "$opens" },
            { $match: { "opens.isBot": { $ne: true }, "opens.isApplePrivacy": { $ne: true } } },
            {
                $group: {
                    _id: {
                        hour: { $hour: "$opens.openedAt" },
                        dayOfWeek: { $dayOfWeek: "$opens.openedAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
        ]),

        // 2. Open velocity — time between sentAt and open
        EmailMessage.aggregate([
            { $match: { ...baseMatch, opened: true } },
            {
                $project: {
                    timeToOpenMs: { $subtract: ["$openedAt", "$sentAt"] },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    within5min: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 300000] }, 1, 0] } },
                    within15min: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 900000] }, 1, 0] } },
                    within1h: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 3600000] }, 1, 0] } },
                    within4h: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 14400000] }, 1, 0] } },
                    within24h: { $sum: { $cond: [{ $lte: ["$timeToOpenMs", 86400000] }, 1, 0] } },
                    after24h: { $sum: { $cond: [{ $gt: ["$timeToOpenMs", 86400000] }, 1, 0] } },
                },
            },
        ]),

        // 3. Re-openers — contacts who opened emails multiple times
        EmailMessage.aggregate([
            { $match: { ...baseMatch, opened: true, openCount: { $gte: 2 } } },
            {
                $lookup: {
                    from: "contacts",
                    localField: "contactId",
                    foreignField: "_id",
                    as: "contact",
                },
            },
            { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    email: "$toEmail",
                    contactName: {
                        $concat: [
                            { $ifNull: ["$contact.firstName", ""] },
                            " ",
                            { $ifNull: ["$contact.lastName", ""] },
                        ],
                    },
                    subject: 1,
                    openCount: 1,
                    firstOpenedAt: "$openedAt",
                    lastOpenedAt: 1,
                    replied: 1,
                },
            },
            { $sort: { openCount: -1 } },
            { $limit: 15 },
        ]),

        // 4. Total stats for context
        EmailMessage.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: 1 },
                    totalOpened: { $sum: { $cond: ["$opened", 1, 0] } },
                    avgOpenCount: { $avg: { $cond: ["$opened", "$openCount", null] } },
                    maxOpenCount: { $max: "$openCount" },
                    multiOpeners: { $sum: { $cond: [{ $gte: ["$openCount", 2] }, 1, 0] } },
                },
            },
        ]),
    ]);

    // Build 7×24 heatmap matrix
    const dayNames = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const heatmap: Array<{ dayOfWeek: number; dayName: string; hour: number; hourLabel: string; count: number }> = [];
    let maxCount = 0;

    for (let day = 1; day <= 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            const match = heatmapData.find((d: any) => d._id.dayOfWeek === day && d._id.hour === hour);
            const count = match?.count || 0;
            if (count > maxCount) maxCount = count;
            heatmap.push({
                dayOfWeek: day,
                dayName: dayNames[day],
                hour,
                hourLabel: `${hour.toString().padStart(2, "0")}:00`,
                count,
            });
        }
    }

    // Best send-time recommendation
    const sorted = [...heatmap].sort((a, b) => b.count - a.count);
    const bestTimes = sorted.slice(0, 3).map(t => ({
        dayName: t.dayName,
        hourLabel: t.hourLabel,
        count: t.count,
    }));

    // Open velocity formatting
    const ov = openVelocity[0] || { total: 0 };
    const pct = (n: number) => ov.total > 0 ? Math.round((n / ov.total) * 100) : 0;

    const stats = totalStats[0] || {};

    return {
        heatmap,
        maxHeatmapCount: maxCount,
        bestSendTimes: bestTimes,
        openVelocity: {
            total: ov.total || 0,
            distribution: [
                { label: "Within 5 min", count: ov.within5min || 0, pct: pct(ov.within5min || 0) },
                { label: "Within 15 min", count: ov.within15min || 0, pct: pct(ov.within15min || 0) },
                { label: "Within 1 hour", count: ov.within1h || 0, pct: pct(ov.within1h || 0) },
                { label: "Within 4 hours", count: ov.within4h || 0, pct: pct(ov.within4h || 0) },
                { label: "Within 24 hours", count: ov.within24h || 0, pct: pct(ov.within24h || 0) },
                { label: "After 24 hours", count: ov.after24h || 0, pct: pct(ov.after24h || 0) },
            ],
        },
        reOpeners: reOpeners.map((r: any) => ({
            ...r,
            contactName: r.contactName?.trim() || r.email,
        })),
        summary: {
            totalSent: stats.totalSent || 0,
            totalOpened: stats.totalOpened || 0,
            avgOpenCount: Math.round((stats.avgOpenCount || 0) * 10) / 10,
            maxOpenCount: stats.maxOpenCount || 0,
            multiOpeners: stats.multiOpeners || 0,
            multiOpenerPct: stats.totalOpened > 0 ? Math.round((stats.multiOpeners / stats.totalOpened) * 100) : 0,
        },
    };
}

// ─── EMAIL CONTACT ENGAGEMENT — Per-contact engagement detail ──────────
// Covers: per-contact open count, geo info, reply timing, engagement ranking

async function getEmailContactEngagement(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");
    const page = config.page || 1;
    const limit = Math.min(config.limit || 25, 100);
    const skip = (page - 1) * limit;
    const sortField = config.sortBy || "engagementScore";

    const baseMatch = { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm };

    // Main per-contact aggregation
    const [contacts, totalCount] = await Promise.all([
        EmailMessage.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: "$contactId",
                    email: { $first: "$toEmail" },
                    totalSent: { $sum: 1 },
                    totalOpened: { $sum: { $cond: ["$opened", 1, 0] } },
                    totalClicked: { $sum: { $cond: ["$clicked", 1, 0] } },
                    totalReplied: { $sum: { $cond: ["$replied", 1, 0] } },
                    totalOpenCount: { $sum: { $ifNull: ["$openCount", 0] } },
                    lastOpenedAt: { $max: "$lastOpenedAt" },
                    lastRepliedAt: { $max: "$repliedAt" },
                    firstSentAt: { $min: "$sentAt" },
                    lastSentAt: { $max: "$sentAt" },
                    // Engagement score: open=1, click=3, reply=5
                    engagementScore: {
                        $sum: {
                            $add: [
                                { $cond: ["$opened", 1, 0] },
                                { $multiply: [{ $cond: ["$clicked", 1, 0] }, 3] },
                                { $multiply: [{ $cond: ["$replied", 1, 0] }, 5] },
                            ],
                        },
                    },
                },
            },
            // Join contact info
            {
                $lookup: {
                    from: "contacts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "contactInfo",
                },
            },
            { $unwind: { path: "$contactInfo", preserveNullAndEmptyArrays: true } },
            // Sort and paginate
            { $sort: { [sortField]: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    contactId: "$_id",
                    email: 1,
                    contactName: {
                        $concat: [
                            { $ifNull: ["$contactInfo.firstName", ""] },
                            " ",
                            { $ifNull: ["$contactInfo.lastName", ""] },
                        ],
                    },
                    company: "$contactInfo.company",
                    totalSent: 1,
                    totalOpened: 1,
                    totalClicked: 1,
                    totalReplied: 1,
                    totalOpenCount: 1,
                    lastOpenedAt: 1,
                    lastRepliedAt: 1,
                    engagementScore: 1,
                    openRate: {
                        $cond: [{ $gt: ["$totalSent", 0] }, { $round: [{ $multiply: [{ $divide: ["$totalOpened", "$totalSent"] }, 100] }, 0] }, 0],
                    },
                },
            },
        ]),

        // Total unique contacts for pagination
        EmailMessage.aggregate([
            { $match: baseMatch },
            { $group: { _id: "$contactId" } },
            { $count: "total" },
        ]),
    ]);

    // Enrich contacts with geo-location — batch query instead of N+1
    const contactIds = contacts.map((c: any) => c.contactId).filter(Boolean);
    const geoResults = contactIds.length > 0
        ? await EmailMessage.find(
            { workspaceId: wId, contactId: { $in: contactIds }, "opens.country": { $ne: null } },
            { contactId: 1, opens: 1 }
        ).sort({ "opens.openedAt": -1 }).lean()
        : [];

    // Build a map of contactId → most recent geo open
    const geoMap = new Map<string, { country: string; countryCode?: string; city?: string; timezone?: string }>();
    for (const doc of geoResults) {
        const key = doc.contactId.toString();
        if (geoMap.has(key)) continue; // already found most recent for this contact
        const geoOpen = (doc.opens as any[] || [])
            .filter((o: any) => !o.isBot && o.country)
            .sort((a: any, b: any) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())[0];
        if (geoOpen) {
            geoMap.set(key, {
                country: geoOpen.country,
                countryCode: geoOpen.countryCode,
                city: geoOpen.city,
                timezone: geoOpen.timezone,
            });
        }
    }

    const enrichedContacts = contacts.map((c: any) => ({
        ...c,
        contactName: c.contactName?.trim() || c.email,
        location: geoMap.get(c.contactId?.toString()) || null,
    }));

    const total = totalCount[0]?.total || 0;

    return {
        contacts: enrichedContacts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        summary: {
            totalContacts: total,
            avgEngagementScore: contacts.length > 0
                ? Math.round(contacts.reduce((s: number, c: any) => s + c.engagementScore, 0) / contacts.length * 10) / 10
                : 0,
        },
    };
}

// ═══════════════════════════════════════════════════════════════════
// CROSS-ENTITY EMAIL INTELLIGENCE REPORTS
// ═══════════════════════════════════════════════════════════════════

// ─── EMAIL → REVENUE ATTRIBUTION ─────────────────────────────────────
// Which emails actually generate pipeline & revenue?

async function getEmailRevenueAttribution(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");

    // 1. Contacts who received emails → their opportunities
    const [emailedContactsWithDeals, emailAttributionRevenue, topSubjects] = await Promise.all([
        // Contacts who received emails AND have opportunities
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm } },
            { $group: { _id: "$contactId" } },
            {
                $lookup: {
                    from: "opportunities",
                    localField: "_id",
                    foreignField: "contactId",
                    as: "opportunities",
                },
            },
            { $unwind: { path: "$opportunities", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: "$opportunities.status",
                    count: { $sum: 1 },
                    totalValue: { $sum: "$opportunities.value" },
                },
            },
        ]),

        // Revenue from Attribution model where channel = email
        Attribution.aggregate([
            { $match: { workspaceId: wId, converted: true, convertedAt: { $gte: start, $lte: end } } },
            { $unwind: "$touchpoints" },
            { $match: { "touchpoints.channel": { $in: ["email", "cold_outreach"] } } },
            {
                $group: {
                    _id: null,
                    firstTouchValue: { $sum: { $multiply: ["$conversionValue", { $divide: ["$touchpoints.firstTouchCredit", 100] }] } },
                    lastTouchValue: { $sum: { $multiply: ["$conversionValue", { $divide: ["$touchpoints.lastTouchCredit", 100] }] } },
                    linearValue: { $sum: { $multiply: ["$conversionValue", { $divide: ["$touchpoints.linearCredit", 100] }] } },
                    totalConversions: { $sum: 1 },
                },
            },
        ]),

        // Top-performing email subjects (by won deal count)
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } } },
            {
                $lookup: {
                    from: "opportunities",
                    localField: "contactId",
                    foreignField: "contactId",
                    as: "opportunities",
                },
            },
            { $unwind: { path: "$opportunities", preserveNullAndEmptyArrays: false } },
            { $match: { "opportunities.status": "won" } },
            {
                $group: {
                    _id: "$subject",
                    wonDeals: { $sum: 1 },
                    revenue: { $sum: "$opportunities.value" },
                    totalSent: { $sum: 1 },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
        ]),
    ]);

    // Email-to-deal conversion rate
    const [totalEmailedContacts, totalContactsWithOpps] = await Promise.all([
        EmailMessage.distinct("contactId", { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } }).then(c => c.length),
        Opportunity.distinct("contactId", { workspaceId: wId, createdAt: { $gte: start, $lte: end } }).then(c => c.length),
    ]);

    const dealsByStatus = emailedContactsWithDeals.reduce((acc: any, item: any) => {
        acc[item._id] = { count: item.count, value: item.totalValue };
        return acc;
    }, {});

    const attribution = emailAttributionRevenue[0] || {};

    return {
        conversionRate: {
            emailedContacts: totalEmailedContacts,
            contactsWithOpportunities: totalContactsWithOpps,
            conversionPct: totalEmailedContacts > 0 ? Math.round((totalContactsWithOpps / totalEmailedContacts) * 100) : 0,
        },
        dealsByStatus: {
            won: dealsByStatus.won || { count: 0, value: 0 },
            open: dealsByStatus.open || { count: 0, value: 0 },
            lost: dealsByStatus.lost || { count: 0, value: 0 },
        },
        attributionModels: {
            firstTouch: Math.round(attribution.firstTouchValue || 0),
            lastTouch: Math.round(attribution.lastTouchValue || 0),
            linear: Math.round(attribution.linearValue || 0),
            totalConversions: attribution.totalConversions || 0,
        },
        topSubjects: topSubjects.map((s: any) => ({
            subject: s._id,
            wonDeals: s.wonDeals,
            revenue: s.revenue,
            avgRevenuePerDeal: s.wonDeals > 0 ? Math.round(s.revenue / s.wonDeals) : 0,
        })),
    };
}

// ─── EMAIL → LIFECYCLE ACCELERATION ──────────────────────────────────
// Do emails actually move people through the lifecycle stages?

async function getEmailLifecycleAcceleration(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "90days"); // Longer period for lifecycle

    // Get contacts who received emails
    const emailedContacts = await EmailMessage.distinct("contactId", {
        workspaceId: wId,
        direction: "outbound",
        sentAt: { $gte: start, $lte: end },
        ...dm
    });

    // Lifecycle transitions within period
    const [emailedTransitions, allTransitions, engagementByStage] = await Promise.all([
        // Transitions for emailed contacts
        ContactLifecycleHistory.aggregate([
            {
                $match: {
                    workspaceId: wId,
                    contactId: { $in: emailedContacts.map(id => new Types.ObjectId(id)) },
                    transitionedAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: { from: "$transitionedFrom", to: "$transitionedTo" },
                    count: { $sum: 1 },
                    avgTimeInStage: { $avg: "$timeInStage" },
                },
            },
        ]),

        // Transitions for all contacts (comparison baseline)
        ContactLifecycleHistory.aggregate([
            { $match: { workspaceId: wId, transitionedAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: { from: "$transitionedFrom", to: "$transitionedTo" },
                    count: { $sum: 1 },
                    avgTimeInStage: { $avg: "$timeInStage" },
                },
            },
        ]),

        // Email engagement by current lifecycle stage
        Contact.aggregate([
            { $match: { workspaceId: wId, _id: { $in: emailedContacts.map(id => new Types.ObjectId(id)) } } },
            {
                $lookup: {
                    from: "emailmessages",
                    let: { contactId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$contactId", "$$contactId"] },
                                direction: "outbound",
                                sentAt: { $gte: start, $lte: end },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                opened: { $sum: { $cond: ["$opened", 1, 0] } },
                                replied: { $sum: { $cond: ["$replied", 1, 0] } },
                                total: { $sum: 1 },
                            },
                        },
                    ],
                    as: "emailStats",
                },
            },
            { $unwind: { path: "$emailStats", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$lifecycleStage",
                    contacts: { $sum: 1 },
                    avgOpenRate: { $avg: { $cond: [{ $gt: ["$emailStats.total", 0] }, { $divide: ["$emailStats.opened", "$emailStats.total"] }, 0] } },
                    avgReplyRate: { $avg: { $cond: [{ $gt: ["$emailStats.total", 0] }, { $divide: ["$emailStats.replied", "$emailStats.total"] }, 0] } },
                },
            },
        ]),
    ]);

    // Calculate acceleration vs baseline
    const accelerationMetrics = emailedTransitions.map((et: any) => {
        const baseline = allTransitions.find((at: any) =>
            at._id.from === et._id.from && at._id.to === et._id.to
        );
        const emailedTime = et.avgTimeInStage || 0;
        const baselineTime = baseline?.avgTimeInStage || emailedTime;
        const acceleration = baselineTime > 0 ? Math.round(((baselineTime - emailedTime) / baselineTime) * 100) : 0;

        return {
            from: et._id.from || "new",
            to: et._id.to,
            emailedContacts: et.count,
            avgTimeEmailed: Math.round(emailedTime),
            avgTimeBaseline: Math.round(baselineTime),
            accelerationPct: acceleration,
        };
    });

    return {
        transitions: accelerationMetrics.sort((a, b) => b.accelerationPct - a.accelerationPct),
        engagementByStage: engagementByStage.map((e: any) => ({
            stage: e._id || "unknown",
            contacts: e.contacts,
            openRate: Math.round((e.avgOpenRate || 0) * 10000) / 100, // Convert to %
            replyRate: Math.round((e.avgReplyRate || 0) * 10000) / 100,
        })),
        summary: {
            emailedContacts: emailedContacts.length,
            totalTransitions: emailedTransitions.reduce((s: number, t: any) => s + t.count, 0),
            avgAcceleration: accelerationMetrics.length > 0
                ? Math.round(accelerationMetrics.reduce((s, m) => s + m.accelerationPct, 0) / accelerationMetrics.length)
                : 0,
        },
    };
}

// ─── CAMPAIGN A/B COMPARISON ─────────────────────────────────────────
// Side-by-side campaign performance analysis

async function getCampaignComparison(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const campaignIds = config.campaignIds || []; // Array of campaign IDs to compare

    if (campaignIds.length === 0) {
        // Return top 5 campaigns by enrollment if no IDs specified
        const topCampaigns = await Campaign.find({ workspaceId: wId, status: { $ne: "draft" }, ...dm })
            .sort({ totalEnrolled: -1 })
            .limit(5)
            .select("_id");
        campaignIds.push(...topCampaigns.map(c => c._id.toString()));
    }

    const campaigns = await Promise.all(
        campaignIds.map(async (campaignId: string) => {
            const cId = new Types.ObjectId(campaignId);
            const [campaign, enrollmentStats, stepPerformance] = await Promise.all([
                Campaign.findById(cId).lean(),

                // Enrollment stats
                CampaignEnrollment.aggregate([
                    { $match: { campaignId: cId } },
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 },
                        },
                    },
                ]),

                // Per-step performance
                CampaignEnrollment.aggregate([
                    { $match: { campaignId: cId } },
                    { $unwind: "$emailsSent" },
                    {
                        $group: {
                            _id: "$emailsSent.stepId",
                            sent: { $sum: 1 },
                            opened: { $sum: { $cond: ["$emailsSent.opened", 1, 0] } },
                            clicked: { $sum: { $cond: ["$emailsSent.clicked", 1, 0] } },
                            replied: { $sum: { $cond: ["$emailsSent.replied", 1, 0] } },
                            bounced: { $sum: { $cond: ["$emailsSent.bounced", 1, 0] } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
            ]);

            if (!campaign) return null;

            const statusDist = enrollmentStats.reduce((acc: any, s: any) => {
                acc[s._id] = s.count;
                return acc;
            }, {});

            return {
                id: campaign._id.toString(),
                name: campaign.name,
                status: campaign.status,
                totalEnrolled: campaign.totalEnrolled || 0,
                completionRate: campaign.totalEnrolled > 0
                    ? Math.round(((campaign.completedEnrollments || 0) / campaign.totalEnrolled) * 100)
                    : 0,
                stats: campaign.stats,
                enrollmentsByStatus: statusDist,
                stepPerformance: stepPerformance.map((step: any) => ({
                    stepId: step._id,
                    sent: step.sent,
                    openRate: step.sent > 0 ? Math.round((step.opened / step.sent) * 100) : 0,
                    clickRate: step.sent > 0 ? Math.round((step.clicked / step.sent) * 100) : 0,
                    replyRate: step.sent > 0 ? Math.round((step.replied / step.sent) * 100) : 0,
                    bounceRate: step.sent > 0 ? Math.round((step.bounced / step.sent) * 100) : 0,
                })),
            };
        })
    );

    return {
        campaigns: campaigns.filter(c => c !== null),
        comparison: {
            bestOpenRate: campaigns.reduce((max, c) => !c ? max : (c.stats?.opened || 0) / (c.stats?.sent || 1) > max.rate ? { name: c.name, rate: (c.stats?.opened || 0) / (c.stats?.sent || 1) } : max, { name: "", rate: 0 }),
            bestReplyRate: campaigns.reduce((max, c) => !c ? max : (c.stats?.replied || 0) / (c.stats?.sent || 1) > max.rate ? { name: c.name, rate: (c.stats?.replied || 0) / (c.stats?.sent || 1) } : max, { name: "", rate: 0 }),
        },
    };
}

// ─── SEQUENCE STEP FUNNEL ────────────────────────────────────────────
// Where exactly do contacts drop off in sequences?

async function getSequenceStepFunnel(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const sequenceId = config.sequenceId ? new Types.ObjectId(config.sequenceId) : null;

    if (!sequenceId) {
        return { error: "sequenceId is required" };
    }

    const [sequence, funnelData, replyByStep] = await Promise.all([
        Sequence.findById(sequenceId).lean(),

        // Step-by-step funnel
        Sequence.aggregate([
            { $match: { _id: sequenceId } },
            { $unwind: "$enrollments" },
            {
                $group: {
                    _id: "$enrollments.currentStepIndex",
                    contacts: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ["$enrollments.status", "completed"] }, 1, 0] } },
                    replied: { $sum: { $cond: [{ $eq: ["$enrollments.status", "replied"] }, 1, 0] } },
                    bounced: { $sum: { $cond: [{ $eq: ["$enrollments.status", "bounced"] }, 1, 0] } },
                    unenrolled: { $sum: { $cond: [{ $eq: ["$enrollments.status", "unenrolled"] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]),

        // Replies by step position
        Sequence.aggregate([
            { $match: { _id: sequenceId } },
            { $unwind: "$enrollments" },
            { $match: { "enrollments.status": "replied" } },
            {
                $group: {
                    _id: "$enrollments.currentStepIndex",
                    replies: { $sum: 1 },
                    avgEmailsSent: { $avg: "$enrollments.emailsSent" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    if (!sequence) {
        return { error: "Sequence not found" };
    }

    const steps = funnelData.map((step: any, index: number) => {
        const replyData = replyByStep.find((r: any) => r._id === step._id);
        const previousStep = index > 0 ? funnelData[index - 1] : null;
        const dropOff = previousStep ? previousStep.contacts - step.contacts : 0;

        return {
            stepIndex: step._id,
            stepName: sequence.steps[step._id]?.subject || `Step ${step._id + 1}`,
            contacts: step.contacts,
            dropOff,
            dropOffPct: previousStep && previousStep.contacts > 0 ? Math.round((dropOff / previousStep.contacts) * 100) : 0,
            replied: step.replied,
            replyRate: step.contacts > 0 ? Math.round((step.replied / step.contacts) * 100) : 0,
            avgEmailsToReply: Math.round(replyData?.avgEmailsSent || 0),
        };
    });

    return {
        sequenceId: sequence._id.toString(),
        sequenceName: sequence.name,
        totalSteps: sequence.steps.length,
        totalEnrolled: sequence.stats.totalEnrolled,
        funnel: steps,
        summary: {
            completionRate: sequence.stats.totalEnrolled > 0
                ? Math.round((sequence.stats.completed / sequence.stats.totalEnrolled) * 100)
                : 0,
            replyRate: sequence.stats.totalEnrolled > 0
                ? Math.round((sequence.stats.replied / sequence.stats.totalEnrolled) * 100)
                : 0,
            avgStepsBeforeReply: replyByStep.length > 0
                ? Math.round(replyByStep.reduce((s: number, r: any) => s + r._id, 0) / replyByStep.length)
                : 0,
        },
    };
}

// ─── DELIVERABILITY HEALTH SCORE ─────────────────────────────────────
// Track bounce rates, bot opens, domain reputation

async function getDeliverabilityHealth(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "30days");
    const groupBy = config.groupBy || "day";
    const format = groupBy === "day" ? "%Y-%m-%d" : groupBy === "week" ? "%Y-W%V" : "%Y-%m";

    const [trendData, domainHealth, botAnalysis, engagementQuality] = await Promise.all([
        // Bounce rate trend over time
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: { $dateToString: { format, date: "$sentAt" } },
                    sent: { $sum: 1 },
                    bounced: { $sum: { $cond: ["$bounced", 1, 0] } },
                    opened: { $sum: { $cond: ["$opened", 1, 0] } },
                    spamReported: { $sum: { $cond: ["$spamReported", 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]),

        // Health by sending domain/account
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: "$fromEmail",
                    sent: { $sum: 1 },
                    bounced: { $sum: { $cond: ["$bounced", 1, 0] } },
                    opened: { $sum: { $cond: ["$opened", 1, 0] } },
                    replied: { $sum: { $cond: ["$replied", 1, 0] } },
                },
            },
            {
                $project: {
                    fromEmail: "$_id",
                    sent: 1,
                    bounceRate: { $cond: [{ $gt: ["$sent", 0] }, { $round: [{ $multiply: [{ $divide: ["$bounced", "$sent"] }, 100] }, 2] }, 0] },
                    openRate: { $cond: [{ $gt: ["$sent", 0] }, { $round: [{ $multiply: [{ $divide: ["$opened", "$sent"] }, 100] }, 2] }, 0] },
                    replyRate: { $cond: [{ $gt: ["$sent", 0] }, { $round: [{ $multiply: [{ $divide: ["$replied", "$sent"] }, 100] }, 2] }, 0] },
                },
            },
            { $sort: { bounceRate: -1 } },
        ]),

        // Bot opens analysis
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, opened: true } },
            { $unwind: "$opens" },
            {
                $group: {
                    _id: null,
                    totalOpens: { $sum: 1 },
                    botOpens: { $sum: { $cond: ["$opens.isBot", 1, 0] } },
                    applePrivacyOpens: { $sum: { $cond: ["$opens.isApplePrivacy", 1, 0] } },
                },
            },
        ]),

        // Engagement quality (reply-to-open ratio)
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalOpened: { $sum: { $cond: ["$opened", 1, 0] } },
                    totalReplied: { $sum: { $cond: ["$replied", 1, 0] } },
                },
            },
        ]),
    ]);

    const trend = trendData.map((d: any) => ({
        period: d._id,
        sent: d.sent,
        bounced: d.bounced,
        opened: d.opened,
        bounceRate: d.sent > 0 ? Math.round((d.bounced / d.sent) * 100 * 100) / 100 : 0,
        openRate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100 * 100) / 100 : 0,
    }));

    const botStats = botAnalysis[0] || { totalOpens: 0, botOpens: 0, applePrivacyOpens: 0 };
    const engagementStats = engagementQuality[0] || { totalOpened: 0, totalReplied: 0 };

    const overallBounceRate = trend.length > 0
        ? trend.reduce((s, t) => s + t.bounceRate, 0) / trend.length
        : 0;

    // Health score: 100 - (bounce_rate * 10) - (bot_rate * 5)
    const healthScore = Math.max(0, Math.min(100,
        100 - (overallBounceRate * 10) - ((botStats.botOpens / (botStats.totalOpens || 1)) * 500)
    ));

    return {
        healthScore: Math.round(healthScore),
        trend,
        domainHealth: domainHealth.map((d: any) => ({
            fromEmail: d.fromEmail,
            sent: d.sent,
            bounceRate: d.bounceRate,
            openRate: d.openRate,
            replyRate: d.replyRate,
            status: d.bounceRate > 5 ? "at_risk" : d.bounceRate > 2 ? "warning" : "healthy",
        })),
        botAnalysis: {
            totalOpens: botStats.totalOpens,
            botOpens: botStats.botOpens,
            applePrivacyOpens: botStats.applePrivacyOpens,
            botPct: botStats.totalOpens > 0 ? Math.round((botStats.botOpens / botStats.totalOpens) * 100) : 0,
        },
        engagementQuality: {
            totalOpened: engagementStats.totalOpened,
            totalReplied: engagementStats.totalReplied,
            replyToOpenRatio: engagementStats.totalOpened > 0
                ? Math.round((engagementStats.totalReplied / engagementStats.totalOpened) * 100 * 100) / 100
                : 0,
        },
    };
}

// ─── ENGAGEMENT DECAY ANALYSIS ───────────────────────────────────────
// Identify contacts losing interest & re-engagement candidates

async function getEngagementDecay(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const { start, end } = getDateRange(config.period || "90days");
    const midpoint = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);

    // Contacts with declining engagement
    const decliningContacts = await EmailMessage.aggregate([
        { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm } },
        {
            $group: {
                _id: "$contactId",
                firstHalfSent: { $sum: { $cond: [{ $lte: ["$sentAt", midpoint] }, 1, 0] } },
                firstHalfOpened: { $sum: { $cond: [{ $and: [{ $lte: ["$sentAt", midpoint] }, "$opened"] }, 1, 0] } },
                secondHalfSent: { $sum: { $cond: [{ $gt: ["$sentAt", midpoint] }, 1, 0] } },
                secondHalfOpened: { $sum: { $cond: [{ $and: [{ $gt: ["$sentAt", midpoint] }, "$opened"] }, 1, 0] } },
                lastEmailAt: { $max: "$sentAt" },
                lastOpenedAt: { $max: "$openedAt" },
            },
        },
        {
            $project: {
                contactId: "$_id",
                firstHalfRate: { $cond: [{ $gt: ["$firstHalfSent", 0] }, { $divide: ["$firstHalfOpened", "$firstHalfSent"] }, 0] },
                secondHalfRate: { $cond: [{ $gt: ["$secondHalfSent", 0] }, { $divide: ["$secondHalfOpened", "$secondHalfSent"] }, 0] },
                lastEmailAt: 1,
                lastOpenedAt: 1,
            },
        },
        {
            $addFields: {
                decayPct: {
                    $cond: [
                        { $gt: ["$firstHalfRate", 0] },
                        { $multiply: [{ $divide: [{ $subtract: ["$firstHalfRate", "$secondHalfRate"] }, "$firstHalfRate"] }, 100] },
                        0,
                    ],
                },
            },
        },
        { $match: { decayPct: { $gt: 20 } } }, // 20%+ decline
        { $sort: { decayPct: -1 } },
        { $limit: 100 },
    ]);

    // Enrich with contact & opportunity data
    const enrichedDecaying = await Promise.all(
        decliningContacts.slice(0, 25).map(async (dc: any) => {
            const [contact, opportunities] = await Promise.all([
                Contact.findById(dc.contactId).select("firstName lastName email company lifecycleStage engagementScore").lean(),
                Opportunity.find({ contactId: dc.contactId, status: "open" }).select("value title").lean(),
            ]);

            return {
                contactId: dc.contactId,
                contactName: contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email : "Unknown",
                email: contact?.email,
                company: contact?.company,
                lifecycleStage: contact?.lifecycleStage,
                engagementScore: (contact as any)?.engagementScore,
                decayPct: Math.round(dc.decayPct),
                lastEmailAt: dc.lastEmailAt,
                lastOpenedAt: dc.lastOpenedAt,
                daysSinceLastOpen: dc.lastOpenedAt ? Math.floor((Date.now() - new Date(dc.lastOpenedAt).getTime()) / 86400000) : null,
                openOpportunities: opportunities.length,
                pipelineValue: opportunities.reduce((s, o) => s + (o.value || 0), 0),
                status: opportunities.length > 0 ? "at_risk_pipeline" : "churning",
            };
        })
    );

    // Ghost contacts (opened before, stopped)
    const ghostContacts = await EmailMessage.aggregate([
        { $match: { workspaceId: wId, direction: "outbound", opened: true } },
        {
            $group: {
                _id: "$contactId",
                lastOpenedAt: { $max: "$openedAt" },
                totalOpens: { $sum: 1 },
            },
        },
        { $match: { lastOpenedAt: { $lt: new Date(Date.now() - 30 * 86400000) } } }, // 30+ days ago
        { $sort: { lastOpenedAt: 1 } },
        { $limit: 50 },
    ]);

    return {
        decliningEngagement: enrichedDecaying,
        ghostContacts: ghostContacts.length,
        summary: {
            totalDeclining: decliningContacts.length,
            withOpenDeals: enrichedDecaying.filter(c => c.openOpportunities > 0).length,
            atRiskPipeline: enrichedDecaying.reduce((s, c) => s + c.pipelineValue, 0),
            avgDecayRate: decliningContacts.length > 0
                ? Math.round(decliningContacts.reduce((s: number, c: any) => s + c.decayPct, 0) / decliningContacts.length)
                : 0,
        },
    };
}

// ─── TOP PERFORMERS — With win rate + ranking ──────────────────

async function getTopPerformersData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const metric = config.metric || "deals";
    const period = config.period || "30days";
    const { start, end } = getDateRange(period);

    if (metric === "deals" || metric === "revenue") {
        const performers = await Opportunity.aggregate([
            { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: "$assignedTo",
                    wonDeals: { $sum: 1 },
                    revenue: { $sum: "$value" },
                    avgDealSize: { $avg: "$value" },
                },
            },
            { $sort: { [metric === "revenue" ? "revenue" : "wonDeals"]: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users", localField: "_id", foreignField: "_id", as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        ]);

        // Also get lost deals for win rate calculation
        const lostByUser = await Opportunity.aggregate([
            { $match: { workspaceId: wId, status: "lost", updatedAt: { $gte: start, $lte: end }, ...dm } },
            { $group: { _id: "$assignedTo", lostDeals: { $sum: 1 } } },
        ]);
        const lostMap = new Map(lostByUser.map((l) => [l._id?.toString(), l.lostDeals]));

        const ranked = performers.map((p, i) => {
            const lost = lostMap.get(p._id?.toString()) || 0;
            const totalDecided = p.wonDeals + lost;
            return {
                rank: i + 1,
                name: p.user?.name || "Unknown",
                email: p.user?.email,
                deals: p.wonDeals,
                revenue: Math.round(p.revenue),
                avgDealSize: Math.round(p.avgDealSize),
                winRate: totalDecided > 0 ? Math.round((p.wonDeals / totalDecided) * 100) : 0,
            };
        });

        return { performers: ranked };
    }

    if (metric === "emails") {
        const performers = await EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end }, ...dm } },
            {
                $group: {
                    _id: "$userId",
                    sent: { $sum: 1 },
                    opened: { $sum: { $cond: [{ $eq: ["$tracking.opened", true] }, 1, 0] } },
                    clicked: { $sum: { $cond: [{ $eq: ["$tracking.clicked", true] }, 1, 0] } },
                    replied: { $sum: { $cond: [{ $eq: ["$tracking.replied", true] }, 1, 0] } },
                },
            },
            { $sort: { sent: -1 } },
            { $limit: 10 },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        ]);

        const ranked = performers.map((p, i) => ({
            rank: i + 1,
            name: p.user?.name || "Unknown",
            sent: p.sent,
            opened: p.opened,
            clicked: p.clicked,
            replied: p.replied,
            openRate: p.sent > 0 ? Math.round((p.opened / p.sent) * 100) : 0,
            replyRate: p.sent > 0 ? Math.round((p.replied / p.sent) * 100) : 0,
        }));

        return { performers: ranked };
    }

    return { performers: [] };
}

// ─── LEAD SOURCES — With conversion rates ──────────────────────

async function getLeadSourcesData(workspaceId: string, _config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = _config._dashboardMatch || {};

    // Get contacts by source (fixes B4: normalize source to lowercase/trim)
    const sources = await Contact.aggregate([
        { $match: { workspaceId: wId, source: { $exists: true, $nin: [null, ""] }, ...dm } },
        {
            $addFields: {
                normalizedSource: {
                    $trim: { input: { $toLower: "$source" } }
                }
            }
        },
        { $group: { _id: "$normalizedSource", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    // Get deals linked to contacts to calculate source → deal conversion
    const dealsBySource = await Opportunity.aggregate([
        { $match: { workspaceId: wId, ...dm } },
        { $lookup: { from: "contacts", localField: "contactId", foreignField: "_id", as: "contact" } },
        { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                normalizedSource: {
                    $trim: { input: { $toLower: "$contact.source" } }
                }
            }
        },
        {
            $group: {
                _id: "$normalizedSource",
                deals: { $sum: 1 },
                revenue: { $sum: "$value" },
                wonDeals: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
                wonRevenue: { $sum: { $cond: [{ $eq: ["$status", "won"] }, "$value", 0] } },
            },
        },
    ]);

    const dealMap = new Map(dealsBySource.map((d) => [d._id, d]));
    const totalContacts = sources.reduce((s, src) => s + src.count, 0);

    const enriched = sources.map((s) => {
        const dealData = dealMap.get(s._id);
        return {
            name: s._id || "Unknown",
            count: s.count,
            percentage: totalContacts > 0 ? Math.round((s.count / totalContacts) * 100) : 0,
            deals: dealData?.deals || 0,
            revenue: dealData?.revenue || 0,
            wonDeals: dealData?.wonDeals || 0,
            wonRevenue: dealData?.wonRevenue || 0,
            conversionRate: s.count > 0 ? Math.round(((dealData?.deals || 0) / s.count) * 100) : 0,
        };
    });

    return {
        sources: enriched,
        summary: {
            totalContacts,
            topSource: enriched[0]?.name || "None",
            uniqueSources: sources.length,
        },
    };
}

// ─── FORECAST — With pipeline coverage + trend projection ──────

async function getForecastData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const period = config.period || "quarter";
    const { start, end } = getDateRange(period);
    const target = config.target || 0; // Revenue target if provided

    const deals = await Opportunity.find({
        workspaceId: wId,
        status: { $nin: ["lost"] },
        expectedCloseDate: { $gte: start, $lte: end },
        ...dm
    }).select("value probability status stage expectedCloseDate title").lean();

    // Already won revenue this period
    const wonThisPeriod = await Opportunity.aggregate([
        { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end }, ...dm } },
        { $group: { _id: null, total: { $sum: "$value" } } },
    ]);
    const alreadyWon = wonThisPeriod[0]?.total || 0;

    // Pipeline categories
    const committed = deals
        .filter((d) => (d.probability || 0) >= 90)
        .reduce((s, d) => s + (d.value || 0), 0);
    const upside = deals
        .filter((d) => (d.probability || 0) >= 50 && (d.probability || 0) < 90)
        .reduce((s, d) => s + (d.value || 0), 0);
    const weighted = deals.reduce((s, d) => s + (d.value || 0) * ((d.probability || 0) / 100), 0);
    const bestCase = deals.reduce((s, d) => s + (d.value || 0), 0);

    // Predicted (already won + weighted open pipeline)
    const predicted = alreadyWon + weighted;

    // Pipeline coverage ratio (pipeline / target)
    const coverage = target > 0 ? Math.round((bestCase / target) * 100) / 100 : null;

    // Gap analysis
    const gap = target > 0 ? Math.max(0, target - predicted) : null;

    // Break down by stage
    const byStage = deals.reduce((acc: any, d: any) => {
        const s = d.stage || "unknown";
        if (!acc[s]) acc[s] = { count: 0, value: 0, weighted: 0 };
        acc[s].count++;
        acc[s].value += d.value || 0;
        acc[s].weighted += (d.value || 0) * ((d.probability || 0) / 100);
        return acc;
    }, {});

    return {
        alreadyWon,
        committed,
        upside,
        weighted: Math.round(weighted),
        bestCase,
        predicted: Math.round(predicted),
        dealCount: deals.length,
        target: target || null,
        coverage,
        gap: gap !== null ? Math.round(gap) : null,
        byStage: Object.entries(byStage).map(([stage, data]: [string, any]) => ({
            stage,
            count: data.count,
            value: data.value,
            weighted: Math.round(data.weighted),
        })),
    };
}

// ─── AT-RISK — Multi-factor risk scoring ───────────────────────

async function getAtRiskData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const dm = config._dashboardMatch || {};
    const inactiveDays = config.inactiveDays || 14;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - inactiveDays);

    const deals = await Opportunity.find({
        workspaceId: wId,
        status: { $nin: ["won", "lost"] },
        ...dm
    })
        .select("title value stage probability updatedAt createdAt expectedCloseDate stageId")
        .sort({ value: -1 })
        .limit(50)
        .lean();

    const now = Date.now();
    const scored = deals.map((d: any) => {
        const daysSinceUpdate = Math.floor((now - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const dealAge = Math.floor((now - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = d.expectedCloseDate && new Date(d.expectedCloseDate) < new Date();
        const isPastDue = d.expectedCloseDate
            ? Math.floor((now - new Date(d.expectedCloseDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        // Risk scoring (0-100, higher = more at risk)
        let riskScore = 0;
        const riskFactors: string[] = [];

        // Factor 1: Inactivity (max 30 points)
        if (daysSinceUpdate > inactiveDays) {
            const inactivityScore = Math.min(30, Math.floor((daysSinceUpdate - inactiveDays) / 7) * 10 + 10);
            riskScore += inactivityScore;
            riskFactors.push(`No activity for ${daysSinceUpdate} days`);
        }

        // Factor 2: Overdue close date (max 25 points)
        if (isOverdue && isPastDue > 0) {
            const overdueScore = Math.min(25, Math.floor(isPastDue / 7) * 5 + 10);
            riskScore += overdueScore;
            riskFactors.push(`Overdue by ${isPastDue} days`);
        }

        // Factor 3: Deal aging (max 20 points)
        if (dealAge > 90) {
            const ageScore = Math.min(20, Math.floor((dealAge - 90) / 30) * 5 + 5);
            riskScore += ageScore;
            riskFactors.push(`Deal is ${dealAge} days old`);
        }

        // Factor 4: Low probability (max 15 points)
        const prob = d.probability || 0;
        if (prob < 30) {
            riskScore += 15;
            riskFactors.push(`Low probability (${prob}%)`);
        } else if (prob < 50) {
            riskScore += 8;
            riskFactors.push(`Below-average probability (${prob}%)`);
        }

        // Factor 5: High value at stake (max 10 points)
        if ((d.value || 0) > 10000) {
            riskScore += 10;
            riskFactors.push(`High-value deal ($${((d.value || 0) / 1000).toFixed(0)}K)`);
        }

        return {
            id: d._id,
            name: d.title || "Untitled",
            value: d.value || 0,
            stage: d.stageId || d.stage,
            probability: prob,
            daysSinceUpdate,
            dealAge,
            isOverdue: !!isOverdue,
            daysPastDue: isPastDue > 0 ? isPastDue : 0,
            riskScore: Math.min(100, riskScore),
            riskLevel: riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low",
            riskFactors,
        };
    });

    // Filter to only deals with non-zero risk, then sort by risk score
    const atRisk = scored
        .filter((d) => d.riskScore > 0)
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 20);

    const highRisk = atRisk.filter((d) => d.riskLevel === "high");
    const totalValueAtRisk = atRisk.reduce((s, d) => s + d.value, 0);

    return {
        deals: atRisk,
        summary: {
            totalAtRisk: atRisk.length,
            highRisk: highRisk.length,
            mediumRisk: atRisk.filter((d) => d.riskLevel === "medium").length,
            totalValueAtRisk,
            avgRiskScore: atRisk.length > 0 ? Math.round(atRisk.reduce((s, d) => s + d.riskScore, 0) / atRisk.length) : 0,
        },
    };
}

// ─── Deal Velocity ─────────────────────────────────────────────

/**
 * Pipeline Velocity = (# deals × avg deal value × win rate) / avg sales cycle (days)
 * Also: avg sales cycle by stage, by source, win/loss speed comparison
 */
async function getDealVelocityData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "90d");
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);

    // Closed deals in current period (fixes C3: use actualCloseDate)
    const closedDeals = await Opportunity.find({
        workspaceId: wsId,
        status: { $in: ["won", "lost"] },
        actualCloseDate: { $gte: start, $lte: end },
        ...dm
    }).lean();

    // Previous period
    const prevClosedDeals = await Opportunity.find({
        workspaceId: wsId,
        status: { $in: ["won", "lost"] },
        actualCloseDate: { $gte: prevStart, $lt: prevEnd },
        ...dm
    }).lean();

    // Active pipeline
    const activeDeals = await Opportunity.countDocuments({
        workspaceId: wsId,
        status: "open",
    });

    const wonDeals = closedDeals.filter((d: any) => d.status === "won");
    const lostDeals = closedDeals.filter((d: any) => d.status === "lost");
    const prevWon = prevClosedDeals.filter((d: any) => d.status === "won");

    // Calculate sales cycle (days from created to closed) - fixes C3
    const cycleDays = (deals: any[]) => {
        if (deals.length === 0) return [];
        const durations = deals.map(d => {
            const created = new Date(d.createdAt).getTime();
            // Use actualCloseDate if available, fallback to updatedAt (legacy data)
            const closed = new Date(d.actualCloseDate || d.updatedAt).getTime();
            return (closed - created) / 86400000;
        }).filter(days => days >= 0); // Filter out negative durations
        return durations;
    };

    const wonCycleDays = cycleDays(wonDeals);
    const lostCycleDays = cycleDays(lostDeals);
    const prevWonCycleDays = cycleDays(prevWon);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const median = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const stdDev = (arr: number[]) => {
        if (arr.length < 2) return 0;
        const mean = avg(arr);
        const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    };

    const avgCycleWon = Math.round(avg(wonCycleDays) * 10) / 10;
    const avgCycleLost = Math.round(avg(lostCycleDays) * 10) / 10;
    const prevAvgCycleWon = Math.round(avg(prevWonCycleDays) * 10) / 10;
    const medianCycleWon = Math.round(median(wonCycleDays) * 10) / 10;

    const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;
    const avgDealValue = wonDeals.length > 0 ? wonDeals.reduce((s: number, d: any) => s + (d.value || 0), 0) / wonDeals.length : 0;

    // Pipeline velocity formula
    const pipelineVelocity = avgCycleWon > 0
        ? Math.round((activeDeals * avgDealValue * (winRate / 100)) / avgCycleWon)
        : 0;
    const prevAvgDealValue = prevWon.length > 0 ? prevWon.reduce((s: number, d: any) => s + (d.value || 0), 0) / prevWon.length : 0;
    const prevWinRate = prevClosedDeals.length > 0 ? prevWon.length / prevClosedDeals.length * 100 : 0;
    const prevVelocity = prevAvgCycleWon > 0
        ? Math.round((activeDeals * prevAvgDealValue * (prevWinRate / 100)) / prevAvgCycleWon)
        : 0;

    // Cycle by stage (from stageHistory)
    const stageTimings: Record<string, number[]> = {};
    for (const deal of wonDeals) {
        if ((deal as any).stageHistory) {
            for (const sh of (deal as any).stageHistory) {
                const name = sh.stageName || "unknown";
                const dur = sh.duration ? sh.duration / 86400000 : 0; // ms to days
                if (!stageTimings[name]) stageTimings[name] = [];
                stageTimings[name].push(dur);
            }
        }
    }

    const cycleByStage = Object.entries(stageTimings).map(([stage, durations]) => ({
        stage,
        avgDays: Math.round(avg(durations) * 10) / 10,
        medianDays: Math.round(median(durations) * 10) / 10,
        count: durations.length,
    })).sort((a, b) => b.avgDays - a.avgDays);

    // Cycle by source
    const sourceTimings: Record<string, { days: number[]; values: number[] }> = {};
    for (const deal of wonDeals) {
        const src = (deal as any).source || "unknown";
        const created = new Date(deal.createdAt).getTime();
        const closed = new Date(deal.updatedAt).getTime();
        const days = (closed - created) / 86400000;
        if (!sourceTimings[src]) sourceTimings[src] = { days: [], values: [] };
        sourceTimings[src].days.push(days);
        sourceTimings[src].values.push((deal as any).value || 0);
    }

    const cycleBySource = Object.entries(sourceTimings).map(([source, data]) => ({
        source,
        avgDays: Math.round(avg(data.days) * 10) / 10,
        avgValue: Math.round(avg(data.values)),
        deals: data.days.length,
    })).sort((a, b) => a.avgDays - b.avgDays);

    return {
        pipelineVelocity,
        pipelineVelocityChange: percentChange(pipelineVelocity, prevVelocity),
        avgCycleWon,
        avgCycleLost,
        medianCycleWon,
        stdDevCycleWon: Math.round(stdDev(wonCycleDays) * 10) / 10,
        cycleChange: percentChange(avgCycleWon, prevAvgCycleWon),
        winRate,
        avgDealValue: Math.round(avgDealValue),
        totalClosed: closedDeals.length,
        wonCount: wonDeals.length,
        lostCount: lostDeals.length,
        activeDeals,
        cycleByStage,
        cycleBySource,
        summary: {
            velocityLabel: `$${pipelineVelocity >= 1000 ? (pipelineVelocity / 1000).toFixed(1) + "K" : pipelineVelocity}/day`,
            winRateLabel: `${winRate}%`,
            cycleLabel: `${avgCycleWon}d avg`,
        },
    };
}

// ─── Activity Breakdown ────────────────────────────────────────

/**
 * Activity analytics: volume by type, by user, by hour/day heatmap,
 * response times, activities per deal, and period comparison.
 */
async function getActivityBreakdownData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "30d");
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);

    const [activities, prevActivities] = await Promise.all([
        Activity.find({ workspaceId: wsId, createdAt: { $gte: start, $lte: end }, ...dm }).lean(),
        Activity.find({ workspaceId: wsId, createdAt: { $gte: prevStart, $lt: prevEnd }, ...dm }).lean(),
    ]);

    // By type
    const typeMap: Record<string, number> = {};
    const prevTypeMap: Record<string, number> = {};
    activities.forEach((a: any) => { typeMap[a.type] = (typeMap[a.type] || 0) + 1; });
    prevActivities.forEach((a: any) => { prevTypeMap[a.type] = (prevTypeMap[a.type] || 0) + 1; });

    const byType = Object.entries(typeMap).map(([type, count]) => ({
        type,
        count,
        change: percentChange(count, prevTypeMap[type] || 0),
        percentage: Math.round((count / activities.length) * 100),
    })).sort((a, b) => b.count - a.count);

    // By user (top 10)
    const userMap: Record<string, { count: number; calls: number; emails: number; meetings: number }> = {};
    activities.forEach((a: any) => {
        const uid = a.userId?.toString() || "system";
        if (!userMap[uid]) userMap[uid] = { count: 0, calls: 0, emails: 0, meetings: 0 };
        userMap[uid].count++;
        if (a.type === "call") userMap[uid].calls++;
        if (a.type === "email") userMap[uid].emails++;
        if (a.type === "meeting") userMap[uid].meetings++;
    });

    const byUser = Object.entries(userMap)
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Heatmap: activities by day-of-week × hour
    const heatmap: Record<string, number> = {};
    activities.forEach((a: any) => {
        const d = new Date(a.createdAt);
        const dayOfWeek = d.getDay(); // 0=Sun
        const hour = d.getHours();
        const key = `${dayOfWeek}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
    });

    const heatmapData = Object.entries(heatmap).map(([key, count]) => {
        const [day, hour] = key.split("-").map(Number);
        return { day, hour, count };
    });

    // Daily trend
    const dailyMap: Record<string, number> = {};
    activities.forEach((a: any) => {
        const day = new Date(a.createdAt).toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const dailyTrend = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Call duration stats
    const callActivities = activities.filter((a: any) => a.type === "call" && a.duration);
    const callDurations = callActivities.map((a: any) => a.duration || 0);
    const avgCallDuration = callDurations.length > 0
        ? Math.round(callDurations.reduce((a: number, b: number) => a + b, 0) / callDurations.length)
        : 0;

    // Automated vs manual
    const automated = activities.filter((a: any) => a.automated || a.isAutoLogged).length;
    const manual = activities.length - automated;

    return {
        total: activities.length,
        totalChange: percentChange(activities.length, prevActivities.length),
        byType,
        byUser,
        heatmapData,
        dailyTrend,
        avgPerDay: Math.round((activities.length / ((end.getTime() - start.getTime()) / 86400000)) * 10) / 10,
        callStats: {
            total: callActivities.length,
            avgDurationSec: avgCallDuration,
            avgDurationMin: Math.round(avgCallDuration / 60 * 10) / 10,
            totalDurationHrs: Math.round(callDurations.reduce((a, b) => a + b, 0) / 3600 * 10) / 10,
        },
        automationRate: activities.length > 0 ? Math.round((automated / activities.length) * 100) : 0,
        automated,
        manual,
        summary: {
            total: activities.length,
            change: percentChange(activities.length, prevActivities.length),
            avgPerDay: Math.round((activities.length / ((end.getTime() - start.getTime()) / 86400000)) * 10) / 10,
        },
    };
}

// ─── Campaign Performance ──────────────────────────────────────

/**
 * Campaign/sequence analytics: engagement rates, step-by-step dropoff,
 * best/worst performing, A/B comparison, and time-series trends.
 */
async function getCampaignPerformanceData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "30d");
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);

    const campaigns = await Campaign.find({ workspaceId: wsId, createdAt: { $gte: start, $lte: end }, ...dm }).lean();

    if (campaigns.length === 0) {
        return { campaigns: [], summary: { totalCampaigns: 0, totalSent: 0 } };
    }

    const campaignMetrics = campaigns.map((c: any) => {
        const s = c.stats || {};
        const sent = s.sent || 0;
        const delivered = s.delivered || 0;
        const opened = s.opened || 0;
        const clicked = s.clicked || 0;
        const replied = s.replied || 0;
        const bounced = s.bounced || 0;
        const unsubscribed = s.unsubscribed || 0;
        const positiveReplies = s.positiveReplies || 0;
        const negativeReplies = s.negativeReplies || 0;

        return {
            id: c._id,
            name: c.name,
            status: c.status,
            steps: (c.steps || []).length,
            totalEnrolled: c.totalEnrolled || 0,
            activeEnrollments: c.activeEnrollments || 0,
            completedEnrollments: c.completedEnrollments || 0,
            completionRate: c.totalEnrolled > 0 ? Math.round((c.completedEnrollments / c.totalEnrolled) * 100) : 0,
            sent,
            delivered,
            deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
            openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
            replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
            bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
            unsubscribeRate: sent > 0 ? Math.round((unsubscribed / sent) * 100) : 0,
            positiveReplyRate: replied > 0 ? Math.round((positiveReplies / replied) * 100) : 0,
            sentimentScore: replied > 0 ? Math.round(((positiveReplies - negativeReplies) / replied) * 100) : 0,
            createdAt: c.createdAt,
        };
    });

    // Sort by performance
    const byOpenRate = [...campaignMetrics].sort((a, b) => b.openRate - a.openRate);
    const byReplyRate = [...campaignMetrics].sort((a, b) => b.replyRate - a.replyRate);

    // Aggregate stats
    const totalSent = campaignMetrics.reduce((s, c) => s + c.sent, 0);
    const totalDelivered = campaignMetrics.reduce((s, c) => s + c.delivered, 0);
    const totalOpened = campaigns.reduce((s: number, c: any) => s + (c.stats?.opened || 0), 0);
    const totalClicked = campaigns.reduce((s: number, c: any) => s + (c.stats?.clicked || 0), 0);
    const totalReplied = campaigns.reduce((s: number, c: any) => s + (c.stats?.replied || 0), 0);
    const totalBounced = campaigns.reduce((s: number, c: any) => s + (c.stats?.bounced || 0), 0);
    const totalEnrolled = campaignMetrics.reduce((s, c) => s + c.totalEnrolled, 0);

    // By status
    const byStatus: Record<string, number> = {};
    campaigns.forEach((c: any) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

    return {
        campaigns: campaignMetrics,
        topByOpenRate: byOpenRate.slice(0, 5),
        topByReplyRate: byReplyRate.slice(0, 5),
        worstByOpenRate: byOpenRate.slice(-3).reverse(),
        byStatus,
        summary: {
            totalCampaigns: campaigns.length,
            activeCampaigns: campaigns.filter((c: any) => c.status === "active").length,
            totalEnrolled,
            totalSent,
            totalDelivered,
            avgDeliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
            avgOpenRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
            avgClickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
            avgReplyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
            avgBounceRate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0,
        },
    };
}

// ─── Lifecycle Funnel ──────────────────────────────────────────

/**
 * Full contact lifecycle: subscriber → lead → MQL → SQL → SAL → Opportunity → Customer
 * With conversion rates between stages, avg time in stage, SLA breach tracking.
 */
async function getLifecycleFunnelData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "90d");
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);

    const STAGES = ["subscriber", "lead", "mql", "sql", "sal", "opportunity", "customer", "evangelist"];

    // Get all lifecycle records for this workspace in period
    const transitions = await ContactLifecycleHistory.find({
        workspaceId: wsId,
        transitionedAt: { $gte: start, $lte: end },
        ...dm
    }).lean();

    // Current stage distribution (fixes C4: use aggregation instead of loading all)
    const stageDistribution = await ContactLifecycleHistory.aggregate([
        { $match: { workspaceId: wsId, ...dm } },
        { $sort: { contactId: 1, transitionedAt: -1 } },
        {
            $group: {
                _id: "$contactId",
                currentStage: { $first: "$currentStage" },
                transitionedTo: { $first: "$transitionedTo" },
            }
        },
        {
            $group: {
                _id: { $ifNull: ["$currentStage", "$transitionedTo"] },
                count: { $sum: 1 }
            }
        }
    ]);

    const stageDistributionMap: Record<string, number> = {};
    stageDistribution.forEach((s: any) => {
        stageDistributionMap[s._id] = s.count;
    });

    const totalContacts = Object.values(stageDistributionMap).reduce((a, b) => a + b, 0);

    // Build funnel stages
    const funnelStages = STAGES.map((stage, i) => {
        const count = stageDistributionMap[stage] || 0;
        const prevStage = i > 0 ? STAGES[i - 1] : null;
        const prevCount = prevStage ? (stageDistributionMap[prevStage] || 0) : totalContacts;
        const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        const percentage = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0;

        return { stage, count, conversionRate, percentage };
    }).filter(s => s.count > 0 || STAGES.indexOf(s.stage) < 7);

    // Time in stage (from transitions with timeInStage)
    const stageTimings: Record<string, number[]> = {};
    for (const t of transitions as any[]) {
        if (t.timeInStage && t.transitionedFrom) {
            if (!stageTimings[t.transitionedFrom]) stageTimings[t.transitionedFrom] = [];
            stageTimings[t.transitionedFrom].push(t.timeInStage); // hours
        }
    }

    const avgTimeByStage = Object.entries(stageTimings).map(([stage, times]) => ({
        stage,
        avgHours: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        avgDays: Math.round(times.reduce((a, b) => a + b, 0) / times.length / 24 * 10) / 10,
        count: times.length,
    }));

    // SLA breaches
    const slaBreaches = (transitions as any[]).filter(t => t.slaStatus === "breached").length;
    const slaAtRisk = (transitions as any[]).filter(t => t.slaStatus === "at_risk").length;

    // Transition methods
    const methodCounts: Record<string, number> = {};
    (transitions as any[]).forEach(t => {
        methodCounts[t.transitionMethod] = (methodCounts[t.transitionMethod] || 0) + 1;
    });

    // Overall conversion: subscriber/lead → customer
    const topOfFunnel = (stageDistribution["subscriber"] || 0) + (stageDistribution["lead"] || 0);
    const customers = stageDistribution["customer"] || 0;
    const overallConversion = (topOfFunnel + customers) > 0
        ? Math.round((customers / (topOfFunnel + customers)) * 100)
        : 0;

    // Disqualified / churned
    const disqualified = stageDistribution["disqualified"] || 0;
    const churned = stageDistribution["churned"] || 0;

    return {
        stages: funnelStages,
        stageDistribution,
        avgTimeByStage,
        transitionCount: transitions.length,
        transitionMethods: methodCounts,
        sla: { breaches: slaBreaches, atRisk: slaAtRisk },
        overallConversion,
        disqualified,
        churned,
        totalContacts,
        summary: {
            totalContacts,
            overallConversion,
            slaBreaches,
            churned,
            disqualified,
        },
    };
}

// ─── Call Insights ─────────────────────────────────────────────

/**
 * Call recording analytics: total calls, avg duration, sentiment distribution,
 * BANT scoring across calls, key moments (objections vs commitments), and trends.
 */
async function getCallInsightsData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "30d");
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);

    const [calls, prevCalls] = await Promise.all([
        CallRecording.find({ workspaceId: wsId, recordedAt: { $gte: start, $lte: end }, ...dm }).lean(),
        CallRecording.find({ workspaceId: wsId, recordedAt: { $gte: prevStart, $lt: prevEnd }, ...dm }).lean(),
    ]);

    // Duration stats
    const durations = (calls as any[]).filter(c => c.duration).map(c => c.duration);
    const totalDurationSec = durations.reduce((a: number, b: number) => a + b, 0);
    const avgDurationSec = durations.length > 0 ? Math.round(totalDurationSec / durations.length) : 0;

    // Sentiment distribution
    const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    (calls as any[]).forEach(c => {
        if (c.overallSentiment) sentimentCounts[c.overallSentiment]++;
    });
    const sentimentScore = calls.length > 0
        ? Math.round(((sentimentCounts.positive - sentimentCounts.negative) / calls.length) * 100)
        : 0;

    // BANT coverage
    let budgetMentioned = 0, authorityMentioned = 0, needIdentified = 0, timelineMentioned = 0;
    (calls as any[]).forEach(c => {
        if (c.keyInsights?.budget?.mentioned) budgetMentioned++;
        if (c.keyInsights?.authority?.decisionMaker) authorityMentioned++;
        if (c.keyInsights?.need?.identified) needIdentified++;
        if (c.keyInsights?.timeline?.mentioned) timelineMentioned++;
    });

    const bantCoverage = calls.length > 0 ? {
        budget: Math.round((budgetMentioned / calls.length) * 100),
        authority: Math.round((authorityMentioned / calls.length) * 100),
        need: Math.round((needIdentified / calls.length) * 100),
        timeline: Math.round((timelineMentioned / calls.length) * 100),
        overall: Math.round(((budgetMentioned + authorityMentioned + needIdentified + timelineMentioned) / (calls.length * 4)) * 100),
    } : { budget: 0, authority: 0, need: 0, timeline: 0, overall: 0 };

    // Key moments analysis
    let objections = 0, interests = 0, concerns = 0, commitments = 0;
    (calls as any[]).forEach(c => {
        (c.keyMoments || []).forEach((m: any) => {
            if (m.type === "objection") objections++;
            if (m.type === "interest") interests++;
            if (m.type === "concern") concerns++;
            if (m.type === "commitment") commitments++;
        });
    });

    // Source distribution
    const sourceCounts: Record<string, number> = {};
    (calls as any[]).forEach(c => {
        sourceCounts[c.source || "unknown"] = (sourceCounts[c.source || "unknown"] || 0) + 1;
    });

    // Action items completion
    let totalActionItems = 0, completedActionItems = 0;
    (calls as any[]).forEach(c => {
        (c.actionItems || []).forEach((ai: any) => {
            totalActionItems++;
            if (ai.completed) completedActionItems++;
        });
    });

    // Weekly trend
    const weeklyMap: Record<string, number> = {};
    (calls as any[]).forEach(c => {
        const d = new Date(c.recordedAt);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        weeklyMap[key] = (weeklyMap[key] || 0) + 1;
    });
    const weeklyTrend = Object.entries(weeklyMap)
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => a.week.localeCompare(b.week));

    return {
        totalCalls: calls.length,
        totalCallsChange: percentChange(calls.length, prevCalls.length),
        avgDurationMin: Math.round(avgDurationSec / 60 * 10) / 10,
        totalDurationHrs: Math.round(totalDurationSec / 3600 * 10) / 10,
        sentimentCounts,
        sentimentScore,
        bantCoverage,
        keyMoments: { objections, interests, concerns, commitments },
        commitmentToObjectionRatio: objections > 0 ? Math.round((commitments / objections) * 100) / 100 : commitments > 0 ? Infinity : 0,
        sourceCounts,
        actionItems: { total: totalActionItems, completed: completedActionItems, rate: totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0 },
        weeklyTrend,
        summary: {
            totalCalls: calls.length,
            change: percentChange(calls.length, prevCalls.length),
            sentimentScore,
            bantOverall: bantCoverage.overall,
        },
    };
}

// ─── Deal Cohort Analysis ──────────────────────────────────────

/**
 * Groups deals by creation month and tracks outcomes for each cohort:
 * win rate, revenue, avg cycle time, and how they compare across months.
 */
async function getDealCohortData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "6months");
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);

    const deals = await Opportunity.find({
        workspaceId: wsId,
        createdAt: { $gte: start, $lte: end },
        ...dm
    }).lean();

    // Group by creation month
    const cohorts: Record<string, any[]> = {};
    deals.forEach((d: any) => {
        const key = new Date(d.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!cohorts[key]) cohorts[key] = [];
        cohorts[key].push(d);
    });

    const cohortData = Object.entries(cohorts)
        .map(([month, deals]) => {
            const won = deals.filter(d => d.status === "won");
            const lost = deals.filter(d => d.status === "lost");
            const open = deals.filter(d => d.status === "open");
            const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);
            const wonValue = won.reduce((s, d) => s + (d.value || 0), 0);
            const lostValue = lost.reduce((s, d) => s + (d.value || 0), 0);

            // Avg cycle for closed deals
            const closedDeals = [...won, ...lost];
            const avgCycleDays = closedDeals.length > 0
                ? Math.round(closedDeals.reduce((s, d) => {
                    const created = new Date(d.createdAt).getTime();
                    const updated = new Date(d.updatedAt).getTime();
                    return s + (updated - created) / 86400000;
                }, 0) / closedDeals.length)
                : null;

            return {
                month,
                total: deals.length,
                won: won.length,
                lost: lost.length,
                open: open.length,
                winRate: (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
                totalValue: Math.round(totalValue),
                wonValue: Math.round(wonValue),
                lostValue: Math.round(lostValue),
                avgDealSize: deals.length > 0 ? Math.round(totalValue / deals.length) : 0,
                avgCycleDays,
                conversionPending: open.length, // still could convert
            };
        })
        .sort((a, b) => a.month.localeCompare(b.month));

    // Trends across cohorts
    const winRates = cohortData.filter(c => c.winRate !== null).map(c => c.winRate as number);
    const winRateTrend = trendDirection(trendSlope(winRates));
    const dealSizes = cohortData.map(c => c.avgDealSize);
    const dealSizeTrend = trendDirection(trendSlope(dealSizes));

    return {
        cohorts: cohortData,
        totalDeals: deals.length,
        winRateTrend,
        dealSizeTrend,
        summary: {
            cohortCount: cohortData.length,
            totalDeals: deals.length,
            avgWinRate: winRates.length > 0 ? Math.round(winRates.reduce((a, b) => a + b, 0) / winRates.length) : 0,
            winRateTrend,
        },
    };
}

// ─── Task Productivity ─────────────────────────────────────────

/**
 * Task analytics: completion rates, overdue analysis, avg completion time,
 * tasks by priority, by assignee, and trends.
 */
async function getTaskProductivityData(workspaceId: string, config: any) {
    const { start, end } = getDateRange(config.period || "30d");
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const dm = config._dashboardMatch || {};
    const wsId = new Types.ObjectId(workspaceId);
    const now = new Date();

    const [tasks, prevTasks] = await Promise.all([
        Task.find({ workspaceId: wsId, createdAt: { $gte: start, $lte: end }, ...dm }).lean(),
        Task.find({ workspaceId: wsId, createdAt: { $gte: prevStart, $lt: prevEnd }, ...dm }).lean(),
    ]);

    // Also get all open tasks (regardless of creation date)
    const allOpenTasks = await Task.find({ workspaceId: wsId, status: { $ne: "completed" } }).lean();
    const overdueTasks = (allOpenTasks as any[]).filter(t => t.dueDate && new Date(t.dueDate) < now);

    const completed = (tasks as any[]).filter(t => t.status === "completed");
    const prevCompleted = (prevTasks as any[]).filter(t => t.status === "completed");

    const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
    const prevCompletionRate = prevTasks.length > 0 ? Math.round((prevCompleted.length / prevTasks.length) * 100) : 0;

    // Avg completion time (created → completed, in hours)
    const completionTimes = completed
        .filter((t: any) => t.completedAt || t.updatedAt)
        .map((t: any) => {
            const created = new Date(t.createdAt).getTime();
            const done = new Date(t.completedAt || t.updatedAt).getTime();
            return (done - created) / 3600000; // hours
        });
    const avgCompletionHrs = completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10
        : 0;

    // By priority
    const byPriority: Record<string, { total: number; completed: number }> = {};
    (tasks as any[]).forEach(t => {
        const p = t.priority || "medium";
        if (!byPriority[p]) byPriority[p] = { total: 0, completed: 0 };
        byPriority[p].total++;
        if (t.status === "completed") byPriority[p].completed++;
    });

    const priorityData = Object.entries(byPriority).map(([priority, stats]) => ({
        priority,
        total: stats.total,
        completed: stats.completed,
        rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));

    // By assignee (top 10)
    const byAssignee: Record<string, { total: number; completed: number; overdue: number }> = {};
    (tasks as any[]).forEach(t => {
        const uid = t.assignedTo?.toString() || t.userId?.toString() || "unassigned";
        if (!byAssignee[uid]) byAssignee[uid] = { total: 0, completed: 0, overdue: 0 };
        byAssignee[uid].total++;
        if (t.status === "completed") byAssignee[uid].completed++;
        if (t.dueDate && new Date(t.dueDate) < now && t.status !== "completed") byAssignee[uid].overdue++;
    });

    const assigneeData = Object.entries(byAssignee)
        .map(([userId, stats]) => ({ userId, ...stats, rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    // Daily created/completed trend
    const dailyCreated: Record<string, number> = {};
    const dailyCompleted: Record<string, number> = {};
    (tasks as any[]).forEach(t => {
        const day = new Date(t.createdAt).toISOString().slice(0, 10);
        dailyCreated[day] = (dailyCreated[day] || 0) + 1;
        if (t.status === "completed") {
            const doneDay = new Date(t.completedAt || t.updatedAt).toISOString().slice(0, 10);
            dailyCompleted[doneDay] = (dailyCompleted[doneDay] || 0) + 1;
        }
    });

    const allDays = [...new Set([...Object.keys(dailyCreated), ...Object.keys(dailyCompleted)])].sort();
    const dailyTrend = allDays.map(day => ({
        date: day,
        created: dailyCreated[day] || 0,
        completed: dailyCompleted[day] || 0,
    }));

    return {
        total: tasks.length,
        totalChange: percentChange(tasks.length, prevTasks.length),
        completed: completed.length,
        completedChange: percentChange(completed.length, prevCompleted.length),
        completionRate,
        completionRateChange: completionRate - prevCompletionRate,
        overdue: overdueTasks.length,
        avgCompletionHrs,
        avgCompletionDays: Math.round(avgCompletionHrs / 24 * 10) / 10,
        openTasks: allOpenTasks.length,
        byPriority: priorityData,
        byAssignee: assigneeData,
        dailyTrend,
        summary: {
            total: tasks.length,
            change: percentChange(tasks.length, prevTasks.length),
            completionRate,
            overdue: overdueTasks.length,
        },
    };
}

// ─── Main Endpoint ─────────────────────────────────────────────

/**
 * POST /api/workspaces/:workspaceId/report-data
 * 
 * Unified endpoint — accepts { type, config } and returns data for any report type.
 * Supports 17 report types covering pipeline, activity, campaigns, lifecycle,
 * calls, cohorts, and task productivity.
 */
router.post(
    "/:workspaceId/report-data",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            // Validate workspace access
            if (!(await validateAccess(workspaceId, userId, res))) return;

            const { type, config: rawConfig = {}, definition } = req.body;
            const config = applyDashboardOverrides(rawConfig);

            // New: Dynamic Report Query Engine
            if (definition) {
                // Validate definition
                const validationError = validateReportDefinition(definition);
                if (validationError) {
                    return res.status(400).json({ error: validationError });
                }

                const engine = new ReportQueryEngine();
                const data = await engine.execute(definition, workspaceId);
                return res.json({ type: definition.type, data, custom: true });
            }

            // Legacy: Backward compatible with existing report types
            if (!type) {
                return res.status(400).json({ error: "Report type is required" });
            }

            let data: any;

            switch (type) {
                // ── Pipeline & Deals ───────────────────
                case "insight": data = await getInsightData(workspaceId, config); break;
                case "historical": data = await getHistoricalData(workspaceId, config); break;
                case "funnel": data = await getFunnelData(workspaceId, config); break;
                case "time_in_stage": data = await getTimeInStageData(workspaceId, config); break;
                case "stage_changed": data = await getStageChangedData(workspaceId, config); break;
                case "forecast": data = await getForecastData(workspaceId, config); break;
                case "at_risk": data = await getAtRiskData(workspaceId, config); break;
                case "deal_velocity": data = await getDealVelocityData(workspaceId, config); break;
                case "deal_cohort": data = await getDealCohortData(workspaceId, config); break;

                // ── People & Activity ──────────────────
                case "top_performers": data = await getTopPerformersData(workspaceId, config); break;
                case "lead_sources": data = await getLeadSourcesData(workspaceId, config); break;
                case "lifecycle_funnel": data = await getLifecycleFunnelData(workspaceId, config); break;
                case "activity_breakdown": data = await getActivityBreakdownData(workspaceId, config); break;

                // ── Outreach & Communication ──────────
                case "email": data = await getEmailData(workspaceId, config); break;
                case "email_engagement_deep_dive": data = await getEmailEngagementDeepDive(workspaceId, config); break;
                case "email_reply_analysis": data = await getEmailReplyAnalysis(workspaceId, config); break;
                case "email_open_heatmap": data = await getEmailOpenHeatmap(workspaceId, config); break;
                case "email_contact_engagement": data = await getEmailContactEngagement(workspaceId, config); break;

                // ── Cross-Entity Email Intelligence ──────
                case "email_revenue_attribution": data = await getEmailRevenueAttribution(workspaceId, config); break;
                case "email_lifecycle_acceleration": data = await getEmailLifecycleAcceleration(workspaceId, config); break;
                case "campaign_comparison": data = await getCampaignComparison(workspaceId, config); break;
                case "sequence_step_funnel": data = await getSequenceStepFunnel(workspaceId, config); break;
                case "deliverability_health": data = await getDeliverabilityHealth(workspaceId, config); break;
                case "engagement_decay": data = await getEngagementDecay(workspaceId, config); break;

                case "campaign_performance": data = await getCampaignPerformanceData(workspaceId, config); break;
                case "call_insights": data = await getCallInsightsData(workspaceId, config); break;

                // ── Productivity ──────────────────────
                case "task_productivity": data = await getTaskProductivityData(workspaceId, config); break;

                default:
                    return res.status(400).json({ error: `Unknown report type: ${type}` });
            }

            res.json({ type, data });
        } catch (error) {
            console.error("Error fetching report data:", error);
            res.status(500).json({ error: "Failed to fetch report data" });
        }
    }
);

// ─── DRILL-DOWN ENDPOINT (with sort/filter/search) ──────
router.post(
    "/:workspaceId/report-data/drill-down",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            // Validate workspace access
            if (!(await validateAccess(workspaceId, userId, res))) return;

            const { definition, context, sort, search } = req.body;

            if (!definition) {
                return res.status(400).json({ error: "Report definition is required" });
            }

            // Validate definition
            const validationError = validateReportDefinition(definition);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            const engine = new ReportQueryEngine();
            const drillContext = {
                ...(context || {}),
                // Sort: { field: "value", direction: "asc" | "desc" }
                sort: sort || undefined,
                // Search: free-text search across name/title/subject/email fields
                search: search || undefined,
            };
            const result = await engine.executeDrillDown(definition, new Types.ObjectId(workspaceId), drillContext);

            res.json(result);
        } catch (error) {
            console.error("Error executing drill-down:", error);
            res.status(500).json({ error: "Failed to fetch drill-down data" });
        }
    }
);

export default router;
