/**
 * PlannerAgent - Strategy Decomposition Agent
 * Takes structured intents and creates execution plans
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAgent } from './BaseAgent';
import {
    AgentTask,
    AgentResult,
    ParsedIntent,
    ExecutionPlan,
    PlanStep
} from './types';
import { memoryStore } from './MemoryStore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface PlannerTaskPayload {
    intent: ParsedIntent;
    originalMessage: string;
}

export class PlannerAgent extends BaseAgent {
    private model: any;

    constructor() {
        super('planner', {
            settings: {
                model: 'gemini-2.0-flash',
                maxSteps: 10,
                requireApproval: true,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.model = genAI.getGenerativeModel({
            model: this.config.settings.model || "gemini-2.0-flash"
        });
        this.log('Planner Agent initialized');
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'planner:task' ||
            task.type === 'create_plan' ||
            task.type.startsWith('planner:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as PlannerTaskPayload;

        if (!payload.intent) {
            return this.error('Intent is required for planning');
        }

        try {
            // Generate execution plan
            const plan = await this.createPlan(payload, task.context.workspaceId);

            // Store plan in memory
            memoryStore.storePlan(task.context.workspaceId, plan);

            // Check if plan requires workflow building
            const needsWorkflowBuilder = plan.steps.some(
                step => step.action === 'create_workflow' || step.action === 'build_workflow'
            );

            if (needsWorkflowBuilder) {
                // Route to Workflow Builder
                return this.routeToAgent('workflow_builder', {
                    plan,
                    intent: payload.intent,
                }, {
                    plan,
                    response: this.formatPlanResponse(plan),
                });
            }

            // Return plan for confirmation or direct execution
            return this.success({
                plan,
                response: this.formatPlanResponse(plan),
                requiresApproval: this.config.settings.requireApproval,
            });

        } catch (error: any) {
            this.log('Planning error:', error.message);
            return this.error(`Failed to create plan: ${error.message}`);
        }
    }

    private async createPlan(
        payload: PlannerTaskPayload,
        workspaceId: string
    ): Promise<ExecutionPlan> {
        const prompt = this.buildPlanningPrompt(payload);

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1024,
            },
        });

        const responseText = result.response.text();
        const steps = this.parseStepsFromResponse(responseText);

        const plan: ExecutionPlan = {
            id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            goal: payload.originalMessage || payload.intent.intent,
            steps,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return plan;
    }

    private buildPlanningPrompt(payload: PlannerTaskPayload): string {
        return `You are a CRM automation planner. Create a step-by-step execution plan.

USER GOAL: "${payload.originalMessage}"
DETECTED INTENT: ${payload.intent.intent}
ENTITIES: ${JSON.stringify(payload.intent.entities)}

AVAILABLE ACTIONS:
- create_workflow: Create a new workflow with triggers and steps
- create_segment: Create a contact segment/filter
- create_pipeline: Create a sales pipeline
- add_pipeline_stage: Add a stage to a pipeline
- create_email_template: Create an email template
- create_task: Create a follow-up task
- send_notification: Send a notification
- update_contact_field: Update a field on contacts
- enrich_contacts: Enrich contacts with Apollo data
- schedule_action: Schedule an action for later

Generate a JSON plan with ordered steps:
\`\`\`json
{
  "steps": [
    {
      "order": 1,
      "action": "action_name",
      "params": { "key": "value" },
      "description": "Human readable description"
    }
  ]
}
\`\`\`

Keep the plan focused (3-7 steps max). Each step should be atomic and actionable.`;
    }

    private parseStepsFromResponse(response: string): PlanStep[] {
        try {
            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return (parsed.steps || []).map((step: any, index: number) => ({
                    id: `step-${index + 1}`,
                    order: step.order || index + 1,
                    action: step.action,
                    params: step.params || {},
                    status: 'pending' as const,
                    description: step.description,
                }));
            }
        } catch (error) {
            this.log('Failed to parse plan JSON, using fallback');
        }

        // Fallback: create basic plan
        return [{
            id: 'step-1',
            order: 1,
            action: 'create_workflow',
            params: {},
            status: 'pending',
        }];
    }

    private formatPlanResponse(plan: ExecutionPlan): string {
        let response = `📋 **Execution Plan**\n\n`;
        response += `**Goal:** ${plan.goal}\n\n`;
        response += `**Steps:**\n`;

        for (const step of plan.steps) {
            const statusIcon = step.status === 'completed' ? '✅' :
                step.status === 'in_progress' ? '🔄' : '⏳';
            response += `${statusIcon} ${step.order}. ${step.description || step.action}\n`;
        }

        response += `\n*Plan ID: ${plan.id}*`;
        return response;
    }
}

export default PlannerAgent;
