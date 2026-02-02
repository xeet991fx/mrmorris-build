/**
 * Notification Service
 * Story 5.2 - Automatic Token Refresh
 * Story 5.3 - Integration Expiration Notifications (Email Delivery)
 *
 * Provides notification functionality for integration-related events.
 * Uses AINotification model to store and deliver notifications.
 * Sends email notifications for integration expiration warnings.
 */

import AINotification from '../models/AINotification';
import User from '../models/User';
import Project from '../models/Project';
import { IntegrationType } from '../models/IntegrationCredential';
import EmailService from './email';
import { renderIntegrationExpiringEmail, renderIntegrationExpiredEmail } from '../utils/emailTemplates';

/**
 * Integration type display names for user-friendly notifications
 */
const INTEGRATION_DISPLAY_NAMES: Record<string, string> = {
    gmail: 'Gmail',
    calendar: 'Google Calendar',
    google_sheets: 'Google Sheets',
    linkedin: 'LinkedIn',
    slack: 'Slack',
    notion: 'Notion',
};

/**
 * NotificationService class
 * Handles creating and managing notifications for users
 */
export class NotificationService {
    /**
     * Get the display name for an integration type
     */
    private static getIntegrationDisplayName(type: string): string {
        return INTEGRATION_DISPLAY_NAMES[type] || type;
    }

    /**
     * Get workspace owner user ID
     */
    private static async getWorkspaceOwner(workspaceId: string): Promise<string | null> {
        try {
            const project = await Project.findById(workspaceId);
            if (project && project.userId) {
                return project.userId.toString();
            }

            // Fallback: find any user associated with this workspace
            const user = await User.findOne({}).lean();
            return user ? user._id.toString() : null;
        } catch (error) {
            console.error(`Failed to get workspace owner for ${workspaceId}:`, error);
            return null;
        }
    }

    /**
     * Notify that an integration is about to expire
     * Story 5.3 Task 3: Added email delivery
     *
     * @param workspaceId - Workspace ID
     * @param integrationType - Type of integration
     * @param daysRemaining - Days until expiration
     * @param affectedAgents - Optional list of affected agent names
     */
    static async notifyIntegrationExpiring(
        workspaceId: string,
        integrationType: string,
        daysRemaining: number,
        affectedAgents?: string[]
    ): Promise<void> {
        const userId = await this.getWorkspaceOwner(workspaceId);
        if (!userId) {
            console.warn(`Cannot send integration expiring notification: no user for workspace ${workspaceId}`);
            return;
        }

        const displayName = this.getIntegrationDisplayName(integrationType);
        const dayText = daysRemaining === 1 ? 'day' : 'days';
        const priority = daysRemaining <= 1 ? 'urgent' : daysRemaining <= 3 ? 'high' : 'medium';

        // Create in-app notification
        await AINotification.create({
            workspaceId,
            userId,
            type: 'integration_expiring',
            title: `⚠️ ${displayName} expires in ${daysRemaining} ${dayText}`,
            message: `Your ${displayName} integration will expire in ${daysRemaining} ${dayText}. Reconnect now to avoid disruption to your agents.`,
            priority,
            status: 'pending',
            metadata: {
                integrationType,
                daysRemaining,
                affectedAgents: affectedAgents || [],
            },
            suggestedAction: {
                label: 'Reconnect Now',
                url: `/settings/integrations`,
                actionType: 'reconnect_integration',
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire in 7 days
        });

        console.info(`Created integration expiring notification for ${displayName}, workspace ${workspaceId}`);

        // Story 5.3 Task 3.3: Send email notification
        try {
            const user = await User.findById(userId);
            if (user && user.email) {
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const reconnectUrl = `${baseUrl}/settings/integrations`;
                const urgencyClass = daysRemaining <= 1 ? 'urgency-high' : 'urgency-medium';

                const emailHtml = renderIntegrationExpiringEmail({
                    userName: user.name || 'there',
                    integrationName: displayName,
                    daysRemaining,
                    dayText,
                    urgencyClass,
                    reconnectUrl,
                    affectedAgents,
                });

                await EmailService.sendEmail({
                    to: user.email,
                    subject: `${displayName} integration expires in ${daysRemaining} ${dayText}`,
                    html: emailHtml,
                });

                console.info(`Sent integration expiring email to ${user.email} for ${displayName}`);
            }
        } catch (error) {
            console.error(`Failed to send integration expiring email:`, error);
            // Don't fail notification creation if email fails
        }
    }

    /**
     * Notify that an integration has expired
     * Story 5.3 Task 3: Added email delivery
     *
     * @param workspaceId - Workspace ID
     * @param integrationType - Type of integration
     * @param affectedAgents - Story 5.2 Task 6.4: Optional list of affected agent names
     */
    static async notifyIntegrationExpired(
        workspaceId: string,
        integrationType: string,
        affectedAgents?: string[]
    ): Promise<void> {
        const userId = await this.getWorkspaceOwner(workspaceId);
        if (!userId) {
            console.warn(`Cannot send integration expired notification: no user for workspace ${workspaceId}`);
            return;
        }

        const displayName = this.getIntegrationDisplayName(integrationType);

        // Story 5.2 Task 6.4: Build message with affected agents list
        let message = `Your ${displayName} integration has expired.`;
        if (affectedAgents && affectedAgents.length > 0) {
            const agentList = affectedAgents.length <= 3
                ? affectedAgents.join(', ')
                : `${affectedAgents.slice(0, 3).join(', ')} and ${affectedAgents.length - 3} more`;
            message += ` The following agents have been paused: ${agentList}.`;
        } else {
            message += ` Agents using this integration have been paused.`;
        }
        message += ` Reconnect to resume operations.`;

        // Create in-app notification
        await AINotification.create({
            workspaceId,
            userId,
            type: 'integration_expired',
            title: `❌ ${displayName} integration expired`,
            message,
            priority: 'urgent',
            status: 'pending',
            metadata: {
                integrationType,
                expiredAt: new Date().toISOString(),
                affectedAgents: affectedAgents || [],
            },
            suggestedAction: {
                label: 'Reconnect Now',
                url: `/settings/integrations`,
                actionType: 'reconnect_integration',
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expire in 30 days
        });

        console.info(`Created integration expired notification for ${displayName}, workspace ${workspaceId}, affected agents: ${affectedAgents?.length || 0}`);

        // Story 5.3 Task 3.3: Send email notification
        try {
            const user = await User.findById(userId);
            if (user && user.email) {
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const reconnectUrl = `${baseUrl}/settings/integrations`;

                const emailHtml = renderIntegrationExpiredEmail({
                    userName: user.name || 'there',
                    integrationName: displayName,
                    reconnectUrl,
                    affectedAgents,
                });

                await EmailService.sendEmail({
                    to: user.email,
                    subject: `${displayName} integration has expired`,
                    html: emailHtml,
                });

                console.info(`Sent integration expired email to ${user.email} for ${displayName}`);
            }
        } catch (error) {
            console.error(`Failed to send integration expired email:`, error);
            // Don't fail notification creation if email fails
        }
    }

    /**
     * Send integration expiry warning (alias for notifyIntegrationExpiring)
     */
    static async sendIntegrationExpiryWarning(
        workspaceId: string,
        integrationType: string,
        daysRemaining: number
    ): Promise<void> {
        return this.notifyIntegrationExpiring(workspaceId, integrationType, daysRemaining);
    }

    /**
     * Send integration expired notification (alias for notifyIntegrationExpired)
     */
    static async sendIntegrationExpiredNotification(
        workspaceId: string,
        integrationType: string,
        affectedAgents?: string[]
    ): Promise<void> {
        return this.notifyIntegrationExpired(workspaceId, integrationType, affectedAgents);
    }

    /**
     * Notify that an integration has persistent errors
     * Story 5.3 Code Review Fix: Separate method for Error status (not Expired)
     *
     * @param workspaceId - Workspace ID
     * @param integrationType - Type of integration
     * @param errorDurationHours - How long the error has persisted
     */
    static async notifyIntegrationError(
        workspaceId: string,
        integrationType: string,
        errorDurationHours: number
    ): Promise<void> {
        const userId = await this.getWorkspaceOwner(workspaceId);
        if (!userId) {
            console.warn(`Cannot send integration error notification: no user for workspace ${workspaceId}`);
            return;
        }

        const displayName = this.getIntegrationDisplayName(integrationType);

        // Create in-app notification
        await AINotification.create({
            workspaceId,
            userId,
            type: 'integration_error',
            title: `⚠️ ${displayName} integration error`,
            message: `Your ${displayName} integration has been experiencing errors for ${errorDurationHours} hour${errorDurationHours > 1 ? 's' : ''}. Please check your connection and reconnect if needed.`,
            priority: 'high',
            status: 'pending',
            metadata: {
                integrationType,
                errorDurationHours,
                errorDetectedAt: new Date().toISOString(),
            },
            suggestedAction: {
                label: 'Check Integration',
                url: `/settings/integrations`,
                actionType: 'reconnect_integration',
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire in 7 days
        });

        console.info(`Created integration error notification for ${displayName}, workspace ${workspaceId}, duration: ${errorDurationHours}h`);

        // Send email notification
        try {
            const user = await User.findById(userId);
            if (user && user.email) {
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const reconnectUrl = `${baseUrl}/settings/integrations`;

                // Reuse expired email template with adjusted messaging
                const emailHtml = renderIntegrationExpiredEmail({
                    userName: user.name || 'there',
                    integrationName: displayName,
                    reconnectUrl,
                    affectedAgents: [], // Errors don't pause agents yet
                });

                await EmailService.sendEmail({
                    to: user.email,
                    subject: `${displayName} integration experiencing errors`,
                    html: emailHtml,
                });

                console.info(`Sent integration error email to ${user.email} for ${displayName}`);
            }
        } catch (error) {
            console.error(`Failed to send integration error email:`, error);
            // Don't fail notification creation if email fails
        }
    }
}

export default NotificationService;
