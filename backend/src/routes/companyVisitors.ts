/**
 * Company Visitors Routes
 *
 * API endpoints for managing company visitors identified via reverse IP lookup
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import CompanyVisitor from '../models/CompanyVisitor';
import { reverseIPService } from '../services/ReverseIPService';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/sanitize';

const router = express.Router();

/**
 * GET /api/workspaces/:id/company-visitors
 * Get all company visitors for a workspace
 */
router.get('/workspaces/:id/company-visitors', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const {
                page = 1,
                limit = 20,
                sortBy = 'lastSeen',
                targetOnly,
                minScore,
                industry,
                search,
            } = req.query;

            const query: any = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };

            // Filter by target accounts only
            if (targetOnly === 'true') {
                query.isTargetAccount = true;
            }

            // Filter by minimum account score
            if (minScore) {
                query.accountScore = { $gte: parseInt(minScore as string) };
            }

            // Filter by industry
            if (industry) {
                query['firmographics.industry'] = industry;
            }

            // Search by company name or domain - using escaped regex to prevent ReDoS
            if (search) {
                const safeSearch = escapeRegex(search as string);
                query.$or = [
                    { companyName: { $regex: safeSearch, $options: 'i' } },
                    { domain: { $regex: safeSearch, $options: 'i' } },
                ];
            }

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);

            const visitors = await CompanyVisitor.find(query)
                .sort({ [sortBy as string]: -1 })
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .select('-rawEnrichmentData -pageViews'); // Exclude large fields

            const total = await CompanyVisitor.countDocuments(query);

            res.json({
                success: true,
                data: visitors,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            });
        } catch (error: any) {
            console.error('Error fetching company visitors:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch company visitors',
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/company-visitors/analytics
 * Get analytics and statistics for company visitors
 */
router.get('/workspaces/:id/company-visitors/analytics', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;

            const analytics = await reverseIPService.getAnalytics(workspaceId);

            res.json({
                success: true,
                data: analytics,
            });
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch analytics',
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/company-visitors/top
 * Get top company visitors by score
 */
router.get('/workspaces/:id/company-visitors/top', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const { limit = 10 } = req.query;

            const topVisitors = await reverseIPService.getTopVisitors(
                workspaceId,
                parseInt(limit as string)
            );

            res.json({
                success: true,
                data: topVisitors,
            });
        } catch (error: any) {
            console.error('Error fetching top visitors:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch top visitors',
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/company-visitors/target-accounts
 * Get recent target account visits
 */
router.get('/workspaces/:id/company-visitors/target-accounts', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const { days = 7 } = req.query;

            const targetVisits = await reverseIPService.getRecentTargetVisits(
                workspaceId,
                parseInt(days as string)
            );

            res.json({
                success: true,
                data: targetVisits,
            });
        } catch (error: any) {
            console.error('Error fetching target visits:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch target account visits',
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/company-visitors/:visitorId
 * Get a specific company visitor with full details including page views
 */
router.get('/workspaces/:id/company-visitors/:visitorId', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId, visitorId } = req.params;

            const visitor = await CompanyVisitor.findOne({
                _id: visitorId,
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
            });

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    error: 'Company visitor not found',
                });
            }

            res.json({
                success: true,
                data: visitor,
            });
        } catch (error: any) {
            console.error('Error fetching company visitor:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch company visitor',
            });
        }
    }
);

/**
 * PUT /api/workspaces/:id/company-visitors/:visitorId
 * Update a company visitor (mark as target account, add notes, etc.)
 */
router.put('/workspaces/:id/company-visitors/:visitorId', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId, visitorId } = req.params;
            const updates = req.body;

            const visitor = await CompanyVisitor.findOne({
                _id: visitorId,
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
            });

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    error: 'Company visitor not found',
                });
            }

            // Apply updates
            if (updates.isTargetAccount !== undefined) {
                visitor.isTargetAccount = updates.isTargetAccount;
            }

            if (updates.targetAccountTier) {
                visitor.targetAccountTier = updates.targetAccountTier;
            }

            // Recalculate score if target account settings changed
            if (updates.isTargetAccount !== undefined || updates.targetAccountTier) {
                visitor.calculateAccountScore();
            }

            await visitor.save();

            res.json({
                success: true,
                data: visitor,
            });
        } catch (error: any) {
            console.error('Error updating company visitor:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update company visitor',
            });
        }
    }
);

/**
 * POST /api/workspaces/:id/company-visitors/:visitorId/mark-target
 * Mark a company visitor as a target account
 */
router.post('/workspaces/:id/company-visitors/:visitorId/mark-target', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { visitorId } = req.params;
            const { tier } = req.body;

            if (!tier || !['tier1', 'tier2', 'tier3'].includes(tier)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid tier (tier1, tier2, or tier3) is required',
                });
            }

            const visitor = await reverseIPService.markAsTargetAccount(visitorId, tier);

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    error: 'Company visitor not found',
                });
            }

            res.json({
                success: true,
                data: visitor,
            });
        } catch (error: any) {
            console.error('Error marking target account:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to mark as target account',
            });
        }
    }
);

/**
 * POST /api/workspaces/:id/company-visitors/:visitorId/re-enrich
 * Re-enrich a company visitor's data from Clearbit
 */
router.post('/workspaces/:id/company-visitors/:visitorId/re-enrich', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { visitorId } = req.params;

            const visitor = await reverseIPService.reEnrichVisitor(visitorId);

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    error: 'Company visitor not found',
                });
            }

            res.json({
                success: true,
                data: visitor,
                message: 'Company data re-enriched successfully',
            });
        } catch (error: any) {
            console.error('Error re-enriching visitor:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to re-enrich visitor',
            });
        }
    }
);

/**
 * DELETE /api/workspaces/:id/company-visitors/:visitorId
 * Delete a company visitor
 */
router.delete('/workspaces/:id/company-visitors/:visitorId', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId, visitorId } = req.params;

            const visitor = await CompanyVisitor.findOneAndDelete({
                _id: visitorId,
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
            });

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    error: 'Company visitor not found',
                });
            }

            res.json({
                success: true,
                message: 'Company visitor deleted successfully',
            });
        } catch (error: any) {
            console.error('Error deleting company visitor:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete company visitor',
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/company-visitors/:visitorId/page-views
 * Get page views for a specific company visitor
 */
router.get('/workspaces/:id/company-visitors/:visitorId/page-views', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId, visitorId } = req.params;
            const { page = 1, limit = 50 } = req.query;

            const visitor = await CompanyVisitor.findOne({
                _id: visitorId,
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
            }).select('pageViews');

            if (!visitor) {
                return res.status(404).json({
                    success: false,
                    error: 'Company visitor not found',
                });
            }

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);

            // Sort page views by timestamp descending
            const sortedPageViews = visitor.pageViews.sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
            );

            const paginatedPageViews = sortedPageViews.slice(
                (pageNum - 1) * limitNum,
                pageNum * limitNum
            );

            res.json({
                success: true,
                data: paginatedPageViews,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: visitor.pageViews.length,
                    pages: Math.ceil(visitor.pageViews.length / limitNum),
                },
            });
        } catch (error: any) {
            console.error('Error fetching page views:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch page views',
            });
        }
    }
);

export default router;
