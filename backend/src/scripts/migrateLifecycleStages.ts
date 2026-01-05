/**
 * Migration Script: Add Lifecycle Stages to Existing Contacts
 *
 * This script updates all existing contacts to have a default lifecycle stage
 * based on their current status field.
 *
 * Run with: npx ts-node src/scripts/migrateLifecycleStages.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Contact from "../models/Contact";
import ContactLifecycleHistory from "../models/ContactLifecycleHistory";

dotenv.config();

// Status to Lifecycle Stage mapping
const STATUS_TO_LIFECYCLE: { [key: string]: string } = {
  lead: "lead",
  prospect: "mql",
  customer: "customer",
  inactive: "subscriber",
  disqualified: "disqualified",
  nurture: "lead",
};

async function migrateLifecycleStages() {
  try {
    console.log("🚀 Starting lifecycle stage migration...");

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/clianta";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to database");

    // Get all contacts without lifecycle stage
    const contacts = await Contact.find({
      $or: [{ lifecycleStage: null }, { lifecycleStage: { $exists: false } }],
    });

    console.log(`📊 Found ${contacts.length} contacts without lifecycle stage`);

    let migratedCount = 0;
    let historyCount = 0;

    for (const contact of contacts) {
      const status = contact.status || "lead";
      const lifecycleStage = STATUS_TO_LIFECYCLE[status] || "lead";

      // Update contact
      await Contact.findByIdAndUpdate(contact._id, {
        lifecycleStage,
        lifecycleStageUpdatedAt: new Date(),
      });

      // Create initial lifecycle history entry
      await ContactLifecycleHistory.create({
        contactId: contact._id,
        workspaceId: contact.workspaceId,
        currentStage: lifecycleStage,
        currentStageEnteredAt: contact.createdAt || new Date(),
        transitionedFrom: undefined,
        transitionedTo: lifecycleStage,
        transitionedAt: contact.createdAt || new Date(),
        transitionMethod: "import",
        transitionReason: "Initial migration from status field",
        slaTarget: 0,
        slaStatus: "on_track",
        timeInStage: 0,
        metadata: {
          originalStatus: status,
          migrated: true,
        },
      });

      migratedCount++;
      historyCount++;

      if (migratedCount % 100 === 0) {
        console.log(`  ✓ Migrated ${migratedCount}/${contacts.length} contacts...`);
      }
    }

    console.log("\n✅ Migration completed!");
    console.log(`📊 Statistics:`);
    console.log(`  - Contacts updated: ${migratedCount}`);
    console.log(`  - History entries created: ${historyCount}`);

    // Show breakdown by lifecycle stage
    const breakdown = await Contact.aggregate([
      { $group: { _id: "$lifecycleStage", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📊 Lifecycle Stage Distribution:");
    breakdown.forEach((item: any) => {
      console.log(`  - ${item._id}: ${item.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateLifecycleStages();
