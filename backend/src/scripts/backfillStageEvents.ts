/**
 * Migration Script: Backfill StageChangeEvents from Opportunity Stage History
 *
 * This script migrates existing stage history data from Opportunity.stageHistory
 * embedded arrays into the new StageChangeEvent collection for event sourcing.
 *
 * Run with: npx ts-node src/scripts/backfillStageEvents.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Opportunity from "../models/Opportunity";
import StageChangeEvent from "../models/StageChangeEvent";
import Pipeline from "../models/Pipeline";

dotenv.config();

async function backfillStageEvents() {
  try {
    console.log("🚀 Starting stage change event backfill...");

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/clianta";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database");

    // Get all opportunities with stage history
    const opportunities = await Opportunity.find({
      stageHistory: { $exists: true, $ne: [] },
    }).select("_id workspaceId pipelineId stageHistory value probability status assignedTo userId createdAt");

    console.log(`📊 Found ${opportunities.length} opportunities with stage history`);

    let eventsCreated = 0;
    let opportunitiesProcessed = 0;

    for (const opportunity of opportunities) {
      try {
        const stageHistory = opportunity.stageHistory || [];

        if (stageHistory.length === 0) {
          continue;
        }

        // Process each stage transition
        for (let i = 0; i < stageHistory.length; i++) {
          const currentStage = stageHistory[i];
          const previousStage = i > 0 ? stageHistory[i - 1] : undefined;

          // Check if event already exists (avoid duplicates on re-runs)
          const existingEvent = await StageChangeEvent.findOne({
            entityId: opportunity._id,
            newStageId: currentStage.stageId,
            timestamp: currentStage.enteredAt,
          });

          if (existingEvent) {
            continue; // Skip if already migrated
          }

          // Create stage change event
          await StageChangeEvent.create({
            entityId: opportunity._id,
            entityType: "opportunity",
            workspaceId: opportunity.workspaceId,
            pipelineId: opportunity.pipelineId,
            oldStageId: previousStage?.stageId,
            oldStageName: previousStage?.stageName,
            newStageId: currentStage.stageId,
            newStageName: currentStage.stageName,
            timestamp: currentStage.enteredAt,
            userId: opportunity.userId, // Best effort - might be null for old data
            metadata: {
              value: opportunity.value,
              probability: opportunity.probability,
              status: opportunity.status,
              assignedTo: opportunity.assignedTo,
              migrated: true,
              originalIndex: i,
            },
          });

          eventsCreated++;
        }

        opportunitiesProcessed++;

        if (opportunitiesProcessed % 100 === 0) {
          console.log(`  ✓ Processed ${opportunitiesProcessed}/${opportunities.length} opportunities...`);
        }
      } catch (oppError) {
        console.error(`  ❌ Error processing opportunity ${opportunity._id}:`, oppError);
        // Continue with next opportunity
      }
    }

    console.log("\n✅ Backfill completed!");
    console.log(`📊 Statistics:`);
    console.log(`  - Opportunities processed: ${opportunitiesProcessed}`);
    console.log(`  - Events created: ${eventsCreated}`);

    // Show breakdown by pipeline
    const pipelineBreakdown = await StageChangeEvent.aggregate([
      { $match: { "metadata.migrated": true } },
      {
        $lookup: {
          from: "pipelines",
          localField: "pipelineId",
          foreignField: "_id",
          as: "pipeline",
        },
      },
      { $unwind: { path: "$pipeline", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$pipelineId",
          pipelineName: { $first: "$pipeline.name" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📊 Events by Pipeline:");
    pipelineBreakdown.forEach((item: any) => {
      console.log(`  - ${item.pipelineName || "Unknown"}: ${item.count} events`);
    });

    // Show total events in collection
    const totalEvents = await StageChangeEvent.countDocuments();
    console.log(`\n📊 Total events in collection: ${totalEvents}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

// Run backfill
backfillStageEvents();
