import express, { Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import Opportunity from "../models/Opportunity";
import Activity from "../models/Activity";
import Project from "../models/Project";
import { analyzeDeal, suggestNextActions, AIInsights, NextActionSuggestion } from "../services/ai.service";

const router = express.Router();

/**
 * POST /api/workspaces/:workspaceId/opportunities/:opportunityId/analyze
 * Trigger AI analysis for an opportunity
 */
router.post(
    "/workspaces/:workspaceId/opportunities/:opportunityId/analyze",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, opportunityId } = req.params;

            // Validate workspace
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({
                    success: false,
                    error: "Workspace not found.",
                });
            }

            if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
                return res.status(403).json({
                    success: false,
                    error: "You do not have permission to access this workspace.",
                });
            }

            // Get opportunity
            const opportunity = await Opportunity.findOne({
                _id: opportunityId,
                workspaceId,
            })
                .populate("contactId", "firstName lastName email")
                .populate("companyId", "name industry");

            if (!opportunity) {
                return res.status(404).json({
                    success: false,
                    error: "Opportunity not found.",
                });
            }

            // Get activities for this opportunity
            const activities = await Activity.find({
                workspaceId,
                opportunityId,
            })
                .sort({ createdAt: -1 })
                .limit(20);

            // Run AI analysis
            const insights = await analyzeDeal(opportunity, activities);

            // Update opportunity with AI insights
            opportunity.aiInsights = {
                dealScore: insights.dealScore,
                closeProbability: insights.closeProbability,
                recommendedActions: insights.recommendedActions,
                riskFactors: insights.riskFactors,
                lastAnalyzedAt: new Date(),
                confidenceLevel: insights.confidence,
            };

            // Update deal temperature based on AI score
            if (insights.dealScore >= 70) {
                opportunity.dealTemperature = "hot";
            } else if (insights.dealScore < 40) {
                opportunity.dealTemperature = "cold";
            } else {
                opportunity.dealTemperature = "warm";
            }

            await opportunity.save();

            res.json({
                success: true,
                data: {
                    insights: opportunity.aiInsights,
                    dealTemperature: opportunity.dealTemperature,
                },
            });
        } catch (error: any) {
            console.error("AI analysis error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to analyze opportunity.",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/opportunities/:opportunityId/suggestions
 * Get AI-powered next action suggestions
 */
router.get(
    "/workspaces/:workspaceId/opportunities/:opportunityId/suggestions",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, opportunityId } = req.params;

            // Validate workspace
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({
                    success: false,
                    error: "Workspace not found.",
                });
            }

            if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
                return res.status(403).json({
                    success: false,
                    error: "You do not have permission to access this workspace.",
                });
            }

            // Get opportunity
            const opportunity = await Opportunity.findOne({
                _id: opportunityId,
                workspaceId,
            });

            if (!opportunity) {
                return res.status(404).json({
                    success: false,
                    error: "Opportunity not found.",
                });
            }

            // Get recent activities
            const activities = await Activity.find({
                workspaceId,
                opportunityId,
            })
                .sort({ createdAt: -1 })
                .limit(10);

            // Get AI suggestions
            const suggestions = await suggestNextActions(opportunity, activities);

            res.json({
                success: true,
                data: { suggestions },
            });
        } catch (error: any) {
            console.error("AI suggestions error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get suggestions.",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/opportunities/:opportunityId/insights
 * Get cached AI insights (without triggering new analysis)
 */
router.get(
    "/workspaces/:workspaceId/opportunities/:opportunityId/insights",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, opportunityId } = req.params;

            // Validate workspace
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({
                    success: false,
                    error: "Workspace not found.",
                });
            }

            if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
                return res.status(403).json({
                    success: false,
                    error: "You do not have permission to access this workspace.",
                });
            }

            // Get opportunity with AI insights
            const opportunity = await Opportunity.findOne({
                _id: opportunityId,
                workspaceId,
            }).select("aiInsights dealTemperature");

            if (!opportunity) {
                return res.status(404).json({
                    success: false,
                    error: "Opportunity not found.",
                });
            }

            res.json({
                success: true,
                data: {
                    insights: opportunity.aiInsights || null,
                    dealTemperature: opportunity.dealTemperature || null,
                    hasAnalysis: !!opportunity.aiInsights?.lastAnalyzedAt,
                },
            });
        } catch (error: any) {
            console.error("Get AI insights error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get insights.",
            });
        }
    }
);

export default router;
