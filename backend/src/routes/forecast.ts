/**
 * Forecasting API Routes
 *
 * Provides revenue forecasting, trend analysis, risk alerts, and executive summaries.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import Opportunity from "../models/Opportunity";
import Activity from "../models/Activity";

const router = Router();

function getDateRange(period: string): { start: Date; end: Date; label: string } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
        case "month":
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            return { start, end, label: now.toLocaleString("default", { month: "long", year: "numeric" }) };
        case "quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            end.setMonth((quarter + 1) * 3, 0);
            return { start, end, label: `Q${quarter + 1} ${now.getFullYear()}` };
        case "year":
            start.setMonth(0, 1);
            end.setMonth(11, 31);
            return { start, end, label: `${now.getFullYear()}` };
        default:
            // Next 30 days
            end.setDate(end.getDate() + 30);
            return { start, end, label: "Next 30 Days" };
    }
}

function daysSince(date: Date | undefined): number {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/workspaces/:workspaceId/forecast
 *
 * Get revenue forecast for a period (month/quarter/year).
 */
router.get(
    "/:workspaceId/forecast",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { period = "month", pipelineId } = req.query;

            const dateRange = getDateRange(period as string);

            const filter: any = {
                workspaceId,
                status: "open",
                expectedCloseDate: { $gte: dateRange.start, $lte: dateRange.end },
            };
            if (pipelineId) filter.pipelineId = pipelineId;

            const deals = await Opportunity.find(filter).lean();

            // Calculate forecast categories
            let committed = 0;
            let bestCase = 0;
            let pipeline = 0;
            const dealDetails: any[] = [];

            for (const deal of deals) {
                const d = deal as any;
                const value = d.value || 0;
                const probability = d.probability || 50;
                const daysInactive = daysSince(d.lastActivityAt);

                // Adjust probability based on activity
                let adjustedProb = probability;
                if (daysInactive > 14) adjustedProb *= 0.7;
                if (daysInactive > 30) adjustedProb *= 0.5;

                bestCase += value;
                pipeline += value * (adjustedProb / 100);

                if (probability >= 80 && daysInactive < 14) {
                    committed += value;
                }

                dealDetails.push({
                    id: d._id.toString(),
                    title: d.title,
                    value,
                    probability,
                    adjustedProbability: Math.round(adjustedProb),
                    expectedClose: d.expectedCloseDate,
                    category: probability >= 80 ? "committed" : probability >= 50 ? "probable" : "possible",
                });
            }

            res.json({
                success: true,
                data: {
                    period: dateRange.label,
                    forecast: {
                        committed,
                        weightedPipeline: Math.round(pipeline),
                        bestCase,
                        dealCount: deals.length,
                    },
                    deals: dealDetails,
                },
            });
        } catch (error: any) {
            console.error("Error fetching forecast:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch forecast",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/forecast/trends
 *
 * Get trend analysis for metrics over time.
 */
router.get(
    "/:workspaceId/forecast/trends",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { metric = "deals_won", months = 6 } = req.query;

            const monthsNum = parseInt(months as string);
            const periods: any[] = [];

            for (let i = monthsNum - 1; i >= 0; i--) {
                const start = new Date();
                start.setMonth(start.getMonth() - i, 1);
                const end = new Date(start);
                end.setMonth(end.getMonth() + 1, 0);

                let value = 0;
                let count = 0;

                switch (metric) {
                    case "deals_won":
                        const won = await Opportunity.countDocuments({
                            workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: start, $lte: end },
                        });
                        value = won;
                        count = won;
                        break;
                    case "revenue":
                        const wonDeals = await Opportunity.find({
                            workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: start, $lte: end },
                        }).lean();
                        value = wonDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
                        count = wonDeals.length;
                        break;
                    case "avg_deal_size":
                        const allWon = await Opportunity.find({
                            workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: start, $lte: end },
                        }).lean();
                        value = allWon.length > 0
                            ? allWon.reduce((sum, d: any) => sum + (d.value || 0), 0) / allWon.length
                            : 0;
                        count = allWon.length;
                        break;
                    case "win_rate":
                        const wonCount = await Opportunity.countDocuments({
                            workspaceId,
                            status: "won",
                            updatedAt: { $gte: start, $lte: end },
                        });
                        const lostCount = await Opportunity.countDocuments({
                            workspaceId,
                            status: "lost",
                            updatedAt: { $gte: start, $lte: end },
                        });
                        value = (wonCount + lostCount) > 0
                            ? Math.round((wonCount / (wonCount + lostCount)) * 100)
                            : 0;
                        count = wonCount + lostCount;
                        break;
                }

                periods.push({
                    period: start.toLocaleString("default", { month: "short", year: "numeric" }),
                    value: Math.round(value),
                    count,
                });
            }

            // Calculate trend
            const values = periods.map(p => p.value);
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
            const trendDirection = secondAvg > firstAvg ? "up" : secondAvg < firstAvg ? "down" : "stable";
            const trendPercent = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;

            res.json({
                success: true,
                data: {
                    metric,
                    periods,
                    trend: {
                        direction: trendDirection,
                        percentChange: trendPercent,
                    },
                },
            });
        } catch (error: any) {
            console.error("Error fetching trends:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch trends",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/forecast/risks
 *
 * Get at-risk deals.
 */
router.get(
    "/:workspaceId/forecast/risks",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { threshold = 30 } = req.query;

            const openDeals = await Opportunity.find({
                workspaceId,
                status: "open",
            }).populate("contactId", "firstName lastName").lean();

            const riskyDeals: any[] = [];

            for (const deal of openDeals) {
                const d = deal as any;
                const risks: string[] = [];
                let riskScore = 0;

                // Check for risk factors
                if (daysSince(d.lastActivityAt) > 14) {
                    risks.push(`No activity for ${daysSince(d.lastActivityAt)} days`);
                    riskScore += 25;
                }
                if (d.expectedCloseDate && new Date(d.expectedCloseDate) < new Date()) {
                    risks.push("Past expected close date");
                    riskScore += 30;
                }
                if (!d.nextAction) {
                    risks.push("No next action defined");
                    riskScore += 15;
                }
                if (d.dealTemperature === "cold") {
                    risks.push("Deal marked as cold");
                    riskScore += 20;
                }
                if ((d.probability || 50) < 30) {
                    risks.push("Low probability");
                    riskScore += 15;
                }

                if (riskScore >= parseInt(threshold as string)) {
                    riskyDeals.push({
                        id: d._id.toString(),
                        title: d.title,
                        value: d.value,
                        contact: d.contactId ? `${d.contactId.firstName} ${d.contactId.lastName}` : null,
                        riskScore,
                        risks,
                        recommendation: riskScore > 60
                            ? "Urgent: Schedule immediate follow-up or consider closing"
                            : "Action needed: Re-engage within 48 hours",
                    });
                }
            }

            riskyDeals.sort((a, b) => (b.value * b.riskScore) - (a.value * a.riskScore));

            res.json({
                success: true,
                data: {
                    totalAtRisk: riskyDeals.length,
                    totalValueAtRisk: riskyDeals.reduce((sum, d) => sum + (d.value || 0), 0),
                    deals: riskyDeals.slice(0, 10),
                },
            });
        } catch (error: any) {
            console.error("Error fetching risk alerts:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch risk alerts",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/forecast/summary
 *
 * Get executive summary.
 */
router.get(
    "/:workspaceId/forecast/summary",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { reportType = "weekly" } = req.query;

            const now = new Date();
            const periodStart = new Date();
            periodStart.setDate(now.getDate() - (reportType === "weekly" ? 7 : reportType === "monthly" ? 30 : 90));

            const [
                newDeals,
                wonDeals,
                lostDeals,
                openDeals,
                activities,
            ] = await Promise.all([
                Opportunity.countDocuments({ workspaceId, createdAt: { $gte: periodStart } }),
                Opportunity.find({ workspaceId, status: "won", actualCloseDate: { $gte: periodStart } }).lean(),
                Opportunity.countDocuments({ workspaceId, status: "lost", updatedAt: { $gte: periodStart } }),
                Opportunity.find({ workspaceId, status: "open" }).lean(),
                Activity.countDocuments({ workspaceId, createdAt: { $gte: periodStart } }),
            ]);

            const wonValue = wonDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
            const pipelineValue = openDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
            const winRate = (wonDeals.length + lostDeals) > 0
                ? Math.round((wonDeals.length / (wonDeals.length + lostDeals)) * 100)
                : 0;

            res.json({
                success: true,
                data: {
                    reportType,
                    period: `${periodStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                    metrics: {
                        newDeals,
                        dealsWon: wonDeals.length,
                        wonValue,
                        dealsLost: lostDeals,
                        winRate,
                        openPipeline: openDeals.length,
                        pipelineValue,
                        activities,
                    },
                },
            });
        } catch (error: any) {
            console.error("Error generating summary:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to generate summary",
            });
        }
    }
);

export default router;
