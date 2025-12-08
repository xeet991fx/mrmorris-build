/**
 * PipelineAgent - Sales Pipeline Management Agent
 * Manages deals, stages, and pipeline automations
 */

import { BaseAgent } from './BaseAgent';
import { AgentTask, AgentResult } from './types';
import { eventBus } from './EventBus';

interface PipelineTaskPayload {
    action: 'create_pipeline' | 'create_deal' | 'move_deal' | 'update_deal' | 'get_metrics';
    pipelineId?: string;
    dealId?: string;
    stageId?: string;
    name?: string;
    stages?: Array<{ name: string; color: string }>;
    dealData?: {
        title: string;
        value?: number;
        contactId?: string;
        companyId?: string;
    };
}

export class PipelineAgent extends BaseAgent {
    constructor() {
        super('pipeline', {
            settings: {
                autoAssign: true,
                notifyOnStageChange: true,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.log('Pipeline Agent initialized');

        // Subscribe to deal events
        eventBus.subscribe('deal:stage_changed', async (event) => {
            await this.handleStageChange(event.payload);
        });
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'pipeline:task' ||
            task.type === 'create_pipeline' ||
            task.type === 'move_deal' ||
            task.type.startsWith('pipeline:') ||
            task.type.startsWith('deal:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as PipelineTaskPayload;

        switch (payload.action) {
            case 'create_pipeline':
                return this.createPipeline(payload, task.context);

            case 'create_deal':
                return this.createDeal(payload, task.context);

            case 'move_deal':
                return this.moveDeal(payload, task.context.workspaceId);

            case 'update_deal':
                return this.updateDeal(payload, task.context.workspaceId);

            case 'get_metrics':
                return this.getMetrics(payload, task.context.workspaceId);

            default:
                return this.error(`Unknown pipeline action: ${payload.action}`);
        }
    }

    private async handleStageChange(data: any): Promise<void> {
        this.log(`Deal ${data.dealId} moved to stage: ${data.newStage}`);

        // Would trigger stage change workflows
        // Send notifications if enabled
        if (this.config.settings.notifyOnStageChange) {
            // Notify assigned user
        }
    }

    private async createPipeline(
        payload: PipelineTaskPayload,
        context: any
    ): Promise<AgentResult> {
        const { name, stages } = payload;

        if (!name) {
            return this.error('Pipeline name is required');
        }

        if (!stages || stages.length === 0) {
            return this.error('At least one stage is required');
        }

        try {
            // Would create pipeline in database
            const pipeline = {
                id: `pipeline-${Date.now()}`,
                name,
                stages: stages.map((s, i) => ({
                    ...s,
                    order: i,
                })),
                workspaceId: context.workspaceId,
                createdAt: new Date(),
            };

            this.log(`Created pipeline: ${name}`);

            return this.success({
                pipeline,
                message: `Pipeline "${name}" created with ${stages.length} stages`,
            });

        } catch (error: any) {
            return this.error(`Failed to create pipeline: ${error.message}`);
        }
    }

    private async createDeal(
        payload: PipelineTaskPayload,
        context: any
    ): Promise<AgentResult> {
        const { pipelineId, dealData } = payload;

        if (!dealData?.title) {
            return this.error('Deal title is required');
        }

        try {
            const deal = {
                id: `deal-${Date.now()}`,
                ...dealData,
                pipelineId,
                stageId: null, // Would be set to first stage
                workspaceId: context.workspaceId,
                createdAt: new Date(),
            };

            eventBus.publish({
                type: 'deal:created',
                source: 'pipeline',
                workspaceId: context.workspaceId,
                payload: { dealId: deal.id },
            });

            return this.success({
                deal,
                message: `Deal "${dealData.title}" created`,
            });

        } catch (error: any) {
            return this.error(`Failed to create deal: ${error.message}`);
        }
    }

    private async moveDeal(
        payload: PipelineTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { dealId, stageId } = payload;

        if (!dealId || !stageId) {
            return this.error('Deal ID and stage ID are required');
        }

        try {
            // Would update deal in database
            const oldStageId = 'old-stage'; // Would fetch from DB

            eventBus.publish({
                type: 'deal:stage_changed',
                source: 'pipeline',
                workspaceId,
                payload: {
                    dealId,
                    oldStage: oldStageId,
                    newStage: stageId,
                },
            });

            return this.success({
                moved: true,
                dealId,
                stageId,
                message: 'Deal moved to new stage',
            });

        } catch (error: any) {
            return this.error(`Failed to move deal: ${error.message}`);
        }
    }

    private async updateDeal(
        payload: PipelineTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { dealId, dealData } = payload;

        if (!dealId) {
            return this.error('Deal ID is required');
        }

        try {
            // Would update deal in database
            return this.success({
                updated: true,
                dealId,
                message: 'Deal updated successfully',
            });

        } catch (error: any) {
            return this.error(`Failed to update deal: ${error.message}`);
        }
    }

    private async getMetrics(
        payload: PipelineTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { pipelineId } = payload;

        try {
            // Would calculate pipeline metrics
            const metrics = {
                totalDeals: 0,
                totalValue: 0,
                avgDealSize: 0,
                avgTimeToClose: 0,
                conversionRate: 0,
                stageBreakdown: [],
            };

            return this.success({
                pipelineId,
                metrics,
                message: 'Pipeline metrics calculated',
            });

        } catch (error: any) {
            return this.error(`Failed to get metrics: ${error.message}`);
        }
    }
}

export default PipelineAgent;
