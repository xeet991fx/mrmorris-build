import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import InboxService from '../services/InboxService';

/**
 * Email Sync Job
 * Automatically syncs Gmail replies every 5 minutes
 */

// Create email sync queue
const emailSyncQueue = new Queue('email-sync', defaultQueueOptions);

/**
 * Start email sync job scheduler
 * Adds a repeatable job that runs every 5 minutes
 */
export const startEmailSyncJob = async () => {
  try {
    // Remove any existing repeatable jobs first (to avoid duplicates)
    const repeatableJobs = await emailSyncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await emailSyncQueue.removeRepeatableByKey(job.key);
    }

    // Add new repeatable job
    await emailSyncQueue.add(
      'sync-gmail-replies',
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

    console.log('✅ Email sync job scheduled (every 5 minutes)');
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
    console.log('🔄 Processing email sync job...');

    try {
      // Call InboxService to fetch new replies
      const repliesProcessed = await InboxService.fetchNewReplies();

      console.log(`✅ Email sync complete: ${repliesProcessed} replies processed`);

      return {
        success: true,
        repliesProcessed,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ Email sync failed:', error);

      throw new Error(`Email sync failed: ${error.message}`);
    }
  },
  {
    ...defaultWorkerOptions,
    concurrency: 1, // Only process one sync job at a time
  }
);

/**
 * Event handlers
 */

// Job completed successfully
emailSyncWorker.on('completed', (job, result) => {
  console.log(`✅ Email sync job completed:`, {
    jobId: job.id,
    repliesProcessed: result.repliesProcessed,
    timestamp: result.timestamp,
  });
});

// Job failed
emailSyncWorker.on('failed', (job, error) => {
  console.error(`❌ Email sync job failed:`, {
    jobId: job?.id,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
});

// Worker active
emailSyncWorker.on('active', (job) => {
  console.log(`🔄 Email sync job started: ${job.id}`);
});

// Worker error
emailSyncWorker.on('error', (error) => {
  console.error('❌ Email sync worker error:', error);
});

export { emailSyncQueue, emailSyncWorker };
