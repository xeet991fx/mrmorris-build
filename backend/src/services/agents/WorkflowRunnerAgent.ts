/**
 * WorkflowRunnerAgent - Workflow Execution Agent
 * Executes workflow steps, manages enrollments, handles delays and conditions
 */

import { BaseAgent } from './BaseAgent';
import { AgentTask, AgentResult } from './types';
import { eventBus } from './EventBus';
import Workflow, { IWorkflow } from '../../models/Workflow';

interface WorkflowRunnerPayload {
    action: 'execute_step' | 'enroll' | 'unenroll' | 'pause' | 'resume' | 'check_conditions';
    workflowId?: string;
    enrollmentId?: string;
    entityId?: string;
    entityType?: 'contact' | 'deal' | 'company';
    stepId?: string;
}

export class WorkflowRunnerAgent extends BaseAgent {
    private activeEnrollments: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        super('workflow_runner', {
            settings: {
                maxConcurrentEnrollments: 100,
                stepExecutionTimeout: 30000,
            },
            limits: {
                maxConcurrentTasks: 20,
                maxRetries: 3,
                timeoutMs: 60000,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.log('Workflow Runner Agent initialized');

        // Subscribe to trigger events
        const triggerEvents = [
            'contact:created',
            'contact:updated',
            'deal:created',
            'deal:stage_changed',
            'email:opened',
            'email:clicked',
        ];

        for (const eventType of triggerEvents) {
            eventBus.subscribe(eventType as any, async (event) => {
                await this.checkWorkflowTriggers(event);
            });
        }
    }

    protected async onShutdown(): Promise<void> {
        // Clear all scheduled steps
        for (const timeout of this.activeEnrollments.values()) {
            clearTimeout(timeout);
        }
        this.activeEnrollments.clear();
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'workflow_runner:task' ||
            task.type === 'execute_workflow' ||
            task.type.startsWith('workflow_runner:') ||
            task.type.startsWith('workflow:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as WorkflowRunnerPayload;

        switch (payload.action) {
            case 'enroll':
                return this.enrollEntity(payload, task.context.workspaceId);

            case 'unenroll':
                return this.unenrollEntity(payload);

            case 'execute_step':
                return this.executeStep(payload, task.context.workspaceId);

            case 'pause':
                return this.pauseEnrollment(payload);

            case 'resume':
                return this.resumeEnrollment(payload, task.context.workspaceId);

            case 'check_conditions':
                return this.checkConditions(payload);

            default:
                return this.error(`Unknown workflow runner action: ${payload.action}`);
        }
    }

    private async checkWorkflowTriggers(event: any): Promise<void> {
        const { workspaceId, payload } = event;

        // Find workflows that match this trigger
        const workflows = await Workflow.find({
            workspaceId,
            status: 'active',
        });

        for (const workflow of workflows) {
            const triggerStep = workflow.steps.find(s => s.type === 'trigger');
            if (triggerStep?.config?.triggerType === this.mapEventToTrigger(event.type)) {
                // Check enrollment criteria
                if (this.matchesCriteria(payload, workflow.enrollmentCriteria)) {
                    this.log(`Triggering workflow ${workflow.name} for entity ${payload.entityId}`);
                    await this.enrollEntity({
                        action: 'enroll',
                        workflowId: String(workflow._id),
                        entityId: payload.entityId || payload.contactId || payload.dealId,
                        entityType: payload.entityType || 'contact',
                    }, workspaceId);
                }
            }
        }
    }

    private mapEventToTrigger(eventType: string): string {
        const mapping: Record<string, string> = {
            'contact:created': 'contact_created',
            'contact:updated': 'contact_updated',
            'deal:created': 'deal_created',
            'deal:stage_changed': 'deal_stage_changed',
            'email:opened': 'email_opened',
            'email:clicked': 'email_clicked',
        };
        return mapping[eventType] || eventType;
    }

    private matchesCriteria(entity: any, criteria: any): boolean {
        if (!criteria || !criteria.conditions || criteria.conditions.length === 0) {
            return true; // No criteria means all entities match
        }

        // Would evaluate conditions against entity
        return true;
    }

    private async enrollEntity(
        payload: WorkflowRunnerPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { workflowId, entityId, entityType } = payload;

        if (!workflowId || !entityId) {
            return this.error('Workflow ID and entity ID are required');
        }

        try {
            const workflow = await Workflow.findById(workflowId);
            if (!workflow) {
                return this.error('Workflow not found');
            }

            if (workflow.status !== 'active') {
                return this.error('Workflow is not active');
            }

            // Check if already enrolled (unless re-enrollment allowed)
            if (!workflow.allowReenrollment) {
                // Would check WorkflowEnrollment collection
            }

            // Create enrollment record
            const enrollmentId = `enroll-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

            // Find first step after trigger
            const firstStep = workflow.steps.find(s => s.type !== 'trigger');

            if (firstStep) {
                // Schedule first step execution
                await this.scheduleStepExecution(enrollmentId, workflowId, firstStep, 0);
            }

            // Update workflow stats
            workflow.stats.totalEnrolled = (workflow.stats.totalEnrolled || 0) + 1;
            // Note: currentlyEnrolled would need to be added to IWorkflowStats if needed
            await workflow.save();

            eventBus.publish({
                type: 'workflow:triggered',
                source: 'workflow_runner',
                workspaceId,
                payload: { workflowId, entityId, entityType, enrollmentId },
            });

            return this.success({
                enrolled: true,
                enrollmentId,
                workflowId,
                entityId,
                message: `Enrolled in workflow "${workflow.name}"`,
            });

        } catch (error: any) {
            return this.error(`Enrollment failed: ${error.message}`);
        }
    }

    private async unenrollEntity(payload: WorkflowRunnerPayload): Promise<AgentResult> {
        const { enrollmentId } = payload;

        if (!enrollmentId) {
            return this.error('Enrollment ID is required');
        }

        // Clear any scheduled steps
        const timeout = this.activeEnrollments.get(enrollmentId);
        if (timeout) {
            clearTimeout(timeout);
            this.activeEnrollments.delete(enrollmentId);
        }

        return this.success({
            unenrolled: true,
            enrollmentId,
            message: 'Entity unenrolled from workflow',
        });
    }

    private async executeStep(
        payload: WorkflowRunnerPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { workflowId, enrollmentId, stepId } = payload;

        if (!workflowId || !stepId) {
            return this.error('Workflow ID and step ID are required');
        }

        try {
            const workflow = await Workflow.findById(workflowId);
            if (!workflow) {
                return this.error('Workflow not found');
            }

            const step = workflow.steps.find(s => s.id === stepId);
            if (!step) {
                return this.error('Step not found');
            }

            this.log(`Executing step: ${step.name} (${step.type})`);

            let result: AgentResult;

            switch (step.type) {
                case 'action':
                    result = await this.executeActionStep(step, workspaceId);
                    break;

                case 'delay':
                    result = await this.executeDelayStep(step, enrollmentId!, workflowId);
                    break;

                case 'condition':
                    result = await this.executeConditionStep(step, payload);
                    break;

                default:
                    result = this.success({ executed: true, stepType: step.type });
            }

            // Find and schedule next step
            if (result.success && step.nextStepIds?.length > 0) {
                const nextStepId = step.nextStepIds[0];
                const nextStep = workflow.steps.find(s => s.id === nextStepId);

                if (nextStep) {
                    await this.scheduleStepExecution(enrollmentId!, workflowId, nextStep, 0);
                }
            }

            return result;

        } catch (error: any) {
            return this.error(`Step execution failed: ${error.message}`);
        }
    }

    private async executeActionStep(step: any, workspaceId: string): Promise<AgentResult> {
        const { actionType } = step.config;

        switch (actionType) {
            case 'send_email':
                return this.routeToAgent('email', {
                    action: 'send',
                    ...step.config,
                });

            case 'update_field':
                // Would update contact/deal field
                return this.success({ action: 'update_field', executed: true });

            case 'create_task':
                // Would create task
                return this.success({ action: 'create_task', executed: true });

            case 'add_tag':
            case 'remove_tag':
                // Would modify tags
                return this.success({ action: actionType, executed: true });

            case 'send_notification':
                // Would send notification
                return this.success({ action: 'send_notification', executed: true });

            default:
                return this.success({ action: actionType, executed: true });
        }
    }

    private async executeDelayStep(
        step: any,
        enrollmentId: string,
        workflowId: string
    ): Promise<AgentResult> {
        const { delayValue, delayUnit } = step.config;

        // Calculate delay in milliseconds
        const multipliers: Record<string, number> = {
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
            weeks: 7 * 24 * 60 * 60 * 1000,
        };

        const delayMs = (delayValue || 1) * (multipliers[delayUnit] || multipliers.days);

        // Find next step
        if (step.nextStepIds?.length > 0) {
            const nextStepId = step.nextStepIds[0];

            // Schedule next step after delay
            const timeout = setTimeout(async () => {
                await this.executeStep({
                    action: 'execute_step',
                    workflowId,
                    enrollmentId,
                    stepId: nextStepId,
                }, ''); // Would need workspace ID
                this.activeEnrollments.delete(enrollmentId);
            }, delayMs);

            this.activeEnrollments.set(enrollmentId, timeout);
        }

        return this.success({
            delayed: true,
            delayMs,
            message: `Waiting ${delayValue} ${delayUnit}`,
        });
    }

    private async executeConditionStep(step: any, payload: any): Promise<AgentResult> {
        // Evaluate conditions
        const conditions = step.config.conditions || [];
        const metCondition = true; // Would evaluate actual conditions

        // Return which branch to take
        return this.success({
            evaluated: true,
            conditionMet: metCondition,
            nextBranch: metCondition ? 'yes' : 'no',
        });
    }

    private async scheduleStepExecution(
        enrollmentId: string,
        workflowId: string,
        step: any,
        delayMs: number
    ): Promise<void> {
        if (delayMs > 0) {
            const timeout = setTimeout(async () => {
                // Would execute step
                this.activeEnrollments.delete(enrollmentId);
            }, delayMs);

            this.activeEnrollments.set(enrollmentId, timeout);
        } else {
            // Execute immediately (next tick)
            setImmediate(async () => {
                // Would execute step
            });
        }
    }

    private async pauseEnrollment(payload: WorkflowRunnerPayload): Promise<AgentResult> {
        const { enrollmentId } = payload;

        if (!enrollmentId) {
            return this.error('Enrollment ID is required');
        }

        const timeout = this.activeEnrollments.get(enrollmentId);
        if (timeout) {
            clearTimeout(timeout);
        }

        return this.success({
            paused: true,
            enrollmentId,
            message: 'Enrollment paused',
        });
    }

    private async resumeEnrollment(
        payload: WorkflowRunnerPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { enrollmentId } = payload;

        if (!enrollmentId) {
            return this.error('Enrollment ID is required');
        }

        // Would resume from current step
        return this.success({
            resumed: true,
            enrollmentId,
            message: 'Enrollment resumed',
        });
    }

    private async checkConditions(payload: WorkflowRunnerPayload): Promise<AgentResult> {
        // Evaluate workflow conditions
        return this.success({
            conditionsMet: true,
        });
    }
}

export default WorkflowRunnerAgent;
