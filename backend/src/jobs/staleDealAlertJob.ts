import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import Opportunity from '../models/Opportunity';
import AINotification from '../models/AINotification';

/**
 * Stale Deal Alert Job
 * 
 * Proactively identifies deals that are going stale and alerts sales reps.
 * Runs every 4 hours to check for deals without activity.
 */

const staleDealQueue = new Queue('stale-deal-alerts', defaultQueueOptions);

// Configurable thresholds
const STALE_THRESHOLDS = {
    warning: 7,  // Days without activity for warning
    critical: 14, // Days without activity for critical
};

/**
 * Start stale deal alert job scheduler
 */
export const startStaleDealAlertJob = async () => {
    try {
        const repeatableJobs = await staleDealQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await staleDealQueue.removeRepeatableByKey(job.key);
        }

        // Run every 4 hours
        await staleDealQueue.add(
            'check-stale-deals',
            {},
            {
                repeat: {
                    pattern: '0 */4 * * *', // Every 4 hours
                },
                removeOnComplete: { count: 20 },
                removeOnFail: { count: 50 },
            }
        );

        console.log('✅ Stale deal alert job scheduled (every 4 hours)');
    } catch (error) {
        console.error('❌ Failed to start stale deal alert job:', error);
    }
};

/**
 * Worker to check for stale deals
 */
const staleDealWorker = new Worker(
    'stale-deal-alerts',
    async (job) => {
        console.log('🔍 Checking for stale deals...');

        try {
            const now = new Date();
            const warningDate = new Date(now.getTime() - STALE_THRESHOLDS.warning * 24 * 60 * 60 * 1000);
            const criticalDate = new Date(now.getTime() - STALE_THRESHOLDS.critical * 24 * 60 * 60 * 1000);

            // Find stale open deals
            const staleDeals = await Opportunity.find({
                status: 'open',
                $or: [
                    { lastActivityAt: { $lte: warningDate } },
                    { lastActivityAt: { $exists: false }, createdAt: { $lte: warningDate } },
                ],
            }).populate('contactId companyId assignedTo');

            console.log(`⚠️ Found ${staleDeals.length} stale deals`);

            let alertsCreated = 0;

            for (const deal of staleDeals) {
                try {
                    const lastActivity = deal.lastActivityAt || deal.createdAt;
                    const daysSinceActivity = Math.floor(
                        (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    const isCritical = daysSinceActivity >= STALE_THRESHOLDS.critical;
                    const priority = isCritical ? 'urgent' : 'high';

                    // Check if we've already sent an alert recently
                    const existingAlert = await AINotification.findOne({
                        contextType: 'deal',
                        contextId: deal._id,
                        type: 'stale_deal_alert',
                        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // Within 24h
                    });

                    if (existingAlert) {
                        continue; // Skip if already alerted
                    }

                    const contactName = (deal.contactId as any)?.firstName || 'Unknown contact';
                    const companyName = (deal.companyId as any)?.name || '';
                    const dealValue = deal.value?.toLocaleString() || '0';

                    // Create alert notification
                    await AINotification.create({
                        workspaceId: deal.workspaceId,
                        userId: deal.assignedTo || deal.userId, // userId is the creator
                        type: 'stale_deal_alert',
                        title: isCritical
                            ? `🚨 Critical: Deal "${deal.title}" has no activity for ${daysSinceActivity} days`
                            : `⚠️ Warning: Deal "${deal.title}" going stale`,
                        message: `$${dealValue} deal with ${contactName}${companyName ? ` at ${companyName}` : ''} hasn't had activity in ${daysSinceActivity} days. Take action to prevent loss.`,
                        priority,
                        contextType: 'deal',
                        contextId: deal._id,
                        metadata: {
                            dealTitle: deal.title,
                            dealValue: deal.value,
                            daysSinceActivity,
                            lastActivityAt: deal.lastActivityAt,
                            probability: deal.probability,
                        },
                        suggestedAction: {
                            label: 'View Deal',
                            url: `/projects/${deal.workspaceId}/pipelines?deal=${deal._id}`,
                            actionType: 'view_deal',
                        },
                    });

                    alertsCreated++;
                } catch (dealError: any) {
                    console.error(`❌ Failed to process stale deal ${deal._id}:`, dealError.message);
                }
            }

            console.log(`✅ Stale deal check complete: ${alertsCreated} alerts created`);

            return {
                success: true,
                staleDealsFound: staleDeals.length,
                alertsCreated,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('❌ Stale deal alert job failed:', error);
            throw new Error(`Stale deal alert failed: ${error.message}`);
        }
    },
    {
        ...defaultWorkerOptions,
        concurrency: 1,
    }
);

staleDealWorker.on('completed', (job, result) => {
    if (result.alertsCreated > 0) {
        console.log(`⚠️ Stale deal alerts created:`, result.alertsCreated);
    }
});

staleDealWorker.on('failed', (job, error) => {
    console.error(`❌ Stale deal alert job failed:`, error.message);
});

export { staleDealQueue, staleDealWorker };
