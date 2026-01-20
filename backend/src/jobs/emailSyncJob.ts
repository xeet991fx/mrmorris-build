import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import InboxService from '../services/InboxService';

/**
 * Email Sync Job
 * Creates individual sync jobs per email integration for better parallelization
 * Runs every 5 minutes to check for new integrations and schedule their syncs
 */

// Create email sync queue
const emailSyncQueue = new Queue('email-sync', defaultQueueOptions);

/**
 * Start email sync job scheduler
 * Creates individual sync jobs for each active email integration every 5 minutes
 */
export const startEmailSyncJob = async () => {
  try {
    // Remove any existing repeatable jobs first (to avoid duplicates)
    const repeatableJobs = await emailSyncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await emailSyncQueue.removeRepeatableByKey(job.key);
    }

    // Add scheduler job that runs every 5 minutes to create per-integration sync jobs
    await emailSyncQueue.add(
      'schedule-integration-syncs',
      {},
      {
        repeat: {
          pattern: '*/5 * * * *', // Every 5 minutes (cron format)
        },
        removeOnComplete: {
          count: 10, // Keep last 10 completed jobs
        },
        removeOnFail: {
          count: 50, // Keep last 50 failed jobs for debugging
        },
      }
    );

    console.log('✅ Email sync job scheduler started (creates per-integration jobs every 5 minutes)');
  } catch (error) {
    console.error('❌ Failed to start email sync job:', error);
  }
};

/**
 * Worker to process email sync jobs
 */
const emailSyncWorker = new Worker(
  'email-sync',
  async (job) => {
    // Handle scheduler job - creates individual sync jobs per integration
    if (job.name === 'schedule-integration-syncs') {
      console.log('🔄 Scheduling per-integration email sync jobs...');

      try {
        // Import EmailIntegration model
        const EmailIntegration = (await import('../models/EmailIntegration')).default;

        // Find all active Gmail integrations
        const integrations = await EmailIntegration.find({
          provider: 'gmail',
          isActive: true,
        }).select('_id email workspaceId');

        console.log(`📊 Found ${integrations.length} active email integration(s)`);

        if (integrations.length === 0) {
          return {
            success: true,
            message: 'No active integrations to sync',
            timestamp: new Date().toISOString(),
          };
        }

        // Create individual sync job for each integration
        const jobPromises = integrations.map((integration) =>
          emailSyncQueue.add(
            `sync-integration-${integration._id}`,
            {
              integrationId: integration._id.toString(),
              email: integration.email,
              workspaceId: integration.workspaceId.toString(),
            },
            {
              removeOnComplete: {
                count: 5, // Keep last 5 completed syncs per integration
              },
              removeOnFail: {
                count: 10, // Keep last 10 failed syncs for debugging
              },
              attempts: 2, // Retry once if failed
              backoff: {
                type: 'exponential',
                delay: 5000, // 5 seconds
              },
            }
          )
        );

        await Promise.all(jobPromises);

        console.log(`✅ Created ${integrations.length} individual email sync job(s)`);

        return {
          success: true,
          integrationsScheduled: integrations.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error('❌ Failed to schedule integration syncs:', error);
        throw new Error(`Failed to schedule integration syncs: ${error.message}`);
      }
    }

    // Handle individual integration sync job
    if (job.name.startsWith('sync-integration-')) {
      const { integrationId, email, workspaceId } = job.data;

      console.log(`🔄 Syncing emails for integration: ${email} (workspace: ${workspaceId})`);

      try {
        // Fetch new replies for this specific workspace
        const repliesProcessed = await InboxService.fetchNewReplies(workspaceId);

        console.log(`✅ Email sync complete for ${email}: ${repliesProcessed} replies processed`);

        return {
          success: true,
          integrationId,
          email,
          workspaceId,
          repliesProcessed,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(`❌ Email sync failed for ${email}:`, error);
        throw new Error(`Email sync failed for ${email}: ${error.message}`);
      }
    }

    // Unknown job type
    throw new Error(`Unknown job type: ${job.name}`);
  },
  {
    ...defaultWorkerOptions,
    concurrency: 10, // Process up to 10 integration syncs simultaneously
  }
);

/**
 * Event handlers
 */

// Job completed successfully
emailSyncWorker.on('completed', (job, result) => {
  if (job.name === 'schedule-integration-syncs') {
    console.log(`✅ Email sync scheduler completed:`, {
      jobId: job.id,
      integrationsScheduled: result.integrationsScheduled,
      timestamp: result.timestamp,
    });
  } else if (job.name.startsWith('sync-integration-')) {
    console.log(`✅ Integration sync completed:`, {
      jobId: job.id,
      email: result.email,
      repliesProcessed: result.repliesProcessed,
      timestamp: result.timestamp,
    });
  }
});

// Job failed
emailSyncWorker.on('failed', (job, error) => {
  if (job?.name === 'schedule-integration-syncs') {
    console.error(`❌ Email sync scheduler failed:`, {
      jobId: job?.id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } else if (job?.name.startsWith('sync-integration-')) {
    console.error(`❌ Integration sync failed:`, {
      jobId: job?.id,
      email: job?.data?.email,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Worker active
emailSyncWorker.on('active', (job) => {
  if (job.name === 'schedule-integration-syncs') {
    console.log(`🔄 Email sync scheduler started: ${job.id}`);
  } else if (job.name.startsWith('sync-integration-')) {
    console.log(`🔄 Integration sync started: ${job.id} (${job.data.email})`);
  }
});

// Worker error
emailSyncWorker.on('error', (error) => {
  console.error('❌ Email sync worker error:', error);
});

export { emailSyncQueue, emailSyncWorker };
