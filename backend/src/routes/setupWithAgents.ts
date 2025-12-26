/**
 * Setup With Agents Routes
 * 
 * Handles conversational onboarding and AI-driven CRM setup.
 * Uses existing agents (pipelineAgent, sequenceAgent, workflowAgent, etc.)
 * to create customized CRM configuration based on user's answers.
 */

import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { invokeAgentV2 } from "../agents";
import { getProModel } from "../agents/modelFactory";

const router = express.Router();

interface OnboardingAnswers {
    industry: string;
    teamSize: string;
    salesCycle: string;
    primaryGoal: string;
    emailOutreach: string;
}

/**
 * POST /:workspaceId/ai-setup
 * Analyze onboarding answers and execute AI-driven CRM setup
 */
router.post(
    "/:workspaceId/ai-setup",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;
            const { answers } = req.body as { answers: OnboardingAnswers };

            if (!answers) {
                return res.status(400).json({
                    success: false,
                    error: "Onboarding answers are required",
                });
            }

            console.log(`🚀 AI Setup starting for workspace ${workspaceId}`);
            console.log(`📋 Answers:`, answers);

            // Step 1: Use LLM to generate a customized setup plan
            const model = getProModel();

            const analysisPrompt = `You are a CRM setup expert. Based on these onboarding answers, generate SPECIFIC setup instructions.

BUSINESS PROFILE:
- Industry: ${answers.industry}
- Team Size: ${answers.teamSize}
- Sales Cycle: ${answers.salesCycle}
- Primary Goal: ${answers.primaryGoal}
- Email Outreach: ${answers.emailOutreach}

IMPORTANT CONSTRAINTS:
- Pipeline: Create with 4-7 stages appropriate for the industry
- Workflow actions MUST be one of: send_email, create_task, assign_owner, add_tag, send_notification
- Workflow triggers MUST be: contact_created, deal_created, deal_stage_changed, or form_submitted
- Keep workflows SIMPLE - max 2-3 actions each

Generate setup instructions for:
1. A sales pipeline with stages tailored to ${answers.industry}
2. ONE simple workflow (e.g., "when new contact created, add tag 'new lead' and create task to follow up")

OUTPUT FORMAT:
Write a natural instruction starting with "Set up my CRM:" 
Be specific about stage names and workflow trigger/actions.
Keep it under 150 words. DO NOT mention creating deals as workflow actions.`;

            const planResult = await model.invoke(analysisPrompt);
            const setupInstruction = typeof planResult.content === 'string'
                ? planResult.content
                : String(planResult.content);

            console.log(`📝 Generated setup instruction:`, setupInstruction);

            // Step 2: Execute setup using multi-agent system
            const result = await invokeAgentV2(
                setupInstruction,
                workspaceId,
                userId,
                undefined,
                120000 // 2 minute timeout for complex setup
            );

            console.log(`✅ AI Setup complete for workspace ${workspaceId}`);

            res.json({
                success: true,
                data: {
                    setupInstruction,
                    agentResponse: result.response,
                    toolResults: result.toolResults,
                },
            });
        } catch (error: any) {
            console.error("AI Setup error:", error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * GET /setup-questions
 * Get the onboarding questions for the setup wizard
 */
router.get("/setup-questions", authenticate, async (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            questions: [
                {
                    id: "industry",
                    question: "What industry is your business in?",
                    type: "select",
                    options: [
                        { value: "saas", label: "SaaS / Software" },
                        { value: "real_estate", label: "Real Estate" },
                        { value: "recruiting", label: "Recruiting / Staffing" },
                        { value: "consulting", label: "Consulting / Agency" },
                        { value: "ecommerce", label: "E-commerce" },
                        { value: "financial", label: "Financial Services" },
                        { value: "healthcare", label: "Healthcare" },
                        { value: "other", label: "Other" },
                    ],
                },
                {
                    id: "teamSize",
                    question: "How many people on your sales team?",
                    type: "select",
                    options: [
                        { value: "solo", label: "Just me" },
                        { value: "small", label: "2-5 people" },
                        { value: "medium", label: "6-20 people" },
                        { value: "large", label: "20+ people" },
                    ],
                },
                {
                    id: "salesCycle",
                    question: "What's your average sales cycle length?",
                    type: "select",
                    options: [
                        { value: "short", label: "Less than 1 week" },
                        { value: "medium", label: "1-4 weeks" },
                        { value: "long", label: "1-3 months" },
                        { value: "enterprise", label: "3+ months" },
                    ],
                },
                {
                    id: "primaryGoal",
                    question: "What's your main goal with this CRM?",
                    type: "select",
                    options: [
                        { value: "leads", label: "Generate more leads" },
                        { value: "close", label: "Close deals faster" },
                        { value: "followup", label: "Improve follow-ups" },
                        { value: "visibility", label: "Better pipeline visibility" },
                        { value: "automation", label: "Automate repetitive tasks" },
                    ],
                },
                {
                    id: "emailOutreach",
                    question: "Do you run email outreach campaigns?",
                    type: "select",
                    options: [
                        { value: "regularly", label: "Yes, regularly" },
                        { value: "sometimes", label: "Sometimes" },
                        { value: "planning", label: "Planning to start" },
                        { value: "no", label: "No" },
                    ],
                },
            ],
        },
    });
});

export default router;
