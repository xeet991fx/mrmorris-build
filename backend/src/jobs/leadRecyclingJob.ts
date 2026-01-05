import cron from "node-cron";
import Project from "../models/Project";
import LeadRecyclingService from "../services/LeadRecyclingService";

/**
 * Lead Recycling Job
 *
 * Runs daily to:
 * 1. Detect dead/stale leads
 * 2. Process re-engagement attempts
 */
export function startLeadRecyclingJob() {
  // Run daily at 9 AM: 0 9 * * *
  const schedule = "0 9 * * *";

  console.log(`📋 Scheduling lead recycling job (${schedule})`);

  const job = cron.schedule(schedule, async () => {
    console.log("🔄 Starting lead recycling job...");

    try {
      const workspaces = await Project.find({ status: "active" });

      let totalDetected = 0;
      let totalProcessed = 0;
      let totalSent = 0;

      for (const workspace of workspaces) {
        try {
          // Step 1: Detect dead leads
          const detection = await LeadRecyclingService.detectDeadLeads(workspace._id);

          if (detection.detected > 0) {
            console.log(
              `  🔍 Workspace ${workspace.name}: Detected ${detection.detected} dead leads`
            );

            // Create recycling records
            const created = await LeadRecyclingService.createRecyclingRecords(
              workspace._id,
              detection.leads
            );

            totalDetected += created;
          }

          // Step 2: Process re-engagement attempts
          const processing = await LeadRecyclingService.processReEngagementAttempts(workspace._id);

          if (processing.sent > 0) {
            console.log(
              `  ✉️  Workspace ${workspace.name}: Sent ${processing.sent} re-engagement attempts`
            );
          }

          totalProcessed += processing.processed;
          totalSent += processing.sent;
        } catch (error) {
          console.error(`❌ Error processing workspace ${workspace.name}:`, error);
        }
      }

      console.log(`✅ Lead recycling job completed!`);
      console.log(`   📊 Statistics:`);
      console.log(`      - Dead leads detected: ${totalDetected}`);
      console.log(`      - Re-engagement attempts processed: ${totalProcessed}`);
      console.log(`      - Emails/SMS sent: ${totalSent}`);
    } catch (error) {
      console.error("❌ Lead recycling job error:", error);
    }
  });

  console.log("✅ Lead recycling job scheduled successfully");

  return job;
}
