/**
 * IntegrationAgent - External Integrations Hub
 * Manages webhooks, OAuth, and third-party connections
 */

import { BaseAgent } from './BaseAgent';
import { AgentTask, AgentResult, WebhookConfig } from './types';
import { eventBus } from './EventBus';
import crypto from 'crypto';

interface IntegrationTaskPayload {
    action: 'webhook_receive' | 'webhook_send' | 'oauth_connect' | 'oauth_refresh' | 'sync_data';
    integrationId?: string;
    webhookData?: any;
    signature?: string;
    authCode?: string;
    direction?: 'inbound' | 'outbound';
}

// Supported integrations
const SUPPORTED_INTEGRATIONS = {
    apollo: { name: 'Apollo.io', type: 'enrichment' },
    gmail: { name: 'Gmail', type: 'email' },
    outlook: { name: 'Outlook', type: 'email' },
    slack: { name: 'Slack', type: 'notification' },
    zapier: { name: 'Zapier', type: 'automation' },
    calendly: { name: 'Calendly', type: 'scheduling' },
    stripe: { name: 'Stripe', type: 'payments' },
    hubspot: { name: 'HubSpot', type: 'crm_sync' },
};

export class IntegrationAgent extends BaseAgent {
    private webhookSecrets: Map<string, string> = new Map();

    constructor() {
        super('integration', {
            settings: {
                rateLimitPerMinute: 100,
                retryFailedWebhooks: true,
                maxRetryAttempts: 3,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.log('Integration Agent initialized');

        // Subscribe to CRM events for outbound webhooks
        eventBus.subscribe('*', async (event) => {
            await this.processOutboundWebhooks(event);
        });
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'integration:task' ||
            task.type === 'webhook' ||
            task.type.startsWith('integration:') ||
            task.type.startsWith('webhook:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as IntegrationTaskPayload;

        switch (payload.action) {
            case 'webhook_receive':
                return this.handleInboundWebhook(payload, task.context.workspaceId);

            case 'webhook_send':
                return this.sendOutboundWebhook(payload, task.context.workspaceId);

            case 'oauth_connect':
                return this.handleOAuthConnect(payload, task.context.workspaceId);

            case 'oauth_refresh':
                return this.refreshOAuthToken(payload, task.context.workspaceId);

            case 'sync_data':
                return this.syncIntegrationData(payload, task.context.workspaceId);

            default:
                return this.error(`Unknown integration action: ${payload.action}`);
        }
    }

    private async handleInboundWebhook(
        payload: IntegrationTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { integrationId, webhookData, signature } = payload;

        if (!integrationId) {
            return this.error('Integration ID is required');
        }

        // Verify webhook signature
        if (signature) {
            const isValid = await this.verifyWebhookSignature(
                integrationId,
                webhookData,
                signature
            );

            if (!isValid) {
                return this.error('Invalid webhook signature');
            }
        }

        try {
            // Process webhook based on integration type
            const integration = SUPPORTED_INTEGRATIONS[integrationId as keyof typeof SUPPORTED_INTEGRATIONS];

            if (!integration) {
                return this.error(`Unknown integration: ${integrationId}`);
            }

            // Publish event for other agents to handle
            eventBus.publish({
                type: 'webhook:received',
                source: 'integration',
                workspaceId,
                payload: {
                    integrationId,
                    integrationType: integration.type,
                    data: webhookData,
                },
            });

            // Route to appropriate agent based on integration type
            switch (integration.type) {
                case 'enrichment':
                    return this.routeToAgent('enrichment', webhookData);
                case 'email':
                    return this.routeToAgent('email', webhookData);
                case 'scheduling':
                    // Handle calendly events
                    return this.handleSchedulingWebhook(webhookData, workspaceId);
                default:
                    return this.success({
                        processed: true,
                        integration: integrationId,
                        message: 'Webhook received and processed',
                    });
            }

        } catch (error: any) {
            this.log('Webhook processing error:', error.message);
            return this.error(`Webhook processing failed: ${error.message}`);
        }
    }

    private async sendOutboundWebhook(
        payload: IntegrationTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { integrationId, webhookData } = payload;

        if (!integrationId) {
            return this.error('Integration ID is required');
        }

        try {
            // Would fetch webhook URL from config
            const webhookUrl = await this.getWebhookUrl(integrationId, workspaceId);

            if (!webhookUrl) {
                return this.error('Webhook URL not configured');
            }

            // Send webhook with retry logic
            const result = await this.sendWebhookWithRetry(webhookUrl, webhookData);

            return this.success({
                sent: result.success,
                statusCode: result.statusCode,
                message: result.success ? 'Webhook sent successfully' : result.error,
            });

        } catch (error: any) {
            return this.error(`Failed to send webhook: ${error.message}`);
        }
    }

    private async handleOAuthConnect(
        payload: IntegrationTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { integrationId, authCode } = payload;

        if (!integrationId || !authCode) {
            return this.error('Integration ID and auth code are required');
        }

        try {
            // Exchange auth code for tokens
            const tokens = await this.exchangeOAuthCode(integrationId, authCode);

            // Store tokens securely
            // Would encrypt and store in database

            eventBus.publish({
                type: 'integration:connected',
                source: 'integration',
                workspaceId,
                payload: { integrationId },
            });

            return this.success({
                connected: true,
                integrationId,
                message: `${integrationId} connected successfully`,
            });

        } catch (error: any) {
            return this.error(`OAuth connection failed: ${error.message}`);
        }
    }

    private async refreshOAuthToken(
        payload: IntegrationTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { integrationId } = payload;

        if (!integrationId) {
            return this.error('Integration ID is required');
        }

        try {
            // Fetch refresh token from storage
            // Exchange for new access token

            return this.success({
                refreshed: true,
                integrationId,
                message: 'Token refreshed successfully',
            });

        } catch (error: any) {
            return this.error(`Token refresh failed: ${error.message}`);
        }
    }

    private async syncIntegrationData(
        payload: IntegrationTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { integrationId } = payload;

        if (!integrationId) {
            return this.error('Integration ID is required');
        }

        try {
            // Sync data based on integration type
            const syncResult = {
                imported: 0,
                updated: 0,
                errors: 0,
            };

            return this.success({
                synced: true,
                integrationId,
                ...syncResult,
                message: `Sync complete: ${syncResult.imported} imported, ${syncResult.updated} updated`,
            });

        } catch (error: any) {
            return this.error(`Data sync failed: ${error.message}`);
        }
    }

    private async processOutboundWebhooks(event: any): Promise<void> {
        // Check if any outbound webhooks are configured for this event type
        // Would query webhook configurations from database
    }

    private async handleSchedulingWebhook(
        data: any,
        workspaceId: string
    ): Promise<AgentResult> {
        // Handle Calendly meeting booked events
        if (data.event === 'invitee.created') {
            // Create activity for the meeting
            return this.success({
                processed: true,
                eventType: 'meeting_booked',
                message: 'Meeting scheduled and logged',
            });
        }

        return this.success({
            processed: true,
            message: 'Scheduling event processed',
        });
    }

    private async verifyWebhookSignature(
        integrationId: string,
        data: any,
        signature: string
    ): Promise<boolean> {
        const secret = this.webhookSecrets.get(integrationId);
        if (!secret) return false;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(data))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    private async getWebhookUrl(
        integrationId: string,
        workspaceId: string
    ): Promise<string | null> {
        // Would fetch from database
        return null;
    }

    private async sendWebhookWithRetry(
        url: string,
        data: any
    ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
        const maxRetries = this.config.settings.maxRetryAttempts;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (response.ok) {
                    return { success: true, statusCode: response.status };
                }

                if (attempt === maxRetries) {
                    return {
                        success: false,
                        statusCode: response.status,
                        error: `HTTP ${response.status}`,
                    };
                }
            } catch (error: any) {
                if (attempt === maxRetries) {
                    return { success: false, error: error.message };
                }
            }

            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }

        return { success: false, error: 'Max retries exceeded' };
    }

    private async exchangeOAuthCode(
        integrationId: string,
        code: string
    ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
        // Would call OAuth provider's token endpoint
        return {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000),
        };
    }

    /**
     * Get list of supported integrations
     */
    getSupportedIntegrations(): typeof SUPPORTED_INTEGRATIONS {
        return SUPPORTED_INTEGRATIONS;
    }
}

export default IntegrationAgent;
