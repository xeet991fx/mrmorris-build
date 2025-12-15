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
    enrollment: IWorkflowEnrollment,
    retryCount: number = 0
): Promise<void> {
    const MAX_VERSION_RETRIES = 3;

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

        // CRITICAL: Clear nextExecutionTime IMMEDIATELY to prevent duplicate processing
        // The scheduler runs every minute and might pick up this enrollment again if we don't clear it
        enrollment.nextExecutionTime = undefined;

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

                case "wait_event":
                    await executeWaitEventStep(step, enrollment, workflow, nextStepId);
                    return; // Wait event step pauses execution
            }

            // Update step as completed
            const stepExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
            stepExec.status = "completed";
            stepExec.completedAt = new Date();
            stepExec.result = result;

            // Move to next step
            enrollment.currentStepId = nextStepId;

            // Set nextExecutionTime for the next step
            // For non-delay steps, schedule immediately but let scheduler pick it up
            // This avoids version conflicts from recursive execution
            if (nextStepId) {
                enrollment.nextExecutionTime = new Date();
            } else {
                enrollment.nextExecutionTime = undefined;
            }

            if (!nextStepId) {
                // Check if goal criteria is met before completing
                const goalMet = await checkGoalCriteria(enrollment, workflow);
                const completionStatus = goalMet ? "goal_met" : "completed";
                await completeEnrollment(enrollment, completionStatus);
            } else {
                await enrollment.save();
                // DO NOT chain to next step here - let the scheduler handle it
                // This prevents version conflicts from rapid recursive saves
            }
        } catch (error: any) {
            await handleStepError(enrollment, workflow, error);
        }
    } catch (error: any) {
        // Handle version conflict errors with retry
        if (error.name === "VersionError" && retryCount < MAX_VERSION_RETRIES) {
            console.log(`🔄 Version conflict, retrying (attempt ${retryCount + 1}/${MAX_VERSION_RETRIES})...`);

            // Wait a bit and refresh the enrollment
            await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));

            const WorkflowEnrollment = (await import("../../models/WorkflowEnrollment")).default;
            const refreshedEnrollment = await WorkflowEnrollment.findById(enrollment._id);

            if (refreshedEnrollment) {
                await executeNextStep(refreshedEnrollment, retryCount + 1);
            }
            return;
        }

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
    const now = new Date();
    let delayMs = 0;
    let scheduledFor: Date;
    let description: string;

    const delayType = step.config.delayType || "duration";

    switch (delayType) {
        case "duration":
            // Standard duration delay (minutes, hours, days, weeks)
            delayMs = calculateDelayMs(step.config.delayValue, step.config.delayUnit);
            scheduledFor = new Date(now.getTime() + delayMs);
            description = `${step.config.delayValue} ${step.config.delayUnit}`;
            break;

        case "until_date":
            // Wait until a specific date
            const targetDate = new Date(step.config.delayDate!);
            scheduledFor = targetDate;
            delayMs = Math.max(0, targetDate.getTime() - now.getTime());
            description = `until ${targetDate.toLocaleDateString()}`;
            break;

        case "until_time":
            // Wait until a specific time today or tomorrow
            const [hours, minutes] = step.config.delayTime!.split(":");
            const targetTime = new Date(now);
            targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // If time has passed today, schedule for tomorrow
            if (targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            scheduledFor = targetTime;
            delayMs = targetTime.getTime() - now.getTime();
            description = `until ${step.config.delayTime}`;
            break;

        case "until_weekday":
            // Wait until a specific day of the week (0 = Sunday, 6 = Saturday)
            const targetWeekday = parseInt(step.config.delayWeekday!);
            const currentWeekday = now.getDay();
            let daysToAdd = targetWeekday - currentWeekday;

            // If same day or past, go to next week
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }

            const targetWeekdayDate = new Date(now);
            targetWeekdayDate.setDate(targetWeekdayDate.getDate() + daysToAdd);

            // Set to 9 AM by default
            targetWeekdayDate.setHours(9, 0, 0, 0);

            scheduledFor = targetWeekdayDate;
            delayMs = targetWeekdayDate.getTime() - now.getTime();

            const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            description = `until next ${weekdays[targetWeekday]}`;
            break;

        default:
            // Fallback to 1 day
            delayMs = 24 * 60 * 60 * 1000;
            scheduledFor = new Date(now.getTime() + delayMs);
            description = "1 day (default)";
    }

    enrollment.currentStepId = nextStepId;
    enrollment.nextExecutionTime = scheduledFor;

    // Update step execution
    const delayExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
    delayExec.status = "completed";
    delayExec.completedAt = new Date();
    delayExec.result = {
        delayType,
        delayMs,
        scheduledFor: scheduledFor.toISOString(),
        description,
    };

    await enrollment.save();

    console.log(
        `⏰ Delay step: Waiting ${description} (scheduled for ${scheduledFor.toLocaleString()})`
    );
}

/**
 * Execute a wait-for-event step (pauses until event occurs)
 */
async function executeWaitEventStep(
    step: any,
    enrollment: IWorkflowEnrollment,
    workflow: any,
    nextStepId: string | undefined
): Promise<void> {
    const { eventType, timeoutDays, timeoutStepId } = step.config;

    if (!eventType) {
        throw new Error("Wait event step requires eventType configuration");
    }

    // Calculate timeout if specified
    let timeoutAt: Date | undefined;
    if (timeoutDays && timeoutDays > 0) {
        timeoutAt = new Date();
        timeoutAt.setDate(timeoutAt.getDate() + timeoutDays);
    }

    // Update enrollment to waiting state
    enrollment.status = "waiting_for_event";
    enrollment.currentStepId = step.id; // Keep current step
    enrollment.nextExecutionTime = timeoutAt; // Will be checked by timeout handler
    enrollment.waitingForEvent = {
        eventType,
        timeoutAt,
        timeoutStepId: timeoutStepId || step.nextStepIds[1], // Timeout path (or stay on current)
    };

    // Update step execution
    const waitExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
    waitExec.status = "waiting";
    waitExec.result = {
        eventType,
        waitingFor: eventType,
        timeoutAt: timeoutAt?.toISOString(),
    };

    await enrollment.save();

    console.log(
        `⏸️ Wait event step: Waiting for '${eventType}'${timeoutAt ? ` (timeout: ${timeoutAt.toLocaleString()})` : " (no timeout)"}`
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
 * Handle step execution errors with exponential backoff retry logic
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

    // Retry logic with exponential backoff - fail after 3 attempts
    const maxRetries = 3;

    if (enrollment.errorCount >= maxRetries) {
        await completeEnrollment(enrollment, "failed");
        console.error(
            `❌ Enrollment failed after ${enrollment.errorCount} attempts: ${error.message}`
        );

        // TODO: Send notification to user about failed enrollment
        // await notifyUserOfFailure(enrollment, error);
    } else {
        // Exponential backoff: 1min (attempt 1), 5min (attempt 2), 15min (attempt 3)
        const retryDelayMinutes = Math.pow(5, enrollment.errorCount);
        const retryDelayMs = retryDelayMinutes * 60 * 1000;

        enrollment.status = "retrying";
        enrollment.nextExecutionTime = new Date(Date.now() + retryDelayMs);
        await enrollment.save();

        console.warn(
            `⚠️ Step failed (attempt ${enrollment.errorCount}/${maxRetries}), retrying in ${retryDelayMinutes} minute${retryDelayMinutes > 1 ? 's' : ''}: ${error.message}`
        );
    }
}

// ============================================
// GOAL CHECKING
// ============================================

/**
 * Check if the enrollment met the workflow's goal criteria
 */
async function checkGoalCriteria(
    enrollment: IWorkflowEnrollment,
    workflow: any
): Promise<boolean> {
    // If no goal criteria defined, return false
    if (!workflow.goalCriteria || !workflow.goalCriteria.conditions || workflow.goalCriteria.conditions.length === 0) {
        return false;
    }

    try {
        // Get the current state of the entity
        const entity = await getEntity(enrollment.entityType, enrollment.entityId);
        if (!entity) {
            console.warn(`Entity not found for goal checking: ${enrollment.entityId}`);
            return false;
        }

        // Evaluate goal conditions
        const { conditions, matchAll } = workflow.goalCriteria;
        const results = await Promise.all(
            conditions.map((condition: any) =>
                evaluateCondition(entity, condition)
            )
        );

        // AND logic: all must be true
        if (matchAll) {
            return results.every((r) => r === true);
        }

        // OR logic: at least one must be true
        return results.some((r) => r === true);
    } catch (error: any) {
        console.error("Goal criteria evaluation failed:", error.message);
        return false;
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
