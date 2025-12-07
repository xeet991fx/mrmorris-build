// ============================================
// WORKFLOW VALIDATION LIBRARY
// ============================================

import { WorkflowStep, Workflow, StepType } from './types';

// Validation error/warning types
export interface ValidationError {
    id: string;
    nodeId?: string;
    type: 'structural' | 'configuration';
    severity: 'error' | 'warning';
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

export function validateWorkflow(workflow: Partial<Workflow>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const steps = workflow.steps || [];

    // 1. Check for exactly one trigger
    const triggers = steps.filter(s => s.type === 'trigger');
    if (triggers.length === 0) {
        errors.push({
            id: 'no-trigger',
            type: 'structural',
            severity: 'error',
            message: 'Workflow must have a trigger node',
        });
    } else if (triggers.length > 1) {
        errors.push({
            id: 'multiple-triggers',
            type: 'structural',
            severity: 'error',
            message: 'Workflow can only have one trigger node',
            nodeId: triggers[1].id,
        });
    }

    // 2. Check trigger configuration
    triggers.forEach(trigger => {
        if (!trigger.config.triggerType) {
            errors.push({
                id: `trigger-no-type-${trigger.id}`,
                nodeId: trigger.id,
                type: 'configuration',
                severity: 'error',
                message: 'Trigger must have a type selected',
            });
        }
    });

    // 3. Check all nodes are connected (no orphans)
    const connectedIds = new Set<string>();

    // Start from trigger and traverse
    const triggerStep = triggers[0];
    if (triggerStep) {
        traverseConnections(triggerStep, steps, connectedIds);
    }

    steps.forEach(step => {
        if (step.type !== 'trigger' && !connectedIds.has(step.id)) {
            errors.push({
                id: `orphan-${step.id}`,
                nodeId: step.id,
                type: 'structural',
                severity: 'error',
                message: `${step.name || step.type} is not connected to the workflow`,
            });
        }
    });

    // 4. Check for circular loops (simplified DFS)
    const hasLoop = detectCycles(steps);
    if (hasLoop) {
        errors.push({
            id: 'circular-loop',
            type: 'structural',
            severity: 'error',
            message: 'Workflow contains circular loops which could cause infinite execution',
        });
    }

    // 5. Check condition nodes have both Yes and No paths
    const conditionSteps = steps.filter(s => s.type === 'condition');
    conditionSteps.forEach(condition => {
        if (!condition.nextStepIds || condition.nextStepIds.length < 2) {
            warnings.push({
                id: `condition-incomplete-${condition.id}`,
                nodeId: condition.id,
                type: 'structural',
                severity: 'warning',
                message: 'Condition should have both Yes and No paths connected',
            });
        }

        // Check condition is configured
        if (!condition.config.conditions?.length) {
            errors.push({
                id: `condition-no-config-${condition.id}`,
                nodeId: condition.id,
                type: 'configuration',
                severity: 'error',
                message: 'Condition must have at least one rule configured',
            });
        }
    });

    // 6. Check action configurations
    const actionSteps = steps.filter(s => s.type === 'action');
    actionSteps.forEach(action => {
        if (!action.config.actionType) {
            errors.push({
                id: `action-no-type-${action.id}`,
                nodeId: action.id,
                type: 'configuration',
                severity: 'error',
                message: 'Action must have a type selected',
            });
        } else {
            // Type-specific validation
            switch (action.config.actionType) {
                case 'send_email':
                    if (!action.config.emailSubject || !action.config.emailBody) {
                        errors.push({
                            id: `email-incomplete-${action.id}`,
                            nodeId: action.id,
                            type: 'configuration',
                            severity: 'error',
                            message: 'Email action must have subject and body',
                        });
                    }
                    break;
                case 'create_task':
                    if (!action.config.taskTitle) {
                        errors.push({
                            id: `task-no-title-${action.id}`,
                            nodeId: action.id,
                            type: 'configuration',
                            severity: 'error',
                            message: 'Create Task action must have a title',
                        });
                    }
                    break;
                case 'update_field':
                    if (!action.config.fieldName) {
                        errors.push({
                            id: `field-no-name-${action.id}`,
                            nodeId: action.id,
                            type: 'configuration',
                            severity: 'error',
                            message: 'Update Field action must specify which field to update',
                        });
                    }
                    break;
                case 'add_tag':
                case 'remove_tag':
                    if (!action.config.tagName) {
                        errors.push({
                            id: `tag-no-name-${action.id}`,
                            nodeId: action.id,
                            type: 'configuration',
                            severity: 'error',
                            message: 'Tag action must specify which tag to add/remove',
                        });
                    }
                    break;
            }
        }
    });

    // 7. Check delay configurations
    const delaySteps = steps.filter(s => s.type === 'delay');
    delaySteps.forEach(delay => {
        if (!delay.config.delayValue || delay.config.delayValue <= 0) {
            errors.push({
                id: `delay-invalid-${delay.id}`,
                nodeId: delay.id,
                type: 'configuration',
                severity: 'error',
                message: 'Delay must have a positive duration',
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function traverseConnections(
    step: WorkflowStep,
    allSteps: WorkflowStep[],
    visited: Set<string>
): void {
    if (visited.has(step.id)) return;
    visited.add(step.id);

    step.nextStepIds?.forEach(nextId => {
        const nextStep = allSteps.find(s => s.id === nextId);
        if (nextStep) {
            traverseConnections(nextStep, allSteps, visited);
        }
    });
}

function detectCycles(steps: WorkflowStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(stepId: string): boolean {
        if (recursionStack.has(stepId)) return true; // Cycle found
        if (visited.has(stepId)) return false;

        visited.add(stepId);
        recursionStack.add(stepId);

        const step = steps.find(s => s.id === stepId);
        if (step?.nextStepIds) {
            for (const nextId of step.nextStepIds) {
                if (dfs(nextId)) return true;
            }
        }

        recursionStack.delete(stepId);
        return false;
    }

    for (const step of steps) {
        if (dfs(step.id)) return true;
    }

    return false;
}

// Export for use in components
export default validateWorkflow;
