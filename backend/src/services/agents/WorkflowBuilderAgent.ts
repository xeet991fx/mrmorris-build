/**
 * WorkflowBuilderAgent - Workflow Creation Agent
 * Creates CRM workflows from execution plans
 */

import { BaseAgent } from './BaseAgent';
import {
    AgentTask,
    AgentResult,
    ExecutionPlan,
    ParsedIntent
} from './types';
import Workflow, { TriggerType, ActionType } from '../../models/Workflow';
import { memoryStore } from './MemoryStore';

interface WorkflowBuilderPayload {
    plan: ExecutionPlan;
    intent: ParsedIntent;
}

// Map intent entities to workflow triggers
const TRIGGER_MAPPING: Record<string, TriggerType> = {
    'contact_created': 'contact_created',
    'contact_updated': 'contact_updated',
    'deal_created': 'deal_created',
    'deal_stage_changed': 'deal_stage_changed',
    'email_opened': 'email_opened',
    'email_clicked': 'email_clicked',
    'form_submitted': 'form_submitted',
    'page_visit': 'form_submitted',
    'manual': 'manual',
};

// Map plan actions to workflow actions
const ACTION_MAPPING: Record<string, ActionType> = {
    'send_email': 'send_email',
    'update_field': 'update_field',
    'create_task': 'create_task',
    'add_tag': 'add_tag',
    'remove_tag': 'remove_tag',
    'move_deal': 'update_field',
    'send_notification': 'send_notification',
    'enrich_contact': 'update_field',
};

export class WorkflowBuilderAgent extends BaseAgent {
    constructor() {
        super('workflow_builder', {
            settings: {
                requireConfirmation: true,
                maxWorkflowSteps: 20,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.log('Workflow Builder Agent initialized');
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'workflow_builder:task' ||
            task.type === 'build_workflow' ||
            task.type.startsWith('workflow_builder:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as WorkflowBuilderPayload;

        if (!payload.plan) {
            return this.error('Execution plan is required');
        }

        try {
            // Build workflow from plan
            const workflowData = this.buildWorkflowFromPlan(
                payload.plan,
                task.context.workspaceId
            );

            // Validate workflow
            const validation = this.validateWorkflow(workflowData);
            if (!validation.valid) {
                return this.error(`Workflow validation failed: ${validation.errors.join(', ')}`);
            }

            // If confirmation required, return draft for approval
            if (this.config.settings.requireConfirmation) {
                return this.requiresConfirmation(
                    this.formatWorkflowPreview(workflowData),
                    {
                        workflowData,
                        plan: payload.plan,
                        preview: this.formatWorkflowPreview(workflowData),
                    }
                );
            }

            // Create workflow in database
            const workflow = await this.createWorkflow(workflowData, task.context);

            // Update plan status
            memoryStore.updatePlanStatus(task.context.workspaceId, payload.plan.id, 'completed');

            return this.success({
                workflow,
                message: `✅ Workflow "${workflow.name}" created successfully!`,
                workflowId: workflow._id,
            });

        } catch (error: any) {
            this.log('Workflow creation error:', error.message);
            return this.error(`Failed to create workflow: ${error.message}`);
        }
    }

    private buildWorkflowFromPlan(plan: ExecutionPlan, workspaceId: string): any {
        // Extract workflow steps from plan
        const workflowSteps: any[] = [];
        let hasTrigger = false;
        let triggerType: TriggerType = 'manual';

        for (const step of plan.steps) {
            if (step.action === 'create_workflow' || step.action === 'build_workflow') {
                // This is a meta step, extract config
                if (step.params?.trigger) {
                    triggerType = TRIGGER_MAPPING[step.params.trigger] || 'manual';
                }
                continue;
            }

            // Check if this is a trigger definition
            if (step.action.includes('trigger') || TRIGGER_MAPPING[step.action]) {
                hasTrigger = true;
                triggerType = TRIGGER_MAPPING[step.action] || triggerType;

                workflowSteps.push({
                    id: step.id,
                    type: 'trigger',
                    name: step.description || `Trigger: ${step.action}`,
                    config: {
                        triggerType,
                        ...step.params,
                    },
                    position: { x: 100, y: (workflowSteps.length + 1) * 120 },
                    nextStepIds: [],
                });
                continue;
            }

            // Handle delay steps
            if (step.action === 'wait' || step.action === 'delay') {
                workflowSteps.push({
                    id: step.id,
                    type: 'delay',
                    name: step.description || 'Wait',
                    config: {
                        delayType: step.params?.type || 'fixed',
                        delayValue: step.params?.value || 1,
                        delayUnit: step.params?.unit || 'days',
                    },
                    position: { x: 100, y: (workflowSteps.length + 1) * 120 },
                    nextStepIds: [],
                });
                continue;
            }

            // Handle condition steps
            if (step.action === 'condition' || step.action === 'if') {
                workflowSteps.push({
                    id: step.id,
                    type: 'condition',
                    name: step.description || 'Condition',
                    config: {
                        conditions: step.params?.conditions || [],
                    },
                    position: { x: 100, y: (workflowSteps.length + 1) * 120 },
                    nextStepIds: [],
                });
                continue;
            }

            // Handle action steps
            const actionType = ACTION_MAPPING[step.action] || 'send_email';
            workflowSteps.push({
                id: step.id,
                type: 'action',
                name: step.description || step.action,
                config: {
                    actionType,
                    ...step.params,
                },
                position: { x: 100, y: (workflowSteps.length + 1) * 120 },
                nextStepIds: [],
            });
        }

        // Add default trigger if none found
        if (!hasTrigger) {
            workflowSteps.unshift({
                id: 'trigger-1',
                type: 'trigger',
                name: 'Workflow Trigger',
                config: { triggerType },
                position: { x: 100, y: 0 },
                nextStepIds: [],
            });
        }

        // Link steps together
        for (let i = 0; i < workflowSteps.length - 1; i++) {
            workflowSteps[i].nextStepIds = [workflowSteps[i + 1].id];
        }

        return {
            name: this.generateWorkflowName(plan.goal),
            description: plan.goal,
            workspaceId,
            status: 'draft',
            triggerEntityType: 'contact',
            steps: workflowSteps,
            allowReenrollment: false,
        };
    }

    private generateWorkflowName(goal: string): string {
        // Generate a concise name from the goal
        const words = goal.split(' ').slice(0, 5);
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    private validateWorkflow(workflowData: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!workflowData.name) {
            errors.push('Workflow name is required');
        }

        if (!workflowData.steps || workflowData.steps.length === 0) {
            errors.push('Workflow must have at least one step');
        }

        if (workflowData.steps.length > this.config.settings.maxWorkflowSteps) {
            errors.push(`Workflow exceeds maximum steps (${this.config.settings.maxWorkflowSteps})`);
        }

        // Check for trigger
        const hasTrigger = workflowData.steps.some((s: any) => s.type === 'trigger');
        if (!hasTrigger) {
            errors.push('Workflow must have a trigger');
        }

        // Check for circular dependencies
        const visited = new Set<string>();
        const checkCircular = (stepId: string, path: Set<string>): boolean => {
            if (path.has(stepId)) return true;
            if (visited.has(stepId)) return false;

            visited.add(stepId);
            path.add(stepId);

            const step = workflowData.steps.find((s: any) => s.id === stepId);
            if (step?.nextStepIds) {
                for (const nextId of step.nextStepIds) {
                    if (checkCircular(nextId, new Set(path))) {
                        errors.push('Workflow has circular dependency');
                        return true;
                    }
                }
            }

            return false;
        };

        for (const step of workflowData.steps) {
            if (checkCircular(step.id, new Set())) break;
        }

        return { valid: errors.length === 0, errors };
    }

    private formatWorkflowPreview(workflowData: any): string {
        let preview = `🔧 **Workflow Preview**\n\n`;
        preview += `**Name:** ${workflowData.name}\n`;
        preview += `**Description:** ${workflowData.description}\n\n`;
        preview += `**Steps:**\n`;

        for (const step of workflowData.steps) {
            const icon = step.type === 'trigger' ? '⚡' :
                step.type === 'delay' ? '⏱️' :
                    step.type === 'condition' ? '🔀' : '▶️';
            preview += `${icon} ${step.name}\n`;
        }

        preview += `\n*Do you want me to create this workflow?*`;
        return preview;
    }

    private async createWorkflow(workflowData: any, context: any): Promise<any> {
        const workflow = new Workflow({
            ...workflowData,
            userId: context.userId,
            workspaceId: context.workspaceId,
        });

        await workflow.save();
        this.log(`Created workflow: ${workflow.name} (${workflow._id})`);

        return workflow;
    }

    /**
     * Activate a workflow after user confirmation
     */
    async activateWorkflow(workflowId: string): Promise<AgentResult> {
        try {
            const workflow = await Workflow.findById(workflowId);
            if (!workflow) {
                return this.error('Workflow not found');
            }

            workflow.status = 'active';
            workflow.lastActivatedAt = new Date();
            await workflow.save();

            return this.success({
                workflow,
                message: `✅ Workflow "${workflow.name}" is now active!`,
            });
        } catch (error: any) {
            return this.error(`Failed to activate workflow: ${error.message}`);
        }
    }
}

export default WorkflowBuilderAgent;
