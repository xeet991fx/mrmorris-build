/**
 * Try/Catch Error Handler
 *
 * Provides error handling and retry logic for workflow steps.
 * Supports try/catch/finally patterns with configurable retries.
 */

import { Types } from "mongoose";
import { IWorkflowStep } from "../../models/Workflow";
import { IWorkflowEnrollment } from "../../models/WorkflowEnrollment";
import { executeNextStep } from "./stepExecutor";

// ============================================
// TYPES
// ============================================

interface TryCatchConfig {
    // Try block steps (execute sequentially)
    trySteps?: string[];

    // Error handling
    catchStep?: string;                  // Step to execute on error
    finallyStep?: string;                // Always execute after try/catch

    // Error context
    errorVariable?: string;              // Variable name to store error info

    // Retry configuration
    retryOnError?: boolean;
    maxRetries?: number;                 // Default: 3
    retryDelay?: number;                 // Base delay in ms (default: 1000)
    exponentialBackoff?: boolean;        // Use exponential backoff (default: true)
}

interface ErrorContext {
    stepId: string;
    stepName: string;
    error: string;
    timestamp: string;
    attemptNumber: number;
    stackTrace?: string;
}

// ============================================
// TRY/CATCH EXECUTOR
// ============================================

/**
 * Execute a try/catch workflow step
 */
export async function executeTryCatch(
    step: IWorkflowStep,
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string
): Promise<{ success: boolean; nextStepId?: string; error?: string }> {
    const config = step.config as unknown as TryCatchConfig;

    // Initialize dataContext if needed
    if (!enrollment.dataContext) {
        enrollment.dataContext = { variables: {}, previousResults: {} };
    }

    try {
        // Execute try block
        if (config.trySteps && config.trySteps.length > 0) {
            await executeTryBlock(config.trySteps, enrollment, workflow, workspaceId, config);
        }

        // Execute finally block if configured
        if (config.finallyStep) {
            await executeFinallyBlock(config.finallyStep, enrollment, workflow, workspaceId);
        }

        // Success - move to next step after try/catch
        const nextStepId = step.branches?.success || step.nextStepIds[0];
        return { success: true, nextStepId };

    } catch (error: any) {
        console.error(`❌ Try/Catch error:`, error.message);

        // Store error context
        if (config.errorVariable) {
            const errorContext: ErrorContext = {
                stepId: step.id,
                stepName: step.name,
                error: error.message,
                timestamp: new Date().toISOString(),
                attemptNumber: enrollment.errorCount + 1,
                stackTrace: error.stack,
            };

            if (!enrollment.dataContext.variables) {
                enrollment.dataContext.variables = {};
            }
            enrollment.dataContext.variables[config.errorVariable] = errorContext;
        }

        // Execute catch block if configured
        if (config.catchStep) {
            try {
                await executeCatchBlock(config.catchStep, enrollment, workflow, workspaceId);
            } catch (catchError: any) {
                console.error(`❌ Catch block failed:`, catchError.message);
            }
        }

        // Execute finally block
        if (config.finallyStep) {
            try {
                await executeFinallyBlock(config.finallyStep, enrollment, workflow, workspaceId);
            } catch (finallyError: any) {
                console.error(`❌ Finally block failed:`, finallyError.message);
            }
        }

        // Route to error step if configured
        const errorStepId = step.branches?.error;
        if (errorStepId) {
            return { success: true, nextStepId: errorStepId };
        }

        // No error handler - fail the enrollment
        return { success: false, error: error.message };
    }
}

// ============================================
// BLOCK EXECUTORS
// ============================================

/**
 * Execute try block with retry logic
 */
async function executeTryBlock(
    trySteps: string[],
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string,
    config: TryCatchConfig
): Promise<void> {
    const maxRetries = config.retryOnError ? (config.maxRetries || 3) : 0;
    const baseDelay = config.retryDelay || 1000;
    const useExponentialBackoff = config.exponentialBackoff !== false;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                // Calculate delay with exponential backoff
                const delay = useExponentialBackoff
                    ? baseDelay * Math.pow(2, attempt - 1)
                    : baseDelay;

                console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
                await sleep(delay);
            }

            // Execute each step in the try block sequentially
            for (const stepId of trySteps) {
                const stepToExecute = workflow.steps.find((s: IWorkflowStep) => s.id === stepId);
                if (!stepToExecute) {
                    throw new Error(`Step ${stepId} not found in workflow`);
                }

                // Update current step
                enrollment.currentStepId = stepId;

                // Execute the step
                await executeNextStep(enrollment, 0);
            }

            // Success - no more retries needed
            return;

        } catch (error: any) {
            lastError = error;

            if (attempt >= maxRetries) {
                // Last attempt failed
                throw lastError;
            }

            console.log(`⚠️ Try block failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
        }
    }

    // Should not reach here, but throw last error just in case
    throw lastError || new Error('Try block failed');
}

/**
 * Execute catch block
 */
async function executeCatchBlock(
    catchStepId: string,
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string
): Promise<void> {
    console.log(`🔧 Executing catch block: ${catchStepId}`);

    const catchStep = workflow.steps.find((s: IWorkflowStep) => s.id === catchStepId);
    if (!catchStep) {
        throw new Error(`Catch step ${catchStepId} not found`);
    }

    enrollment.currentStepId = catchStepId;
    await executeNextStep(enrollment, 0);
}

/**
 * Execute finally block
 */
async function executeFinallyBlock(
    finallyStepId: string,
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string
): Promise<void> {
    console.log(`🔚 Executing finally block: ${finallyStepId}`);

    const finallyStep = workflow.steps.find((s: IWorkflowStep) => s.id === finallyStepId);
    if (!finallyStep) {
        console.warn(`Finally step ${finallyStepId} not found`);
        return;
    }

    enrollment.currentStepId = finallyStepId;

    try {
        await executeNextStep(enrollment, 0);
    } catch (error: any) {
        console.error(`Finally block error (non-fatal): ${error.message}`);
        // Finally block errors don't fail the workflow
    }
}

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a default error context
 */
export function createErrorContext(
    stepId: string,
    stepName: string,
    error: Error,
    attemptNumber: number = 1
): ErrorContext {
    return {
        stepId,
        stepName,
        error: error.message,
        timestamp: new Date().toISOString(),
        attemptNumber,
        stackTrace: error.stack,
    };
}
