/**
 * Sequence Execution Service
 *
 * Handles email sequence execution - the background job that actually sends
 * sequence emails based on enrollment schedules.
 *
 * Features:
 * - Processes enrollments where nextEmailAt <= now
 * - Sends emails via Gmail API or SMTP
 * - Advances enrollments to next step
 * - Respects send windows and weekend settings
 * - Handles reply detection for auto-unenroll
 */

import { Queue, Worker, Job } from 'bullmq';
import { QUEUE_NAMES, defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import Sequence, { ISequence, ISequenceEnrollment, ISequenceStep } from '../models/Sequence';
import Contact from '../models/Contact';
import EmailMessage from '../models/EmailMessage';
import EmailIntegration from '../models/EmailIntegration';
import EmailAccountService from './EmailAccountService';
import nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import crypto from 'crypto';

// Worker identification
const WORKER_ID = `sequence-worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

// Add sequence queue name to queue config
const SEQUENCE_QUEUE_NAME = 'sequence-emails';

// Job payload interface
interface SequenceEmailJob {
    sequenceId: string;
    enrollmentId: string;
    contactId: string;
    workspaceId: string;
    stepIndex: number;
}

// Queue instance (singleton)
let sequenceQueue: Queue | null = null;
let sequenceWorker: Worker | null = null;

/**
 * Get or create the sequence email queue
 */
export function getSequenceEmailQueue(): Queue {
    if (!sequenceQueue) {
        sequenceQueue = new Queue(SEQUENCE_QUEUE_NAME, {
            ...defaultQueueOptions,
            defaultJobOptions: {
                ...defaultQueueOptions.defaultJobOptions,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: {
                    age: 3600,
                    count: 5000,
                },
                removeOnFail: {
                    age: 86400 * 7,
                    count: 2000,
                },
            },
        });

        console.log(`📧 Sequence email queue initialized`);
    }
    return sequenceQueue;
}

/**
 * Enqueue a sequence email for sending
 */
export async function enqueueSequenceEmail(job: SequenceEmailJob): Promise<string> {
    const queue = getSequenceEmailQueue();

    // Use enrollment ID + step as job ID for idempotency
    const jobId = `seq-email-${job.enrollmentId}-${job.stepIndex}`;

    const addedJob = await queue.add('send-sequence-email', job, {
        jobId,
        priority: 2,
    });

    return addedJob.id || jobId;
}

/**
 * Queue all ready sequence enrollments for sending
 * Called by cron job or manual trigger
 */
export async function queueReadySequenceEnrollments(limit: number = 200): Promise<{ queued: number; skipped: number }> {
    const now = new Date();

    // Find all active sequences with enrollments ready to send
    const sequences = await Sequence.find({
        status: 'active',
        'enrollments.status': 'active',
        'enrollments.nextEmailAt': { $lte: now },
    }).select('_id workspaceId enrollments steps sendWindowStart sendWindowEnd sendOnWeekends timezone');

    let queued = 0;
    let skipped = 0;

    for (const sequence of sequences) {
        // Check send window and weekend settings
        if (!isWithinSendWindow(sequence)) {
            continue;
        }

        for (const enrollment of sequence.enrollments) {
            if (
                enrollment.status === 'active' &&
                enrollment.nextEmailAt &&
                enrollment.nextEmailAt <= now
            ) {
                // Skip if already at limit
                if (queued >= limit) break;

                try {
                    await enqueueSequenceEmail({
                        sequenceId: sequence._id.toString(),
                        enrollmentId: enrollment._id!.toString(),
                        contactId: enrollment.contactId.toString(),
                        workspaceId: sequence.workspaceId.toString(),
                        stepIndex: enrollment.currentStepIndex,
                    });
                    queued++;
                } catch (error: any) {
                    if (error.message?.includes('already exists')) {
                        skipped++;
                    } else {
                        console.error(`Failed to queue sequence email:`, error);
                    }
                }
            }
        }
    }

    if (queued > 0 || skipped > 0) {
        console.log(`📧 Sequence emails: queued ${queued}, skipped ${skipped} duplicates`);
    }

    return { queued, skipped };
}

/**
 * Check if current time is within send window
 */
function isWithinSendWindow(sequence: ISequence): boolean {
    const now = new Date();
    const timezone = sequence.timezone || 'UTC';

    // Check weekend setting
    if (!sequence.sendOnWeekends) {
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
    }

    // Check send window
    if (sequence.sendWindowStart && sequence.sendWindowEnd) {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const currentTime = formatter.format(now);

            if (currentTime < sequence.sendWindowStart || currentTime > sequence.sendWindowEnd) {
                return false;
            }
        } catch (error) {
            // If timezone parsing fails, allow sending
            console.warn(`Invalid timezone ${timezone}, allowing send`);
        }
    }

    return true;
}

/**
 * Process a sequence email job
 */
async function processSequenceEmailJob(job: Job<SequenceEmailJob>): Promise<void> {
    const { sequenceId, enrollmentId, stepIndex } = job.data;
    const now = new Date();

    console.log(`📧 [${WORKER_ID}] Processing sequence email job ${job.id}`);

    // Get sequence with enrollment
    const sequence = await Sequence.findById(sequenceId);
    if (!sequence || sequence.status !== 'active') {
        console.log(`⚠️ Sequence ${sequenceId} not found or not active`);
        return;
    }

    // Find the specific enrollment
    const enrollment = sequence.enrollments.find(
        (e) => e._id?.toString() === enrollmentId && e.status === 'active'
    );

    if (!enrollment) {
        console.log(`⚠️ Enrollment ${enrollmentId} not found or not active`);
        return;
    }

    // Verify step index matches (prevent double-send)
    if (enrollment.currentStepIndex !== stepIndex) {
        console.log(`⚠️ Enrollment ${enrollmentId} step mismatch: expected ${stepIndex}, got ${enrollment.currentStepIndex}`);
        return;
    }

    // Get current step
    const step = sequence.steps.find((s) => s.order === stepIndex);
    if (!step) {
        // No more steps - mark as completed
        enrollment.status = 'completed';
        enrollment.completedAt = now;
        sequence.stats.currentlyActive--;
        sequence.stats.completed++;
        await sequence.save();
        console.log(`✅ Enrollment ${enrollmentId} completed (no more steps)`);
        return;
    }

    // Only process email type steps
    if (step.type !== 'email') {
        // For task/linkedin steps, just advance to next
        await advanceEnrollment(sequence, enrollment, step);
        return;
    }

    // Get contact
    const contact = await Contact.findById(enrollment.contactId);
    if (!contact || !contact.email) {
        enrollment.status = 'completed';
        sequence.stats.currentlyActive--;
        await sequence.save();
        console.log(`⚠️ Contact ${enrollment.contactId} not found or no email`);
        return;
    }

    try {
        // Get email account to send from
        const emailAccount = await getEmailAccount(sequence);
        if (!emailAccount) {
            throw new Error('No available email account for sending');
        }

        // Send the email
        await sendSequenceEmail(emailAccount, contact, step, sequence, enrollment);

        // Update enrollment stats
        enrollment.emailsSent++;
        enrollment.lastEmailAt = now;

        // Advance to next step
        await advanceEnrollment(sequence, enrollment, step);

        // Update sequence stats
        await Sequence.findByIdAndUpdate(sequenceId, {
            $inc: { 'stats.totalEmailsSent': 1 },
        });

        console.log(`✅ Sequence email sent for enrollment ${enrollmentId}`);

    } catch (error: any) {
        console.error(`❌ Failed to send sequence email for enrollment ${enrollmentId}:`, error.message);
        throw error; // Let BullMQ retry
    }
}

/**
 * Advance enrollment to next step
 */
async function advanceEnrollment(
    sequence: ISequence,
    enrollment: ISequenceEnrollment,
    currentStep: ISequenceStep
): Promise<void> {
    const now = new Date();
    const nextStepIndex = enrollment.currentStepIndex + 1;
    const nextStep = sequence.steps.find((s) => s.order === nextStepIndex);

    if (nextStep) {
        // Calculate next send time
        const delayMs = getDelayMs(nextStep.delay.value, nextStep.delay.unit);
        enrollment.currentStepIndex = nextStepIndex;
        enrollment.nextEmailAt = new Date(now.getTime() + delayMs);
    } else {
        // Sequence completed
        enrollment.status = 'completed';
        enrollment.completedAt = now;
        enrollment.nextEmailAt = undefined;
        sequence.stats.currentlyActive--;
        sequence.stats.completed++;
    }

    await sequence.save();
}

/**
 * Get email account for sending
 */
async function getEmailAccount(sequence: ISequence): Promise<any> {
    // Try sequence-specific account first
    if (sequence.sendFromAccountId) {
        const integration = await EmailIntegration.findById(sequence.sendFromAccountId)
            .select('+accessToken +refreshToken');
        if (integration && integration.isActive) {
            return integration;
        }
    }

    // Fallback to any active account in workspace
    const integration = await EmailIntegration.findOne({
        workspaceId: sequence.workspaceId,
        isActive: true,
        provider: { $in: ['gmail', 'outlook'] },
    }).select('+accessToken +refreshToken');

    return integration;
}

/**
 * Send email via Gmail API or SMTP
 */
async function sendSequenceEmail(
    emailAccount: any,
    contact: any,
    step: ISequenceStep,
    sequence: ISequence,
    enrollment: ISequenceEnrollment
): Promise<void> {
    const subject = personalizeText(step.subject, contact);
    const body = personalizeText(step.body, contact);
    const htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;

    if (emailAccount.provider === 'gmail' || emailAccount.provider === 'outlook') {
        await sendViaGmailAPI(emailAccount, contact, subject, htmlBody, body);
    } else {
        await sendViaSMTP(emailAccount, contact, subject, htmlBody, body);
    }

    // Save email message record
    await EmailMessage.create({
        workspaceId: sequence.workspaceId,
        contactId: contact._id,
        fromAccountId: emailAccount._id,
        fromEmail: emailAccount.email,
        toEmail: contact.email,
        subject,
        bodyHtml: htmlBody,
        bodyText: body,
        sentAt: new Date(),
        source: 'sequence',
        sequenceId: sequence._id,
        stepId: step.id,
    });
}

/**
 * Send email via Gmail API
 */
async function sendViaGmailAPI(
    integration: any,
    contact: any,
    subject: string,
    htmlBody: string,
    textBody: string
): Promise<void> {
    const { google } = await import('googleapis');

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/email/callback/gmail`
    );

    oauth2Client.setCredentials({
        access_token: integration.getAccessToken(),
        refresh_token: integration.getRefreshToken(),
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailLines = [
        `From: ${integration.email}`,
        `To: ${contact.email}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlBody,
    ];

    const rawMessage = emailLines.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
    });
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(
    account: any,
    contact: any,
    subject: string,
    htmlBody: string,
    textBody: string
): Promise<void> {
    const password = EmailAccountService.getSMTPPassword(account);

    const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpPort === 465,
        auth: {
            user: account.smtpUser,
            pass: password,
        },
    });

    await transporter.sendMail({
        from: account.email,
        to: contact.email,
        subject,
        text: textBody,
        html: htmlBody,
    });
}

/**
 * Personalize text with contact data
 */
function personalizeText(text: string, contact: any): string {
    const firstName = contact.firstName || contact.name?.split(' ')[0] || '';
    const lastName = contact.lastName || contact.name?.split(' ')[1] || '';
    const fullName = contact.name || `${firstName} ${lastName}`.trim();

    return text
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{lastName\}\}/g, lastName)
        .replace(/\{\{name\}\}/g, fullName)
        .replace(/\{\{email\}\}/g, contact.email || '')
        .replace(/\{\{company\}\}/g, contact.company || '')
        .replace(/\{\{phone\}\}/g, contact.phone || '')
        .replace(/\{\{contact\.name\}\}/g, fullName)
        .replace(/\{\{contact\.firstName\}\}/g, firstName)
        .replace(/\{\{contact\.lastName\}\}/g, lastName)
        .replace(/\{\{contact\.email\}\}/g, contact.email || '')
        .replace(/\{\{contact\.company\}\}/g, contact.company || '')
        .replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
}

/**
 * Convert delay to milliseconds
 */
function getDelayMs(value: number, unit: string): number {
    switch (unit) {
        case 'hours':
            return value * 60 * 60 * 1000;
        case 'days':
            return value * 24 * 60 * 60 * 1000;
        case 'weeks':
            return value * 7 * 24 * 60 * 60 * 1000;
        default:
            return value * 24 * 60 * 60 * 1000;
    }
}

/**
 * Handle contact reply - unenroll if configured
 */
export async function handleContactReply(
    workspaceId: string,
    contactEmail: string
): Promise<{ unenrolled: number }> {
    // Find contact by email
    const contact = await Contact.findOne({
        workspaceId,
        email: contactEmail.toLowerCase(),
    });

    if (!contact) {
        return { unenrolled: 0 };
    }

    // Find sequences with unenrollOnReply enabled
    const sequences = await Sequence.find({
        workspaceId,
        status: 'active',
        unenrollOnReply: true,
        'enrollments.contactId': contact._id,
        'enrollments.status': 'active',
    });

    let unenrolled = 0;

    for (const sequence of sequences) {
        const enrollment = sequence.enrollments.find(
            (e) => e.contactId.toString() === contact._id.toString() && e.status === 'active'
        );

        if (enrollment) {
            enrollment.status = 'replied';
            sequence.stats.currentlyActive--;
            sequence.stats.replied++;
            await sequence.save();
            unenrolled++;
            console.log(`📧 Auto-unenrolled ${contactEmail} from sequence ${sequence.name} (reply)`);
        }
    }

    return { unenrolled };
}

/**
 * Start the sequence email queue worker
 */
export function startSequenceEmailWorker(): Worker {
    if (sequenceWorker) {
        console.log('⚠️ Sequence email worker already running');
        return sequenceWorker;
    }

    sequenceWorker = new Worker(
        SEQUENCE_QUEUE_NAME,
        processSequenceEmailJob,
        {
            ...defaultWorkerOptions,
            concurrency: parseInt(process.env.SEQUENCE_WORKER_CONCURRENCY || '3'),
            limiter: {
                max: parseInt(process.env.SEQUENCE_RATE_LIMIT || '5'),
                duration: 1000,
            },
        }
    );

    sequenceWorker.on('completed', (job) => {
        console.log(`✅ Sequence email job completed: ${job.id}`);
    });

    sequenceWorker.on('failed', (job, err) => {
        console.error(`❌ Sequence email job failed: ${job?.id}`, err.message);
    });

    sequenceWorker.on('error', (err) => {
        console.error('❌ Sequence worker error:', err);
    });

    console.log(`🚀 Sequence email worker started (concurrency: ${process.env.SEQUENCE_WORKER_CONCURRENCY || '3'})`);
    return sequenceWorker;
}

/**
 * Get sequence queue statistics
 */
export async function getSequenceQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}> {
    const queue = getSequenceEmailQueue();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
}

/**
 * Shutdown the sequence email queue worker
 */
export async function shutdownSequenceQueue(): Promise<void> {
    if (sequenceWorker) {
        await sequenceWorker.close();
        sequenceWorker = null;
    }
    if (sequenceQueue) {
        await sequenceQueue.close();
        sequenceQueue = null;
    }
    console.log('✅ Sequence queue shutdown complete');
}

export default {
    getSequenceEmailQueue,
    enqueueSequenceEmail,
    queueReadySequenceEnrollments,
    handleContactReply,
    startSequenceEmailWorker,
    getSequenceQueueStats,
    shutdownSequenceQueue,
};
