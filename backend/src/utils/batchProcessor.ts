/**
 * Batch Processor Utility
 * 
 * Provides parallel batch processing for high-volume operations
 * like email sending across campaigns and workflows.
 */

// ============================================
// TYPES
// ============================================

export interface BatchProcessorOptions {
    /** Max items to process in parallel per batch (default: 10) */
    batchSize?: number;
    /** Delay between batches in ms (default: 100) */
    batchDelayMs?: number;
    /** Continue processing if individual items fail (default: true) */
    continueOnError?: boolean;
    /** Callback for progress updates */
    onProgress?: (processed: number, total: number) => void;
}

export interface BatchResult<T> {
    success: boolean;
    results: T[];
    errors: Array<{ index: number; error: string }>;
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    duration: number;
}

// ============================================
// BATCH PROCESSOR
// ============================================

/**
 * Process items in parallel batches
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Processing options
 * @returns Aggregated results
 * 
 * @example
 * const results = await processBatches(
 *     enrollments,
 *     async (enrollment) => await sendEmail(enrollment),
 *     { batchSize: 10 }
 * );
 */
export async function processBatches<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: BatchProcessorOptions = {}
): Promise<BatchResult<R>> {
    const {
        batchSize = 10,
        batchDelayMs = 100,
        continueOnError = true,
        onProgress,
    } = options;

    const startTime = Date.now();
    const results: R[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    let processed = 0;

    // Split into batches
    const batches = chunkArray(items, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchOffset = batchIndex * batchSize;

        // Process batch in parallel
        const batchPromises = batch.map((item, idx) =>
            processor(item, batchOffset + idx)
                .then(result => ({ success: true as const, result, index: batchOffset + idx }))
                .catch(error => ({ success: false as const, error: error.message, index: batchOffset + idx }))
        );

        const batchResults = await Promise.all(batchPromises);

        // Process results
        for (const result of batchResults) {
            if ('result' in result && result.success === true) {
                results.push(result.result);
            } else if ('error' in result) {
                errors.push({ index: result.index, error: String(result.error) });
                if (!continueOnError) {
                    break;
                }
            }
            processed++;
        }

        // Progress callback
        if (onProgress) {
            onProgress(processed, items.length);
        }

        // Delay between batches to prevent overwhelming resources
        if (batchIndex < batches.length - 1 && batchDelayMs > 0) {
            await delay(batchDelayMs);
        }

        // Stop if we hit an error and continueOnError is false
        if (!continueOnError && errors.length > 0) {
            break;
        }
    }

    return {
        success: errors.length === 0,
        results,
        errors,
        totalProcessed: processed,
        successCount: results.length,
        errorCount: errors.length,
        duration: Date.now() - startTime,
    };
}

// ============================================
// HELPERS
// ============================================

/**
 * Split array into chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Delay for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process with concurrency limit (alternative to batching)
 * Starts new tasks as others complete for maximum throughput
 */
export async function processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 10
): Promise<{ results: R[]; errors: string[] }> {
    const results: R[] = [];
    const errors: string[] = [];
    let index = 0;

    async function processNext(): Promise<void> {
        const currentIndex = index++;
        if (currentIndex >= items.length) return;

        try {
            const result = await processor(items[currentIndex]);
            results[currentIndex] = result;
        } catch (error: any) {
            errors.push(`Item ${currentIndex}: ${error.message}`);
        }

        await processNext();
    }

    // Start initial workers
    const workers = Array(Math.min(concurrency, items.length))
        .fill(null)
        .map(() => processNext());

    await Promise.all(workers);

    return { results: results.filter(r => r !== undefined), errors };
}
