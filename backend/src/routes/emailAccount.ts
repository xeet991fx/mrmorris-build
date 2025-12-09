/**
 * Email Account Routes
 * 
 * API routes for managing email accounts (Gmail OAuth, SMTP)
 */

import express from "express";
import EmailAccountService from "../services/EmailAccountService";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/email-accounts
 * Get all email accounts for workspace
 */
router.get("/", async (req: any, res) => {
    try {
        const { workspaceId } = req.user;
        const { status, provider } = req.query;

        const accounts = await EmailAccountService.getAccounts(workspaceId, {
            status,
            provider,
        });

        res.json({
            success: true,
            accounts,
        });
    } catch (error: any) {
        console.error("Get email accounts error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/email-accounts/smtp
 * Connect an SMTP account
 */
router.post("/smtp", async (req: any, res) => {
    try {
        const { workspaceId, userId } = req.user;
        const { email, smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;

        if (!email || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        const account = await EmailAccountService.connectSMTPAccount(
            userId,
            workspaceId,
            email,
            smtpHost,
            parseInt(smtpPort),
            smtpUser,
            smtpPassword
        );

        res.json({
            success: true,
            account,
            message: "SMTP account connected successfully",
        });
    } catch (error: any) {
        console.error("Connect SMTP account error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/email-accounts/gmail
 * Connect a Gmail account (OAuth)
 * NOTE: This is simplified. In production, implement full OAuth flow with Google
 */
router.post("/gmail", async (req: any, res) => {
    try {
        const { workspaceId, userId } = req.user;
        const { email, accessToken, refreshToken, tokenExpiry } = req.body;

        if (!email || !accessToken || !refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Missing OAuth tokens",
            });
        }

        const account = await EmailAccountService.connectGmailAccount(
            userId,
            workspaceId,
            email,
            accessToken,
            refreshToken,
            new Date(tokenExpiry)
        );

        res.json({
            success: true,
            account,
            message: "Gmail account connected successfully",
        });
    } catch (error: any) {
        console.error("Connect Gmail account error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * PUT /api/email-accounts/:id/warmup
 * Start/update warmup settings
 */
router.put("/:id/warmup", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { warmupEnabled, warmupTargetDaily, warmupSlowRamp } = req.body;

        const EmailAccount = (await import("../models/EmailAccount")).default;
        const account = await EmailAccount.findById(id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Email account not found",
            });
        }

        if (warmupEnabled !== undefined) account.warmupEnabled = warmupEnabled;
        if (warmupTargetDaily !== undefined) account.warmupTargetDaily = warmupTargetDaily;
        if (warmupSlowRamp !== undefined) account.warmupSlowRamp = warmupSlowRamp;

        if (warmupEnabled && !account.warmupStartDate) {
            account.warmupStartDate = new Date();
            account.warmupCurrentDaily = 2;
        }

        await account.save();

        res.json({
            success: true,
            account,
            message: "Warmup settings updated",
        });
    } catch (error: any) {
        console.error("Update warmup error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * GET /api/email-accounts/:id/health
 * Get account health status
 */
router.get("/:id/health", async (req: any, res) => {
    try {
        const { id } = req.params;

        const health = await EmailAccountService.getAccountHealth(id);

        res.json({
            success: true,
            health,
        });
    } catch (error: any) {
        console.error("Get account health error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * DELETE /api/email-accounts/:id
 * Disconnect an email account
 */
router.delete("/:id", async (req: any, res) => {
    try {
        const { id } = req.params;

        await EmailAccountService.disconnectAccount(id);

        res.json({
            success: true,
            message: "Email account disconnected",
        });
    } catch (error: any) {
        console.error("Disconnect account error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
