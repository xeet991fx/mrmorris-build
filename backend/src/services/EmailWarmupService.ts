/**
 * Email Warmup Service
 *
 * Integrates with email warmup services (Mailreach, Lemwarm, Warmbox)
 * Helps build sender reputation gradually
 */

import axios from 'axios';
import EmailAccount, { IEmailAccount } from '../models/EmailAccount';

export type WarmupProvider = 'mailreach' | 'lemwarm' | 'warmbox' | 'internal';
export type WarmupStatus = 'not_started' | 'warming_up' | 'complete' | 'paused' | 'failed';

export interface WarmupConfig {
    provider: WarmupProvider;
    startingDaily: number;
    targetDaily: number;
    rampUpDays: number;
    incrementPerDay: number;
}

export interface WarmupStats {
    emailAccountId: string;
    email: string;
    status: WarmupStatus;
    currentDaily: number;
    targetDaily: number;
    daysElapsed: number;
    emailsSentToday: number;
    totalEmailsSent: number;
    reputationScore?: number;
    provider: WarmupProvider;
    lastActivity?: Date;
}

export interface MailreachCampaign {
    id: string;
    email: string;
    status: 'active' | 'paused' | 'stopped';
    dailyLimit: number;
    emailsSent: number;
    replyRate: number;
    inboxRate: number;
    createdAt: string;
}

export class EmailWarmupService {
    /**
     * Start email warmup for an account
     */
    async startWarmup(
        emailAccount: IEmailAccount,
        config: WarmupConfig
    ): Promise<{ success: boolean; message: string; campaignId?: string }> {
        try {
            if (config.provider === 'internal') {
                return await this.startInternalWarmup(emailAccount, config);
            } else if (config.provider === 'mailreach') {
                return await this.startMailreachWarmup(emailAccount, config);
            } else if (config.provider === 'lemwarm') {
                return await this.startLemwarmWarmup(emailAccount, config);
            } else if (config.provider === 'warmbox') {
                return await this.startWarmboxWarmup(emailAccount, config);
            }

            return {
                success: false,
                message: 'Unsupported warmup provider',
            };
        } catch (error: any) {
            console.error('Error starting warmup:', error);
            return {
                success: false,
                message: error.message || 'Failed to start warmup',
            };
        }
    }

    /**
     * Get warmup stats for an account
     */
    async getWarmupStats(emailAccount: IEmailAccount): Promise<WarmupStats> {
        const daysElapsed = emailAccount.warmupStartDate
            ? Math.floor(
                  (Date.now() - emailAccount.warmupStartDate.getTime()) /
                      (1000 * 60 * 60 * 24)
              )
            : 0;

        let status: WarmupStatus = 'not_started';
        if (emailAccount.warmupEnabled) {
            if (emailAccount.warmupCurrentDaily >= emailAccount.warmupTargetDaily) {
                status = 'complete';
            } else if (emailAccount.warmupCurrentDaily > 0) {
                status = 'warming_up';
            } else {
                status = 'not_started';
            }
        } else {
            status = 'paused';
        }

        return {
            emailAccountId: emailAccount._id.toString(),
            email: emailAccount.email,
            status,
            currentDaily: emailAccount.warmupCurrentDaily,
            targetDaily: emailAccount.warmupTargetDaily,
            daysElapsed,
            emailsSentToday: emailAccount.sentToday,
            totalEmailsSent: 0, // TODO: Calculate from sent emails
            reputationScore: emailAccount.reputationScore,
            provider: emailAccount.warmupConfig?.externalProvider || 'internal',
            lastActivity: emailAccount.lastSentAt,
        };
    }

    /**
     * Update warmup progress (internal warmup)
     */
    async updateWarmupProgress(emailAccount: IEmailAccount): Promise<void> {
        if (!emailAccount.warmupEnabled || !emailAccount.warmupStartDate) {
            return;
        }

        const daysElapsed = Math.floor(
            (Date.now() - emailAccount.warmupStartDate.getTime()) /
                (1000 * 60 * 60 * 24)
        );

        // Calculate daily limit based on warmup plan
        const increment = emailAccount.warmupSlowRamp ? 2 : 5; // Slow or fast ramp
        const newDaily = Math.min(
            10 + daysElapsed * increment,
            emailAccount.warmupTargetDaily
        );

        emailAccount.warmupCurrentDaily = newDaily;
        emailAccount.dailySendLimit = newDaily;

        // Update status if warmup is complete
        if (newDaily >= emailAccount.warmupTargetDaily) {
            emailAccount.status = 'active';
        } else {
            emailAccount.status = 'warming_up';
        }

        await emailAccount.save();
    }

    /**
     * Pause warmup
     */
    async pauseWarmup(emailAccount: IEmailAccount): Promise<void> {
        emailAccount.warmupEnabled = false;
        emailAccount.status = 'paused';
        await emailAccount.save();

        // If using external provider, pause there too
        if (emailAccount.warmupConfig?.externalProvider === 'mailreach') {
            await this.pauseMailreachCampaign(emailAccount);
        }
    }

    /**
     * Resume warmup
     */
    async resumeWarmup(emailAccount: IEmailAccount): Promise<void> {
        emailAccount.warmupEnabled = true;
        emailAccount.status = 'warming_up';
        await emailAccount.save();

        // If using external provider, resume there too
        if (emailAccount.warmupConfig?.externalProvider === 'mailreach') {
            await this.resumeMailreachCampaign(emailAccount);
        }
    }

    // ============================================
    // INTERNAL WARMUP
    // ============================================

    private async startInternalWarmup(
        emailAccount: IEmailAccount,
        config: WarmupConfig
    ): Promise<{ success: boolean; message: string }> {
        emailAccount.warmupEnabled = true;
        emailAccount.warmupStartDate = new Date();
        emailAccount.warmupCurrentDaily = config.startingDaily;
        emailAccount.warmupTargetDaily = config.targetDaily;
        emailAccount.warmupSlowRamp = config.incrementPerDay <= 3;
        emailAccount.dailySendLimit = config.startingDaily;
        emailAccount.status = 'warming_up';

        await emailAccount.save();

        return {
            success: true,
            message: 'Internal warmup started successfully',
        };
    }

    // ============================================
    // MAILREACH INTEGRATION
    // ============================================

    private async startMailreachWarmup(
        emailAccount: IEmailAccount,
        config: WarmupConfig
    ): Promise<{ success: boolean; message: string; campaignId?: string }> {
        const apiKey = process.env.MAILREACH_API_KEY || emailAccount.warmupConfig?.apiKey;
        if (!apiKey) {
            throw new Error('Mailreach API key not configured');
        }

        try {
            // Create warmup campaign via Mailreach API
            const response = await axios.post(
                'https://api.mailreach.co/v1/campaigns',
                {
                    email: emailAccount.email,
                    smtp_host: emailAccount.smtpHost || 'smtp.gmail.com',
                    smtp_port: emailAccount.smtpPort || 587,
                    smtp_user: emailAccount.smtpUser || emailAccount.email,
                    smtp_password: emailAccount.smtpPassword, // Should be decrypted
                    daily_limit: config.startingDaily,
                    ramp_up: true,
                    target_daily: config.targetDaily,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );

            const campaignId = response.data.campaign_id;

            // Update email account with warmup config
            emailAccount.warmupConfig = {
                externalProvider: 'mailreach',
                apiKey,
                campaignId,
                dailyLimit: config.startingDaily,
                rampUpRate: config.incrementPerDay,
                enabled: true,
            };
            emailAccount.warmupEnabled = true;
            emailAccount.warmupStartDate = new Date();
            emailAccount.warmupCurrentDaily = config.startingDaily;
            emailAccount.warmupTargetDaily = config.targetDaily;
            emailAccount.status = 'warming_up';

            await emailAccount.save();

            return {
                success: true,
                message: 'Mailreach warmup campaign started successfully',
                campaignId,
            };
        } catch (error: any) {
            console.error('Mailreach API error:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.message || 'Failed to start Mailreach campaign'
            );
        }
    }

    private async getMailreachStats(emailAccount: IEmailAccount): Promise<MailreachCampaign | null> {
        const apiKey = emailAccount.warmupConfig?.apiKey;
        const campaignId = emailAccount.warmupConfig?.campaignId;

        if (!apiKey || !campaignId) {
            return null;
        }

        try {
            const response = await axios.get(
                `https://api.mailreach.co/v1/campaigns/${campaignId}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                    timeout: 10000,
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('Mailreach API error:', error.message);
            return null;
        }
    }

    private async pauseMailreachCampaign(emailAccount: IEmailAccount): Promise<void> {
        const apiKey = emailAccount.warmupConfig?.apiKey;
        const campaignId = emailAccount.warmupConfig?.campaignId;

        if (!apiKey || !campaignId) {
            return;
        }

        try {
            await axios.post(
                `https://api.mailreach.co/v1/campaigns/${campaignId}/pause`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                    timeout: 10000,
                }
            );
        } catch (error: any) {
            console.error('Failed to pause Mailreach campaign:', error.message);
        }
    }

    private async resumeMailreachCampaign(emailAccount: IEmailAccount): Promise<void> {
        const apiKey = emailAccount.warmupConfig?.apiKey;
        const campaignId = emailAccount.warmupConfig?.campaignId;

        if (!apiKey || !campaignId) {
            return;
        }

        try {
            await axios.post(
                `https://api.mailreach.co/v1/campaigns/${campaignId}/resume`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                    timeout: 10000,
                }
            );
        } catch (error: any) {
            console.error('Failed to resume Mailreach campaign:', error.message);
        }
    }

    // ============================================
    // LEMWARM / WARMBOX INTEGRATION (Placeholder)
    // ============================================

    private async startLemwarmWarmup(
        emailAccount: IEmailAccount,
        config: WarmupConfig
    ): Promise<{ success: boolean; message: string }> {
        // Lemwarm integration would go here
        // Similar to Mailreach but with Lemwarm's API
        throw new Error('Lemwarm integration not yet implemented');
    }

    private async startWarmboxWarmup(
        emailAccount: IEmailAccount,
        config: WarmupConfig
    ): Promise<{ success: boolean; message: string }> {
        // Warmbox integration would go here
        // Similar to Mailreach but with Warmbox's API
        throw new Error('Warmbox integration not yet implemented');
    }
}

export const emailWarmupService = new EmailWarmupService();
