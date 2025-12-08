/**
 * IntentAgent - Natural Language Understanding Agent
 * Parses user messages to extract intent and route to appropriate agents
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAgent } from './BaseAgent';
import {
    AgentTask,
    AgentResult,
    AgentContext,
    ParsedIntent,
    AgentType
} from './types';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface IntentTaskPayload {
    message: string;
    conversationHistory?: Array<{ role: string; content: string }>;
}

// Intent categories and their target agents
const INTENT_ROUTING: Record<string, AgentType> = {
    // Planning & Setup
    'create_automation': 'planner',
    'setup_workflow': 'planner',
    'automate_process': 'planner',
    'configure_system': 'planner',
    'onboard': 'onboarding',

    // Workflow Building
    'create_workflow': 'workflow_builder',
    'modify_workflow': 'workflow_builder',
    'build_sequence': 'workflow_builder',

    // Direct Actions (handled by orchestrator)
    'create_contact': 'intent', // Return action directly
    'create_company': 'intent',
    'create_deal': 'intent',
    'send_email': 'email',
    'create_pipeline': 'pipeline',

    // Queries (no routing needed)
    'query': 'intent',
    'help': 'intent',
    'explain': 'intent',
};

export class IntentAgent extends BaseAgent {
    private model: any;

    constructor() {
        super('intent', {
            settings: {
                model: 'gemini-2.0-flash',
                temperature: 0.3,
                maxTokens: 1024,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.model = genAI.getGenerativeModel({
            model: this.config.settings.model || "gemini-2.0-flash"
        });
        this.log('Intent Agent initialized with Gemini');
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'parse_intent' || task.type.startsWith('intent:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as IntentTaskPayload;

        if (!payload.message || typeof payload.message !== 'string') {
            return this.error('Message is required');
        }

        const message = payload.message.trim();

        if (message.length === 0) {
            return this.error('Please provide a request');
        }

        try {
            // Parse intent using Gemini
            const parsedIntent = await this.parseIntent(message, task.context);

            // Determine if we need to route to another agent
            const targetAgent = this.getTargetAgent(parsedIntent);

            if (targetAgent && targetAgent !== 'intent') {
                // Route to appropriate agent
                return this.routeToAgent(targetAgent, {
                    intent: parsedIntent,
                    originalMessage: message,
                }, {
                    intent: parsedIntent,
                    response: `I understand you want to ${parsedIntent.intent.replace(/_/g, ' ')}. Let me help you with that.`,
                });
            }

            // Handle directly or return clarification
            if (parsedIntent.requiresClarification) {
                return this.success({
                    intent: parsedIntent,
                    response: parsedIntent.clarificationQuestion,
                    requiresClarification: true,
                });
            }

            // Generate response for simple queries
            const response = await this.generateResponse(message, parsedIntent, task.context);

            return this.success({
                intent: parsedIntent,
                response,
                action: this.extractAction(parsedIntent),
            });

        } catch (error: any) {
            this.log('Intent parsing error:', error.message);
            return this.error(`I had trouble understanding that: ${error.message}`);
        }
    }

    private async parseIntent(
        message: string,
        context: AgentContext
    ): Promise<ParsedIntent> {
        const prompt = this.buildIntentPrompt(message, context);

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 512,
            },
        });

        const responseText = result.response.text();

        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }

            // Try parsing entire response as JSON
            return JSON.parse(responseText);
        } catch {
            // Fallback to basic intent extraction
            return this.fallbackIntentParsing(message);
        }
    }

    private buildIntentPrompt(message: string, context: AgentContext): string {
        return `You are an intent parser for a CRM system. Analyze the user message and extract structured intent.

USER MESSAGE: "${message}"

CONTEXT:
- Current Page: ${context.currentPage || 'dashboard'}
- Selected Items: ${JSON.stringify(context.selectedItems || {})}

AVAILABLE INTENTS:
- create_automation: User wants to automate a process or create rules
- setup_workflow: User wants to set up a workflow with steps
- automate_process: General automation request
- create_contact: Create a new contact
- create_company: Create a new company
- create_deal: Create a new deal/opportunity
- send_email: Send an email
- create_pipeline: Create a sales pipeline
- query: User is asking a question
- help: User needs help or explanation
- onboard: User wants to set up their account

Respond with JSON only:
\`\`\`json
{
  "intent": "the_intent",
  "entities": {
    "key": "value"
  },
  "confidence": 0.95,
  "requiresClarification": false,
  "clarificationQuestion": null
}
\`\`\`

If the intent is ambiguous, set requiresClarification to true and provide a clarificationQuestion.`;
    }

    private fallbackIntentParsing(message: string): ParsedIntent {
        const lowerMessage = message.toLowerCase();

        // Simple keyword-based intent detection
        if (lowerMessage.includes('automate') || lowerMessage.includes('automation')) {
            return { intent: 'create_automation', entities: {}, confidence: 0.7 };
        }
        if (lowerMessage.includes('workflow')) {
            return { intent: 'setup_workflow', entities: {}, confidence: 0.7 };
        }
        if (lowerMessage.includes('create contact') || lowerMessage.includes('add contact')) {
            return { intent: 'create_contact', entities: {}, confidence: 0.8 };
        }
        if (lowerMessage.includes('send email')) {
            return { intent: 'send_email', entities: {}, confidence: 0.8 };
        }
        if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
            return { intent: 'help', entities: {}, confidence: 0.7 };
        }
        if (lowerMessage.includes('setup') || lowerMessage.includes('onboard')) {
            return { intent: 'onboard', entities: {}, confidence: 0.7 };
        }

        // Default to query
        return {
            intent: 'query',
            entities: { question: message },
            confidence: 0.5
        };
    }

    private getTargetAgent(intent: ParsedIntent): AgentType | null {
        return INTENT_ROUTING[intent.intent] || null;
    }

    private extractAction(intent: ParsedIntent): any | null {
        // Extract actionable commands from intent
        const actionIntents = ['create_contact', 'create_company', 'create_deal', 'send_email', 'create_pipeline'];

        if (actionIntents.includes(intent.intent)) {
            return {
                action: intent.intent,
                params: intent.entities,
                requiresConfirmation: true,
            };
        }

        return null;
    }

    private async generateResponse(
        message: string,
        intent: ParsedIntent,
        context: AgentContext
    ): Promise<string> {
        const prompt = `You are MrMorris AI, a helpful CRM assistant.

User asked: "${message}"
Detected intent: ${intent.intent}
Entities: ${JSON.stringify(intent.entities)}

Provide a helpful, conversational response. Keep it concise (2-3 sentences max).
If this is a query, answer it. If this requires action, explain what you'll do.`;

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 256,
            },
        });

        return result.response.text();
    }
}

export default IntentAgent;
