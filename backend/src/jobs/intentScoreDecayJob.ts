import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import Contact from '../models/Contact';
import IntentSignal from '../models/IntentSignal';
import { calculateIntentScore, DECAY_CONFIG } from '../services/intentScoring';

/**
 * Intent Score Decay Job
 * Recalculates all contact intent scores daily to apply time-based decay
 */

// Create intent score decay queue
const intentDecayQueue = new Queue('intent-score-decay', defaultQueueOptions);

/**
 * Start intent score decay job scheduler
 * Adds a repeatable job that runs daily at 2 AM
 */
export const startIntentScoreDecayJob = async () => {
  try {
    // Remove any existing repeatable jobs first (to avoid duplicates)
    const repeatableJobs = await intentDecayQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await intentDecayQueue.removeRepeatableByKey(job.key);
    }

    // Add new repeatable job - runs daily at 2 AM
    await intentDecayQueue.add(
      'recalculate-intent-scores',
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

    console.log('✅ Intent score decay job scheduled (daily at 2 AM)');
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
    console.log('🔄 Starting intent score decay recalculation...');

    try {
      const startTime = Date.now();

      // Find all contacts that have intent signals
      const maxAgeDate = new Date();
      maxAgeDate.setDate(maxAgeDate.getDate() - DECAY_CONFIG.MAX_AGE_DAYS);

      // Get unique contact IDs with recent intent signals
      const contactsWithSignals = await IntentSignal.distinct('contactId', {
        contactId: { $exists: true, $ne: null },
        timestamp: { $gte: maxAgeDate },
      });

      console.log(`📊 Found ${contactsWithSignals.length} contacts with recent intent signals`);

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
      ✅ Intent Score Decay Job Completed
      ⏱️  Duration: ${duration}s
      ✅ Success: ${successCount} contacts
      ❌ Errors: ${errorCount} contacts
      📊 Avg Score Change: ${avgScoreChange} points
      🔄 Total Processed: ${contactsWithSignals.length} contacts
      `);

      return {
        success: true,
        processed: contactsWithSignals.length,
        successCount,
        errorCount,
        duration,
        avgScoreChange,
      };
    } catch (error: any) {
      console.error('❌ Intent score decay job failed:', error);
      throw error;
    }
  },
  defaultWorkerOptions
);

// Worker event handlers
intentDecayWorker.on('completed', (job) => {
  console.log(`✅ Intent score decay job ${job.id} completed:`, job.returnvalue);
});

intentDecayWorker.on('failed', (job, err) => {
  console.error(`❌ Intent score decay job ${job?.id} failed:`, err.message);
});

intentDecayWorker.on('error', (err) => {
  console.error('❌ Intent score decay worker error:', err);
});

export { intentDecayQueue, intentDecayWorker };
