/**
 * Multi-Channel Orchestration Service
 *
 * Executes multi-channel sequences across Email, LinkedIn, SMS, WhatsApp.
 * Automatically switches channels based on engagement.
 */

import { Types } from "mongoose";
import MultiChannelSequence, { ISequenceStep, ChannelType } from "../models/MultiChannelSequence";
import Contact from "../models/Contact";
import emailService from "./email";
import { sendConnectionRequest, sendLinkedInMessage, checkConnectionStatus } from "./LinkedInService";
import { sendSMS } from "./SMSService";

// ============================================
// SEQUENCE ENROLLMENT
// ============================================

export interface EnrollmentData {
    workspaceId: string | Types.ObjectId;
    sequenceId: string | Types.ObjectId;
    contactId: string | Types.ObjectId;
    variables?: Record<string, any>; // For template personalization
}

/**
 * Enroll contact in multi-channel sequence
 */
export async function enrollContact(data: EnrollmentData): Promise<{
    success: boolean;
    enrollmentId?: string;
    error?: string;
}> {

    try {
        const sequence = await MultiChannelSequence.findById(data.sequenceId);
        if (!sequence) {
            return { success: false, error: 'Sequence not found' };
        }

        if (sequence.status !== 'active') {
            return { success: false, error: 'Sequence is not active' };
        }

        const contact = await Contact.findById(data.contactId);
        if (!contact) {
            return { success: false, error: 'Contact not found' };
        }

        // Check if already enrolled
        // TODO: Create SequenceEnrollment model to track enrollments

        console.log(`✅ Enrolled ${contact.email} in sequence: ${sequence.name}`);

        // Schedule first step
        await scheduleNextStep(data.sequenceId.toString(), data.contactId.toString(), 0);

        // Update stats
        await MultiChannelSequence.findByIdAndUpdate(data.sequenceId, {
            $inc: { 'stats.totalEnrolled': 1, 'stats.currentlyActive': 1 },
        });

        return {
            success: true,
            enrollmentId: `enrollment_${Date.now()}`,
        };

    } catch (error: any) {
        console.error('Enrollment failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Schedule next step in sequence
 */
async function scheduleNextStep(
    sequenceId: string,
    contactId: string,
    currentStepIndex: number
): Promise<void> {

    const sequence = await MultiChannelSequence.findById(sequenceId);
    if (!sequence) return;

    const nextStep = sequence.steps[currentStepIndex];
    if (!nextStep) {
        console.log(`✅ Sequence completed for contact: ${contactId}`);
        await MultiChannelSequence.findByIdAndUpdate(sequenceId, {
            $inc: { 'stats.currentlyActive': -1, 'stats.completed': 1 },
        });
        return;
    }

    // Calculate delay
    const delayMs = calculateStepDelay(nextStep);

    console.log(`⏰ Scheduling step ${currentStepIndex + 1} in ${delayMs / 1000} seconds`);

    // In production, use a job queue (Bull, BullMQ, etc.)
    setTimeout(async () => {
        await executeStep(sequenceId, contactId, currentStepIndex);
    }, delayMs);
}

/**
 * Calculate delay before executing step
 */
function calculateStepDelay(step: ISequenceStep): number {
    const delayDays = step.delayDays || 0;
    const delayHours = step.delayHours || 0;

    const totalMs = (delayDays * 24 * 60 * 60 * 1000) + (delayHours * 60 * 60 * 1000);

    return totalMs;
}

/**
 * Execute a sequence step
 */
async function executeStep(
    sequenceId: string,
    contactId: string,
    stepIndex: number
): Promise<void> {

    try {
        const sequence = await MultiChannelSequence.findById(sequenceId);
        if (!sequence) return;

        const step = sequence.steps[stepIndex];
        if (!step) return;

        const contact = await Contact.findById(contactId);
        if (!contact) return;

        console.log(`🚀 Executing step ${stepIndex + 1}: ${step.action} via ${step.channel}`);

        // Check business hours
        if (sequence.settings.onlyBusinessHours) {
            if (!isWithinBusinessHours(sequence.settings.businessHours)) {
                console.log('⏸️ Outside business hours. Rescheduling...');
                // Reschedule for next business hour
                setTimeout(() => executeStep(sequenceId, contactId, stepIndex), 60 * 60 * 1000); // Check again in 1 hour
                return;
            }
        }

        // Execute based on channel and action
        switch (step.channel) {
            case 'email':
                await executeEmailStep(step, contact, sequence);
                break;

            case 'linkedin':
                await executeLinkedInStep(step, contact, sequence);
                break;

            case 'sms':
                await executeSMSStep(step, contact, sequence);
                break;

            case 'whatsapp':
                await executeWhatsAppStep(step, contact, sequence);
                break;

            default:
                console.warn(`Unknown channel: ${step.channel}`);
        }

        // Schedule next step
        await scheduleNextStep(sequenceId, contactId, stepIndex + 1);

    } catch (error: any) {
        console.error('Step execution failed:', error);
    }
}

/**
 * Execute email step
 */
async function executeEmailStep(
    step: ISequenceStep,
    contact: any,
    sequence: any
): Promise<void> {

    if (!contact.email) {
        console.warn('No email address for contact');
        return;
    }

    const personalizedMessage = personalizeMessage(step.message, contact);
    const personalizedSubject = personalizeMessage(step.subject || 'Hello', contact);

    await emailService.sendEmail({
        to: contact.email,
        subject: personalizedSubject,
        html: personalizedMessage,
        from: process.env.SMTP_FROM || 'noreply@clinata.com',
    });

    console.log(`✅ Email sent to: ${contact.email}`);

    // Update stats
    await MultiChannelSequence.findByIdAndUpdate(sequence._id, {
        $inc: { 'stats.channelStats.email.sent': 1 },
    });
}

/**
 * Execute LinkedIn step
 */
async function executeLinkedInStep(
    step: ISequenceStep,
    contact: any,
    sequence: any
): Promise<void> {

    if (!contact.linkedin) {
        console.warn('No LinkedIn URL for contact');
        return;
    }

    if (step.action === 'connect_linkedin') {
        // Send connection request
        const note = personalizeMessage(step.message, contact);

        const result = await sendConnectionRequest({
            profileUrl: contact.linkedin,
            note: sequence.settings.linkedin?.addPersonalNote ? note : undefined,
            contactId: contact._id.toString(),
        });

        if (result.success) {
            console.log(`✅ LinkedIn connection request sent to: ${contact.linkedin}`);
            await MultiChannelSequence.findByIdAndUpdate(sequence._id, {
                $inc: { 'stats.channelStats.linkedin.sent': 1 },
            });
        }

    } else if (step.action === 'send_message') {
        // Send LinkedIn message (requires connection to be accepted)
        const message = personalizeMessage(step.message, contact);

        const result = await sendLinkedInMessage({
            profileUrl: contact.linkedin,
            message,
            contactId: contact._id.toString(),
        });

        if (result.success) {
            console.log(`✅ LinkedIn message sent to: ${contact.linkedin}`);
        }
    }
}

/**
 * Execute SMS step
 */
async function executeSMSStep(
    step: ISequenceStep,
    contact: any,
    sequence: any
): Promise<void> {

    if (!contact.phone) {
        console.warn('No phone number for contact');
        return;
    }

    if (!sequence.settings.sms) {
        console.warn('SMS not configured for this sequence');
        return;
    }

    const personalizedMessage = personalizeMessage(step.message, contact);

    const result = await sendSMS(
        {
            to: contact.phone,
            message: personalizedMessage,
            contactId: contact._id.toString(),
            workspaceId: sequence.workspaceId.toString(),
        },
        sequence.settings.sms
    );

    if (result.success) {
        console.log(`✅ SMS sent to: ${contact.phone}`);
        await MultiChannelSequence.findByIdAndUpdate(sequence._id, {
            $inc: { 'stats.channelStats.sms.sent': 1 },
        });
    }
}

/**
 * Execute WhatsApp step
 */
async function executeWhatsAppStep(
    step: ISequenceStep,
    contact: any,
    sequence: any
): Promise<void> {

    if (!contact.phone) {
        console.warn('No phone number for contact');
        return;
    }

    // TODO: Implement WhatsApp Business API integration
    console.log(`📱 WhatsApp message would be sent to: ${contact.phone}`);
    console.log(`Message: ${step.message}`);
}

/**
 * Personalize message with contact data
 */
function personalizeMessage(template: string, contact: any): string {
    let message = template;

    // Replace variables
    message = message.replace(/{{firstName}}/g, contact.firstName || '');
    message = message.replace(/{{lastName}}/g, contact.lastName || '');
    message = message.replace(/{{company}}/g, contact.company || '');
    message = message.replace(/{{jobTitle}}/g, contact.jobTitle || '');
    message = message.replace(/{{email}}/g, contact.email || '');
    message = message.replace(/{{phone}}/g, contact.phone || '');

    return message;
}

/**
 * Check if current time is within business hours
 */
function isWithinBusinessHours(businessHours: { start: string; end: string; timezone: string }): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Auto-switch channel if no response
 */
export async function checkAndSwitchChannel(
    sequenceId: string,
    contactId: string,
    currentChannel: ChannelType
): Promise<{ switched: boolean; newChannel?: ChannelType }> {

    const sequence = await MultiChannelSequence.findById(sequenceId);
    if (!sequence || !sequence.autoSwitch.enabled) {
        return { switched: false };
    }

    // Find matching auto-switch rule
    const rule = sequence.autoSwitch.rules.find(r => r.fromChannel === currentChannel);
    if (!rule) {
        return { switched: false };
    }

    // TODO: Check if trigger condition met (no response, bounced, etc.)
    // This would require tracking engagement for each message

    console.log(`🔄 Switching channel from ${currentChannel} to ${rule.toChannel}`);

    return {
        switched: true,
        newChannel: rule.toChannel,
    };
}

export default {
    enrollContact,
    checkAndSwitchChannel,
};
