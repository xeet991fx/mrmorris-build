import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import { insightService } from '../services/insightService';
import AINotification from '../models/AINotification';
import User from '../models/User';

/**
 * Daily Insight Batch Job
 * 
 * Generates AI insights overnight for:
 * - Hot leads that need attention
 * - Deals closing soon that need push
 * - Campaign performance anomalies
 */

const dailyInsightQueue = new Queue('daily-insights', defaultQueueOptions);

/**
 * Start daily insight job scheduler
 */
export const startDailyInsightJob = async () => {
    try {
        const repeatableJobs = await dailyInsightQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await dailyInsightQueue.removeRepeatableByKey(job.key);
        }

        // Run at 6 AM every day
        await dailyInsightQueue.add(
            'generate-daily-insights',
            {},
            {
                repeat: {
                    pattern: '0 6 * * *', // 6 AM daily
                },
                removeOnComplete: { count: 7 }, // Keep last week
                removeOnFail: { count: 30 },
            }
        );

        console.log('✅ Daily insight job scheduled (6 AM daily)');
    } catch (error) {
        console.error('❌ Failed to start daily insight job:', error);
    }
};

/**
 * Worker to generate daily insights
 */
const dailyInsightWorker = new Worker(
    'daily-insights',
    async (job) => {
        console.log('🌅 Starting daily insight generation...');

        try {
            const results = {
                hotLeadsIdentified: 0,
                dealsNeedingAttention: 0,
                insightsGenerated: 0,
            };

            // Get all active workspaces with activity
            const activeWorkspaces = await getActiveWorkspaces();

            for (const { workspaceId, userId } of activeWorkspaces) {
                try {
                    // 1. Find hot leads (high engagement score)
                    const hotLeads = await Contact.find({
                        workspaceId,
                        intentScore: { $gte: 80 },
                        status: { $in: ['lead', 'qualified'] },
                    }).limit(5);

                    for (const lead of hotLeads) {
                        // Check if already notified today
                        const existing = await AINotification.findOne({
                            contextId: lead._id,
                            type: 'hot_lead_alert',
                            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                        });

                        if (!existing) {
                            await AINotification.create({
                                workspaceId,
                                userId,
                                type: 'hot_lead_alert',
                                title: `🔥 Hot Lead: ${lead.firstName} ${lead.lastName || ''}`,
                                message: `Intent score: ${lead.intentScore}. ${lead.company ? `Works at ${lead.company}.` : ''} Consider reaching out today.`,
                                priority: 'high',
                                contextType: 'contact',
                                contextId: lead._id,
                                metadata: {
                                    intentScore: lead.intentScore,
                                    company: lead.company,
                                    email: lead.email,
                                },
                                suggestedAction: {
                                    label: 'View Contact',
                                    url: `/projects/${workspaceId}/contacts/${lead._id}`,
                                },
                            });
                            results.hotLeadsIdentified++;
                        }
                    }

                    // 2. Find deals closing soon that need attention
                    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    const urgentDeals = await Opportunity.find({
                        workspaceId,
                        status: 'open',
                        expectedCloseDate: { $lte: nextWeek },
                        probability: { $gte: 50 }, // Likely to close
                    }).limit(5);

                    for (const deal of urgentDeals) {
                        const daysUntilClose = Math.ceil(
                            (new Date(deal.expectedCloseDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        );

                        const existing = await AINotification.findOne({
                            contextId: deal._id,
                            type: 'deal_insight',
                            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                        });

                        if (!existing && daysUntilClose > 0) {
                            await AINotification.create({
                                workspaceId,
                                userId,
                                type: 'deal_insight',
                                title: `📅 "${deal.title}" closes in ${daysUntilClose} days`,
                                message: `$${deal.value?.toLocaleString() || 0} deal at ${deal.probability}% probability. Final push needed!`,
                                priority: daysUntilClose <= 3 ? 'urgent' : 'high',
                                contextType: 'deal',
                                contextId: deal._id,
                                metadata: {
                                    dealValue: deal.value,
                                    probability: deal.probability,
                                    daysUntilClose,
                                },
                                suggestedAction: {
                                    label: 'View Deal',
                                    url: `/projects/${workspaceId}/pipelines?deal=${deal._id}`,
                                },
                            });
                            results.dealsNeedingAttention++;
                        }
                    }

                    // 3. Generate workspace analytics insights (once per workspace)
                    try {
                        const analyticsResult = await insightService.generateAnalyticsInsights(
                            workspaceId.toString(),
                            userId.toString()
                        );
                        results.insightsGenerated += analyticsResult.insights?.length || 0;
                    } catch (analyticsError) {
                        console.warn(`Analytics insights failed for workspace ${workspaceId}:`, analyticsError);
                    }

                } catch (workspaceError: any) {
                    console.error(`Failed to process workspace ${workspaceId}:`, workspaceError.message);
                }
            }

            console.log(`✅ Daily insights complete:`, results);

            return {
                success: true,
                ...results,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('❌ Daily insight job failed:', error);
            throw new Error(`Daily insight job failed: ${error.message}`);
        }
    },
    {
        ...defaultWorkerOptions,
        concurrency: 1,
    }
);

/**
 * Get active workspaces (those with recent activity)
 */
async function getActiveWorkspaces(): Promise<{ workspaceId: any; userId: any }[]> {
    try {
        // Get unique workspace/user combinations with recent activity
        const recentContacts = await Contact.aggregate([
            {
                $match: {
                    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            },
            {
                $group: {
                    _id: { workspaceId: '$workspaceId' },
                },
            },
            { $limit: 50 }, // Process max 50 workspaces per run
        ]);

        const workspaces = [];
        for (const ws of recentContacts) {
            // Get workspace owner/first user
            const user = await User.findOne({}).lean();
            if (user) {
                workspaces.push({
                    workspaceId: ws._id.workspaceId,
                    userId: user._id,
                });
            }
        }

        return workspaces;
    } catch (error) {
        console.error('Failed to get active workspaces:', error);
        return [];
    }
}

dailyInsightWorker.on('completed', (job, result) => {
    console.log(`🌅 Daily insights generated:`, {
        hotLeads: result.hotLeadsIdentified,
        deals: result.dealsNeedingAttention,
        insights: result.insightsGenerated,
    });
});

dailyInsightWorker.on('failed', (job, error) => {
    console.error(`❌ Daily insight job failed:`, error.message);
});

export { dailyInsightQueue, dailyInsightWorker };
