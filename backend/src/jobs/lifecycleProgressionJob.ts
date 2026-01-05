import cron from "node-cron";
import Project from "../models/Project";
import LifecycleStageService from "../services/LifecycleStageService";

/**
 * Job to automatically progress contacts through lifecycle stages
 * Runs every 2 hours to check if contacts meet criteria for automatic progression
 */
export function startLifecycleProgressionJob() {
  // Run every 2 hours: 0 */2 * * * (at minute 0, every 2 hours)
  const schedule = "0 */2 * * *";

  console.log(`📋 Scheduling lifecycle progression job (${schedule})`);

  const job = cron.schedule(schedule, async () => {
    console.log("🚀 Starting lifecycle progression job...");

    try {
      // Get all active workspaces
      const workspaces = await Project.find({ status: "active" });

      let totalProgressed = 0;

      for (const workspace of workspaces) {
        try {
          const progressedCount = await LifecycleStageService.processAutomaticProgressions(
            workspace._id
          );

          if (progressedCount > 0) {
            console.log(
              `✅ Workspace ${workspace.name}: Progressed ${progressedCount} contacts`
            );
            totalProgressed += progressedCount;
          }
        } catch (error) {
          console.error(`❌ Error processing workspace ${workspace.name}:`, error);
        }
      }

      console.log(
        `✅ Lifecycle progression job completed. Total progressed: ${totalProgressed}`
      );
    } catch (error) {
      console.error("❌ Lifecycle progression job error:", error);
    }
  });

  // Run immediately on startup (optional)
  // Uncomment the next line if you want to run the job immediately when the server starts
  // job.invoke();

  console.log("✅ Lifecycle progression job scheduled successfully");

  return job;
}
