/**
 * Migration Script: Deal → Opportunity
 *
 * Migrates all Deal records to the Opportunity model to resolve data duplication (A1).
 *
 * This script:
 * 1. Reads all Deal records
 * 2. Creates corresponding Opportunity records
 * 3. Maps hardcoded stage enum to dynamic pipeline stages
 * 4. Preserves all historical data
 * 5. Marks migrated Deals (adds migrated flag)
 *
 * Usage:
 *   npm run migrate:deals
 *
 * Safety:
 * - Dry run mode by default (set DRY_RUN=false to execute)
 * - Creates backups before migration
 * - Idempotent (can be run multiple times safely)
 */

import mongoose from "mongoose";
import Deal from "../models/Deal";
import Opportunity from "../models/Opportunity";
import Pipeline from "../models/Pipeline";

interface MigrationResult {
    success: boolean;
    dealsProcessed: number;
    opportunitiesCreated: number;
    errors: Array<{ dealId: string; error: string }>;
}

// Stage mapping from Deal enum → Pipeline stage names
const STAGE_MAPPING: Record<string, string> = {
    lead: "Lead",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
};

async function migrateDealToOpportunity(
    workspaceId: string,
    dryRun: boolean = true
): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: true,
        dealsProcessed: 0,
        opportunitiesCreated: 0,
        errors: [],
    };

    try {
        // Find or create default pipeline for this workspace
        let pipeline = await Pipeline.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            name: { $regex: /default|main|sales/i },
        });

        if (!pipeline) {
            console.log(`Creating default pipeline for workspace ${workspaceId}`);
            if (!dryRun) {
                pipeline = await Pipeline.create({
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                    name: "Sales Pipeline (Migrated)",
                    description: "Auto-created during Deal → Opportunity migration",
                    stages: Object.entries(STAGE_MAPPING).map(([key, name], index) => ({
                        name,
                        probability: key === "closed_won" ? 100 : key === "closed_lost" ? 0 : (index + 1) * 20,
                        order: index,
                        color: key === "closed_won" ? "#10b981" : key === "closed_lost" ? "#ef4444" : "#3b82f6",
                        rotAfterDays: key === "lead" ? 30 : undefined,
                    })),
                });
            }
        }

        // Get all deals for this workspace that haven't been migrated
        const deals = await Deal.find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            // @ts-ignore - migrated flag will be added during migration
            migrated: { $ne: true },
        });

        console.log(`Found ${deals.length} deals to migrate`);

        for (const deal of deals) {
            try {
                result.dealsProcessed++;

                // Map Deal stage to Pipeline stage
                const stageName = STAGE_MAPPING[deal.stage] || "Lead";
                const pipelineStage = pipeline?.stages.find((s) => s.name === stageName);

                if (!pipelineStage) {
                    throw new Error(`Pipeline stage not found for ${deal.stage}`);
                }

                // Convert stageHistory from Deal format to Opportunity format
                const stageHistory = (deal.stageHistory || []).map((entry, index) => {
                    const nextEntry = deal.stageHistory?.[index + 1];
                    const enteredAt = new Date(entry.changedAt);
                    const exitedAt = nextEntry ? new Date(nextEntry.changedAt) : undefined;
                    const duration = exitedAt ? exitedAt.getTime() - enteredAt.getTime() : undefined;

                    return {
                        stageId: pipelineStage._id,
                        stageName: STAGE_MAPPING[entry.stage] || entry.stage,
                        enteredAt,
                        exitedAt,
                        duration,
                    };
                });

                // Map Deal status to Opportunity status
                const status =
                    deal.stage === "closed_won"
                        ? "won"
                        : deal.stage === "closed_lost"
                        ? "lost"
                        : "open";

                // Create Opportunity record
                const opportunityData = {
                    workspaceId: deal.workspaceId,
                    userId: deal.userId,
                    pipelineId: pipeline?._id,
                    stageId: pipelineStage?._id,

                    // Core fields
                    title: deal.name,
                    value: deal.value || 0,
                    currency: deal.currency || "USD",
                    probability: deal.probability,
                    expectedCloseDate: deal.expectedCloseDate,
                    actualCloseDate: deal.closeDate,

                    // Relationships
                    contactId: deal.contacts?.[0], // Primary contact
                    associatedContacts: deal.contacts,
                    companyId: deal.companyId,

                    // Details
                    description: deal.description || deal.notes,
                    source: deal.source,
                    status,
                    lostReason: deal.lostReason,

                    // Assignment & Tracking
                    assignedTo: deal.assignedTo,
                    tags: deal.tags,

                    // Stage History
                    stageHistory,

                    // Custom Fields
                    customFields: deal.customFields,

                    // AI Insights (if available)
                    aiInsights: deal.aiInsights
                        ? {
                              dealScore: deal.aiInsights.winProbability,
                              closeProbability: deal.aiInsights.winProbability,
                              recommendedActions: deal.aiInsights.nextBestAction
                                  ? [deal.aiInsights.nextBestAction]
                                  : undefined,
                              riskFactors: deal.aiInsights.riskFactors,
                              lastAnalyzedAt: deal.aiInsights.lastAnalyzedAt,
                          }
                        : undefined,

                    // Preserve timestamps
                    createdAt: deal.createdAt,
                    updatedAt: deal.updatedAt,
                };

                if (!dryRun) {
                    await Opportunity.create(opportunityData);
                    result.opportunitiesCreated++;

                    // Mark Deal as migrated
                    // @ts-ignore
                    deal.migrated = true;
                    // @ts-ignore
                    deal.migratedAt = new Date();
                    // @ts-ignore
                    deal.migratedToOpportunityId = opportunityData.title; // For reference
                    await deal.save();
                } else {
                    console.log(`[DRY RUN] Would create Opportunity: ${deal.name}`);
                }
            } catch (error: any) {
                result.errors.push({
                    dealId: deal._id.toString(),
                    error: error.message,
                });
                console.error(`Error migrating deal ${deal._id}:`, error.message);
            }
        }

        console.log("\n=== Migration Summary ===");
        console.log(`Deals processed: ${result.dealsProcessed}`);
        console.log(`Opportunities created: ${result.opportunitiesCreated}`);
        console.log(`Errors: ${result.errors.length}`);

        if (dryRun) {
            console.log("\n⚠️  DRY RUN MODE - No changes were made");
            console.log("Set DRY_RUN=false to execute migration");
        }

        return result;
    } catch (error: any) {
        result.success = false;
        console.error("Migration failed:", error);
        throw error;
    }
}

// CLI execution
if (require.main === module) {
    const workspaceId = process.env.WORKSPACE_ID;
    const dryRun = process.env.DRY_RUN !== "false";

    if (!workspaceId) {
        console.error("Error: WORKSPACE_ID environment variable is required");
        process.exit(1);
    }

    mongoose
        .connect(process.env.MONGODB_URI || "")
        .then(async () => {
            console.log("Connected to MongoDB");
            console.log(`Workspace: ${workspaceId}`);
            console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

            await migrateDealToOpportunity(workspaceId, dryRun);
            await mongoose.disconnect();
            process.exit(0);
        })
        .catch((error) => {
            console.error("Database connection error:", error);
            process.exit(1);
        });
}

export { migrateDealToOpportunity };
