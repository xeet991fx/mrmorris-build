/**
 * OnboardingAgent - Conversational Setup Wizard
 * Guides new users through CRM setup via interview-style questions
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAgent } from './BaseAgent';
import {
    AgentTask,
    AgentResult,
    AgentContext
} from './types';
import { memoryStore } from './MemoryStore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface OnboardingState {
    step: number;
    answers: Record<string, any>;
    isComplete: boolean;
}

interface OnboardingTaskPayload {
    message?: string;
    action?: 'start' | 'answer' | 'skip' | 'complete';
}

// Onboarding questions flow
const ONBOARDING_QUESTIONS = [
    {
        id: 'business_type',
        question: "What type of business are you running?",
        options: ['SaaS / Software', 'E-commerce', 'Services / Consulting', 'Agency', 'Other'],
        required: true,
    },
    {
        id: 'sales_process',
        question: "What's your primary sales approach?",
        options: ['Inbound (leads come to you)', 'Outbound (you reach out)', 'Both'],
        required: true,
    },
    {
        id: 'team_size',
        question: "How big is your sales team?",
        options: ['Solo (just me)', 'Small (2-5 people)', 'Medium (6-20 people)', 'Large (20+ people)'],
        required: true,
    },
    {
        id: 'goals',
        question: "What are your main goals with the CRM? (select all that apply)",
        options: ['Lead generation', 'Lead nurturing', 'Closing deals', 'Customer retention', 'Analytics & reporting'],
        multiSelect: true,
        required: true,
    },
    {
        id: 'integrations',
        question: "Which tools do you currently use?",
        options: ['Gmail', 'Outlook', 'Calendar', 'Slack', 'Apollo.io', 'None yet'],
        multiSelect: true,
        required: false,
    },
];

export class OnboardingAgent extends BaseAgent {
    private model: any;

    constructor() {
        super('onboarding', {
            settings: {
                model: 'gemini-2.0-flash',
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.model = genAI.getGenerativeModel({
            model: this.config.settings.model || "gemini-2.0-flash"
        });
        this.log('Onboarding Agent initialized');
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'onboarding:task' ||
            task.type === 'start_onboarding' ||
            task.type.startsWith('onboarding:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as OnboardingTaskPayload;
        const workspaceId = task.context.workspaceId;

        // Get or initialize onboarding state
        let state = this.getOnboardingState(workspaceId);

        switch (payload.action) {
            case 'start':
                state = this.initializeState();
                this.saveOnboardingState(workspaceId, state);
                return this.askQuestion(state);

            case 'skip':
                state.step++;
                this.saveOnboardingState(workspaceId, state);
                if (state.step >= ONBOARDING_QUESTIONS.length) {
                    return this.completeOnboarding(state, task.context);
                }
                return this.askQuestion(state);

            case 'answer':
                return this.processAnswer(payload.message || '', state, task.context);

            case 'complete':
                return this.completeOnboarding(state, task.context);

            default:
                // Check if this is an answer to current question
                if (payload.message && state.step < ONBOARDING_QUESTIONS.length) {
                    return this.processAnswer(payload.message, state, task.context);
                }
                return this.askQuestion(state);
        }
    }

    private initializeState(): OnboardingState {
        return {
            step: 0,
            answers: {},
            isComplete: false,
        };
    }

    private getOnboardingState(workspaceId: string): OnboardingState {
        return memoryStore.getAgentState<OnboardingState>(workspaceId, 'onboarding')
            || this.initializeState();
    }

    private saveOnboardingState(workspaceId: string, state: OnboardingState): void {
        memoryStore.setAgentState(workspaceId, 'onboarding', state);
    }

    private askQuestion(state: OnboardingState): AgentResult {
        if (state.step >= ONBOARDING_QUESTIONS.length) {
            return this.success({
                isComplete: true,
                message: "All questions answered! Ready to set up your CRM.",
                answers: state.answers,
            });
        }

        const question = ONBOARDING_QUESTIONS[state.step];
        let response = `**Question ${state.step + 1}/${ONBOARDING_QUESTIONS.length}**\n\n`;
        response += `${question.question}\n\n`;

        if (question.options) {
            response += question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
            response += '\n\n';
            if (question.multiSelect) {
                response += '_You can select multiple options (e.g., "1, 3, 5")_';
            }
        }

        if (!question.required) {
            response += '\n_This question is optional. Type "skip" to skip._';
        }

        return this.success({
            questionId: question.id,
            question: question.question,
            options: question.options,
            multiSelect: question.multiSelect,
            required: question.required,
            step: state.step + 1,
            totalSteps: ONBOARDING_QUESTIONS.length,
            response,
        });
    }

    private async processAnswer(
        answer: string,
        state: OnboardingState,
        context: AgentContext
    ): Promise<AgentResult> {
        const workspaceId = context.workspaceId;
        const question = ONBOARDING_QUESTIONS[state.step];

        if (!question) {
            return this.completeOnboarding(state, context);
        }

        // Parse the answer
        let parsedAnswer: any;

        if (question.options) {
            // Parse numeric selections or text matches
            const selections = this.parseSelections(answer, question.options);
            parsedAnswer = question.multiSelect ? selections : selections[0];
        } else {
            parsedAnswer = answer.trim();
        }

        // Validate required
        if (question.required && (!parsedAnswer || (Array.isArray(parsedAnswer) && parsedAnswer.length === 0))) {
            return this.success({
                error: "This question is required. Please provide an answer.",
                response: `Please answer the question: ${question.question}`,
            });
        }

        // Store answer
        state.answers[question.id] = parsedAnswer;
        state.step++;
        this.saveOnboardingState(workspaceId, state);

        // Check if complete
        if (state.step >= ONBOARDING_QUESTIONS.length) {
            return this.completeOnboarding(state, context);
        }

        // Ask next question
        return this.askQuestion(state);
    }

    private parseSelections(input: string, options: string[]): string[] {
        const selections: string[] = [];
        const lowerInput = input.toLowerCase();

        // Try parsing as numbers (1, 2, 3)
        const numberMatches = input.match(/\d+/g);
        if (numberMatches) {
            for (const num of numberMatches) {
                const index = parseInt(num) - 1;
                if (index >= 0 && index < options.length) {
                    selections.push(options[index]);
                }
            }
        }

        // Also check for text matches
        for (const option of options) {
            if (lowerInput.includes(option.toLowerCase())) {
                if (!selections.includes(option)) {
                    selections.push(option);
                }
            }
        }

        return selections;
    }

    private async completeOnboarding(
        state: OnboardingState,
        context: AgentContext
    ): Promise<AgentResult> {
        state.isComplete = true;
        this.saveOnboardingState(context.workspaceId, state);

        // Generate setup plan based on answers
        const setupPlan = this.generateSetupPlan(state.answers);

        // Route to Planner to create the actual setup
        return this.routeToAgent('planner', {
            intent: {
                intent: 'setup_crm',
                entities: state.answers,
                confidence: 1.0,
            },
            originalMessage: `Set up CRM for ${state.answers.business_type || 'business'}`,
            businessContext: state.answers,
            setupPlan,
        }, {
            onboardingComplete: true,
            answers: state.answers,
            setupPlan,
            response: this.formatCompletionMessage(state.answers, setupPlan),
        });
    }

    private generateSetupPlan(answers: Record<string, any>): string[] {
        const plan: string[] = [];

        // Pipeline setup based on business type
        if (answers.business_type) {
            plan.push(`Create ${answers.business_type} sales pipeline`);
        }

        // Workflow suggestions based on goals
        const goals = answers.goals || [];
        if (goals.includes('Lead nurturing')) {
            plan.push('Set up lead nurturing automation');
        }
        if (goals.includes('Lead generation')) {
            plan.push('Configure lead capture workflows');
        }

        // Integration setup
        const integrations = answers.integrations || [];
        if (integrations.includes('Gmail') || integrations.includes('Outlook')) {
            plan.push('Connect email integration');
        }
        if (integrations.includes('Apollo.io')) {
            plan.push('Configure Apollo.io enrichment');
        }
        if (integrations.includes('Slack')) {
            plan.push('Set up Slack notifications');
        }

        // Team-specific setup
        if (answers.team_size === 'Medium (6-20 people)' || answers.team_size === 'Large (20+ people)') {
            plan.push('Configure team roles and permissions');
        }

        return plan;
    }

    private formatCompletionMessage(answers: Record<string, any>, plan: string[]): string {
        let message = `🎉 **Onboarding Complete!**\n\n`;
        message += `**Your Profile:**\n`;
        message += `- Business Type: ${answers.business_type || 'Not specified'}\n`;
        message += `- Sales Approach: ${answers.sales_process || 'Not specified'}\n`;
        message += `- Team Size: ${answers.team_size || 'Not specified'}\n\n`;

        message += `**Recommended Setup Plan:**\n`;
        plan.forEach((item, i) => {
            message += `${i + 1}. ${item}\n`;
        });

        message += `\n_I'll now help you set up your CRM based on your preferences!_`;
        return message;
    }
}

export default OnboardingAgent;
