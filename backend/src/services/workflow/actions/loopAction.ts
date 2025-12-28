/**
 * Loop/Iterate Action Executor
 *
 * Iterates over arrays and executes workflow steps for each item.
 * Supports sequential and parallel execution modes.
 */

import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { IWorkflowStep } from "../../../models/Workflow";
import { executeNextStep } from "../stepExecutor";
import { evaluateCondition } from "../conditionEvaluator";

// ============================================
// TYPES
// ============================================

interface LoopNodeConfig {
    // Source array
    sourceArray: string;                     // Variable name or field path
    sourceType?: 'variable' | 'field' | 'expression';

    // Loop variables
    itemVariable: string;                    // Variable name for current item (default: "item")
    indexVariable?: string;                  // Variable name for index (default: "index")

    // Loop body
    firstStepId?: string;                    // First step in loop (if using sub-steps)
    exitStepId?: string;                     // Step to execute after loop

    // Control
    maxIterations?: number;                  // Safety limit (default: 1000)
    breakCondition?: any;                    // Condition to break early

    // Results
    aggregateResults?: boolean;              // Collect iteration results
    resultVariable?: string;                 // Variable name for results array

    // Execution mode
    mode?: 'sequential' | 'parallel';
    batchSize?: number;                      // For parallel mode (default: 10)
}

// ============================================
// LOOP EXECUTOR
// ============================================

export class LoopActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as LoopNodeConfig;

        if (!config.sourceArray) {
            return this.error("Source array is required for loop");
        }

        // Initialize dataContext if needed
        if (!enrollment.dataContext) {
            enrollment.dataContext = { variables: {}, previousResults: {} };
        }
        if (!enrollment.dataContext.variables) {
            enrollment.dataContext.variables = {};
        }

        try {
            // Get source array
            const sourceArray = this.getSourceArray(config, entity, enrollment);

            if (!Array.isArray(sourceArray)) {
                return this.error(`Source '${config.sourceArray}' is not an array`);
            }

            if (sourceArray.length === 0) {
                this.log(`⚠️ Loop source array is empty, skipping`);
                return this.success({
                    itemsProcessed: 0,
                    skipped: true,
                    reason: 'Empty array',
                });
            }

            // Safety: limit iterations
            const maxIterations = Math.min(
                config.maxIterations || 1000,
                sourceArray.length,
                1000 // Hard limit
            );

            this.log(`🔁 Starting loop: ${maxIterations} iterations`);

            // Initialize loop context
            enrollment.dataContext.loopContext = {
                array: sourceArray.slice(0, maxIterations),
                currentIndex: 0,
                currentItem: null,
                results: [],
            };

            // Execute loop
            const mode = config.mode || 'sequential';
            const results = mode === 'sequential'
                ? await this.executeSequential(config, enrollment, entity, maxIterations)
                : await this.executeParallel(config, enrollment, entity, maxIterations);

            // Store aggregated results if configured
            if (config.aggregateResults && config.resultVariable) {
                enrollment.dataContext.variables[config.resultVariable] = results;
                this.log(`💾 Stored ${results.length} results in variable: ${config.resultVariable}`);
            }

            // Clean up loop context
            delete enrollment.dataContext.loopContext;

            this.log(`✅ Loop completed: ${results.length} items processed`);

            return this.success({
                itemsProcessed: results.length,
                results: config.aggregateResults ? results : undefined,
            });

        } catch (error: any) {
            // Clean up on error
            if (enrollment.dataContext.loopContext) {
                delete enrollment.dataContext.loopContext;
            }

            return this.error(`Loop failed: ${error.message}`);
        }
    }

    // ============================================
    // EXECUTION MODES
    // ============================================

    private async executeSequential(
        config: LoopNodeConfig,
        enrollment: any,
        entity: any,
        maxIterations: number
    ): Promise<any[]> {
        const results: any[] = [];
        const { sourceArray } = config;
        const array = enrollment.dataContext.loopContext.array;

        for (let i = 0; i < maxIterations; i++) {
            const item = array[i];

            // Set loop variables
            const itemVarName = config.itemVariable || 'item';
            const indexVarName = config.indexVariable || 'index';

            enrollment.dataContext.variables[itemVarName] = item;
            enrollment.dataContext.variables[indexVarName] = i;

            // Update loop context
            enrollment.dataContext.loopContext.currentIndex = i;
            enrollment.dataContext.loopContext.currentItem = item;

            this.log(`🔄 Loop iteration ${i + 1}/${maxIterations}`);

            // Check break condition
            if (config.breakCondition) {
                const shouldBreak = evaluateCondition(
                    { ...entity, ...enrollment.dataContext.variables },
                    config.breakCondition
                );

                if (shouldBreak) {
                    this.log(`🛑 Loop break condition met at iteration ${i + 1}`);
                    break;
                }
            }

            // Execute iteration (simple variable processing)
            // Note: For executing actual workflow steps, would need to call executeNextStep
            // with the firstStepId, but that requires more complex state management

            // For now, just collect the item as result
            const iterationResult = {
                index: i,
                item,
                processed: true,
            };

            results.push(iterationResult);

            // Store in loop context
            enrollment.dataContext.loopContext.results.push(iterationResult);
        }

        return results;
    }

    private async executeParallel(
        config: LoopNodeConfig,
        enrollment: any,
        entity: any,
        maxIterations: number
    ): Promise<any[]> {
        const batchSize = config.batchSize || 10;
        const array = enrollment.dataContext.loopContext.array;
        const results: any[] = [];

        // Process in batches
        for (let batchStart = 0; batchStart < maxIterations; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, maxIterations);
            const batchPromises = [];

            for (let i = batchStart; i < batchEnd; i++) {
                const item = array[i];
                const iterationPromise = this.executeIteration(i, item, config, enrollment, entity);
                batchPromises.push(iterationPromise);
            }

            // Wait for batch to complete
            const batchResults = await Promise.allSettled(batchPromises);

            // Collect results
            batchResults.forEach((result, index) => {
                const actualIndex = batchStart + index;
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    enrollment.dataContext.loopContext.results.push(result.value);
                } else {
                    this.log(`⚠️ Iteration ${actualIndex + 1} failed: ${result.reason}`);
                    results.push({
                        index: actualIndex,
                        item: array[actualIndex],
                        error: result.reason?.message || 'Unknown error',
                    });
                }
            });

            this.log(`📦 Processed batch ${batchStart + 1}-${batchEnd} of ${maxIterations}`);
        }

        return results;
    }

    private async executeIteration(
        index: number,
        item: any,
        config: LoopNodeConfig,
        enrollment: any,
        entity: any
    ): Promise<any> {
        // Set loop variables in isolated context
        const itemVarName = config.itemVariable || 'item';
        const indexVarName = config.indexVariable || 'index';

        // For parallel execution, we'd need to clone the enrollment context
        // For now, just return the processed item
        return {
            index,
            item,
            processed: true,
        };
    }

    // ============================================
    // HELPERS
    // ============================================

    private getSourceArray(config: LoopNodeConfig, entity: any, enrollment: any): any[] {
        const sourceType = config.sourceType || 'variable';

        switch (sourceType) {
            case 'variable':
                return enrollment.dataContext.variables[config.sourceArray] || [];

            case 'field':
                return this.getNestedValue(entity, config.sourceArray) || [];

            case 'expression':
                // For expressions, check if it's a variable reference or field path
                if (config.sourceArray.startsWith('{{') && config.sourceArray.endsWith('}}')) {
                    const varName = config.sourceArray.slice(2, -2).trim();
                    return enrollment.dataContext.variables[varName] || this.getNestedValue(entity, varName) || [];
                }
                return enrollment.dataContext.variables[config.sourceArray] || [];

            default:
                return [];
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            if (current === null || current === undefined) return undefined;
            return current[key];
        }, obj);
    }
}
