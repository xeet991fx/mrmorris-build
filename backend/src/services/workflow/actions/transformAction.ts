/**
 * Data Transformation Action Executors
 *
 * Provides Set, Map, and Filter operations for data transformation in workflows.
 * - Set: Set variables from expressions
 * - Map: Transform object structures
 * - Filter: Filter arrays based on conditions
 */

import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { evaluateExpression, replacePlaceholders } from "../expressionEvaluator";
import { evaluateCondition } from "../conditionEvaluator";
import { IWorkflowCondition } from "../../../models/Workflow";

// ============================================
// SET NODE - Set Variables
// ============================================

interface SetNodeConfig {
    actionType: 'transform_set';
    operations: Array<{
        variable: string;                    // Variable name
        value: string;                       // Expression or static value
        type?: 'string' | 'number' | 'boolean' | 'expression';
    }>;
}

export class SetNodeExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as SetNodeConfig;

        if (!config.operations || config.operations.length === 0) {
            return this.error("No operations defined for Set node");
        }

        // Initialize dataContext if needed
        if (!enrollment.dataContext) {
            enrollment.dataContext = { variables: {}, previousResults: {} };
        }
        if (!enrollment.dataContext.variables) {
            enrollment.dataContext.variables = {};
        }

        // Build context for expressions with enhanced data flow support
        const expressionContext = {
            ...entity,
            ...enrollment.dataContext.variables,
            // Enhanced context for step references ({{steps.stepId.field}})
            _variables: enrollment.dataContext.variables || {},
            _previousResults: enrollment.dataContext.previousResults || {},
            // Also expose directly for backward compatibility
            variables: enrollment.dataContext.variables || {},
            previousResults: enrollment.dataContext.previousResults || {},
        };

        try {
            const results: Record<string, any> = {};

            for (const operation of config.operations) {
                const { variable, value, type = 'expression' } = operation;

                let finalValue: any;

                switch (type) {
                    case 'expression':
                        // Evaluate as expression (supports {{placeholders}} and filters)
                        finalValue = replacePlaceholders(value, expressionContext);
                        break;

                    case 'number':
                        finalValue = Number(value) || 0;
                        break;

                    case 'boolean':
                        finalValue = value === 'true' || value === '1';
                        break;

                    case 'string':
                    default:
                        finalValue = value;
                        break;
                }

                // Set the variable
                enrollment.dataContext.variables[variable] = finalValue;
                results[variable] = finalValue;

                this.log(`✏️ Set variable ${variable} = ${JSON.stringify(finalValue)}`);
            }

            return this.success({
                variablesSet: Object.keys(results).length,
                values: results,
            });

        } catch (error: any) {
            return this.error(`Set node failed: ${error.message}`);
        }
    }
}

// ============================================
// MAP NODE - Transform Object Structures
// ============================================

interface MapNodeConfig {
    actionType: 'transform_map';
    sourceVariable?: string;                 // Source variable name (or use entity if not specified)
    mappings: Array<{
        from: string;                        // Source path (e.g., "data.user.email")
        to: string;                          // Target path (e.g., "contact.email")
        transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';
    }>;
    outputVariable: string;                  // Where to store result
}

export class MapNodeExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as MapNodeConfig;

        if (!config.mappings || config.mappings.length === 0) {
            return this.error("No mappings defined for Map node");
        }

        if (!config.outputVariable) {
            return this.error("Output variable is required for Map node");
        }

        // Initialize dataContext if needed
        if (!enrollment.dataContext) {
            enrollment.dataContext = { variables: {}, previousResults: {} };
        }
        if (!enrollment.dataContext.variables) {
            enrollment.dataContext.variables = {};
        }

        try {
            // Get source data
            let sourceData: any;
            if (config.sourceVariable) {
                sourceData = enrollment.dataContext.variables[config.sourceVariable];
                if (!sourceData) {
                    return this.error(`Source variable '${config.sourceVariable}' not found`);
                }
            } else {
                sourceData = entity;
            }

            // Apply mappings
            const result: any = {};

            for (const mapping of config.mappings) {
                const { from, to, transform = 'none' } = mapping;

                // Get value from source
                let value = this.getNestedValue(sourceData, from);

                // Apply transformation
                if (value !== undefined && value !== null) {
                    switch (transform) {
                        case 'uppercase':
                            value = String(value).toUpperCase();
                            break;
                        case 'lowercase':
                            value = String(value).toLowerCase();
                            break;
                        case 'trim':
                            value = String(value).trim();
                            break;
                    }
                }

                // Set value in result
                this.setNestedValue(result, to, value);

                this.log(`🔄 Mapped ${from} → ${to} (${transform})`);
            }

            // Store result
            enrollment.dataContext.variables[config.outputVariable] = result;

            return this.success({
                mappingsApplied: config.mappings.length,
                outputVariable: config.outputVariable,
                result,
            });

        } catch (error: any) {
            return this.error(`Map node failed: ${error.message}`);
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            if (current === null || current === undefined) return undefined;

            // Handle array notation: data[0]
            const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, arrayKey, index] = arrayMatch;
                return current[arrayKey]?.[parseInt(index)];
            }

            return current[key];
        }, obj);
    }

    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
}

// ============================================
// FILTER NODE - Filter Arrays
// ============================================

interface FilterNodeConfig {
    actionType: 'transform_filter';
    sourceArray: string;                     // Variable name containing array
    conditions: IWorkflowCondition[];        // Filter conditions
    matchAll?: boolean;                      // AND vs OR (default: true = AND)
    outputVariable: string;                  // Where to store filtered array
}

export class FilterNodeExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as FilterNodeConfig;

        if (!config.sourceArray) {
            return this.error("Source array variable is required for Filter node");
        }

        if (!config.conditions || config.conditions.length === 0) {
            return this.error("No filter conditions defined");
        }

        if (!config.outputVariable) {
            return this.error("Output variable is required for Filter node");
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
            const sourceArray = enrollment.dataContext.variables[config.sourceArray];

            if (!Array.isArray(sourceArray)) {
                return this.error(`Source variable '${config.sourceArray}' is not an array`);
            }

            const matchAll = config.matchAll !== false; // Default to AND logic

            // Filter array
            const filtered = sourceArray.filter(item => {
                // Check each condition
                const conditionResults = config.conditions.map(condition => {
                    return evaluateCondition(item, condition);
                });

                // Apply AND or OR logic
                if (matchAll) {
                    return conditionResults.every(result => result);
                } else {
                    return conditionResults.some(result => result);
                }
            });

            // Store result
            enrollment.dataContext.variables[config.outputVariable] = filtered;

            this.log(
                `🔍 Filtered ${sourceArray.length} items → ${filtered.length} items (${matchAll ? 'AND' : 'OR'} logic)`
            );

            return this.success({
                originalCount: sourceArray.length,
                filteredCount: filtered.length,
                outputVariable: config.outputVariable,
            });

        } catch (error: any) {
            return this.error(`Filter node failed: ${error.message}`);
        }
    }
}
