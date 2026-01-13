/**
 * Google Sheet Form Sync Job
 *
 * Background job that batch syncs form submissions to Google Sheets.
 * Runs every hour to sync submissions for forms with batch sync mode enabled.
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
 * Adds a repeatable job that runs every hour
 */
export const startGoogleSheetFormSyncJob = async () => {
    try {
        // Remove any existing repeatable jobs first (to avoid duplicates)
        const repeatableJobs = await googleSheetFormSyncQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await googleSheetFormSyncQueue.removeRepeatableByKey(job.key);
        }

        // Add new repeatable job
        await googleSheetFormSyncQueue.add(
            'sync-forms-to-google-sheets',
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

        logger.info('[GoogleSheets] Form sync job scheduled (every hour)');
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

        // Check if this is a manual sync for a specific form
        if (job.data.formId) {
            logger.info(`[GoogleSheets] Processing manual sync for form: ${job.data.formId}`);
            const result = await batchSyncSubmissions(job.data.formId);
            return {
                success: result.success,
                formId: job.data.formId,
                rowsAdded: result.rowsAdded,
                error: result.error,
                duration: Date.now() - startTime,
            };
        }

        // Regular scheduled sync for all forms with batch mode
        logger.info('[GoogleSheets] Processing scheduled form sync job...');

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
                    formsSynced: 0,
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime,
                };
            }

            logger.info(`[GoogleSheets] Found ${forms.length} form(s) to sync`);

            // Process each form
            const results = [];
            for (const form of forms) {
                try {
                    logger.info(`[GoogleSheets] Syncing form "${form.name}" (${form._id})`);

                    const syncResult = await batchSyncSubmissions(form._id.toString());

                    results.push({
                        formId: form._id.toString(),
                        formName: form.name,
                        success: syncResult.success,
                        rowsAdded: syncResult.rowsAdded,
                        error: syncResult.error,
                    });

                    if (syncResult.success) {
                        logger.info(`[GoogleSheets] Sync complete for form "${form.name}": ${syncResult.rowsAdded} rows added`);
                    } else {
                        logger.warn(`[GoogleSheets] Sync failed for form "${form.name}": ${syncResult.error}`);
                    }
                } catch (error: any) {
                    logger.error(`[GoogleSheets] Sync error for form "${form.name}":`, error);
                    results.push({
                        formId: form._id.toString(),
                        formName: form.name,
                        success: false,
                        error: error.message,
                    });
                }
            }

            const successCount = results.filter((r) => r.success).length;
            const failureCount = results.filter((r) => !r.success).length;
            const totalRowsAdded = results.reduce((sum, r) => sum + (r.rowsAdded || 0), 0);

            logger.info(
                `[GoogleSheets] Form sync job complete: ${successCount} succeeded, ${failureCount} failed, ${totalRowsAdded} total rows added`
            );

            return {
                success: true,
                formsSynced: successCount,
                formsFailed: failureCount,
                totalRowsAdded,
                results,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
            };
        } catch (error: any) {
            logger.error('[GoogleSheets] Form sync job failed:', error);
            throw new Error(`Google Sheet form sync job failed: ${error.message}`);
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
googleSheetFormSyncWorker.on('completed', (job, result) => {
    logger.info(`[GoogleSheets] Form sync job completed:`, {
        jobId: job.id,
        formsSynced: result.formsSynced,
        formsFailed: result.formsFailed,
        totalRowsAdded: result.totalRowsAdded,
        duration: `${result.duration}ms`,
    });
});

// Job failed
googleSheetFormSyncWorker.on('failed', (job, error) => {
    logger.error(`[GoogleSheets] Form sync job failed:`, {
        jobId: job?.id,
        error: error.message,
        timestamp: new Date().toISOString(),
    });
});

// Worker active
googleSheetFormSyncWorker.on('active', (job) => {
    logger.info(`[GoogleSheets] Form sync job started: ${job.id}`);
});

// Worker error
googleSheetFormSyncWorker.on('error', (error) => {
    logger.error('[GoogleSheets] Form sync worker error:', error);
});

export { googleSheetFormSyncQueue, googleSheetFormSyncWorker };
