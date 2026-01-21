import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import Contact from '../models/Contact';
import IntentSignal from '../models/IntentSignal';
import { calculateIntentScore, DECAY_CONFIG } from '../services/intentScoring';

/**
 * Intent Score Decay Job
 * Creates individual recalculation jobs per workspace for better parallelization
 * Scheduler runs daily at 2 AM to create per-workspace decay jobs
 */

// Create intent score decay queue
const intentDecayQueue = new Queue('intent-score-decay', defaultQueueOptions);

/**
 * Start intent score decay job scheduler
 * Creates individual decay jobs for each workspace daily at 2 AM
 */
export const startIntentScoreDecayJob = async () => {
  try {
    // Remove any existing repeatable jobs first (to avoid duplicates)
    const repeatableJobs = await intentDecayQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await intentDecayQueue.removeRepeatableByKey(job.key);
    }

    // Add scheduler job - runs daily at 2 AM to create per-workspace jobs
    await intentDecayQueue.add(
      'schedule-workspace-decay',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // Daily at 2 AM (cron format)
        },
        removeOnComplete: {
          count: 7, // Keep last 7 days of completed jobs
        },
        removeOnFail: {
          count: 30, // Keep last 30 failed jobs for debugging
        },
      }
    );

    console.log('✅ Intent score decay job scheduler started (creates per-workspace jobs daily at 2 AM)');
  } catch (error) {
    console.error('❌ Failed to start intent score decay job:', error);
  }
};

/**
 * Worker to process intent score decay jobs
 */
const intentDecayWorker = new Worker(
  'intent-score-decay',
  async (job) => {
    // Handle scheduler job - creates individual workspace decay jobs
    if (job.name === 'schedule-workspace-decay') {
      console.log('🔄 Scheduling per-workspace intent decay jobs...');

      try {
        const maxAgeDate = new Date();
        maxAgeDate.setDate(maxAgeDate.getDate() - DECAY_CONFIG.MAX_AGE_DAYS);

        // Get unique workspace IDs with recent intent signals
        const workspacesWithSignals = await IntentSignal.distinct('workspaceId', {
          workspaceId: { $exists: true, $ne: null },
          timestamp: { $gte: maxAgeDate },
        });

        console.log(`📊 Found ${workspacesWithSignals.length} workspace(s) with recent intent signals`);

        if (workspacesWithSignals.length === 0) {
          return {
            success: true,
            workspacesScheduled: 0,
            timestamp: new Date().toISOString(),
          };
        }

        // Create individual decay job for each workspace
        const jobPromises = workspacesWithSignals.map((workspaceId) =>
          intentDecayQueue.add(
            `decay-workspace-${workspaceId}`,
            {
              workspaceId: workspaceId.toString(),
            },
            {
              removeOnComplete: {
                count: 3, // Keep last 3 completed decays per workspace
              },
              removeOnFail: {
                count: 10, // Keep last 10 failed decays for debugging
              },
              attempts: 2, // Retry once if failed
              backoff: {
                type: 'exponential',
                delay: 10000, // 10 seconds
              },
            }
          )
        );

        await Promise.all(jobPromises);

        console.log(`✅ Created ${workspacesWithSignals.length} individual workspace decay job(s)`);

        return {
          success: true,
          workspacesScheduled: workspacesWithSignals.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error('❌ Failed to schedule workspace decay jobs:', error);
        throw new Error(`Failed to schedule workspace decay jobs: ${error.message}`);
      }
    }

    // Handle individual workspace decay job
    if (job.name.startsWith('decay-workspace-')) {
      const { workspaceId } = job.data;

      console.log(`🔄 Starting intent score decay for workspace: ${workspaceId}`);

      try {
        const startTime = Date.now();
        const maxAgeDate = new Date();
        maxAgeDate.setDate(maxAgeDate.getDate() - DECAY_CONFIG.MAX_AGE_DAYS);

        // Get contacts with recent intent signals for this workspace
        const contactsWithSignals = await IntentSignal.distinct('contactId', {
          workspaceId,
          contactId: { $exists: true, $ne: null },
          timestamp: { $gte: maxAgeDate },
        });

        console.log(`📊 Processing ${contactsWithSignals.length} contacts in workspace ${workspaceId}`);

        let successCount = 0;
        let errorCount = 0;
        let totalScoreChange = 0;

        // Process contacts in batches to avoid memory issues
        const BATCH_SIZE = 100;
        for (let i = 0; i < contactsWithSignals.length; i += BATCH_SIZE) {
          const batch = contactsWithSignals.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (contactId) => {
              try {
                // Get contact's current score
                const contact = await Contact.findById(contactId).select('intentScore workspaceId').lean();
                if (!contact) {
                  errorCount++;
                  return;
                }

                const oldScore = contact.intentScore || 0;

                // Recalculate with decay
                const result = await calculateIntentScore(contact.workspaceId, contactId);
                const newScore = result.totalScore;

                // Track score change
                totalScoreChange += Math.abs(newScore - oldScore);

                successCount++;

                // Log significant changes
                if (Math.abs(newScore - oldScore) > 20) {
                  console.log(
                    `  📉 Contact ${contactId}: ${oldScore} → ${Math.round(newScore)} (${Math.round(newScore - oldScore)})`
                  );
                }
              } catch (error: any) {
                console.error(`  ❌ Error recalculating score for contact ${contactId}:`, error.message);
                errorCount++;
              }
            })
          );

          // Log progress for large batches
          if (contactsWithSignals.length > BATCH_SIZE) {
            const progress = Math.min(i + BATCH_SIZE, contactsWithSignals.length);
            console.log(`  Progress: ${progress}/${contactsWithSignals.length} contacts processed`);
          }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const avgScoreChange = contactsWithSignals.length > 0
          ? (totalScoreChange / contactsWithSignals.length).toFixed(2)
          : 0;

        console.log(`
      ✅ Workspace ${workspaceId} Intent Decay Complete
      ⏱️  Duration: ${duration}s
      ✅ Success: ${successCount} contacts
      ❌ Errors: ${errorCount} contacts
      📊 Avg Score Change: ${avgScoreChange} points
      `);

        return {
          success: true,
          workspaceId,
          processed: contactsWithSignals.length,
          successCount,
          errorCount,
          duration,
          avgScoreChange,
        };
      } catch (error: any) {
        console.error(`❌ Intent score decay failed for workspace ${workspaceId}:`, error);
        throw new Error(`Intent score decay failed for workspace ${workspaceId}: ${error.message}`);
      }
    }

    // Unknown job type
    throw new Error(`Unknown job type: ${job.name}`);
  },
  {
    ...defaultWorkerOptions,
    concurrency: 5, // Process up to 5 workspace decays simultaneously
  }
);

// Worker event handlers
intentDecayWorker.on('completed', (job, result) => {
  if (job.name === 'schedule-workspace-decay') {
    console.log(`✅ Intent decay scheduler completed:`, {
      jobId: job.id,
      workspacesScheduled: result.workspacesScheduled,
    });
  } else if (job.name.startsWith('decay-workspace-')) {
    console.log(`✅ Workspace decay completed:`, {
      jobId: job.id,
      workspaceId: result.workspaceId,
      contactsProcessed: result.processed,
      avgScoreChange: result.avgScoreChange,
    });
  }
});

intentDecayWorker.on('failed', (job, err) => {
  if (job?.name === 'schedule-workspace-decay') {
    console.error(`❌ Intent decay scheduler failed:`, {
      jobId: job?.id,
      error: err.message,
    });
  } else if (job?.name.startsWith('decay-workspace-')) {
    console.error(`❌ Workspace decay failed:`, {
      jobId: job?.id,
      workspaceId: job?.data?.workspaceId,
      error: err.message,
    });
  }
});

intentDecayWorker.on('error', (err) => {
  console.error('❌ Intent score decay worker error:', err);
});

export { intentDecayQueue, intentDecayWorker };
