/**
 * Email Account Service
 * 
 * Manages multiple email accounts for cold email sending.
 * Handles Gmail OAuth, SMTP connections, account rotation, and health monitoring.
 */

import EmailAccount, { IEmailAccount } from "../models/EmailAccount";
import crypto from "crypto";
import { Types } from "mongoose";

// ============================================
// ENCRYPTION (for SMTP passwords)
// ============================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production-32c";
const ALGORITHM = "aes-256-cbc";

function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
        iv
    );
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift()!, "hex");
    const encryptedText = parts.join(":");
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
        iv
    );
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

// ============================================
// EMAIL ACCOUNT SERVICE
// ============================================

class EmailAccountService {
    /**
     * Connect a Gmail account using OAuth
     */
    async connectGmailAccount(
        userId: Types.ObjectId,
        workspaceId: Types.ObjectId,
        email: string,
        accessToken: string,
        refreshToken: string,
        tokenExpiry: Date
    ): Promise<IEmailAccount> {
        // Check if account already exists
        const existing = await EmailAccount.findOne({ email });
        if (existing) {
            throw new Error("Email account already connected");
        }

        const account = await EmailAccount.create({
            workspaceId,
            userId,
            email,
            provider: "gmail",
            status: "warming_up",
            accessToken,
            refreshToken,
            tokenExpiry,
            warmupEnabled: true,
            warmupStartDate: new Date(),
            warmupCurrentDaily: 2, // Start slow
            warmupTargetDaily: 50,
            warmupSlowRamp: true,
            dailySendLimit: 50,
            sentToday: 0,
        });

        console.log(`✅ Gmail account connected: ${email}`);
        return account;
    }

    /**
     * Connect an SMTP account
     */
    async connectSMTPAccount(
        userId: Types.ObjectId,
        workspaceId: Types.ObjectId,
        email: string,
        smtpHost: string,
        smtpPort: number,
        smtpUser: string,
        smtpPassword: string
    ): Promise<IEmailAccount> {
        // Check if account already exists
        const existing = await EmailAccount.findOne({ email });
        if (existing) {
            throw new Error("Email account already connected");
        }

        // Encrypt password
        const encryptedPassword = encrypt(smtpPassword);

        const account = await EmailAccount.create({
            workspaceId,
            userId,
            email,
            provider: "smtp",
            status: "warming_up",
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPassword: encryptedPassword,
            warmupEnabled: true,
            warmupStartDate: new Date(),
            warmupCurrentDaily: 2,
            warmupTargetDaily: 50,
            warmupSlowRamp: true,
            dailySendLimit: 50,
            sentToday: 0,
        });

        console.log(`✅ SMTP account connected: ${email}`);
        return account;
    }

    /**
     * Disconnect/remove an email account
     */
    async disconnectAccount(accountId: string): Promise<void> {
        const account = await EmailAccount.findById(accountId);
        if (!account) {
            throw new Error("Email account not found");
        }

        account.status = "disconnected";
        await account.save();

        console.log(`🔌 Email account disconnected: ${account.email}`);
    }

    /**
     * Get all email accounts for a workspace
     */
    async getAccounts(
        workspaceId: Types.ObjectId,
        filters?: {
            status?: string;
            provider?: string;
        }
    ): Promise<IEmailAccount[]> {
        const query: any = { workspaceId };

        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.provider) {
            query.provider = filters.provider;
        }

        return await EmailAccount.find(query).sort({ createdAt: -1 });
    }

    /**
     * Rotate and select next account to send from
     * Picks account with lowest sentToday that hasn't hit dailySendLimit
     */
    async rotateSendingAccount(
        workspaceId: Types.ObjectId,
        fromAccountIds?: Types.ObjectId[]
    ): Promise<IEmailAccount | null> {
        const query: any = {
            workspaceId,
            status: { $in: ["active", "warming_up"] },
            $expr: { $lt: ["$sentToday", "$dailySendLimit"] },
        };

        // If specific accounts are requested (from campaign)
        if (fromAccountIds && fromAccountIds.length > 0) {
            query._id = { $in: fromAccountIds };
        }

        // Get account with lowest sentToday
        const account = await EmailAccount.findOne(query).sort({ sentToday: 1 });

        return account;
    }

    /**
     * Increment sent count for an account
     */
    async incrementSentCount(accountId: Types.ObjectId): Promise<void> {
        await EmailAccount.findByIdAndUpdate(accountId, {
            $inc: { sentToday: 1 },
            lastSentAt: new Date(),
        });
    }

    /**
     * Reset daily send counters (called at midnight via cron)
     */
    async resetDailyCounters(): Promise<void> {
        const result = await EmailAccount.updateMany(
            {},
            {
                sentToday: 0,
            }
        );

        console.log(`🔄 Reset daily counters for ${result.modifiedCount} accounts`);
    }

    /**
     * Get account health status
     * Checks bounce rate, spam rate, etc.
     */
    async getAccountHealth(accountId: string): Promise<{
        status: string;
        issues: string[];
        stats: any;
    }> {
        const account = await EmailAccount.findById(accountId);
        if (!account) {
            throw new Error("Email account not found");
        }

        const issues: string[] = [];
        let healthStatus = "healthy";

        // Check bounce rate
        if (account.bounceRate > 5) {
            issues.push(`High bounce rate: ${account.bounceRate}%`);
            healthStatus = "warning";
        }
        if (account.bounceRate > 10) {
            healthStatus = "critical";
        }

        // Check spam rate
        if (account.spamRate > 0.1) {
            issues.push(`High spam rate: ${account.spamRate}%`);
            healthStatus = "warning";
        }
        if (account.spamRate > 1) {
            healthStatus = "critical";
        }

        // Check daily limit
        if (account.sentToday >= account.dailySendLimit) {
            issues.push(`Daily send limit reached: ${account.sentToday}/${account.dailySendLimit}`);
        }

        // Update account health
        account.healthStatus = healthStatus as any;
        account.healthIssues = issues;
        account.lastHealthCheck = new Date();
        await account.save();

        return {
            status: healthStatus,
            issues,
            stats: {
                bounceRate: account.bounceRate,
                spamRate: account.spamRate,
                openRate: account.openRate,
                replyRate: account.replyRate,
                sentToday: account.sentToday,
                dailyLimit: account.dailySendLimit,
            },
        };
    }

    /**
     * Update warmup progress for an account
     */
    async updateWarmupProgress(
        accountId: Types.ObjectId,
        currentDaily: number
    ): Promise<void> {
        const account = await EmailAccount.findById(accountId);
        if (!account) return;

        account.warmupCurrentDaily = currentDaily;

        // If reached target, mark as active
        if (currentDaily >= account.warmupTargetDaily) {
            account.status = "active";
            console.log(`✅ Account ${account.email} warmup completed!`);
        }

        await account.save();
    }

    /**
     * Get SMTP password (decrypted)
     */
    getSMTPPassword(account: IEmailAccount): string {
        if (!account.smtpPassword) {
            throw new Error("No SMTP password set");
        }
        return decrypt(account.smtpPassword);
    }
}

export default new EmailAccountService();
