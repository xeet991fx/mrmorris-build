/**
 * Token Expiration Check Job
 * Story 5.2 - Automatic Token Refresh
 *
 * Background job that runs daily to:
 * 1. Find integrations expiring within 7 days and send warning notifications
 * 2. Find already expired integrations and mark them as Expired
 * 3. Auto-pause agents that depend on expired integrations
 *
 * Runs at midnight UTC daily.
 */

import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import IntegrationCredential, { IIntegrationCredential } from '../models/IntegrationCredential';
import Agent from '../models/Agent';
import { NotificationService } from '../services/NotificationService';

/**
 * Token expiration check queue
 */
const tokenExpirationQueue = new Queue('token-expiration-check', defaultQueueOptions);

/**
 * Track sent warnings to prevent duplicate notifications
 * Key: credentialId:daysRemaining, Value: timestamp
 */
const sentWarnings = new Map<string, number>();

/**
 * Clear warning cache after 24 hours
 */
const cleanupWarningCache = () => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const [key, timestamp] of sentWarnings.entries()) {
        if (now - timestamp > oneDayMs) {
            sentWarnings.delete(key);
        }
    }
};

/**
 * Start token expiration check job scheduler
 */
export const startTokenExpirationCheckJob = async () => {
    try {
        // Clear existing repeatable jobs
        const repeatableJobs = await tokenExpirationQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await tokenExpirationQueue.removeRepeatableByKey(job.key);
        }

        // Run at midnight UTC daily
        await tokenExpirationQueue.add(
            'check-token-expiration',
            {},
            {
                repeat: {
                    pattern: '0 0 * * *', // Midnight UTC daily
                },
                removeOnComplete: { count: 7 }, // Keep last week
                removeOnFail: { count: 30 },
            }
        );

        console.log('✅ Token expiration check job scheduled (midnight UTC daily)');
    } catch (error) {
        console.error('❌ Failed to start token expiration check job:', error);
    }
};

/**
 * Pause agents that depend on an expired integration
 * Story 5.2 Task 6.4: Returns both count and agent names for notification
 */
async function pauseAgentsUsingIntegration(credentialId: string, workspaceId: string, integrationType: string): Promise<{ count: number; agentNames: string[] }> {
    try {
        // Find agents using this integration
        const agents = await Agent.find({
            workspaceId,
            status: 'Live',
            $or: [
                { 'integrations': credentialId },
                { 'instructions': { $regex: integrationType, $options: 'i' } },
            ],
        });

        const agentNames: string[] = [];

        for (const agent of agents) {
            agent.status = 'Paused';
            agent.pauseReason = `${integrationType} integration expired`;
            await agent.save();
            agentNames.push(agent.name);
            console.info(`Paused agent "${agent.name}" due to expired ${integrationType} integration`);
        }

        return { count: agentNames.length, agentNames };
    } catch (error) {
        console.error(`Failed to pause agents for credential ${credentialId}:`, error);
        return { count: 0, agentNames: [] };
    }
}

/**
 * Worker to check token expiration
 */
const tokenExpirationWorker = new Worker(
    'token-expiration-check',
    async (job) => {
        console.log('🔐 Starting token expiration check...');

        try {
            // Cleanup old warning cache entries
            cleanupWarningCache();

            const now = new Date();
            const warningThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

            const results = {
                warningsSent: 0,
                integrationsExpired: 0,
                agentsPaused: 0,
            };

            // 1. Find integrations expiring within 7 days (only Connected ones)
            const expiringIntegrations = await IntegrationCredential.find({
                expiresAt: { $lte: warningThreshold, $gt: now },
                status: 'Connected',
            });

            for (const credential of expiringIntegrations) {
                const daysUntilExpiry = Math.ceil(
                    (credential.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
                );

                // Only send warnings at 7, 3, and 1 day marks
                const warningDays = [7, 3, 1];
                if (!warningDays.includes(daysUntilExpiry)) {
                    continue;
                }

                // Check if warning already sent today for this credential at this day mark
                const warningKey = `${credential._id}:${daysUntilExpiry}`;
                if (sentWarnings.has(warningKey)) {
                    continue;
                }

                try {
                    // Send warning notification
                    await NotificationService.notifyIntegrationExpiring(
                        credential.workspaceId.toString(),
                        credential.type,
                        daysUntilExpiry
                    );

                    sentWarnings.set(warningKey, Date.now());
                    results.warningsSent++;

                    console.info(
                        `Sent expiry warning for ${credential.type} (${daysUntilExpiry} days), workspace ${credential.workspaceId}`
                    );
                } catch (notifyError) {
                    console.warn(`Failed to send warning for credential ${credential._id}:`, notifyError);
                }
            }

            // 2. Find already expired integrations (still marked as Connected)
            const expiredIntegrations = await IntegrationCredential.find({
                expiresAt: { $lte: now },
                status: 'Connected',
            });

            for (const credential of expiredIntegrations) {
                // Update status to Expired
                credential.status = 'Expired';
                credential.validationError = 'Token expired. Please reconnect.';
                await credential.save();

                results.integrationsExpired++;

                try {
                    // Story 5.2 Task 6.4: Auto-pause affected agents FIRST to get names
                    const { count: pausedCount, agentNames } = await pauseAgentsUsingIntegration(
                        credential._id.toString(),
                        credential.workspaceId.toString(),
                        credential.type
                    );
                    results.agentsPaused += pausedCount;

                    // Send expired notification with affected agent names
                    await NotificationService.notifyIntegrationExpired(
                        credential.workspaceId.toString(),
                        credential.type,
                        agentNames
                    );

                    console.info(
                        `Marked ${credential.type} as Expired, workspace ${credential.workspaceId}, paused ${pausedCount} agents`
                    );
                } catch (notifyError) {
                    console.warn(`Failed to send expired notification for credential ${credential._id}:`, notifyError);
                }
            }

            console.log(`✅ Token expiration check complete:`, results);

            return {
                success: true,
                ...results,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('❌ Token expiration check failed:', error);
            throw new Error(`Token expiration check failed: ${error.message}`);
        }
    },
    {
        ...defaultWorkerOptions,
        concurrency: 1, // Only one instance should run at a time
    }
);

tokenExpirationWorker.on('completed', (job, result) => {
    console.log(`🔐 Token expiration check completed:`, {
        warnings: result.warningsSent,
        expired: result.integrationsExpired,
        paused: result.agentsPaused,
    });
});

tokenExpirationWorker.on('failed', (job, error) => {
    console.error(`❌ Token expiration check failed:`, error.message);
});

export { tokenExpirationQueue, tokenExpirationWorker };
