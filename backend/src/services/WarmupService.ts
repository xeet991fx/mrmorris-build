/**
 * Warmup Service
 * 
 * Handles automated email warmup to build sender reputation.
 * Sends warmup emails between accounts with gradual ramp-up.
 */

import EmailAccount, { IEmailAccount } from "../models/EmailAccount";
import WarmupActivity from "../models/WarmupActivity";
import EmailAccountService from "./EmailAccountService";
import nodemailer, { Transporter } from "nodemailer";
import { Types } from "mongoose";

// ============================================
// WARMUP EMAIL TEMPLATES
// ============================================

const WARMUP_SUBJECTS = [
    "Quick question about {topic}",
    "Thought you might find this interesting",
    "Following up on {topic}",
    "Question about your {interest}",
    "Saw your post about {topic}",
    "Re: {interest} discussion",
    "Quick idea for {topic}",
    "{topic} resources you might like",
];

const WARMUP_BODIES = [
    "Hi there,\n\nI came across your profile and thought you might be interested in {topic}. Would love to hear your thoughts!\n\nBest,\n{sender}",
    "Hey,\n\nJust wanted to share this quick thought about {topic}. Let me know what you think!\n\nCheers,\n{sender}",
    "Hi,\n\nI'm exploring {topic} and would appreciate your perspective. Do you have a few minutes to chat?\n\nThanks,\n{sender}",
    "Hello,\n\nI noticed your interest in {topic}. I have a resource that might help. Want me to send it over?\n\nBest regards,\n{sender}",
];

const TOPICS = [
    "productivity tools",
    "marketing automation",
    "sales strategies",
    "customer success",
    "business growth",
    "email campaigns",
    "lead generation",
    "CRM systems",
];

// ============================================
// WARMUP SERVICE
// ============================================

class WarmupService {
    /**
     * Generate a human-like warmup email
     */
    private generateWarmupEmail(senderName: string): { subject: string; body: string } {
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const interest = TOPICS[Math.floor(Math.random() * TOPICS.length)];

        let subject = WARMUP_SUBJECTS[Math.floor(Math.random() * WARMUP_SUBJECTS.length)];
        subject = subject.replace("{topic}", topic).replace("{interest}", interest);

        let body = WARMUP_BODIES[Math.floor(Math.random() * WARMUP_BODIES.length)];
        body = body.replace("{topic}", topic).replace("{sender}", senderName);

        return { subject, body };
    }

    /**
     * Send a warmup email from one account to another
     */
    async sendWarmupEmail(
        fromAccount: IEmailAccount,
        toAccount: IEmailAccount
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            // Generate email content
            const senderName = fromAccount.email.split("@")[0];
            const { subject, body } = this.generateWarmupEmail(senderName);

            // Create transporter
            let transporter;
            if (fromAccount.provider === "gmail") {
                // Gmail OAuth (simplified - in production, handle token refresh)
                transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        type: "OAuth2",
                        user: fromAccount.email,
                        accessToken: fromAccount.accessToken,
                        refreshToken: fromAccount.refreshToken,
                    },
                });
            } else {
                // SMTP
                const password = EmailAccountService.getSMTPPassword(fromAccount);
                transporter = nodemailer.createTransport({
                    host: fromAccount.smtpHost,
                    port: fromAccount.smtpPort,
                    secure: fromAccount.smtpPort === 465,
                    auth: {
                        user: fromAccount.smtpUser,
                        pass: password,
                    },
                });
            }

            // Send email
            const info = await transporter.sendMail({
                from: fromAccount.email,
                to: toAccount.email,
                subject,
                text: body,
                html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
            });

            // Log warmup activity
            await WarmupActivity.create({
                fromAccountId: fromAccount._id,
                toAccountId: toAccount._id,
                subject,
                body,
                sentAt: new Date(),
                messageId: info.messageId,
            });

            console.log(`📧 Warmup email sent: ${fromAccount.email} → ${toAccount.email}`);

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error: any) {
            console.error("Warmup email failed:", error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Run daily warmup for all accounts
     * This is called by a cron job
     */
    async runDailyWarmup(): Promise<number> {
        console.log("🔥 Starting daily warmup process...");

        // Get all accounts with warmup enabled
        const accounts = await EmailAccount.find({
            warmupEnabled: true,
            status: { $in: ["warming_up", "active"] },
        });

        if (accounts.length === 0) {
            console.log("No accounts to warm up");
            return 0;
        }

        let totalSent = 0;

        for (const account of accounts) {
            try {
                // Calculate how many warmup emails to send today
                const dailyTarget = this.calculateDailyWarmupTarget(account);

                // Get potential recipient accounts (exclude self)
                const recipients = accounts.filter(
                    (a) => a._id.toString() !== account._id.toString()
                );

                if (recipients.length === 0) {
                    console.log(`⚠️ No recipient accounts for ${account.email}`);
                    continue;
                }

                // Send warmup emails
                for (let i = 0; i < dailyTarget && i < recipients.length; i++) {
                    const recipient = recipients[i];
                    await this.sendWarmupEmail(account, recipient);
                    totalSent++;

                    // Small delay to avoid spam detection
                    await this.delay(2000 + Math.random() * 3000); // 2-5 seconds
                }

                // Update warmup progress
                await EmailAccountService.updateWarmupProgress(account._id, dailyTarget);

                console.log(`✅ Warmup completed for ${account.email}: ${dailyTarget} emails`);
            } catch (error: any) {
                console.error(`Error warming up ${account.email}:`, error.message);
            }
        }

        console.log(`🔥 Daily warmup completed: ${totalSent} emails sent`);
        return totalSent;
    }

    /**
     * Calculate daily warmup target based on slow ramp
     */
    private calculateDailyWarmupTarget(account: IEmailAccount): number {
        if (!account.warmupSlowRamp) {
            return account.warmupTargetDaily;
        }

        if (!account.warmupStartDate) {
            return 2; // Default start
        }

        // Calculate days since warmup started
        const now = new Date();
        const daysSinceStart = Math.floor(
            (now.getTime() - account.warmupStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Slow ramp: increase by 2 emails every day
        // Day 1: 2, Day 2: 4, Day 3: 6, ...
        const calculated = Math.min(
            (daysSinceStart + 1) * 2,
            account.warmupTargetDaily
        );

        return calculated;
    }

    /**
     * Auto-reply to warmup emails (simulates engagement)
     */
    async replyToWarmupEmail(
        activity: any,
        fromAccount: IEmailAccount
    ): Promise<void> {
        try {
            const replyBody = `Thanks for reaching out! I appreciate you thinking of me.\n\nBest,\n${fromAccount.email.split("@")[0]
                }`;

            // Send reply (simplified)
            console.log(`↩️ Auto-replied to warmup email: ${activity.messageId}`);

            // Update activity
            activity.replied = true;
            activity.repliedAt = new Date();
            await activity.save();
        } catch (error: any) {
            console.error("Failed to reply to warmup:", error.message);
        }
    }

    /**
     * Simple delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default new WarmupService();
