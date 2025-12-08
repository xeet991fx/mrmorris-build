/**
 * Step Executor
 * 
 * Handles execution of individual workflow steps including:
 * - Action execution
 * - Delay scheduling
 * - Condition evaluation and branching
 */

import Workflow from "../../models/Workflow";
import { IWorkflowEnrollment } from "../../models/WorkflowEnrollment";
import { executeAction, ActionContext } from "./actions";
import { evaluateCondition } from "./conditionEvaluator";
import { completeEnrollment } from "./enrollmentManager";
import { calculateDelayMs, getEntity } from "./utils";

// ============================================
// STEP EXECUTION
// ============================================

/**
 * Execute the next step for an enrollment
 */
export async function executeNextStep(
    enrollment: IWorkflowEnrollment
): Promise<void> {
    try {
        // Get workflow
        const workflow = await Workflow.findById(enrollment.workflowId);
        if (!workflow || workflow.status !== "active") {
            enrollment.status = "paused";
            await enrollment.save();
            console.log(`⏸️ Workflow paused or not found, pausing enrollment`);
            return;
        }

        // Check if there's a current step to execute
        if (!enrollment.currentStepId) {
            await completeEnrollment(enrollment, "completed");
            return;
        }

        // Find the step
        const step = workflow.steps.find((s) => s.id === enrollment.currentStepId);
        if (!step) {
            enrollment.lastError = "Step not found in workflow";
            enrollment.status = "failed";
            await enrollment.save();
            console.error(`❌ Step ${enrollment.currentStepId} not found`);
            return;
        }

        // Add execution record
        const execution = {
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            startedAt: new Date(),
            status: "running" as const,
        };
        enrollment.stepsExecuted.push(execution);
        await enrollment.save();

        // Execute based on step type
        let result: any = null;
        let nextStepId: string | undefined = step.nextStepIds[0] || undefined;

        try {
            switch (step.type) {
                case "action":
                    result = await executeActionStep(step, enrollment);
                    break;

                case "delay":
                    await executeDelayStep(step, enrollment, nextStepId);
                    return; // Delay step schedules future execution

                case "condition":
                    const branchResult = await executeConditionStep(step, enrollment);
                    result = branchResult.result;
                    nextStepId = branchResult.nextStepId;
                    break;
            }

            // Update step as completed
            const stepExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
            stepExec.status = "completed";
            stepExec.completedAt = new Date();
            stepExec.result = result;

            // Move to next step
            enrollment.currentStepId = nextStepId;
            enrollment.nextExecutionTime = nextStepId ? new Date() : undefined;

            if (!nextStepId) {
                await completeEnrollment(enrollment, "completed");
            } else {
                await enrollment.save();

                // Chain to next non-delay step immediately
                const nextStep = workflow.steps.find((s) => s.id === nextStepId);
                if (nextStep && nextStep.type !== "delay") {
                    await executeNextStep(enrollment);
                }
            }
        } catch (error: any) {
            await handleStepError(enrollment, workflow, error);
        }
    } catch (error) {
        console.error("StepExecutor.executeNextStep error:", error);
    }
}

// ============================================
// STEP TYPE HANDLERS
// ============================================

/**
 * Execute an action step
 */
async function executeActionStep(
    step: any,
    enrollment: IWorkflowEnrollment
): Promise<any> {
    const entity = await getEntity(enrollment.entityType, enrollment.entityId);
    if (!entity) {
        throw new Error("Entity not found");
    }

    const context: ActionContext = {
        step,
        entity,
        enrollment,
        workspaceId: enrollment.workspaceId,
    };

    console.log(
        `⚡ Executing action "${step.config.actionType}" for ${enrollment.entityType} ${enrollment.entityId}`
    );

    const result = await executeAction(step.config.actionType, context);

    if (!result.success && !result.skipped) {
        throw new Error(result.error || "Action execution failed");
    }

    return result;
}

/**
 * Execute a delay step (schedules future execution)
 */
async function executeDelayStep(
    step: any,
    enrollment: IWorkflowEnrollment,
    nextStepId: string | undefined
): Promise<void> {
    const delayMs = calculateDelayMs(step.config.delayValue, step.config.delayUnit);

    enrollment.currentStepId = nextStepId;
    enrollment.nextExecutionTime = new Date(Date.now() + delayMs);

    // Update step execution
    const delayExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
    delayExec.status = "completed";
    delayExec.completedAt = new Date();
    delayExec.result = {
        delayMs,
        scheduledFor: enrollment.nextExecutionTime.toISOString(),
    };

    await enrollment.save();

    console.log(
        `⏰ Delay step: Waiting ${step.config.delayValue} ${step.config.delayUnit} (${delayMs}ms)`
    );
}

/**
 * Execute a condition step (determines branch)
 */
async function executeConditionStep(
    step: any,
    enrollment: IWorkflowEnrollment
): Promise<{ result: any; nextStepId: string | undefined }> {
    const entity = await getEntity(enrollment.entityType, enrollment.entityId);
    if (!entity) {
        throw new Error("Entity not found for condition evaluation");
    }

    const condition = step.config.conditions?.[0];
    if (!condition) {
        return {
            result: { conditionResult: true, reason: "No condition configured" },
            nextStepId: step.nextStepIds[0],
        };
    }

    const conditionResult = evaluateCondition(entity, condition);
    let nextStepId: string | undefined;

    // step.nextStepIds[0] = Yes/True path
    // step.nextStepIds[1] = No/False path
    if (conditionResult && step.nextStepIds[0]) {
        nextStepId = step.nextStepIds[0];
        console.log(`🔀 Condition TRUE → taking Yes branch`);
    } else if (!conditionResult && step.nextStepIds[1]) {
        nextStepId = step.nextStepIds[1];
        console.log(`🔀 Condition FALSE → taking No branch`);
    } else {
        nextStepId = step.nextStepIds[0]; // Default to first path
    }

    return {
        result: {
            conditionResult,
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            entityValue: entity[condition.field],
        },
        nextStepId,
    };
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Handle step execution errors with retry logic
 */
async function handleStepError(
    enrollment: IWorkflowEnrollment,
    workflow: any,
    error: Error
): Promise<void> {
    // Update step as failed
    const failedExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
    failedExec.status = "failed";
    failedExec.completedAt = new Date();
    failedExec.error = error.message;

    enrollment.lastError = error.message;
    enrollment.errorCount += 1;

    // Retry logic - fail after 3 attempts
    if (enrollment.errorCount >= 3) {
        await completeEnrollment(enrollment, "failed");
        console.error(
            `❌ Enrollment failed after ${enrollment.errorCount} attempts: ${error.message}`
        );
    } else {
        // Schedule retry in 5 minutes
        enrollment.nextExecutionTime = new Date(Date.now() + 5 * 60 * 1000);
        await enrollment.save();
        console.warn(
            `⚠️ Step failed (attempt ${enrollment.errorCount}/3), retrying in 5 minutes: ${error.message}`
        );
    }
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Process all enrollments that are ready for execution
 */
export async function processReadyEnrollments(): Promise<number> {
    const { findReadyEnrollments } = await import("./enrollmentManager");

    const enrollments = await findReadyEnrollments();
    console.log(`🔄 Processing ${enrollments.length} ready enrollments...`);

    for (const enrollment of enrollments) {
        try {
            await executeNextStep(enrollment);
        } catch (error: any) {
            console.error(
                `Failed to process enrollment ${enrollment._id}:`,
                error.message
            );
        }
    }

    return enrollments.length;
}
