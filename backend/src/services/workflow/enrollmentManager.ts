/**
 * Enrollment Manager
 * 
 * Handles all workflow enrollment logic including:
 * - Checking if entities should be enrolled
 * - Creating new enrollments
 * - Managing enrollment lifecycle
 */

import { Types } from "mongoose";
import Workflow, { IWorkflow } from "../../models/Workflow";
import WorkflowEnrollment, { IWorkflowEnrollment } from "../../models/WorkflowEnrollment";
import { evaluateConditions } from "./conditionEvaluator";
import { mapEventToTrigger, getEntityTypeFromEvent, EntityType } from "./utils";

// ============================================
// AUTOMATIC ENROLLMENT
// ============================================

/**
 * Check if an entity should be enrolled in any active workflows
 * and create enrollments where appropriate.
 */
export async function checkAndEnroll(
    eventType: string,
    entity: any,
    workspaceId: string
): Promise<void> {
    try {
        // Map event to trigger type
        const triggerType = mapEventToTrigger(eventType);
        if (!triggerType) {
            return; // No matching trigger type
        }

        // Determine entity type
        const entityType = getEntityTypeFromEvent(eventType);

        // Find active workflows with matching trigger
        const workflows = await Workflow.find({
            workspaceId,
            status: "active",
            triggerEntityType: entityType,
            "steps.config.triggerType": triggerType,
        });

        console.log(
            `🔍 Found ${workflows.length} active workflows for ${eventType} in workspace ${workspaceId}`
        );

        // Check each workflow for enrollment
        for (const workflow of workflows) {
            try {
                await tryEnrollEntity(workflow, entity, entityType, workspaceId);
            } catch (error: any) {
                console.error(
                    `Failed to check enrollment for workflow "${workflow.name}":`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error("EnrollmentManager.checkAndEnroll error:", error);
    }
}

/**
 * Try to enroll an entity in a specific workflow
 */
async function tryEnrollEntity(
    workflow: IWorkflow,
    entity: any,
    entityType: EntityType,
    workspaceId: string
): Promise<boolean> {
    // Check enrollment criteria
    if (workflow.enrollmentCriteria?.conditions?.length) {
        const matches = evaluateConditions(
            entity,
            workflow.enrollmentCriteria.conditions,
            workflow.enrollmentCriteria.matchAll !== false
        );
        if (!matches) {
            console.log(
                `   ⏭️ Entity doesn't match enrollment criteria for "${workflow.name}"`
            );
            return false;
        }
    }

    // Check if already enrolled (if re-enrollment not allowed)
    if (!workflow.allowReenrollment) {
        const existing = await WorkflowEnrollment.findOne({
            workflowId: workflow._id,
            entityId: entity._id,
            // Include ALL non-terminal statuses to prevent duplicate enrollment
            status: { $in: ["active", "paused", "processing", "retrying", "waiting_for_event"] },
        });
        if (existing) {
            console.log(
                `   ⏭️ Entity already enrolled in "${workflow.name}"`
            );
            return false;
        }
    }

    // Enroll the entity
    await enrollEntity(workflow, entity._id, entityType, workspaceId, undefined, "automatic");
    return true;
}

// ============================================
// ENROLLMENT CREATION
// ============================================

/**
 * Create a new workflow enrollment
 */
export async function enrollEntity(
    workflow: IWorkflow,
    entityId: Types.ObjectId | string,
    entityType: EntityType,
    workspaceId: string,
    enrolledBy?: Types.ObjectId | string,
    source: "automatic" | "manual" | "api" = "automatic"
): Promise<IWorkflowEnrollment> {
    // Get trigger step and find first action step
    const triggerStep = workflow.steps.find((s) => s.type === "trigger");
    const firstStepId = triggerStep?.nextStepIds[0] || undefined;

    // Create enrollment record
    const enrollment = await WorkflowEnrollment.create({
        workflowId: workflow._id,
        workspaceId,
        entityType,
        entityId,
        status: "active",
        currentStepId: firstStepId,
        nextExecutionTime: new Date(), // Execute immediately
        enrolledBy: enrolledBy ? new Types.ObjectId(enrolledBy as string) : undefined,
        enrollmentSource: source,
        stepsExecuted: triggerStep
            ? [
                {
                    stepId: triggerStep.id,
                    stepName: triggerStep.name,
                    stepType: "trigger",
                    startedAt: new Date(),
                    completedAt: new Date(),
                    status: "completed",
                    result: { source },
                },
            ]
            : [],
    });

    // Update workflow stats
    await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: {
            "stats.totalEnrolled": 1,
            "stats.currentlyActive": 1,
        },
    });

    console.log(
        `✅ Enrolled ${entityType} ${entityId} in workflow "${workflow.name}"`
    );

    return enrollment;
}

// ============================================
// ENROLLMENT COMPLETION
// ============================================

/**
 * Complete an enrollment with a final status
 */
export async function completeEnrollment(
    enrollment: IWorkflowEnrollment,
    status: "completed" | "goal_met" | "failed"
): Promise<void> {
    enrollment.status = status;
    enrollment.completedAt = new Date();
    enrollment.currentStepId = undefined;
    enrollment.nextExecutionTime = undefined;
    await enrollment.save();

    // Update workflow stats
    const statsUpdate: any = {
        $inc: { "stats.currentlyActive": -1 },
    };

    if (status === "completed") {
        statsUpdate.$inc["stats.completed"] = 1;
    } else if (status === "goal_met") {
        statsUpdate.$inc["stats.goalsMet"] = 1;
    } else if (status === "failed") {
        statsUpdate.$inc["stats.failed"] = 1;
    }

    await Workflow.findByIdAndUpdate(enrollment.workflowId, statsUpdate);

    console.log(
        `✅ Enrollment ${enrollment._id} completed with status: ${status}`
    );
}

// ============================================
// ENROLLMENT QUERIES
// ============================================

/**
 * Find all enrollments ready for execution
 */
/**
 * Maximum number of enrollments to process per batch
 * This prevents timeout issues on Vercel (10 min limit)
 */
const BATCH_SIZE = 50;

/**
 * Find and lock enrollments ready for execution.
 * Uses atomic findOneAndUpdate to set status to 'processing',
 * preventing other scheduler runs from picking up the same enrollment.
 */
export async function findReadyEnrollments(): Promise<IWorkflowEnrollment[]> {
    const lockedEnrollments: IWorkflowEnrollment[] = [];

    // Find and lock each enrollment atomically - one at a time to prevent race conditions
    for (let i = 0; i < BATCH_SIZE; i++) {
        try {
            // Atomically find ONE ready enrollment and set its status to "processing"
            // This is the ONLY way to prevent duplicate processing
            const locked = await WorkflowEnrollment.findOneAndUpdate(
                {
                    status: { $in: ["active", "retrying"] },
                    nextExecutionTime: { $lte: new Date() },
                },
                {
                    $set: {
                        status: "processing",  // LOCK IT
                        nextExecutionTime: null // Clear so it won't be picked up again
                    },
                },
                {
                    new: true,
                    sort: { nextExecutionTime: 1 } // Process oldest first
                }
            );

            if (locked) {
                lockedEnrollments.push(locked);
            } else {
                // No more ready enrollments
                break;
            }
        } catch (error) {
            // Database error - stop processing
            console.error("Error locking enrollment:", error);
            break;
        }
    }

    return lockedEnrollments;
}

/**
 * Resume enrollments waiting for a specific event
 */
export async function resumeWaitingEnrollments(
    entityId: Types.ObjectId | string,
    eventType: string,
    workspaceId: Types.ObjectId | string
): Promise<number> {
    // Find all enrollments waiting for this event type on this entity
    const waitingEnrollments = await WorkflowEnrollment.find({
        workspaceId,
        entityId,
        status: "waiting_for_event",
        "waitingForEvent.eventType": eventType,
    });

    console.log(
        `🎯 Found ${waitingEnrollments.length} enrollments waiting for event '${eventType}'`
    );

    let resumedCount = 0;

    for (const enrollment of waitingEnrollments) {
        // Mark the wait step as completed
        const waitStep = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
        if (waitStep && waitStep.status === "waiting") {
            waitStep.status = "completed";
            waitStep.completedAt = new Date();
            waitStep.result = {
                ...waitStep.result,
                eventReceived: eventType,
                resumedAt: new Date().toISOString(),
            };
        }

        // Resume execution - move to next step
        const workflow = await Workflow.findById(enrollment.workflowId);
        if (!workflow) {
            console.warn(`Workflow ${enrollment.workflowId} not found`);
            continue;
        }

        const currentStep = workflow.steps.find(
            (s) => s.id === enrollment.currentStepId
        );
        if (!currentStep) {
            console.warn(`Step ${enrollment.currentStepId} not found`);
            continue;
        }

        // Move to next step (the success path - nextStepIds[0])
        enrollment.currentStepId = currentStep.nextStepIds[0];
        enrollment.status = "active";
        enrollment.nextExecutionTime = new Date(); // Execute immediately
        enrollment.waitingForEvent = undefined;

        await enrollment.save();
        resumedCount++;

        console.log(
            `✅ Resumed enrollment ${enrollment._id} - event '${eventType}' received`
        );
    }

    return resumedCount;
}

/**
 * Check if an entity is currently enrolled in a workflow
 */
export async function isEnrolled(
    workflowId: Types.ObjectId | string,
    entityId: Types.ObjectId | string
): Promise<boolean> {
    const count = await WorkflowEnrollment.countDocuments({
        workflowId,
        entityId,
        // Include ALL non-terminal statuses
        status: { $in: ["active", "paused", "processing", "retrying", "waiting_for_event"] },
    });
    return count > 0;
}
