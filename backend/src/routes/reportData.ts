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
        case "7days": start.setDate(end.getDate() - 7); break;
        case "30days": start.setDate(end.getDate() - 30); break;
        case "90days": start.setDate(end.getDate() - 90); break;
        case "6months": start.setMonth(end.getMonth() - 6); break;
        case "1year": start.setFullYear(end.getFullYear() - 1); break;
        case "quarter":
            const q = Math.floor(end.getMonth() / 3);
            start.setMonth(q * 3, 1); start.setHours(0, 0, 0, 0);
            break;
        default: start.setDate(end.getDate() - 30);
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

// ─── INSIGHT — Real-time KPIs with period comparison ───────────

async function getInsightData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const metric = config.metric || "pipeline_value";
    const period = config.period || "30days";
    const { start, end } = getDateRange(period);
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    switch (metric) {
        case "pipeline_value": {
            const [current, previous] = await Promise.all([
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: { $ne: "lost" } } },
                    { $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 }, avgDeal: { $avg: "$value" } } },
                ]),
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: { $ne: "lost" }, createdAt: { $lte: prevEnd } } },
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
                Opportunity.countDocuments({ workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end } }),
                Opportunity.countDocuments({ workspaceId: wId, status: { $in: ["won", "lost"] }, updatedAt: { $gte: start, $lte: end } }),
                Opportunity.countDocuments({ workspaceId: wId, status: "won", updatedAt: { $gte: prevStart, $lte: prevEnd } }),
                Opportunity.countDocuments({ workspaceId: wId, status: { $in: ["won", "lost"] }, updatedAt: { $gte: prevStart, $lte: prevEnd } }),
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
                Opportunity.countDocuments({ workspaceId: wId, status: { $nin: ["won", "lost"] } }),
                Opportunity.countDocuments({ workspaceId: wId, status: { $nin: ["won", "lost"] }, createdAt: { $lte: prevEnd } }),
            ]);
            return {
                value: current, label: "Open Deals", format: "number",
                change: percentChange(current, previous),
            };
        }
        case "revenue_won": {
            const [curRevenue, prevRevenue] = await Promise.all([
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 } } },
                ]),
                Opportunity.aggregate([
                    { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: prevStart, $lte: prevEnd } } },
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
                Contact.countDocuments({ workspaceId: wId }),
                Contact.countDocuments({ workspaceId: wId, createdAt: { $lte: prevEnd } }),
                Contact.countDocuments({ workspaceId: wId, createdAt: { $gte: start, $lte: end } }),
            ]);
            return {
                value: cur, label: "Total Contacts", format: "number",
                change: percentChange(cur, prev),
                newThisPeriod,
            };
        }
        case "total_companies": {
            const [cur, prev] = await Promise.all([
                Company.countDocuments({ workspaceId: wId }),
                Company.countDocuments({ workspaceId: wId, createdAt: { $lte: prevEnd } }),
            ]);
            return { value: cur, label: "Total Companies", format: "number", change: percentChange(cur, prev) };
        }
        case "emails_sent": {
            const [cur, prev] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd } }),
            ]);
            return { value: cur, label: "Emails Sent", format: "number", change: percentChange(cur, prev) };
        }
        case "open_rate": {
            const [opened, total, prevOpened, prevTotal] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.opened": true, sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.opened": true, sentAt: { $gte: prevStart, $lte: prevEnd } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd } }),
            ]);
            const curRate = total > 0 ? Math.round((opened / total) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevOpened / prevTotal) * 100) : 0;
            return { value: curRate, label: "Open Rate", format: "percent", change: curRate - prevRate };
        }
        case "click_rate": {
            const [clicked, total, prevClicked, prevTotal] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.clicked": true, sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.clicked": true, sentAt: { $gte: prevStart, $lte: prevEnd } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd } }),
            ]);
            const curRate = total > 0 ? Math.round((clicked / total) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevClicked / prevTotal) * 100) : 0;
            return { value: curRate, label: "Click Rate", format: "percent", change: curRate - prevRate };
        }
        case "reply_rate": {
            const [replied, total, prevReplied, prevTotal] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.replied": true, sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", "tracking.replied": true, sentAt: { $gte: prevStart, $lte: prevEnd } }),
                EmailMessage.countDocuments({ workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd } }),
            ]);
            const curRate = total > 0 ? Math.round((replied / total) * 100) : 0;
            const prevRate = prevTotal > 0 ? Math.round((prevReplied / prevTotal) * 100) : 0;
            return { value: curRate, label: "Reply Rate", format: "percent", change: curRate - prevRate };
        }
        case "open_tasks": {
            const [cur, prev] = await Promise.all([
                Task.countDocuments({ workspaceId: wId, status: { $ne: "completed" } }),
                Task.countDocuments({ workspaceId: wId, status: { $ne: "completed" }, createdAt: { $lte: prevEnd } }),
            ]);
            return { value: cur, label: "Open Tasks", format: "number", change: percentChange(cur, prev) };
        }
        case "open_tickets": {
            const [cur, prev] = await Promise.all([
                Ticket.countDocuments({ workspaceId: wId, status: { $in: ["open", "in_progress"] } }),
                Ticket.countDocuments({ workspaceId: wId, status: { $in: ["open", "in_progress"] }, createdAt: { $lte: prevEnd } }),
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

    let rawData: any[] = [];

    if (metric === "revenue") {
        rawData = await Opportunity.aggregate([
            { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end } } },
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
            { $match: { workspaceId: wId, createdAt: { $gte: start, $lte: end } } },
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
            { $match: { workspaceId: wId, createdAt: { $gte: start, $lte: end } } },
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
            { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: prevStart, $lte: prevEnd } } },
            { $group: { _id: null, total: { $sum: "$value" } } },
        ]);
        prevTotal = prev[0]?.total || 0;
    } else if (metric === "deals_created") {
        prevTotal = await Opportunity.countDocuments({ workspaceId: wId, createdAt: { $gte: prevStart, $lte: prevEnd } });
    } else if (metric === "contacts_created") {
        prevTotal = await Contact.countDocuments({ workspaceId: wId, createdAt: { $gte: prevStart, $lte: prevEnd } });
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

    // Get actual pipeline data with stage lookups (fixes C1)
    const pipeline = await Opportunity.aggregate([
        { $match: { workspaceId: wId } },
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
    const lostCount = await Opportunity.countDocuments({ workspaceId: wId, status: "lost" });
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
    const wonCount = await Opportunity.countDocuments({ workspaceId: wId, status: "won" });
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
    const aggregation = config.metric || "avg";

    // Query both Opportunity (primary) and Deal (legacy fallback) during transition
    const [opportunities, legacyDeals] = await Promise.all([
        Opportunity.find({
            workspaceId: wId,
            stageHistory: { $exists: true, $not: { $size: 0 } },
        }).select("stageHistory value").lean(),
        Deal.find({
            workspaceId: wId,
            stageHistory: { $exists: true, $not: { $size: 0 } },
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
    const { start, end } = getDateRange(config.period || "30days");
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    // Query both Opportunity (primary) and Deal (legacy fallback) during transition
    const [currentOpps, previousOpps, currentDeals, previousDeals] = await Promise.all([
        Opportunity.find({
            workspaceId: wId,
            "stageHistory.enteredAt": { $gte: start, $lte: end },
        }).select("stageHistory value").lean(),
        Opportunity.find({
            workspaceId: wId,
            "stageHistory.enteredAt": { $gte: prevStart, $lte: prevEnd },
        }).select("stageHistory value").lean(),
        Deal.find({
            workspaceId: wId,
            "stageHistory.changedAt": { $gte: start, $lte: end },
        }).select("stageHistory value").lean(),
        Deal.find({
            workspaceId: wId,
            "stageHistory.changedAt": { $gte: prevStart, $lte: prevEnd },
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
    const { start, end } = getDateRange(config.period || "30days");
    const groupBy = config.groupBy || "day";
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);

    const format = groupBy === "day" ? "%Y-%m-%d" : groupBy === "week" ? "%Y-W%V" : "%Y-%m";

    const [currentData, prevData] = await Promise.all([
        EmailMessage.aggregate([
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } } },
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
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: prevStart, $lte: prevEnd } } },
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

// ─── TOP PERFORMERS — With win rate + ranking ──────────────────

async function getTopPerformersData(workspaceId: string, config: any) {
    const wId = new Types.ObjectId(workspaceId);
    const metric = config.metric || "deals";
    const period = config.period || "30days";
    const { start, end } = getDateRange(period);

    if (metric === "deals" || metric === "revenue") {
        const performers = await Opportunity.aggregate([
            { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end } } },
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
            { $match: { workspaceId: wId, status: "lost", updatedAt: { $gte: start, $lte: end } } },
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
            { $match: { workspaceId: wId, direction: "outbound", sentAt: { $gte: start, $lte: end } } },
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

    // Get contacts by source (fixes B4: normalize source to lowercase/trim)
    const sources = await Contact.aggregate([
        { $match: { workspaceId: wId, source: { $exists: true, $nin: [null, ""] } } },
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
        { $match: { workspaceId: wId } },
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
    const period = config.period || "quarter";
    const { start, end } = getDateRange(period);
    const target = config.target || 0; // Revenue target if provided

    const deals = await Opportunity.find({
        workspaceId: wId,
        status: { $nin: ["lost"] },
        expectedCloseDate: { $gte: start, $lte: end },
    }).select("value probability status stage expectedCloseDate title").lean();

    // Already won revenue this period
    const wonThisPeriod = await Opportunity.aggregate([
        { $match: { workspaceId: wId, status: "won", updatedAt: { $gte: start, $lte: end } } },
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
    const inactiveDays = config.inactiveDays || 14;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - inactiveDays);

    const deals = await Opportunity.find({
        workspaceId: wId,
        status: { $nin: ["won", "lost"] },
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
    const { periodDays = 90 } = config;
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const prevStart = new Date(periodStart.getTime() - periodDays * 86400000);
    const wsId = new Types.ObjectId(workspaceId);

    // Closed deals in current period (fixes C3: use actualCloseDate)
    const closedDeals = await Opportunity.find({
        workspaceId: wsId,
        status: { $in: ["won", "lost"] },
        actualCloseDate: { $gte: periodStart },
    }).lean();

    // Previous period
    const prevClosedDeals = await Opportunity.find({
        workspaceId: wsId,
        status: { $in: ["won", "lost"] },
        actualCloseDate: { $gte: prevStart, $lt: periodStart },
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
    const { periodDays = 30 } = config;
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const prevStart = new Date(periodStart.getTime() - periodDays * 86400000);
    const wsId = new Types.ObjectId(workspaceId);

    const [activities, prevActivities] = await Promise.all([
        Activity.find({ workspaceId: wsId, createdAt: { $gte: periodStart } }).lean(),
        Activity.find({ workspaceId: wsId, createdAt: { $gte: prevStart, $lt: periodStart } }).lean(),
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
        avgPerDay: Math.round((activities.length / periodDays) * 10) / 10,
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
            avgPerDay: Math.round((activities.length / periodDays) * 10) / 10,
        },
    };
}

// ─── Campaign Performance ──────────────────────────────────────

/**
 * Campaign/sequence analytics: engagement rates, step-by-step dropoff,
 * best/worst performing, A/B comparison, and time-series trends.
 */
async function getCampaignPerformanceData(workspaceId: string, config: any) {
    const wsId = new Types.ObjectId(workspaceId);

    const campaigns = await Campaign.find({ workspaceId: wsId }).lean();

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
    const { periodDays = 90 } = config;
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const wsId = new Types.ObjectId(workspaceId);

    const STAGES = ["subscriber", "lead", "mql", "sql", "sal", "opportunity", "customer", "evangelist"];

    // Get all lifecycle records for this workspace in period
    const transitions = await ContactLifecycleHistory.find({
        workspaceId: wsId,
        transitionedAt: { $gte: periodStart },
    }).lean();

    // Current stage distribution (fixes C4: use aggregation instead of loading all)
    const stageDistribution = await ContactLifecycleHistory.aggregate([
        { $match: { workspaceId: wsId } },
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
    const { periodDays = 30 } = config;
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const prevStart = new Date(periodStart.getTime() - periodDays * 86400000);
    const wsId = new Types.ObjectId(workspaceId);

    const [calls, prevCalls] = await Promise.all([
        CallRecording.find({ workspaceId: wsId, recordedAt: { $gte: periodStart } }).lean(),
        CallRecording.find({ workspaceId: wsId, recordedAt: { $gte: prevStart, $lt: periodStart } }).lean(),
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
    const { months = 6 } = config;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const wsId = new Types.ObjectId(workspaceId);

    const deals = await Opportunity.find({
        workspaceId: wsId,
        createdAt: { $gte: startDate },
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
    const { periodDays = 30 } = config;
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const prevStart = new Date(periodStart.getTime() - periodDays * 86400000);
    const wsId = new Types.ObjectId(workspaceId);

    const [tasks, prevTasks] = await Promise.all([
        Task.find({ workspaceId: wsId, createdAt: { $gte: periodStart } }).lean(),
        Task.find({ workspaceId: wsId, createdAt: { $gte: prevStart, $lt: periodStart } }).lean(),
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

            const { type, config = {}, definition } = req.body;

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

// ─── DRILL-DOWN ENDPOINT ────────────────────────────────
router.post(
    "/:workspaceId/report-data/drill-down",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            // Validate workspace access
            if (!(await validateAccess(workspaceId, userId, res))) return;

            const { definition, context } = req.body;

            if (!definition) {
                return res.status(400).json({ error: "Report definition is required" });
            }

            // Validate definition
            const validationError = validateReportDefinition(definition);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            const engine = new ReportQueryEngine();
            const result = await engine.executeDrillDown(definition, new Types.ObjectId(workspaceId), context || {});

            res.json(result);
        } catch (error) {
            console.error("Error executing drill-down:", error);
            res.status(500).json({ error: "Failed to fetch drill-down data" });
        }
    }
);

export default router;
