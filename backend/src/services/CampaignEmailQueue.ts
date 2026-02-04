/**
 * Campaign Email Queue Service
 *
 * Handles high-volume campaign email sending using BullMQ.
 * Designed to handle 500+ emails concurrently from multiple clients.
 *
 * Features:
 * - Async job queuing (instant response to client)
 * - Rate limiting per email provider
 * - Automatic retries with exponential backoff
 * - Dead letter queue for failed emails
 * - Horizontal scaling support
 */

import { Queue, Worker, Job } from 'bullmq';
import { QUEUE_NAMES, defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import CampaignEnrollment from '../models/CampaignEnrollment';
import Campaign from '../models/Campaign';
import EmailMessage from '../models/EmailMessage';
import EmailAccountService from './EmailAccountService';
import nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import crypto from 'crypto';

// Worker identification
const WORKER_ID = `email-worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

// Rate limiting configuration per provider
const RATE_LIMITS = {
    gmail: { max: 20, duration: 1000 },      // 20 emails per second for Gmail API
    smtp: { max: 10, duration: 1000 },        // 10 emails per second for SMTP
    default: { max: 5, duration: 1000 },      // Conservative default
};

// Job payload interface
interface CampaignEmailJob {
    enrollmentId: string;
    campaignId: string;
    contactId: string;
    workspaceId: string;
    stepIndex: number;
    priority?: number;
}

// Queue instance (singleton)
let emailQueue: Queue | null = null;
let emailWorker: Worker | null = null;

/**
 * Get or create the campaign email queue
 */
export function getCampaignEmailQueue(): Queue {
    if (!emailQueue) {
        emailQueue = new Queue(QUEUE_NAMES.CAMPAIGN_EMAILS, {
            ...defaultQueueOptions,
            defaultJobOptions: {
                ...defaultQueueOptions.defaultJobOptions,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // Start with 5 seconds, then 10s, 20s
                },
                removeOnComplete: {
                    age: 3600, // Keep completed for 1 hour
                    count: 10000,
                },
                removeOnFail: {
                    age: 86400 * 7, // Keep failed for 7 days
                    count: 5000,
                },
            },
        });

        console.log(`📧 Campaign email queue initialized`);
    }
    return emailQueue;
}

/**
 * Enqueue a campaign email for sending
 * Returns immediately - email is sent asynchronously
 */
export async function enqueueCampaignEmail(job: CampaignEmailJob): Promise<string> {
    const queue = getCampaignEmailQueue();

    // Use enrollment ID as job ID for idempotency (prevents duplicates)
    const jobId = `campaign-email-${job.enrollmentId}-${job.stepIndex}`;

    const addedJob = await queue.add('send-campaign-email', job, {
        jobId,
        priority: job.priority || 2,
    });

    return addedJob.id || jobId;
}

/**
 * Bulk enqueue multiple campaign emails
 * Efficient for 100-500+ emails
 */
export async function enqueueCampaignEmailsBulk(jobs: CampaignEmailJob[]): Promise<{ queued: number; skipped: number }> {
    const queue = getCampaignEmailQueue();

    let queued = 0;
    let skipped = 0;

    // Use bulk add for efficiency
    const bulkJobs = jobs.map(job => ({
        name: 'send-campaign-email',
        data: job,
        opts: {
            jobId: `campaign-email-${job.enrollmentId}-${job.stepIndex}`,
            priority: job.priority || 2,
        },
    }));

    try {
        await queue.addBulk(bulkJobs);
        queued = jobs.length;
    } catch (error: any) {
        // If bulk fails (e.g., duplicate job IDs), fall back to individual adds
        for (const job of jobs) {
            try {
                await enqueueCampaignEmail(job);
                queued++;
            } catch (e: any) {
                if (e.message.includes('Job with id') && e.message.includes('already exists')) {
                    skipped++;
                } else {
                    throw e;
                }
            }
        }
    }

    console.log(`📧 Bulk enqueued ${queued} emails, skipped ${skipped} duplicates`);
    return { queued, skipped };
}

/**
 * Queue all ready enrollments for sending
 * Called by cron job or manual trigger
 */
export async function queueReadyEnrollments(limit: number = 500): Promise<{ queued: number; skipped: number }> {
    const now = new Date();

    // Find enrollments ready to send (not locked)
    const enrollments = await CampaignEnrollment.find({
        status: { $in: ['pending', 'active'] },
        nextSendAt: { $lte: now },
        $or: [
            { _lockedUntil: null },
            { _lockedUntil: { $lt: now } },
        ],
    })
        .limit(limit)
        .populate('campaignId', 'status workspaceId')
        .lean();

    if (enrollments.length === 0) {
        return { queued: 0, skipped: 0 };
    }

    // Filter to only active campaigns
    const jobs: CampaignEmailJob[] = [];
    for (const enrollment of enrollments) {
        const campaign = enrollment.campaignId as any;
        if (campaign && campaign.status === 'active') {
            jobs.push({
                enrollmentId: enrollment._id.toString(),
                campaignId: campaign._id.toString(),
                contactId: enrollment.contactId.toString(),
                workspaceId: campaign.workspaceId.toString(),
                stepIndex: enrollment.currentStepIndex,
            });
        }
    }

    if (jobs.length === 0) {
        return { queued: 0, skipped: 0 };
    }

    return await enqueueCampaignEmailsBulk(jobs);
}

/**
 * Process a campaign email job
 * This is the worker function that actually sends emails
 */
async function processCampaignEmailJob(job: Job<CampaignEmailJob>): Promise<void> {
    const { enrollmentId, campaignId, stepIndex } = job.data;
    const now = new Date();

    console.log(`📧 [${WORKER_ID}] Processing email job ${job.id}`);

    // Atomically claim the enrollment to prevent double-send
    const lockExpiry = new Date(now.getTime() + 60000);
    const enrollment = await CampaignEnrollment.findOneAndUpdate(
        {
            _id: enrollmentId,
            currentStepIndex: stepIndex,
            status: { $in: ['pending', 'active'] },
            $or: [
                { _lockedUntil: null },
                { _lockedUntil: { $lt: now } },
            ],
        },
        {
            $set: {
                _lockedUntil: lockExpiry,
                _lockedBy: WORKER_ID,
            },
        },
        { new: true }
    )
        .populate('campaignId')
        .populate('contactId');

    if (!enrollment) {
        console.log(`⚠️ Enrollment ${enrollmentId} already processed or locked, skipping`);
        return; // Already processed or locked by another worker
    }

    try {
        const campaign = enrollment.campaignId as any;
        const contact = enrollment.contactId as any;

        if (!campaign || !contact) {
            enrollment.status = 'completed';
            await enrollment.save();
            return;
        }

        if (campaign.status !== 'active') {
            await releaseEnrollmentLock(enrollmentId);
            return;
        }

        const step = campaign.steps[stepIndex];
        if (!step) {
            enrollment.status = 'completed';
            enrollment.completedAt = now;
            await enrollment.save();
            return;
        }

        // Get sending account (atomic selection with increment)
        const account = await EmailAccountService.rotateSendingAccount(
            campaign.workspaceId,
            campaign.fromAccounts
        );

        if (!account) {
            // Try EmailIntegration as fallback
            const EmailIntegration = (await import('../models/EmailIntegration')).default;
            const integration = await EmailIntegration.findOne({
                _id: { $in: campaign.fromAccounts },
                workspaceId: campaign.workspaceId,
                isActive: true,
            }).select('+accessToken +refreshToken');

            if (!integration) {
                throw new Error('No available email accounts');
            }

            // Use Gmail API for integration
            await sendViaGmailAPI(integration, contact, step, campaign, enrollment);
        } else {
            // Use SMTP for EmailAccount
            await sendViaSMTP(account, contact, step, campaign, enrollment);
        }

        // Update enrollment for next step
        enrollment.status = 'active';
        enrollment.emailsSent.push({
            stepId: step.id,
            messageId: `job-${job.id}`,
            sentAt: now,
            fromAccountId: account?._id || campaign.fromAccounts[0],
            opened: false,
            clicked: false,
            replied: false,
            bounced: false,
        });

        enrollment.currentStepIndex += 1;
        const nextStep = campaign.steps[enrollment.currentStepIndex];
        if (nextStep) {
            const delayMs = ((nextStep.delayDays || 0) * 24 * 60 + (nextStep.delayHours || 0) * 60) * 60 * 1000;
            enrollment.nextSendAt = new Date(now.getTime() + delayMs);
        } else {
            enrollment.nextSendAt = undefined;
        }

        // Release lock
        enrollment._lockedUntil = undefined;
        enrollment._lockedBy = undefined;
        await enrollment.save();

        // Update campaign stats
        await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { 'stats.sent': 1 },
        });

        console.log(`✅ Email sent for enrollment ${enrollmentId}`);

    } catch (error: any) {
        console.error(`❌ Failed to send email for enrollment ${enrollmentId}:`, error.message);
        await releaseEnrollmentLock(enrollmentId);
        throw error; // Let BullMQ retry
    }
}

/**
 * Send email via Gmail API
 */
async function sendViaGmailAPI(
    integration: any,
    contact: any,
    step: any,
    campaign: any,
    enrollment: any
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

    const subject = personalizeText(step.subject, contact);
    const body = personalizeText(step.body, contact);
    const htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;

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

    // Save to EmailMessage
    await EmailMessage.create({
        campaignId: campaign._id,
        enrollmentId: enrollment._id,
        contactId: contact._id,
        workspaceId: campaign.workspaceId,
        fromAccountId: integration._id,
        fromEmail: integration.email,
        toEmail: contact.email,
        subject,
        bodyHtml: htmlBody,
        bodyText: body,
        sentAt: new Date(),
        stepId: step.id,
    });
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(
    account: any,
    contact: any,
    step: any,
    campaign: any,
    enrollment: any
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

    const subject = personalizeText(step.subject, contact);
    const body = personalizeText(step.body, contact);
    const htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;

    await transporter.sendMail({
        from: account.email,
        to: contact.email,
        subject,
        text: body,
        html: htmlBody,
    });

    // Save to EmailMessage
    await EmailMessage.create({
        campaignId: campaign._id,
        enrollmentId: enrollment._id,
        contactId: contact._id,
        workspaceId: campaign.workspaceId,
        fromAccountId: account._id,
        fromEmail: account.email,
        toEmail: contact.email,
        subject,
        bodyHtml: htmlBody,
        bodyText: body,
        sentAt: new Date(),
        stepId: step.id,
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
 * Release enrollment lock
 */
async function releaseEnrollmentLock(enrollmentId: string): Promise<void> {
    await CampaignEnrollment.findByIdAndUpdate(enrollmentId, {
        $set: {
            _lockedUntil: null,
            _lockedBy: null,
        },
    });
}

/**
 * Start the email queue worker
 * Call this when the server starts
 */
export function startEmailQueueWorker(): Worker {
    if (emailWorker) {
        console.log('⚠️ Email queue worker already running');
        return emailWorker;
    }

    emailWorker = new Worker(
        QUEUE_NAMES.CAMPAIGN_EMAILS,
        processCampaignEmailJob,
        {
            ...defaultWorkerOptions,
            concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '15'),  // Increased from 5 to 15
            limiter: {
                max: parseInt(process.env.EMAIL_RATE_LIMIT || '30'),  // Increased from 10 to 30
                duration: 1000, // per second
            },
        }
    );

    emailWorker.on('completed', (job) => {
        console.log(`✅ Email job completed: ${job.id}`);
    });

    emailWorker.on('failed', (job, err) => {
        console.error(`❌ Email job failed: ${job?.id}`, err.message);
    });

    emailWorker.on('error', (err) => {
        console.error('❌ Email worker error:', err);
    });

    console.log(`🚀 Email queue worker started (concurrency: ${process.env.EMAIL_WORKER_CONCURRENCY || '15'})`);
    return emailWorker;
}

/**
 * Get queue statistics
 */
export async function getEmailQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}> {
    const queue = getCampaignEmailQueue();

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
 * Shutdown the email queue worker
 */
export async function shutdownEmailQueue(): Promise<void> {
    if (emailWorker) {
        await emailWorker.close();
        emailWorker = null;
    }
    if (emailQueue) {
        await emailQueue.close();
        emailQueue = null;
    }
    console.log('✅ Email queue shutdown complete');
}
