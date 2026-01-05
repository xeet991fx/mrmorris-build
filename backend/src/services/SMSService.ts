/**
 * SMS Service (Twilio Integration)
 *
 * Sends SMS messages via Twilio.
 * Tracks delivery status and replies.
 */

import twilio from 'twilio';

interface SMSConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}

/**
 * Get Twilio client from environment variables or provided config
 */
function getTwilioClient(config?: SMSConfig) {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }

    return twilio(accountSid, authToken);
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
    config?: SMSConfig
): Promise<SMSResult> {

    try {
        // Validate phone number format
        const cleanedPhone = params.to.replace(/[\s\-()]/g, '');
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(cleanedPhone)) {
            return {
                success: false,
                error: 'Invalid phone number format. Must be E.164 format (e.g., +12345678900)',
            };
        }

        // Format phone number
        const formattedPhone = formatPhoneNumber(params.to);

        // Get Twilio configuration
        const fromNumber = config?.fromNumber || process.env.TWILIO_PHONE_NUMBER;
        if (!fromNumber) {
            return {
                success: false,
                error: 'Twilio phone number not configured. Set TWILIO_PHONE_NUMBER environment variable',
            };
        }

        console.log(`📱 Sending SMS to: ${formattedPhone}`);
        console.log(`📝 Message: ${params.message.substring(0, 50)}${params.message.length > 50 ? '...' : ''}`);

        // Get Twilio client
        const client = getTwilioClient(config);

        // Send SMS via Twilio
        const twilioMessage = await client.messages.create({
            body: params.message,
            from: fromNumber,
            to: formattedPhone,
        });

        console.log(`✅ SMS sent successfully. SID: ${twilioMessage.sid}, Status: ${twilioMessage.status}`);

        return {
            success: true,
            messageId: twilioMessage.sid,
            status: twilioMessage.status,
        };

    } catch (error: any) {
        console.error('❌ SMS send failed:', error.message);

        // Parse Twilio-specific errors
        let errorMessage = error.message;
        if (error.code) {
            errorMessage = `Twilio Error ${error.code}: ${error.message}`;
        }

        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSMS(
    messages: SendSMSParams[],
    config?: SMSConfig
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {

    const results: SMSResult[] = [];
    let sent = 0;
    let failed = 0;

    console.log(`📤 Sending ${messages.length} SMS messages...`);

    for (const message of messages) {
        const result = await sendSMS(message, config);
        results.push(result);

        if (result.success) {
            sent++;
        } else {
            failed++;
            console.error(`Failed to send SMS to ${message.to}: ${result.error}`);
        }

        // Rate limiting: 1 SMS per second (Twilio default limit)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📊 Bulk SMS complete: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
}

/**
 * Get SMS delivery status
 */
export async function getSMSStatus(
    messageId: string,
    config?: SMSConfig
): Promise<{ status: string; delivered: boolean; error?: string }> {

    try {
        // Get Twilio client
        const client = getTwilioClient(config);

        // Fetch message status from Twilio
        const message = await client.messages(messageId).fetch();

        console.log(`📊 SMS Status for ${messageId}: ${message.status}`);

        return {
            status: message.status,
            delivered: message.status === 'delivered',
        };

    } catch (error: any) {
        console.error('❌ SMS status check failed:', error.message);

        // Parse Twilio-specific errors
        let errorMessage = error.message;
        if (error.code) {
            errorMessage = `Twilio Error ${error.code}: ${error.message}`;
        }

        return {
            status: 'unknown',
            delivered: false,
            error: errorMessage,
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
