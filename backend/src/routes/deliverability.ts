/**
 * Deliverability Routes
 *
 * API endpoints for email deliverability monitoring and management
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import EmailAccount from '../models/EmailAccount';
import DeliverabilityTest from '../models/DeliverabilityTest';
import { dnsValidationService } from '../services/DNSValidationService';
import { blacklistMonitorService } from '../services/BlacklistMonitorService';
import { emailVerificationService } from '../services/EmailVerificationService';
import { emailWarmupService } from '../services/EmailWarmupService';

const router = express.Router();

/**
 * GET /api/workspaces/:id/deliverability/overview
 * Get deliverability overview for all email accounts
 */
router.get('/workspaces/:id/deliverability/overview', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;

            const emailAccounts = await EmailAccount.find({ workspaceId });

            const overview = {
                totalAccounts: emailAccounts.length,
                activeAccounts: emailAccounts.filter((a) => a.status === 'active').length,
                warmingUpAccounts: emailAccounts.filter((a) => a.status === 'warming_up').length,
                averageReputationScore: emailAccounts.length > 0
                    ? Math.round(
                          emailAccounts.reduce((sum, a) => sum + (a.reputationScore || 50), 0) /
                              emailAccounts.length
                      )
                    : 0,
                blacklistedAccounts: emailAccounts.filter(
                    (a) => a.blacklistStatus && a.blacklistStatus.some((b) => b.isListed)
                ).length,
                dnsIssues: emailAccounts.filter(
                    (a) =>
                        a.dnsRecords &&
                        (!a.dnsRecords.spf?.valid ||
                            !a.dnsRecords.dkim?.valid ||
                            !a.dnsRecords.dmarc?.valid)
                ).length,
                averageBounceRate: emailAccounts.length > 0
                    ? (
                          emailAccounts.reduce((sum, a) => sum + a.bounceRate, 0) /
                          emailAccounts.length
                      ).toFixed(2)
                    : 0,
                averageSpamRate: emailAccounts.length > 0
                    ? (
                          emailAccounts.reduce((sum, a) => sum + a.spamRate, 0) /
                          emailAccounts.length
                      ).toFixed(2)
                    : 0,
            };

            res.json({
                success: true,
                data: overview,
            });
        } catch (error: any) {
            console.error('Error fetching deliverability overview:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch deliverability overview',
            });
        }
    }
);

/**
 * GET /api/email-accounts/:accountId/deliverability
 * Get full deliverability report for an email account
 */
router.get('/email-accounts/:accountId/deliverability', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            res.json({
                success: true,
                data: {
                    email: emailAccount.email,
                    status: emailAccount.status,
                    reputationScore: emailAccount.reputationScore,
                    dnsRecords: emailAccount.dnsRecords,
                    blacklistStatus: emailAccount.blacklistStatus,
                    warmupConfig: emailAccount.warmupConfig,
                    warmupEnabled: emailAccount.warmupEnabled,
                    warmupCurrentDaily: emailAccount.warmupCurrentDaily,
                    warmupTargetDaily: emailAccount.warmupTargetDaily,
                    bounceRate: emailAccount.bounceRate,
                    spamRate: emailAccount.spamRate,
                    openRate: emailAccount.openRate,
                    replyRate: emailAccount.replyRate,
                    lastDeliverabilityCheck: emailAccount.lastDeliverabilityCheck,
                    healthStatus: emailAccount.healthStatus,
                    healthIssues: emailAccount.healthIssues,
                },
            });
        } catch (error: any) {
            console.error('Error fetching deliverability:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch deliverability',
            });
        }
    }
);

/**
 * POST /api/email-accounts/:accountId/deliverability/check-dns
 * Check DNS records (SPF, DKIM, DMARC)
 */
router.post('/email-accounts/:accountId/deliverability/check-dns', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;
            const { dkimSelector } = req.body;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            // Extract domain from email
            const domain = emailAccount.email.split('@')[1];

            // Validate DNS records
            const result = await dnsValidationService.validateDomain(domain, dkimSelector);

            // Update email account with results
            emailAccount.dnsRecords = {
                spf: {
                    valid: result.spf.valid,
                    record: result.spf.record,
                    lastChecked: new Date(),
                    issues: result.spf.issues,
                },
                dkim: {
                    valid: result.dkim.valid,
                    selector: result.dkim.selector,
                    record: result.dkim.record,
                    lastChecked: new Date(),
                    issues: result.dkim.issues,
                },
                dmarc: {
                    valid: result.dmarc.valid,
                    record: result.dmarc.record,
                    policy: result.dmarc.policy,
                    lastChecked: new Date(),
                    issues: result.dmarc.issues,
                },
            };

            emailAccount.lastDeliverabilityCheck = new Date();

            // Update reputation score based on DNS validation
            if (result.overall.passed) {
                emailAccount.reputationScore = Math.min(100, emailAccount.reputationScore + 10);
            } else {
                emailAccount.reputationScore = Math.max(0, emailAccount.reputationScore - 5);
            }

            await emailAccount.save();

            // Generate setup instructions
            const instructions = dnsValidationService.generateSetupInstructions(result);

            res.json({
                success: true,
                data: result,
                instructions,
            });
        } catch (error: any) {
            console.error('Error checking DNS:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to check DNS records',
            });
        }
    }
);

/**
 * POST /api/email-accounts/:accountId/deliverability/check-blacklist
 * Check if email account is blacklisted
 */
router.post('/email-accounts/:accountId/deliverability/check-blacklist', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;
            const { ipAddress } = req.body;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            let report;
            if (ipAddress) {
                report = await blacklistMonitorService.checkIP(ipAddress);
            } else {
                // Check domain
                const domain = emailAccount.email.split('@')[1];
                report = await blacklistMonitorService.checkDomain(domain);
            }

            // Update email account with blacklist status
            emailAccount.blacklistStatus = report.checks.map((check) => ({
                listName: check.name,
                isListed: check.listed,
                listedDate: check.listed ? new Date() : undefined,
                checkedAt: check.checkedAt,
                details: check.details,
            }));

            emailAccount.lastDeliverabilityCheck = new Date();

            // Update reputation score based on blacklist status
            if (report.overallStatus === 'clean') {
                emailAccount.reputationScore = Math.min(100, emailAccount.reputationScore + 5);
            } else if (report.overallStatus === 'critical') {
                emailAccount.reputationScore = Math.max(0, emailAccount.reputationScore - 30);
            } else {
                emailAccount.reputationScore = Math.max(0, emailAccount.reputationScore - 10);
            }

            await emailAccount.save();

            res.json({
                success: true,
                data: report,
            });
        } catch (error: any) {
            console.error('Error checking blacklist:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to check blacklist',
            });
        }
    }
);

/**
 * POST /api/email-accounts/:accountId/deliverability/verify-email
 * Verify a single email address
 */
router.post('/email-accounts/:accountId/deliverability/verify-email', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email address is required',
                });
            }

            const result = await emailVerificationService.verifyEmail(email);

            if (!result) {
                return res.status(503).json({
                    success: false,
                    error: 'Email verification service not configured',
                });
            }

            const recommendations = emailVerificationService.getRecommendations(result);
            const shouldSkip = emailVerificationService.shouldSkipEmail(result);

            res.json({
                success: true,
                data: {
                    ...result,
                    recommendations,
                    shouldSkip,
                },
            });
        } catch (error: any) {
            console.error('Error verifying email:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to verify email',
            });
        }
    }
);

/**
 * POST /api/email-accounts/:accountId/warmup/start
 * Start email warmup
 */
router.post('/email-accounts/:accountId/warmup/start', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;
            const { provider, startingDaily, targetDaily, rampUpDays } = req.body;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            const incrementPerDay = Math.ceil((targetDaily - startingDaily) / rampUpDays);

            const result = await emailWarmupService.startWarmup(emailAccount, {
                provider: provider || 'internal',
                startingDaily: startingDaily || 10,
                targetDaily: targetDaily || 50,
                rampUpDays: rampUpDays || 14,
                incrementPerDay,
            });

            res.json(result);
        } catch (error: any) {
            console.error('Error starting warmup:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to start warmup',
            });
        }
    }
);

/**
 * GET /api/email-accounts/:accountId/warmup/stats
 * Get warmup statistics
 */
router.get('/email-accounts/:accountId/warmup/stats', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            const stats = await emailWarmupService.getWarmupStats(emailAccount);

            res.json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            console.error('Error fetching warmup stats:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch warmup stats',
            });
        }
    }
);

/**
 * POST /api/email-accounts/:accountId/warmup/pause
 * Pause email warmup
 */
router.post('/email-accounts/:accountId/warmup/pause', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            await emailWarmupService.pauseWarmup(emailAccount);

            res.json({
                success: true,
                message: 'Warmup paused successfully',
            });
        } catch (error: any) {
            console.error('Error pausing warmup:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to pause warmup',
            });
        }
    }
);

/**
 * POST /api/email-accounts/:accountId/warmup/resume
 * Resume email warmup
 */
router.post('/email-accounts/:accountId/warmup/resume', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { accountId } = req.params;

            const emailAccount = await EmailAccount.findById(accountId);

            if (!emailAccount) {
                return res.status(404).json({
                    success: false,
                    error: 'Email account not found',
                });
            }

            await emailWarmupService.resumeWarmup(emailAccount);

            res.json({
                success: true,
                message: 'Warmup resumed successfully',
            });
        } catch (error: any) {
            console.error('Error resuming warmup:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to resume warmup',
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/deliverability/tests
 * Get deliverability test history
 */
router.get('/workspaces/:id/deliverability/tests', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const { emailAccountId, testType, page = 1, limit = 20 } = req.query;

            const query: any = { workspaceId };

            if (emailAccountId) {
                query.emailAccountId = emailAccountId;
            }

            if (testType) {
                query.testType = testType;
            }

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);

            const tests = await DeliverabilityTest.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .populate('emailAccountId', 'email');

            const total = await DeliverabilityTest.countDocuments(query);

            res.json({
                success: true,
                data: tests,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            });
        } catch (error: any) {
            console.error('Error fetching tests:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch tests',
            });
        }
    }
);

export default router;
