import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import SalesforceIntegration from '../models/SalesforceIntegration';
import { salesforceService } from '../services/SalesforceService';

/**
 * Salesforce Sync Job
 * Automatically syncs CRM data with Salesforce every 15 minutes
 */

// Create Salesforce sync queue
const salesforceSyncQueue = new Queue('salesforce-sync', defaultQueueOptions);

/**
 * Start Salesforce sync job scheduler
 * Adds a repeatable job that runs every 15 minutes
 */
export const startSalesforceSyncJob = async () => {
  try {
    // Remove any existing repeatable jobs first (to avoid duplicates)
    const repeatableJobs = await salesforceSyncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await salesforceSyncQueue.removeRepeatableByKey(job.key);
    }

    // Add new repeatable job
    await salesforceSyncQueue.add(
      'sync-salesforce',
      {},
      {
        repeat: {
          pattern: '*/15 * * * *', // Every 15 minutes (cron format)
        },
        removeOnComplete: {
          count: 20, // Keep last 20 completed jobs
        },
        removeOnFail: {
          count: 50, // Keep last 50 failed jobs for debugging
        },
      }
    );

    console.log('✅ Salesforce sync job scheduled (every 15 minutes)');
  } catch (error) {
    console.error('❌ Failed to start Salesforce sync job:', error);
  }
};

/**
 * Worker to process Salesforce sync jobs
 */
const salesforceSyncWorker = new Worker(
  'salesforce-sync',
  async (job) => {
    console.log('🔄 Processing Salesforce sync job...');

    try {
      // Find all active integrations that are due for sync
      const now = new Date();
      const integrations = await SalesforceIntegration.find({
        syncStatus: 'active',
        $or: [
          { nextSyncAt: { $lte: now } },
          { nextSyncAt: null },
        ],
      });

      if (integrations.length === 0) {
        console.log('ℹ️  No Salesforce integrations due for sync');
        return {
          success: true,
          integrationsSynced: 0,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(`📊 Found ${integrations.length} Salesforce integration(s) to sync`);

      // Process each integration
      const results = [];
      for (const integration of integrations) {
        try {
          console.log(`🔄 Syncing Salesforce for workspace: ${integration.workspaceId}`);

          const syncResult = await salesforceService.performSync(integration._id.toString());

          results.push({
            integrationId: integration._id.toString(),
            workspaceId: integration.workspaceId.toString(),
            success: true,
            syncResult,
          });

          console.log(`✅ Salesforce sync complete for workspace: ${integration.workspaceId}`);
        } catch (error: any) {
          console.error(`❌ Salesforce sync failed for workspace: ${integration.workspaceId}`, error);

          results.push({
            integrationId: integration._id.toString(),
            workspaceId: integration.workspaceId.toString(),
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`✅ Salesforce sync job complete: ${successCount} succeeded, ${failureCount} failed`);

      return {
        success: true,
        integrationsSynced: successCount,
        integrationsFailed: failureCount,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ Salesforce sync job failed:', error);
      throw new Error(`Salesforce sync job failed: ${error.message}`);
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
salesforceSyncWorker.on('completed', (job, result) => {
  console.log(`✅ Salesforce sync job completed:`, {
    jobId: job.id,
    integrationsSynced: result.integrationsSynced,
    integrationsFailed: result.integrationsFailed,
    timestamp: result.timestamp,
  });
});

// Job failed
salesforceSyncWorker.on('failed', (job, error) => {
  console.error(`❌ Salesforce sync job failed:`, {
    jobId: job?.id,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
});

// Worker active
salesforceSyncWorker.on('active', (job) => {
  console.log(`🔄 Salesforce sync job started: ${job.id}`);
});

// Worker error
salesforceSyncWorker.on('error', (error) => {
  console.error('❌ Salesforce sync worker error:', error);
});

export { salesforceSyncQueue, salesforceSyncWorker };
