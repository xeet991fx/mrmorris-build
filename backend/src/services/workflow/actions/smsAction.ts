/**
 * SMS Notification Action
 *
 * Sends SMS messages via Twilio or other SMS providers
 */

import { IWorkflowStep } from '../../../models/Workflow';
import { IWorkflowEnrollment } from '../../../models/WorkflowEnrollment';

interface SmsActionConfig {
    provider: 'twilio' | 'custom';
    // Twilio credentials (should be from env variables in production)
    accountSid?: string;
    authToken?: string;
    fromNumber: string;
    toNumber?: string;
    toField?: string; // Field name containing phone number (e.g., 'phone')
    message: string;
    // Custom provider webhook
    webhookUrl?: string;
}

interface SmsActionContext {
    step: IWorkflowStep;
    entity: any;
    enrollment: IWorkflowEnrollment;
    workspaceId: string;
}

/**
 * Execute SMS action
 */
export async function executeSmsAction(context: SmsActionContext) {
    const { step, entity } = context;
    const config = step.config as SmsActionConfig;

    try {
        // Validate config
        if (!config.fromNumber) {
            return {
                success: false,
                error: 'From number is required',
            };
        }

        if (!config.message) {
            return {
                success: false,
                error: 'Message content is required',
            };
        }

        // Get recipient phone number
        let toNumber = config.toNumber;
        if (config.toField && entity[config.toField]) {
            toNumber = entity[config.toField];
        }

        if (!toNumber) {
            return {
                success: false,
                error: 'Recipient phone number not found',
            };
        }

        // Replace placeholders in message
        const message = replacePlaceholders(config.message, entity);

        // Validate message length (SMS limit is 160 characters for single message)
        if (message.length > 1600) {
            return {
                success: false,
                error: 'Message is too long (max 1600 characters)',
            };
        }

        // Send based on provider
        if (config.provider === 'twilio') {
            return await sendViaTwilio(config, toNumber, message);
        } else if (config.provider === 'custom' && config.webhookUrl) {
            return await sendViaWebhook(config, toNumber, message);
        } else {
            return {
                success: false,
                error: 'Invalid SMS provider configuration',
            };
        }
    } catch (error: any) {
        console.error('SMS action error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send SMS',
        };
    }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(config: SmsActionConfig, to: string, message: string) {
    try {
        // Get credentials from environment variables (more secure)
        const accountSid = process.env.TWILIO_ACCOUNT_SID || config.accountSid;
        const authToken = process.env.TWILIO_AUTH_TOKEN || config.authToken;

        if (!accountSid || !authToken) {
            return {
                success: false,
                error: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.',
            };
        }

        // Twilio API endpoint
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        // Prepare request body
        const body = new URLSearchParams({
            From: config.fromNumber,
            To: to,
            Body: message,
        });

        // Send request
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorData = await response.json() as any;
            throw new Error(errorData.message || `Twilio API error: ${response.status}`);
        }

        const data = await response.json() as any;

        return {
            success: true,
            message: 'SMS sent successfully via Twilio',
            data: {
                messageSid: data.sid,
                to: to,
                status: data.status,
                messagePreview: message.substring(0, 50),
            },
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Twilio error: ${error.message}`,
        };
    }
}

/**
 * Send SMS via custom webhook
 */
async function sendViaWebhook(config: SmsActionConfig, to: string, message: string) {
    try {
        if (!config.webhookUrl) {
            return {
                success: false,
                error: 'Webhook URL is required for custom provider',
            };
        }

        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: config.fromNumber,
                to: to,
                message: message,
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook error: ${response.status}`);
        }

        return {
            success: true,
            message: 'SMS sent successfully via webhook',
            data: {
                to: to,
                messagePreview: message.substring(0, 50),
            },
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Webhook error: ${error.message}`,
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
