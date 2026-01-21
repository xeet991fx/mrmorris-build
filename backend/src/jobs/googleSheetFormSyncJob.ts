/**
 * Google Sheet Form Sync Job
 *
 * Background job that batch syncs form submissions to Google Sheets.
 * Creates individual sync jobs per form for better parallelization.
 * Scheduler runs every hour to create per-form sync jobs.
 */

import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import Form from '../models/Form';
import { batchSyncSubmissions } from '../services/FormGoogleSheetSync';
import { logger } from '../utils/logger';

// Create Google Sheet sync queue
const googleSheetFormSyncQueue = new Queue('google-sheet-form-sync', defaultQueueOptions);

/**
 * Start Google Sheet form sync job scheduler
 * Creates individual sync jobs for each form every hour
 */
export const startGoogleSheetFormSyncJob = async () => {
    try {
        // Remove any existing repeatable jobs first (to avoid duplicates)
        const repeatableJobs = await googleSheetFormSyncQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await googleSheetFormSyncQueue.removeRepeatableByKey(job.key);
        }

        // Add scheduler job that runs every hour to create per-form sync jobs
        await googleSheetFormSyncQueue.add(
            'schedule-form-syncs',
            {},
            {
                repeat: {
                    pattern: '0 * * * *', // Every hour (at minute 0)
                },
                removeOnComplete: {
                    count: 24, // Keep last 24 completed jobs (one day)
                },
                removeOnFail: {
                    count: 50, // Keep last 50 failed jobs for debugging
                },
            }
        );

        logger.info('[GoogleSheets] Form sync job scheduler started (creates per-form jobs every hour)');
    } catch (error) {
        logger.error('[GoogleSheets] Failed to start form sync job:', error);
    }
};

/**
 * Trigger an immediate sync for a specific form
 */
export const triggerFormSync = async (formId: string) => {
    try {
        await googleSheetFormSyncQueue.add(
            'manual-form-sync',
            { formId },
            {
                removeOnComplete: true,
                removeOnFail: { count: 10 },
            }
        );
        logger.info(`[GoogleSheets] Manual sync triggered for form: ${formId}`);
    } catch (error) {
        logger.error(`[GoogleSheets] Failed to trigger manual sync for form ${formId}:`, error);
        throw error;
    }
};

/**
 * Worker to process Google Sheet sync jobs
 */
const googleSheetFormSyncWorker = new Worker(
    'google-sheet-form-sync',
    async (job) => {
        const startTime = Date.now();

        // Handle scheduler job - creates individual sync jobs per form
        if (job.name === 'schedule-form-syncs') {
            logger.info('[GoogleSheets] Scheduling per-form sync jobs...');

            try {
                // Find all forms with batch sync enabled
                const forms = await Form.find({
                    'googleSheetsIntegration.enabled': true,
                    'googleSheetsIntegration.syncMode': 'batch',
                }).select('_id name');

                if (forms.length === 0) {
                    logger.info('[GoogleSheets] No forms with batch sync enabled');
                    return {
                        success: true,
                        formsScheduled: 0,
                        timestamp: new Date().toISOString(),
                        duration: Date.now() - startTime,
                    };
                }

                logger.info(`[GoogleSheets] Found ${forms.length} form(s) to sync`);

                // Create individual sync job for each form
                const jobPromises = forms.map((form) =>
                    googleSheetFormSyncQueue.add(
                        `sync-form-${form._id}`,
                        {
                            formId: form._id.toString(),
                            formName: form.name,
                        },
                        {
                            removeOnComplete: {
                                count: 5, // Keep last 5 completed syncs per form
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

                logger.info(`[GoogleSheets] Created ${forms.length} individual form sync job(s)`);

                return {
                    success: true,
                    formsScheduled: forms.length,
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime,
                };
            } catch (error: any) {
                logger.error('[GoogleSheets] Failed to schedule form syncs:', error);
                throw new Error(`Failed to schedule form syncs: ${error.message}`);
            }
        }

        // Handle individual form sync job (including manual triggers)
        if (job.data.formId || job.name.startsWith('sync-form-')) {
            const { formId, formName } = job.data;

            logger.info(`[GoogleSheets] Processing sync for form: "${formName}" (${formId})`);

            try {
                const result = await batchSyncSubmissions(formId);

                if (result.success) {
                    logger.info(`[GoogleSheets] Sync complete for "${formName}": ${result.rowsAdded} rows added`);
                } else {
                    logger.warn(`[GoogleSheets] Sync failed for "${formName}": ${result.error}`);
                }

                return {
                    success: result.success,
                    formId,
                    formName,
                    rowsAdded: result.rowsAdded,
                    error: result.error,
                    duration: Date.now() - startTime,
                };
            } catch (error: any) {
                logger.error(`[GoogleSheets] Sync error for form "${formName}":`, error);
                throw new Error(`Form sync failed for ${formName}: ${error.message}`);
            }
        }

        // Unknown job type
        throw new Error(`Unknown job type: ${job.name}`);
    },
    {
        ...defaultWorkerOptions,
        concurrency: 10, // Process up to 10 form syncs simultaneously
    }
);

/**
 * Event handlers
 */

// Job completed successfully
googleSheetFormSyncWorker.on('completed', (job, result) => {
    if (job.name === 'schedule-form-syncs') {
        logger.info(`[GoogleSheets] Form sync scheduler completed:`, {
            jobId: job.id,
            formsScheduled: result.formsScheduled,
            duration: `${result.duration}ms`,
        });
    } else if (job.name.startsWith('sync-form-')) {
        logger.info(`[GoogleSheets] Form sync completed:`, {
            jobId: job.id,
            formName: result.formName,
            rowsAdded: result.rowsAdded,
            duration: `${result.duration}ms`,
        });
    }
});

// Job failed
googleSheetFormSyncWorker.on('failed', (job, error) => {
    if (job?.name === 'schedule-form-syncs') {
        logger.error(`[GoogleSheets] Form sync scheduler failed:`, {
            jobId: job?.id,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    } else if (job?.name.startsWith('sync-form-')) {
        logger.error(`[GoogleSheets] Form sync failed:`, {
            jobId: job?.id,
            formName: job?.data?.formName,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Worker active
googleSheetFormSyncWorker.on('active', (job) => {
    if (job.name === 'schedule-form-syncs') {
        logger.info(`[GoogleSheets] Form sync scheduler started: ${job.id}`);
    } else if (job.name.startsWith('sync-form-')) {
        logger.info(`[GoogleSheets] Form sync started: ${job.id} (${job.data.formName})`);
    }
});

// Worker error
googleSheetFormSyncWorker.on('error', (error) => {
    logger.error('[GoogleSheets] Form sync worker error:', error);
});

export { googleSheetFormSyncQueue, googleSheetFormSyncWorker };
