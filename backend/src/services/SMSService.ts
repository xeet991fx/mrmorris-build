/**
 * SMS Service (Twilio Integration)
 *
 * Sends SMS messages via Twilio.
 * Tracks delivery status and replies.
 */

interface SMSConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}

interface SendSMSParams {
    to: string;
    message: string;
    contactId?: string;
    workspaceId?: string;
}

interface SMSResult {
    success: boolean;
    messageId?: string;
    status?: string;
    error?: string;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
    params: SendSMSParams,
    config: SMSConfig
): Promise<SMSResult> {

    try {
        console.log(`📱 Sending SMS to: ${params.to}`);
        console.log(`Message: ${params.message}`);

        // Validate phone number format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(params.to.replace(/[\s\-()]/g, ''))) {
            return {
                success: false,
                error: 'Invalid phone number format',
            };
        }

        // TODO: Implement actual Twilio integration
        // Uncomment and configure when ready to use

        /*
        const twilio = require('twilio');
        const client = twilio(config.accountSid, config.authToken);

        const twilioMessage = await client.messages.create({
            body: params.message,
            from: config.fromNumber,
            to: params.to,
        });

        console.log(`✅ SMS sent successfully. SID: ${twilioMessage.sid}`);

        return {
            success: true,
            messageId: twilioMessage.sid,
            status: twilioMessage.status,
        };
        */

        // Simulated response for now
        return {
            success: true,
            messageId: `SMS_${Date.now()}`,
            status: 'sent',
        };

    } catch (error: any) {
        console.error('SMS send failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSMS(
    messages: SendSMSParams[],
    config: SMSConfig
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {

    const results: SMSResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const message of messages) {
        const result = await sendSMS(message, config);
        results.push(result);

        if (result.success) {
            sent++;
        } else {
            failed++;
        }

        // Rate limiting: 1 SMS per second
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📊 Bulk SMS results: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
}

/**
 * Get SMS delivery status
 */
export async function getSMSStatus(
    messageId: string,
    config: SMSConfig
): Promise<{ status: string; delivered: boolean }> {

    try {
        // TODO: Implement actual Twilio status check

        /*
        const twilio = require('twilio');
        const client = twilio(config.accountSid, config.authToken);

        const message = await client.messages(messageId).fetch();

        return {
            status: message.status,
            delivered: message.status === 'delivered',
        };
        */

        // Simulated response
        return {
            status: 'delivered',
            delivered: true,
        };

    } catch (error: any) {
        console.error('SMS status check failed:', error);
        return {
            status: 'unknown',
            delivered: false,
        };
    }
}

/**
 * Format phone number for SMS
 */
export function formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Add + if not present and doesn't start with country code
    if (!cleaned.startsWith('+')) {
        // Assume US number if no country code
        cleaned = '+1' + cleaned;
    }

    return cleaned;
}

/**
 * Validate SMS configuration
 */
export function validateSMSConfig(config: SMSConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.accountSid || config.accountSid.length === 0) {
        errors.push('Twilio Account SID is required');
    }

    if (!config.authToken || config.authToken.length === 0) {
        errors.push('Twilio Auth Token is required');
    }

    if (!config.fromNumber || config.fromNumber.length === 0) {
        errors.push('From phone number is required');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Truncate message to SMS length limit (160 characters for single SMS)
 */
export function truncateSMSMessage(message: string, maxLength: number = 160): string {
    if (message.length <= maxLength) {
        return message;
    }

    return message.substring(0, maxLength - 3) + '...';
}

/**
 * Count SMS segments (each segment is 160 characters)
 */
export function countSMSSegments(message: string): number {
    const segmentLength = 160;
    return Math.ceil(message.length / segmentLength);
}

export default {
    sendSMS,
    sendBulkSMS,
    getSMSStatus,
    formatPhoneNumber,
    validateSMSConfig,
    truncateSMSMessage,
    countSMSSegments,
};
