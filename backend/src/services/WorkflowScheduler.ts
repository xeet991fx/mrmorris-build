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

        this.cronJob = cron.schedule(cronExpression, async () => {
            await this.processEnrollments();
        });

        console.log("✅ WorkflowScheduler started successfully");
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
     */
    private async processEnrollments(): Promise<void> {
        if (this.isRunning) {
            console.log("⏳ Previous workflow processing still running, skipping...");
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();

        try {
            await workflowService.processReadyEnrollments();
            this.processedCount++;
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
