/**
 * AI Agent Action Executor
 *
 * Integrates workflow system with the existing multi-agent CRM system.
 * Agent reasons about the task, accesses CRM tools, and forwards results to the workflow.
 */

import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { invokeAgentV2 } from "../../../agents";
import { replacePlaceholders } from "../expressionEvaluator";

// ============================================
// TYPES
// ============================================

interface AIAgentConfig {
    // Task configuration
    taskPrompt: string;                      // Task instruction with {{placeholder}} support
    systemPromptOverride?: string;           // Optional custom system prompt

    // Context inclusion
    includeEntityData?: boolean;             // Include entity fields in context (default: true)
    includeVariables?: boolean;              // Include dataContext variables (default: true)
    additionalContext?: string;              // Additional context with {{placeholders}}

    // Agent configuration
    agentType?: 'auto' | 'contact' | 'email' | 'deal' | 'task' | 'workflow' | 'general';

    // Tool permissions (which tools agent can access)
    allowedTools?: string[];                 // If specified, restrict to these tools

    // Response handling
    responseVariable?: string;               // Variable name to store agent response
    toolHistoryVariable?: string;            // Variable name to store tool execution history
    parseAsJSON?: boolean;                   // Try to parse response as JSON

    // Execution settings
    timeout?: number;                        // Timeout in milliseconds (default: 60000, max: 300000)
}

// ============================================
// AI AGENT EXECUTOR
// ============================================

export class AIAgentActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as AIAgentConfig;

        if (!config.taskPrompt) {
            return this.error("Task prompt is required for AI agent");
        }

        // Initialize dataContext if needed
        if (!enrollment.dataContext) {
            enrollment.dataContext = { variables: {}, previousResults: {} };
        }
        if (!enrollment.dataContext.variables) {
            enrollment.dataContext.variables = {};
        }

        try {
            // Build context for placeholder replacement
            const placeholderContext = this.buildPlaceholderContext(config, entity, enrollment);

            // Replace placeholders in task prompt
            const taskPrompt = replacePlaceholders(config.taskPrompt, placeholderContext);

            // Build additional context if provided
            let additionalContext = "";
            if (config.additionalContext) {
                additionalContext = replacePlaceholders(config.additionalContext, placeholderContext);
            }

            // Construct full message for agent
            const fullMessage = this.constructAgentMessage(
                taskPrompt,
                additionalContext,
                config,
                entity,
                enrollment
            );

            this.log(`🤖 Invoking AI agent with task: "${taskPrompt.substring(0, 100)}..."`);

            // Configure timeout (default 60s, max 300s)
            const timeout = Math.min(config.timeout || 60000, 300000);

            // Get workspace and user IDs from enrollment
            const workspaceId = enrollment.workspaceId?.toString() || '';
            const userId = enrollment.userId?.toString() || '';
            const sessionId = `workflow-${enrollment._id?.toString()}`;

            // Invoke AI agent
            const agentResult = await invokeAgentV2(
                fullMessage,
                workspaceId,
                userId,
                sessionId,
                timeout
            );

            this.log(`✅ Agent completed successfully`);

            // Handle agent response
            if (agentResult.error) {
                return this.error(`Agent error: ${agentResult.error}`);
            }

            // Store response in variable if configured
            let parsedResponse = agentResult.response;
            if (config.responseVariable) {
                // Try to parse as JSON if configured
                if (config.parseAsJSON) {
                    try {
                        parsedResponse = JSON.parse(agentResult.response);
                    } catch (e) {
                        this.log(`⚠️ Failed to parse response as JSON, storing as string`);
                    }
                }

                enrollment.dataContext.variables[config.responseVariable] = parsedResponse;
                this.log(`💾 Stored agent response in variable: ${config.responseVariable}`);
            }

            // Store tool execution history if configured
            if (config.toolHistoryVariable && agentResult.toolResults) {
                enrollment.dataContext.variables[config.toolHistoryVariable] = agentResult.toolResults;
                this.log(`💾 Stored tool history in variable: ${config.toolHistoryVariable}`);
            }

            return this.success({
                response: agentResult.response,
                needsInput: agentResult.needsInput,
                toolsUsed: agentResult.toolResults ? Object.keys(agentResult.toolResults).length : 0,
            });

        } catch (error: any) {
            this.log(`❌ Agent execution failed: ${error.message}`);
            return this.error(`AI agent failed: ${error.message}`);
        }
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Build context object for placeholder replacement
     */
    private buildPlaceholderContext(
        config: AIAgentConfig,
        entity: any,
        enrollment: any
    ): Record<string, any> {
        const context: Record<string, any> = {};

        // Include entity data if configured (default: true)
        if (config.includeEntityData !== false && entity) {
            Object.assign(context, entity);
        }

        // Include workflow variables if configured (default: true)
        if (config.includeVariables !== false && enrollment.dataContext?.variables) {
            Object.assign(context, enrollment.dataContext.variables);
        }

        // Include loop context if active
        if (enrollment.dataContext?.loopContext) {
            context.item = enrollment.dataContext.loopContext.currentItem;
            context.index = enrollment.dataContext.loopContext.currentIndex;
        }

        return context;
    }

    /**
     * Construct full message for agent with context
     */
    private constructAgentMessage(
        taskPrompt: string,
        additionalContext: string,
        config: AIAgentConfig,
        entity: any,
        enrollment: any
    ): string {
        const messageParts: string[] = [];

        // Add task prompt
        messageParts.push(taskPrompt);

        // Add additional context if provided
        if (additionalContext) {
            messageParts.push(`\n\nAdditional Context:\n${additionalContext}`);
        }

        // Add entity data context if included
        if (config.includeEntityData !== false && entity) {
            const entitySummary = this.summarizeEntity(entity);
            if (entitySummary) {
                messageParts.push(`\n\nEntity Data:\n${entitySummary}`);
            }
        }

        // Add workflow variables context if included
        if (config.includeVariables !== false && enrollment.dataContext?.variables) {
            const variablesSummary = this.summarizeVariables(enrollment.dataContext.variables);
            if (variablesSummary) {
                messageParts.push(`\n\nWorkflow Variables:\n${variablesSummary}`);
            }
        }

        // Add system prompt override if provided
        if (config.systemPromptOverride) {
            messageParts.push(`\n\nSpecial Instructions:\n${config.systemPromptOverride}`);
        }

        return messageParts.join('\n');
    }

    /**
     * Summarize entity data for agent context
     */
    private summarizeEntity(entity: any): string {
        if (!entity || typeof entity !== 'object') return '';

        const summary: string[] = [];

        // Common entity fields
        const relevantFields = [
            'firstName', 'lastName', 'email', 'phone', 'company',
            'title', 'dealValue', 'stage', 'status', 'tags',
            'customFields', 'description', 'notes'
        ];

        for (const field of relevantFields) {
            if (entity[field] !== undefined && entity[field] !== null) {
                const value = typeof entity[field] === 'object'
                    ? JSON.stringify(entity[field])
                    : entity[field];
                summary.push(`- ${field}: ${value}`);
            }
        }

        return summary.length > 0 ? summary.join('\n') : '';
    }

    /**
     * Summarize workflow variables for agent context
     */
    private summarizeVariables(variables: Record<string, any>): string {
        if (!variables || typeof variables !== 'object') return '';

        const summary: string[] = [];

        for (const [key, value] of Object.entries(variables)) {
            // Skip internal variables
            if (key.startsWith('_')) continue;

            const valueStr = typeof value === 'object'
                ? JSON.stringify(value).substring(0, 200)
                : String(value);
            summary.push(`- ${key}: ${valueStr}`);
        }

        return summary.length > 0 ? summary.join('\n') : '';
    }
}
