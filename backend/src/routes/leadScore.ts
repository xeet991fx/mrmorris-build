import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import leadScoringService from "../services/leadScoring";
import LeadScore from "../models/LeadScore";

const router = express.Router();

/**
 * Lead Scoring API Routes
 */

// ============================================
// GET LEAD SCORE
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/lead-scores/:contactId
 * @desc    Get lead score for a specific contact
 * @access  Private
 */
router.get(
    "/:workspaceId/lead-scores/:contactId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, contactId } = req.params;

            const leadScore = await leadScoringService.getLeadScore(
                workspaceId,
                contactId
            );

            if (!leadScore) {
                return res.json({
                    score: 0,
                    grade: "F",
                    history: [],
                });
            }

            res.json(leadScore);
        } catch (error: any) {
            console.error("Get lead score error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================
// UPDATE LEAD SCORE
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/lead-scores/:contactId
 * @desc    Update lead score for a contact
 * @access  Private
 */
router.post(
    "/:workspaceId/lead-scores/:contactId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, contactId } = req.params;
            const { eventType, points, reason } = req.body;

            let result;

            if (eventType) {
                // Use predefined event type
                result = await leadScoringService.updateLeadScore(
                    workspaceId,
                    contactId,
                    eventType
                );
            } else if (points !== undefined) {
                // Manual point adjustment
                const currentScore = await leadScoringService.getLeadScore(
                    workspaceId,
                    contactId
                );

                const newScore = (currentScore?.score || 0) + points;

                await leadScoringService.setLeadScore(
                    workspaceId,
                    contactId,
                    newScore,
                    reason || "Manual update"
                );

                result = {
                    score: newScore,
                    scoreChange: points,
                };
            } else {
                return res.status(400).json({
                    error: "Either eventType or points must be provided",
                });
            }

            res.json({
                success: true,
                ...result,
            });
        } catch (error: any) {
            console.error("Update lead score error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================
// GET TOP LEADS
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/lead-scores/top
 * @desc    Get top scored leads
 * @access  Private
 */
router.get(
    "/:workspaceId/lead-scores/top",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const limit = parseInt(req.query.limit as string) || 10;

            const topLeads = await leadScoringService.getTopLeads(
                workspaceId,
                limit
            );

            res.json(topLeads);
        } catch (error: any) {
            console.error("Get top leads error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================
// GET SCORE DISTRIBUTION
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/lead-scores/distribution
 * @desc    Get score distribution by grade
 * @access  Private
 */
router.get(
    "/:workspaceId/lead-scores/distribution",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const distribution = await leadScoringService.getScoreDistribution(
                workspaceId
            );

            res.json(distribution);
        } catch (error: any) {
            console.error("Get score distribution error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================
// APPLY SCORE DECAY
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/lead-scores/decay
 * @desc    Apply score decay to inactive leads
 * @access  Private
 */
router.post(
    "/:workspaceId/lead-scores/decay",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { daysInactive, decayPercent } = req.body;

            const decayedCount = await leadScoringService.applyScoreDecay(
                workspaceId,
                daysInactive || 30,
                decayPercent || 10
            );

            res.json({
                success: true,
                decayedCount,
                daysInactive: daysInactive || 30,
                decayPercent: decayPercent || 10,
            });
        } catch (error: any) {
            console.error("Apply score decay error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================
// GET ALL LEAD SCORES
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/lead-scores
 * @desc    Get all lead scores with pagination
 * @access  Private
 */
router.get(
    "/:workspaceId/lead-scores",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const grade = req.query.grade as string;
            const minScore = req.query.minScore
                ? parseInt(req.query.minScore as string)
                : undefined;

            const query: any = { workspaceId };

            if (grade) {
                query.grade = grade;
            }

            if (minScore !== undefined) {
                query.currentScore = { $gte: minScore };
            }

            const [leadScores, total] = await Promise.all([
                LeadScore.find(query)
                    .populate("contactId", "firstName lastName email company")
                    .sort({ currentScore: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit),
                LeadScore.countDocuments(query),
            ]);

            res.json({
                leadScores,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error: any) {
            console.error("Get all lead scores error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================
// GET SCORING RULES
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/lead-scores/rules
 * @desc    Get scoring rules
 * @access  Private
 */
router.get(
    "/:workspaceId/lead-scores/rules",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            res.json(leadScoringService.SCORING_RULES);
        } catch (error: any) {
            console.error("Get scoring rules error:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

export default router;
