import cron, { ScheduledTask } from "node-cron";
import workflowService from "./WorkflowService";
import { startEmailQueueWorker, queueReadyEnrollments } from "./CampaignEmailQueue";

// ============================================
// WORKFLOW SCHEDULER
// ============================================

/**
 * WorkflowScheduler handles the periodic processing of 
 * workflow enrollments that are ready for execution.
 */
class WorkflowScheduler {
    private cronJob: ScheduledTask | null = null;
    private isRunning: boolean = false;
    private lastRunTime: Date | null = null;
    private processedCount: number = 0;

    /**
     * Start the workflow processor
     * Runs every 30 seconds for better timing accuracy
     */
    start(cronExpression: string = "* * * * *"): void {
        if (this.cronJob) {
            console.log("⚠️ WorkflowScheduler already running");
            return;
        }

        console.log("🚀 Starting WorkflowScheduler...");

        // Start the email queue worker for campaign emails
        startEmailQueueWorker();

        // Workflow processing (every 30 seconds for better accuracy with short delays)
        // Using setInterval because node-cron only supports minute granularity
        setInterval(async () => {
            await this.processEnrollments();
        }, 30 * 1000); // 30 seconds

        // Also run immediately on startup
        setTimeout(() => this.processEnrollments(), 1000);

        // Campaign sending via queue (every 5 minutes)
        // Queues emails for async processing - handles 500+ emails efficiently
        cron.schedule("*/5 * * * *", async () => {
            console.log("📤 Queuing campaign emails...");
            const result = await queueReadyEnrollments(500);
            if (result.queued > 0) {
                console.log(`📧 Queued ${result.queued} campaign emails`);
            }
        });

        // Warmup emails (every hour)
        cron.schedule("0 * * * *", async () => {
            const WarmupService = (await import("./WarmupService")).default;
            await WarmupService.runDailyWarmup();
        });

        // Reset daily counters (midnight)
        cron.schedule("0 0 * * *", async () => {
            const EmailAccountService = (await import("./EmailAccountService")).default;
            await EmailAccountService.resetDailyCounters();
        });

        // Fetch new replies (every 6 hours) 
        cron.schedule("0 */6 * * *", async () => {
            const InboxService = (await import("./InboxService")).default;
            await InboxService.fetchNewReplies();
        });

        // Mark as running (even though we're using setInterval now)
        this.cronJob = cron.schedule(cronExpression, () => { }); // Dummy to track running state

        console.log("✅ WorkflowScheduler started (runs every 30 seconds)");
        console.log("✅ Campaign scheduler started successfully");
        console.log("✅ Warmup scheduler started successfully");
    }

    /**
     * Stop the workflow processor
     */
    stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log("⏹️ WorkflowScheduler stopped");
        }
    }

    /**
     * Process all enrollments ready for execution
     * Loops until no more immediate enrollments (max 10 iterations to prevent infinite loops)
     */
    private async processEnrollments(): Promise<void> {
        if (this.isRunning) {
            console.log("⏳ Previous workflow processing still running, skipping...");
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();

        try {
            const MAX_ITERATIONS = 10; // Safety limit
            let iteration = 0;
            let processedInIteration = 0;

            // Keep processing until no more ready enrollments or max iterations reached
            do {
                processedInIteration = await workflowService.processReadyEnrollments();
                this.processedCount++;
                iteration++;

                // Small delay between iterations to let DB settle
                if (processedInIteration > 0 && iteration < MAX_ITERATIONS) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } while (processedInIteration > 0 && iteration < MAX_ITERATIONS);

            if (iteration >= MAX_ITERATIONS) {
                console.log(`⚠️ Reached max iterations (${MAX_ITERATIONS}), will continue on next tick`);
            }
        } catch (error) {
            console.error("❌ Error processing workflow enrollments:", error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get scheduler status
     */
    getStatus(): {
        isRunning: boolean;
        lastRunTime: Date | null;
        processedCount: number;
        isSchedulerActive: boolean;
    } {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            processedCount: this.processedCount,
            isSchedulerActive: this.cronJob !== null,
        };
    }

    /**
     * Manually trigger a processing run
     */
    async triggerManualRun(): Promise<void> {
        console.log("🔄 Manual workflow processing triggered");
        await this.processEnrollments();
    }
}

// Export singleton instance
export const workflowScheduler = new WorkflowScheduler();
export default workflowScheduler;
