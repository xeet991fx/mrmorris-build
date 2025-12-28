/**
 * Parallel Execution Handler
 *
 * Executes multiple workflow branches in parallel and merges results.
 * Supports: wait for all, race mode, timeout handling.
 */

import { Types } from "mongoose";
import { IWorkflowStep } from "../../models/Workflow";
import { IWorkflowEnrollment } from "../../models/WorkflowEnrollment";
import { executeNextStep } from "./stepExecutor";

// ============================================
// TYPES
// ============================================

interface ParallelConfig {
    branches: Array<{
        id: string;
        name: string;
        firstStepId: string;             // Starting step of this branch
    }>;

    waitForAll?: boolean;                // Wait for all branches (default: true)
    timeout?: number;                    // Max wait time in ms
    onTimeout?: 'continue' | 'fail';     // What to do on timeout (default: continue)
    mergeStepId?: string;                // Step to execute after branches complete
}

interface MergeConfig {
    aggregateResults?: boolean;          // Combine results from all branches
    resultVariable?: string;             // Variable name to store aggregated results
}

interface BranchResult {
    branchId: string;
    branchName: string;
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
}

// ============================================
// PARALLEL EXECUTOR
// ============================================

/**
 * Execute parallel branches
 */
export async function executeParallel(
    step: IWorkflowStep,
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string
): Promise<{ success: boolean; nextStepId?: string; error?: string }> {
    const config = step.config as unknown as ParallelConfig;

    if (!config.branches || config.branches.length === 0) {
        return { success: false, error: "No branches defined for parallel execution" };
    }

    const waitForAll = config.waitForAll !== false; // Default to true
    const timeout = config.timeout || 60000; // Default 60 seconds
    const onTimeout = config.onTimeout || 'continue';

    console.log(`🔀 Starting parallel execution of ${config.branches.length} branches`);

    // Initialize dataContext if needed
    if (!enrollment.dataContext) {
        enrollment.dataContext = { variables: {}, previousResults: {} };
    }

    try {
        // Execute branches
        const branchResults = await executeBranches(
            config.branches,
            enrollment,
            workflow,
            workspaceId,
            waitForAll,
            timeout
        );

        // Check for failures
        const failedBranches = branchResults.filter(r => !r.success);
        if (failedBranches.length > 0 && waitForAll) {
            console.warn(`⚠️ ${failedBranches.length}/${branchResults.length} branches failed`);

            // Store failed branch info
            if (!enrollment.dataContext.variables) {
                enrollment.dataContext.variables = {};
            }
            enrollment.dataContext.variables['_parallelFailures'] = failedBranches;
        }

        // Store all results
        if (!enrollment.dataContext.previousResults) {
            enrollment.dataContext.previousResults = {};
        }
        enrollment.dataContext.previousResults[step.id] = branchResults;

        console.log(`✅ Parallel execution completed (${branchResults.filter(r => r.success).length}/${branchResults.length} successful)`);

        // Move to merge step or next step
        const nextStepId = config.mergeStepId || step.nextStepIds[0];
        return { success: true, nextStepId };

    } catch (error: any) {
        if (error.message.includes('timeout')) {
            console.warn(`⏱️ Parallel execution timeout after ${timeout}ms`);

            if (onTimeout === 'fail') {
                return { success: false, error: error.message };
            }

            // Continue with timeout
            const nextStepId = config.mergeStepId || step.nextStepIds[0];
            return { success: true, nextStepId };
        }

        return { success: false, error: error.message };
    }
}

/**
 * Execute merge step
 */
export async function executeMerge(
    step: IWorkflowStep,
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string
): Promise<{ success: boolean; nextStepId?: string; error?: string }> {
    const config = step.config as unknown as MergeConfig;

    console.log(`🔗 Executing merge step`);

    // Initialize dataContext if needed
    if (!enrollment.dataContext) {
        enrollment.dataContext = { variables: {}, previousResults: {} };
    }

    // Aggregate results if configured
    if (config.aggregateResults && config.resultVariable) {
        // Find parallel step results
        const parallelResults = Object.values(enrollment.dataContext.previousResults || {})
            .filter((result: any) => Array.isArray(result) && result[0]?.branchId)
            .flat();

        // Extract data from successful branches
        const aggregatedData = parallelResults
            .filter((r: any) => r.success && r.data)
            .map((r: any) => r.data);

        // Store aggregated results
        if (!enrollment.dataContext.variables) {
            enrollment.dataContext.variables = {};
        }
        enrollment.dataContext.variables[config.resultVariable] = aggregatedData;

        console.log(`📊 Aggregated ${aggregatedData.length} branch results into variable: ${config.resultVariable}`);
    }

    // Continue to next step
    const nextStepId = step.nextStepIds[0];
    return { success: true, nextStepId };
}

// ============================================
// BRANCH EXECUTION
// ============================================

/**
 * Execute all branches
 */
async function executeBranches(
    branches: ParallelConfig['branches'],
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string,
    waitForAll: boolean,
    timeout: number
): Promise<BranchResult[]> {
    // Create promises for each branch
    const branchPromises = branches.map(branch =>
        executeBranch(branch, enrollment, workflow, workspaceId)
    );

    if (waitForAll) {
        // Wait for all branches with timeout
        const timeoutPromise = createTimeoutPromise(timeout);
        const resultsPromise = Promise.allSettled(branchPromises);

        const winner = await Promise.race([resultsPromise, timeoutPromise]);

        if (winner === 'timeout') {
            throw new Error(`Parallel execution timeout after ${timeout}ms`);
        }

        // Process results
        const results = winner as PromiseSettledResult<BranchResult>[];
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    branchId: branches[index].id,
                    branchName: branches[index].name,
                    success: false,
                    error: result.reason?.message || 'Unknown error',
                    duration: 0,
                };
            }
        });

    } else {
        // Race mode - return first completed branch
        const firstResult = await Promise.race(branchPromises);
        return [firstResult];
    }
}

/**
 * Execute a single branch
 */
async function executeBranch(
    branch: ParallelConfig['branches'][0],
    enrollment: IWorkflowEnrollment,
    workflow: any,
    workspaceId: Types.ObjectId | string
): Promise<BranchResult> {
    const startTime = Date.now();

    console.log(`🌿 Executing branch: ${branch.name}`);

    try {
        // Clone enrollment for isolated execution
        const branchEnrollment = cloneEnrollment(enrollment);
        branchEnrollment.currentStepId = branch.firstStepId;

        // Execute the first step of the branch
        const result = await executeNextStep(branchEnrollment, workflow, workspaceId);

        const duration = Date.now() - startTime;

        if (result.success) {
            console.log(`✅ Branch ${branch.name} completed in ${duration}ms`);

            return {
                branchId: branch.id,
                branchName: branch.name,
                success: true,
                data: result.data,
                duration,
            };
        } else {
            console.error(`❌ Branch ${branch.name} failed: ${result.error}`);

            return {
                branchId: branch.id,
                branchName: branch.name,
                success: false,
                error: result.error,
                duration,
            };
        }

    } catch (error: any) {
        const duration = Date.now() - startTime;

        console.error(`❌ Branch ${branch.name} error:`, error.message);

        return {
            branchId: branch.id,
            branchName: branch.name,
            success: false,
            error: error.message,
            duration,
        };
    }
}

// ============================================
// HELPERS
// ============================================

/**
 * Clone enrollment for isolated branch execution
 */
function cloneEnrollment(enrollment: IWorkflowEnrollment): IWorkflowEnrollment {
    // Create a shallow clone with deep-cloned dataContext
    const cloned = { ...enrollment } as any;

    if (enrollment.dataContext) {
        cloned.dataContext = {
            variables: { ...enrollment.dataContext.variables },
            previousResults: { ...enrollment.dataContext.previousResults },
            loopContext: enrollment.dataContext.loopContext
                ? { ...enrollment.dataContext.loopContext }
                : undefined,
        };
    }

    return cloned as IWorkflowEnrollment;
}

/**
 * Create a timeout promise
 */
function createTimeoutPromise(ms: number): Promise<'timeout'> {
    return new Promise(resolve => {
        setTimeout(() => resolve('timeout'), ms);
    });
}

/**
 * Get parallel step configuration
 */
export function isParallelStep(step: IWorkflowStep): boolean {
    return step.type === 'parallel';
}

/**
 * Get merge step configuration
 */
export function isMergeStep(step: IWorkflowStep): boolean {
    return step.type === 'merge';
}
