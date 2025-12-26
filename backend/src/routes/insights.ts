/**
 * Insights API Routes
 * 
 * Provides endpoints for managing AI-powered proactive insights.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import { insightService } from "../services/insightService";
import { contextAnalyzer } from "../services/contextAnalyzer";

const router = Router();

/**
 * GET /api/workspaces/:workspaceId/insights
 * 
 * Get pending insights for user. Optionally filter by context.
 */
router.get(
    "/:workspaceId/insights",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { contextType, contextId } = req.query;
            const userId = (req.user?._id as any)?.toString();

            const insights = await insightService.getInsights(
                workspaceId,
                userId,
                contextType as string | undefined,
                contextId as string | undefined
            );

            // Mark as shown
            for (const insight of insights) {
                await insightService.markShown(insight._id?.toString());
            }

            res.json({
                success: true,
                data: insights,
            });
        } catch (error: any) {
            console.error("Error fetching insights:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch insights",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/insights/generate
 * 
 * Generate insights for a specific context.
 */
router.post(
    "/:workspaceId/insights/generate",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { contextType, contextId } = req.body;
            const userId = (req.user?._id as any)?.toString();

            let result;

            switch (contextType) {
                case 'contact':
                    result = await insightService.generateContactInsights(
                        workspaceId,
                        userId,
                        contextId
                    );
                    break;
                case 'deal':
                    result = await insightService.generateDealInsights(
                        workspaceId,
                        userId,
                        contextId
                    );
                    break;
                case 'campaign':
                    result = await insightService.generateCampaignInsights(
                        workspaceId,
                        userId,
                        contextId
                    );
                    break;
                case 'email':
                    result = await insightService.generateEmailInsights(
                        workspaceId,
                        userId,
                        contextId
                    );
                    break;
                case 'workflow':
                    result = await insightService.generateWorkflowInsights(
                        workspaceId,
                        userId
                    );
                    break;
                // New context types for AI panels
                case 'sequence':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'sequence',
                        contextId,
                        'sequence_performance'
                    );
                    break;
                case 'ticket':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'ticket',
                        contextId,
                        'ticket_analysis'
                    );
                    break;
                case 'meeting':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'meeting',
                        contextId,
                        'meeting_intelligence'
                    );
                    break;
                case 'lead_score':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'lead_score',
                        contextId,
                        'score_explanation'
                    );
                    break;
                case 'email_template':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'email_template',
                        contextId,
                        'template_performance'
                    );
                    break;
                case 'data_quality':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'data_quality',
                        'workspace',
                        'data_health'
                    );
                    break;
                case 'email_analytics':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'email_analytics',
                        'workspace',
                        'email_performance'
                    );
                    break;
                case 'email_account':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'email_account',
                        contextId,
                        'account_health'
                    );
                    break;
                case 'daily_briefing':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'daily_briefing',
                        'today',
                        'daily_summary'
                    );
                    break;
                case 'pipeline':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'pipeline',
                        contextId,
                        'pipeline_analysis'
                    );
                    break;
                case 'account':
                    result = await insightService.generateGenericInsights(
                        workspaceId,
                        userId,
                        'account',
                        contextId,
                        'account_intelligence'
                    );
                    break;
                case 'analytics':
                    // Full analytics intelligence with trends, anomalies, forecasts
                    result = await insightService.generateAnalyticsInsights(
                        workspaceId,
                        userId
                    );
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: `Unknown context type: ${contextType}`,
                    });
            }

            res.json({
                success: result.success,
                data: result.insights,
                error: result.error,
            });
        } catch (error: any) {
            console.error("Error generating insights:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to generate insights",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/insights/:insightId/act
 * 
 * Mark insight as acted upon.
 */
router.post(
    "/:workspaceId/insights/:insightId/act",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { insightId } = req.params;
            const { actionType } = req.body;

            await insightService.markActed(insightId, actionType);

            res.json({
                success: true,
                message: "Insight marked as acted",
            });
        } catch (error: any) {
            console.error("Error marking insight acted:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to mark insight",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/insights/:insightId/dismiss
 * 
 * Dismiss an insight.
 */
router.post(
    "/:workspaceId/insights/:insightId/dismiss",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { insightId } = req.params;

            await insightService.dismissInsight(insightId);

            res.json({
                success: true,
                message: "Insight dismissed",
            });
        } catch (error: any) {
            console.error("Error dismissing insight:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to dismiss insight",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/insights/:insightId/feedback
 * 
 * Record feedback for an insight.
 */
router.post(
    "/:workspaceId/insights/:insightId/feedback",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { insightId } = req.params;
            const { helpful, feedback } = req.body;

            await insightService.recordFeedback(insightId, helpful, feedback);

            res.json({
                success: true,
                message: "Feedback recorded",
            });
        } catch (error: any) {
            console.error("Error recording feedback:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to record feedback",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/actions/track
 * 
 * Track a user action for pattern detection.
 */
router.post(
    "/:workspaceId/actions/track",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { actionType, page, resourceType, resourceId, metadata } = req.body;
            const userId = (req.user?._id as any)?.toString();

            const action = await contextAnalyzer.trackAction(
                workspaceId,
                userId,
                actionType,
                page,
                resourceType,
                resourceId,
                metadata
            );

            // Check if we should trigger agent analysis
            if (contextAnalyzer.shouldTriggerAgent(page, actionType)) {
                // Generate insights in background (don't await)
                if (page === 'contact_detail' && resourceId) {
                    insightService.generateContactInsights(workspaceId, userId, resourceId)
                        .catch(err => console.error('Background contact insight error:', err));
                } else if (page === 'pipeline' && resourceId) {
                    insightService.generateDealInsights(workspaceId, userId, resourceId)
                        .catch(err => console.error('Background deal insight error:', err));
                } else if (page === 'campaign' && resourceId) {
                    insightService.generateCampaignInsights(workspaceId, userId, resourceId)
                        .catch(err => console.error('Background campaign insight error:', err));
                } else if (page === 'inbox' && resourceId) {
                    insightService.generateEmailInsights(workspaceId, userId, resourceId)
                        .catch(err => console.error('Background email insight error:', err));
                }
            }

            res.json({
                success: true,
                data: { actionId: action._id },
            });
        } catch (error: any) {
            console.error("Error tracking action:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to track action",
            });
        }
    }
);

export default router;
