import cron, { ScheduledTask } from "node-cron";
import workflowService from "./WorkflowService";

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
     * Runs every minute by default
     */
    start(cronExpression: string = "* * * * *"): void {
        if (this.cronJob) {
            console.log("⚠️ WorkflowScheduler already running");
            return;
        }

        console.log("🚀 Starting WorkflowScheduler...");
        console.log(`📅 Cron expression: ${cronExpression}`);

        // Workflow processing (every minute)
        this.cronJob = cron.schedule(cronExpression, async () => {
            await this.processEnrollments();
        });

        // Campaign sending (every 5 minutes)
        cron.schedule("*/5 * * * *", async () => {
            const CampaignService = (await import("./CampaignService")).default;
            await CampaignService.sendNextBatch();
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

        console.log("✅ WorkflowScheduler started successfully");
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
