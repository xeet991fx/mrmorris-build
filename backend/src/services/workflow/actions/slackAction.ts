/**
 * Slack Notification Action
 *
 * Sends a message to a Slack channel or user via webhook
 */

import { IWorkflowStep } from '../../../models/Workflow';
import { IWorkflowEnrollment } from '../../../models/WorkflowEnrollment';

interface SlackActionConfig {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
    message: string;
    messageFormat?: 'plain' | 'markdown';
    attachments?: Array<{
        color?: string;
        title?: string;
        text?: string;
        fields?: Array<{
            title: string;
            value: string;
            short?: boolean;
        }>;
    }>;
}

interface SlackActionContext {
    step: IWorkflowStep;
    entity: any;
    enrollment: IWorkflowEnrollment;
    workspaceId: string;
}

/**
 * Execute Slack notification action
 */
export async function executeSlackAction(context: SlackActionContext) {
    const { step, entity, enrollment } = context;
    const config = step.config as SlackActionConfig;

    try {
        // Validate config
        if (!config.webhookUrl) {
            return {
                success: false,
                error: 'Slack webhook URL is required',
            };
        }

        if (!config.message) {
            return {
                success: false,
                error: 'Message content is required',
            };
        }

        // Replace placeholders in message
        const message = replacePlaceholders(config.message, entity);

        // Prepare Slack payload
        const slackPayload: any = {
            text: message,
        };

        // Add optional fields
        if (config.channel) {
            slackPayload.channel = config.channel;
        }

        if (config.username) {
            slackPayload.username = config.username;
        }

        if (config.iconEmoji) {
            slackPayload.icon_emoji = config.iconEmoji;
        }

        // Add attachments if provided
        if (config.attachments && config.attachments.length > 0) {
            slackPayload.attachments = config.attachments.map(att => ({
                ...att,
                text: att.text ? replacePlaceholders(att.text, entity) : undefined,
                title: att.title ? replacePlaceholders(att.title, entity) : undefined,
                fields: att.fields?.map(field => ({
                    ...field,
                    value: replacePlaceholders(field.value, entity),
                })),
            }));
        }

        // Use markdown formatting if specified
        if (config.messageFormat === 'markdown') {
            slackPayload.mrkdwn = true;
        }

        // Send to Slack
        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(slackPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Slack API error: ${response.status} - ${errorText}`);
        }

        return {
            success: true,
            message: 'Slack notification sent successfully',
            data: {
                channel: config.channel || 'default',
                messagePreview: message.substring(0, 100),
            },
        };
    } catch (error: any) {
        console.error('Slack action error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send Slack notification',
        };
    }
}

/**
 * Replace placeholders in text with entity data
 */
function replacePlaceholders(text: string, entity: any): string {
    if (!text || !entity) return text;

    let result = text;

    // Common placeholders
    const placeholders: Record<string, any> = {
        '{{firstName}}': entity.firstName || '',
        '{{lastName}}': entity.lastName || '',
        '{{email}}': entity.email || '',
        '{{phone}}': entity.phone || '',
        '{{company}}': entity.company || '',
        '{{status}}': entity.status || '',
        '{{name}}': entity.name || `${entity.firstName || ''} ${entity.lastName || ''}`.trim(),
    };

    // Replace all placeholders
    Object.entries(placeholders).forEach(([placeholder, value]) => {
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return result;
}
