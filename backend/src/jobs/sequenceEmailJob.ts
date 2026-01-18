/**
 * Sequence Email Job
 *
 * Processes sequence enrollments and sends scheduled emails.
 * Runs every 2 minutes to check for enrollments ready to send.
 */

import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import {
    queueReadySequenceEnrollments,
    startSequenceEmailWorker,
} from '../services/SequenceExecutionService';

// Create sequence scheduler queue (separate from the email sending queue)
const sequenceSchedulerQueue = new Queue('sequence-scheduler', defaultQueueOptions);

/**
 * Start sequence email job scheduler
 * Adds a repeatable job that runs every 2 minutes
 */
export const startSequenceEmailJob = async () => {
    try {
        // Remove any existing repeatable jobs first (to avoid duplicates)
        const repeatableJobs = await sequenceSchedulerQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await sequenceSchedulerQueue.removeRepeatableByKey(job.key);
        }

        // Add new repeatable job
        await sequenceSchedulerQueue.add(
            'process-sequences',
            {},
            {
                repeat: {
                    pattern: '*/2 * * * *', // Every 2 minutes (cron format)
                },
                removeOnComplete: {
                    count: 10,
                },
                removeOnFail: {
                    count: 50,
                },
            }
        );

        // Start the sequence email sending worker
        startSequenceEmailWorker();

        console.log('✅ Sequence email job scheduled (every 2 minutes)');
    } catch (error) {
        console.error('❌ Failed to start sequence email job:', error);
    }
};

/**
 * Worker to process sequence scheduler jobs
 */
const sequenceSchedulerWorker = new Worker(
    'sequence-scheduler',
    async (job) => {
        console.log(`📧 Running sequence scheduler job ${job.id}`);

        try {
            const result = await queueReadySequenceEnrollments(200);

            console.log(`📧 Sequence scheduler: queued ${result.queued}, skipped ${result.skipped}`);

            return result;
        } catch (error: any) {
            console.error('❌ Sequence scheduler job failed:', error.message);
            throw error;
        }
    },
    {
        ...defaultWorkerOptions,
        concurrency: 1, // Only one scheduler job at a time
    }
);

sequenceSchedulerWorker.on('completed', (job) => {
    console.log(`✅ Sequence scheduler job completed: ${job.id}`);
});

sequenceSchedulerWorker.on('failed', (job, err) => {
    console.error(`❌ Sequence scheduler job failed: ${job?.id}`, err.message);
});

/**
 * Manually trigger sequence processing (for testing)
 */
export const triggerSequenceProcessing = async (): Promise<{ queued: number; skipped: number }> => {
    return queueReadySequenceEnrollments(500);
};

export default {
    startSequenceEmailJob,
    triggerSequenceProcessing,
};
