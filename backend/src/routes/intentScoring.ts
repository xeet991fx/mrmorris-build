/**
 * Intent Scoring API Routes
 *
 * Provides endpoints for tracking and analyzing behavioral intent signals.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import {
    trackIntentSignal,
    calculateIntentScore,
    getHotLeads,
    getContactIntentBreakdown,
    INTENT_SIGNALS,
    INTENT_PATTERNS,
} from "../services/intentScoring";
import IntentSignal from "../models/IntentSignal";

const router = Router();

/**
 * POST /api/workspaces/:workspaceId/intent/track
 *
 * Track an intent signal (can be called from tracking script or manually)
 */
router.post(
    "/:workspaceId/intent/track",
    async (req: any, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const {
                signalName,
                contactId,
                visitorId,
                signalType,
                url,
                pageTitle,
                sessionId,
                source,
                metadata,
            } = req.body;

            if (!signalName) {
                return res.status(400).json({
                    success: false,
                    error: "signalName is required",
                });
            }

            const result = await trackIntentSignal(workspaceId, signalName, {
                contactId,
                visitorId,
                signalType,
                url,
                pageTitle,
                sessionId,
                source,
                metadata,
            });

            res.json({
                success: true,
                data: result,
                message: "Intent signal tracked successfully",
            });
        } catch (error: any) {
            console.error("Error tracking intent signal:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to track intent signal",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/intent/hot-leads
 *
 * Get hot leads based on intent score
 */
router.get(
    "/:workspaceId/intent/hot-leads",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { minScore = 100, limit = 50 } = req.query;

            const hotLeads = await getHotLeads(
                workspaceId,
                parseInt(minScore as string),
                parseInt(limit as string)
            );

            res.json({
                success: true,
                data: hotLeads,
                count: hotLeads.length,
            });
        } catch (error: any) {
            console.error("Error fetching hot leads:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch hot leads",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/intent/contacts/:contactId
 *
 * Get intent breakdown for a specific contact
 */
router.get(
    "/:workspaceId/intent/contacts/:contactId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, contactId } = req.params;
            const { days = 30 } = req.query;

            const breakdown = await getContactIntentBreakdown(
                contactId,
                parseInt(days as string)
            );

            res.json({
                success: true,
                data: breakdown,
            });
        } catch (error: any) {
            console.error("Error fetching intent breakdown:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch intent breakdown",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/intent/analytics
 *
 * Get intent scoring analytics for the workspace
 */
router.get(
    "/:workspaceId/intent/analytics",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { days = 30 } = req.query;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days as string));

            // Get total signals
            const totalSignals = await IntentSignal.countDocuments({
                workspaceId,
                timestamp: { $gte: startDate },
            });

            // Get signals by type
            const signalsByType = await IntentSignal.aggregate([
                {
                    $match: {
                        workspaceId,
                        timestamp: { $gte: startDate },
                    },
                },
                {
                    $group: {
                        _id: "$signalType",
                        count: { $sum: 1 },
                        totalScore: { $sum: "$signalValue" },
                    },
                },
            ]);

            // Get top signals
            const topSignals = await IntentSignal.aggregate([
                {
                    $match: {
                        workspaceId,
                        timestamp: { $gte: startDate },
                    },
                },
                {
                    $group: {
                        _id: "$signalName",
                        count: { $sum: 1 },
                        totalScore: { $sum: "$signalValue" },
                    },
                },
                {
                    $sort: { count: -1 },
                },
                {
                    $limit: 10,
                },
            ]);

            // Get daily trend
            const dailyTrend = await IntentSignal.aggregate([
                {
                    $match: {
                        workspaceId,
                        timestamp: { $gte: startDate },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$timestamp",
                            },
                        },
                        count: { $sum: 1 },
                        totalScore: { $sum: "$signalValue" },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ]);

            res.json({
                success: true,
                data: {
                    totalSignals,
                    signalsByType,
                    topSignals,
                    dailyTrend,
                },
            });
        } catch (error: any) {
            console.error("Error fetching intent analytics:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch analytics",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/intent/config
 *
 * Get available intent signals and patterns
 */
router.get(
    "/:workspaceId/intent/config",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            res.json({
                success: true,
                data: {
                    signals: INTENT_SIGNALS,
                    patterns: INTENT_PATTERNS,
                },
            });
        } catch (error: any) {
            console.error("Error fetching intent config:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch config",
            });
        }
    }
);

export default router;
