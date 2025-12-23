/**
 * Insight Service
 * 
 * Generates, stores, and manages AI-powered proactive insights.
 * Connects context analyzer to specialist agents.
 */

import { Types } from "mongoose";
import AgentInsight, { IAgentInsight } from "../models/AgentInsight";
import {
    contextAnalyzer,
    ContactContext,
    DealContext,
    CampaignContext,
    EmailContext,
    WorkflowContext
} from "./contextAnalyzer";
import { getProModel } from "../agents/modelFactory";

// Insight types
export type InsightType =
    | 'engagement_analysis'
    | 'risk_analysis'
    | 'data_quality'
    | 'campaign_optimization'
    | 'email_categorization'
    | 'automation_suggestion';

export interface InsightGenerationResult {
    success: boolean;
    insights: IAgentInsight[];
    error?: string;
}

class InsightService {
    /**
     * Generate insights for a contact
     */
    async generateContactInsights(
        workspaceId: string,
        userId: string,
        contactId: string
    ): Promise<InsightGenerationResult> {
        try {
            const context = await contextAnalyzer.buildContactContext(
                workspaceId,
                userId,
                contactId,
                'view'
            );

            let analysis: any;

            try {
                const model = getProModel();
                const prompt = this.buildContactAnalysisPrompt(context);
                const response = await model.invoke(prompt);
                analysis = this.parseAIResponse(response.content as string);
            } catch (aiError) {
                console.log('AI model not available, using mock insights for contact');
                // Fallback mock analysis when AI is not available
                analysis = this.getMockContactAnalysis(context);
            }

            // Create insight record
            const insight = await AgentInsight.create({
                workspaceId: new Types.ObjectId(workspaceId),
                userId: new Types.ObjectId(userId),
                contextType: 'contact',
                contextId: new Types.ObjectId(contactId),
                agentType: 'contact_intelligence',
                insights: {
                    type: 'engagement_analysis',
                    title: analysis.title || 'Contact Engagement Analysis',
                    description: analysis.summary || 'Analysis of contact engagement patterns',
                    data: {
                        engagementLevel: analysis.engagementLevel,
                        riskFlags: analysis.riskFlags || [],
                        bestTimeToContact: analysis.bestTimeToContact,
                        recommendedChannel: analysis.recommendedChannel,
                    },
                },
                suggestedActions: analysis.actions?.map((a: any, idx: number) => ({
                    id: `action_${idx}`,
                    type: a.type || 'general',
                    label: a.label || a.action,
                    priority: a.priority || idx + 1,
                    metadata: a.metadata,
                })) || [],
                confidence: analysis.confidence || 0.75,
                priority: analysis.riskFlags?.length > 0 ? 'high' : 'medium',
                displayType: 'inline_panel',
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            });

            return { success: true, insights: [insight] };
        } catch (error: any) {
            console.error('Error generating contact insights:', error);
            return { success: false, insights: [], error: error.message };
        }
    }

    /**
     * Get mock contact analysis for testing when AI is unavailable
     */
    private getMockContactAnalysis(context: ContactContext): any {
        const emailsSent = context.engagementHistory.emailsSent || 0;
        const emailsOpened = context.engagementHistory.emailsOpened || 0;
        const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;

        let engagementLevel = 'warm';
        let riskFlags: string[] = [];

        if (openRate > 50) engagementLevel = 'hot';
        else if (openRate < 20 && emailsSent > 3) {
            engagementLevel = 'cold';
            riskFlags.push('Low email engagement detected');
        }
        if (!context.engagementHistory.lastEmailDate) {
            riskFlags.push('No recent communication');
        }

        return {
            title: `${context.contactData.name} - Engagement Analysis`,
            summary: `This contact shows ${engagementLevel} engagement with ${openRate.toFixed(0)}% email open rate.`,
            engagementLevel,
            riskFlags,
            bestTimeToContact: { day: 'Tuesday', time: '10 AM - 12 PM', confidence: 0.7 },
            recommendedChannel: 'email',
            actions: [
                { type: 'send_email', label: 'Send personalized follow-up', priority: 1 },
                { type: 'schedule_call', label: 'Schedule discovery call', priority: 2 },
            ],
            confidence: 0.75,
        };
    }

    /**
     * Generate insights for a deal
     */
    async generateDealInsights(
        workspaceId: string,
        userId: string,
        dealId: string
    ): Promise<InsightGenerationResult> {
        try {
            const context = await contextAnalyzer.buildDealContext(
                workspaceId,
                userId,
                dealId,
                'view'
            );

            const model = getProModel();
            const prompt = this.buildDealAnalysisPrompt(context);

            const response = await model.invoke(prompt);
            const analysis = this.parseAIResponse(response.content as string);

            const insight = await AgentInsight.create({
                workspaceId: new Types.ObjectId(workspaceId),
                userId: new Types.ObjectId(userId),
                contextType: 'deal',
                contextId: new Types.ObjectId(dealId),
                agentType: 'pipeline_predictor',
                insights: {
                    type: 'risk_analysis',
                    title: analysis.title || 'Deal Risk Analysis',
                    description: analysis.summary || 'Win probability and risk assessment',
                    data: {
                        winProbability: analysis.winProbability,
                        riskLevel: analysis.riskLevel,
                        riskFactors: analysis.riskFactors || [],
                        bottlenecks: analysis.bottlenecks || [],
                        predictedCloseDate: analysis.predictedCloseDate,
                    },
                },
                suggestedActions: analysis.actions?.map((a: any, idx: number) => ({
                    id: `action_${idx}`,
                    type: a.type || 'general',
                    label: a.label || a.action,
                    priority: a.priority || idx + 1,
                    metadata: { expectedImpact: a.expectedImpact },
                })) || [],
                confidence: analysis.confidence || 0.7,
                priority: analysis.riskLevel === 'critical' || analysis.riskLevel === 'high'
                    ? 'high'
                    : 'medium',
                displayType: analysis.riskLevel === 'critical' ? 'toast_notification' : 'inline_panel',
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            return { success: true, insights: [insight] };
        } catch (error: any) {
            console.error('Error generating deal insights:', error);
            return { success: false, insights: [], error: error.message };
        }
    }

    /**
     * Generate insights for a campaign
     */
    async generateCampaignInsights(
        workspaceId: string,
        userId: string,
        campaignId: string
    ): Promise<InsightGenerationResult> {
        try {
            const context = await contextAnalyzer.buildCampaignContext(
                workspaceId,
                userId,
                campaignId,
                'view'
            );

            const model = getProModel();
            const prompt = this.buildCampaignAnalysisPrompt(context);

            const response = await model.invoke(prompt);
            const analysis = this.parseAIResponse(response.content as string);

            const insight = await AgentInsight.create({
                workspaceId: new Types.ObjectId(workspaceId),
                userId: new Types.ObjectId(userId),
                contextType: 'campaign',
                contextId: new Types.ObjectId(campaignId),
                agentType: 'campaign_optimizer',
                insights: {
                    type: 'campaign_optimization',
                    title: analysis.title || 'Campaign Optimization',
                    description: analysis.summary || 'Recommendations for campaign performance',
                    data: {
                        optimizations: analysis.optimizations || [],
                        abTestSuggestions: analysis.abTestSuggestions || [],
                        predictions: analysis.predictions,
                    },
                },
                suggestedActions: analysis.actions?.map((a: any, idx: number) => ({
                    id: `action_${idx}`,
                    type: a.type || 'optimize',
                    label: a.label || a.action,
                    priority: a.priority || idx + 1,
                    metadata: { expectedImpact: a.expectedImpact },
                })) || [],
                confidence: analysis.confidence || 0.75,
                priority: 'medium',
                displayType: 'inline_panel',
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            return { success: true, insights: [insight] };
        } catch (error: any) {
            console.error('Error generating campaign insights:', error);
            return { success: false, insights: [], error: error.message };
        }
    }

    /**
     * Generate insights for an email
     */
    async generateEmailInsights(
        workspaceId: string,
        userId: string,
        emailId: string
    ): Promise<InsightGenerationResult> {
        try {
            const context = await contextAnalyzer.buildEmailContext(
                workspaceId,
                userId,
                emailId,
                'view'
            );

            const model = getProModel();
            const prompt = this.buildEmailAnalysisPrompt(context);

            const response = await model.invoke(prompt);
            const analysis = this.parseAIResponse(response.content as string);

            const insight = await AgentInsight.create({
                workspaceId: new Types.ObjectId(workspaceId),
                userId: new Types.ObjectId(userId),
                contextType: 'email',
                contextId: new Types.ObjectId(emailId),
                agentType: 'email_intelligence',
                insights: {
                    type: 'email_categorization',
                    title: analysis.title || 'Email Analysis',
                    description: analysis.summary || 'Email categorization and suggested actions',
                    data: {
                        category: analysis.category,
                        urgency: analysis.urgency,
                        sentiment: analysis.sentiment,
                        actionItems: analysis.actionItems || [],
                        suggestedResponse: analysis.suggestedResponse,
                    },
                },
                suggestedActions: analysis.actions?.map((a: any, idx: number) => ({
                    id: `action_${idx}`,
                    type: a.type || 'reply',
                    label: a.label || a.action,
                    priority: a.priority || idx + 1,
                })) || [],
                confidence: analysis.confidence || 0.8,
                priority: analysis.urgency === 'immediate' ? 'high' : 'medium',
                displayType: analysis.urgency === 'immediate' ? 'toast_notification' : 'inline_panel',
                status: 'pending',
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours for emails
            });

            return { success: true, insights: [insight] };
        } catch (error: any) {
            console.error('Error generating email insights:', error);
            return { success: false, insights: [], error: error.message };
        }
    }

    /**
     * Generate workflow automation suggestions
     */
    async generateWorkflowInsights(
        workspaceId: string,
        userId: string
    ): Promise<InsightGenerationResult> {
        try {
            const context = await contextAnalyzer.buildWorkflowContext(
                workspaceId,
                userId
            );

            if (context.repetitivePatterns.length === 0) {
                return { success: true, insights: [] };
            }

            const model = getProModel();
            const prompt = this.buildWorkflowAnalysisPrompt(context);

            const response = await model.invoke(prompt);
            const analysis = this.parseAIResponse(response.content as string);

            const insights: IAgentInsight[] = [];

            for (const suggestion of analysis.suggestions || []) {
                const insight = await AgentInsight.create({
                    workspaceId: new Types.ObjectId(workspaceId),
                    userId: new Types.ObjectId(userId),
                    contextType: 'workflow',
                    agentType: 'workflow_automation',
                    insights: {
                        type: 'automation_suggestion',
                        title: suggestion.name || 'Automation Opportunity',
                        description: suggestion.description || 'Detected repetitive pattern',
                        data: {
                            pattern: suggestion.pattern,
                            frequency: suggestion.frequency,
                            timeSavings: suggestion.timeSavings,
                            suggestedWorkflow: suggestion.workflow,
                        },
                    },
                    suggestedActions: [{
                        id: 'create_workflow',
                        type: 'create_workflow',
                        label: 'Create Workflow',
                        priority: 1,
                        metadata: { workflow: suggestion.workflow },
                    }],
                    confidence: suggestion.confidence || 0.7,
                    priority: suggestion.timeSavings > 60 ? 'high' : 'medium',
                    displayType: 'inline_panel',
                    status: 'pending',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                });
                insights.push(insight);
            }

            return { success: true, insights };
        } catch (error: any) {
            console.error('Error generating workflow insights:', error);
            return { success: false, insights: [], error: error.message };
        }
    }

    /**
     * Generate generic insights for new context types
     * Provides mock data for frontend testing while real AI integration is developed
     */
    async generateGenericInsights(
        workspaceId: string,
        userId: string,
        contextType: string,
        contextId: string,
        insightType: string
    ): Promise<InsightGenerationResult> {
        try {
            // Generate context-appropriate mock insights
            const mockData = this.getMockDataForContext(contextType, insightType);

            const insight = await AgentInsight.create({
                workspaceId: new Types.ObjectId(workspaceId),
                userId: new Types.ObjectId(userId),
                contextType: contextType,
                contextId: contextId !== 'workspace' && contextId !== 'today'
                    ? new Types.ObjectId(contextId)
                    : undefined,
                agentType: `${contextType}_intelligence`,
                insights: {
                    type: insightType,
                    title: mockData.title,
                    description: mockData.description,
                    data: mockData.data,
                },
                suggestedActions: mockData.actions || [],
                confidence: mockData.confidence || 0.75,
                priority: mockData.priority || 'medium',
                displayType: 'inline_panel',
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            return { success: true, insights: [insight] };
        } catch (error: any) {
            console.error(`Error generating ${contextType} insights:`, error);
            return { success: false, insights: [], error: error.message };
        }
    }

    /**
     * Get mock data for different context types
     */
    private getMockDataForContext(contextType: string, insightType: string): any {
        const mockDataMap: Record<string, any> = {
            'sequence_performance': {
                title: 'Sequence Performance Analysis',
                description: 'AI analysis of your email sequence performance',
                data: {
                    openRate: 42,
                    replyRate: 8,
                    dropOffStep: 3,
                    bestPerformingSubject: 'Quick question about your goals',
                    averageTimeToReply: '4.2 hrs',
                },
                actions: [
                    { id: 'optimize_1', type: 'optimize', label: 'Optimize Step 3', priority: 1 },
                    { id: 'ab_test', type: 'ab_test', label: 'A/B Test Subject Lines', priority: 2 },
                ],
                confidence: 0.82,
                priority: 'medium',
            },
            'ticket_analysis': {
                title: 'Ticket Intelligence Analysis',
                description: 'AI-powered ticket categorization and prioritization',
                data: {
                    category: 'Technical Support',
                    confidence: 87,
                    priority: 'high',
                    reason: 'VIP customer with urgent issue',
                    assignee: 'Sarah (Support Lead)',
                    estimatedResolution: '2 hours',
                },
                actions: [
                    { id: 'assign', type: 'assign', label: 'Auto-assign to Sarah', priority: 1 },
                    { id: 'template', type: 'template', label: 'Use resolution template', priority: 2 },
                ],
                confidence: 0.87,
                priority: 'high',
            },
            'meeting_intelligence': {
                title: 'Meeting Intelligence',
                description: 'Pre-meeting briefing and agenda suggestions',
                data: {
                    participants: [],
                    suggestedAgenda: ['Review Q4 goals', 'Discuss blockers', 'Next steps'],
                    talkingPoints: ['Recent product updates', 'Competitor analysis'],
                    preparationTips: 'Review last meeting notes and deal status',
                },
                confidence: 0.78,
                priority: 'medium',
            },
            'score_explanation': {
                title: 'Lead Score Analysis',
                description: 'Breakdown of lead score factors',
                data: {
                    score: 85,
                    breakdown: [
                        { factor: 'Email engagement', impact: 20, description: 'Opened 5/8 emails' },
                        { factor: 'Company size', impact: 15, description: 'Enterprise (500+ employees)' },
                        { factor: 'Website visits', impact: 12, description: 'Visited pricing page 3x' },
                    ],
                },
                confidence: 0.74,
                priority: 'medium',
            },
            'template_performance': {
                title: 'Template Performance',
                description: 'Email template effectiveness analysis',
                data: {
                    openRate: 42,
                    replyRate: 8,
                    clickRate: 15,
                    usageCount: 234,
                },
                confidence: 0.80,
                priority: 'low',
            },
            'data_health': {
                title: 'CRM Data Health',
                description: 'Data quality assessment and recommendations',
                data: {
                    overallScore: 76,
                    completeness: 82,
                    accuracy: 91,
                    duplicateRate: 4,
                    issues: [
                        { type: 'Missing phone numbers', count: 234, severity: 'medium' },
                        { type: 'Duplicate contacts', count: 67, severity: 'high' },
                    ],
                },
                confidence: 0.85,
                priority: 'medium',
            },
            'email_performance': {
                title: 'Email Analytics Overview',
                description: 'Workspace email performance metrics',
                data: {
                    deliverabilityRate: 94,
                    openRate: 38,
                    clickRate: 12,
                    bounceRate: 2.1,
                    spamRate: 0.3,
                    bestSendTime: 'Tue 10am',
                    avgTimeToOpen: '4.2 hrs',
                },
                confidence: 0.88,
                priority: 'low',
            },
            'account_health': {
                title: 'Email Account Health',
                description: 'Account reputation and deliverability status',
                data: {
                    healthScore: 92,
                    reputation: 'excellent',
                    warmingProgress: 78,
                    dailyLimit: 200,
                    sentToday: 145,
                    inboxPlacement: 94,
                    spamScore: 0.3,
                    blocklisted: false,
                },
                confidence: 0.90,
                priority: 'low',
            },
            'daily_summary': {
                title: 'Daily Briefing',
                description: 'Your personalized daily CRM summary',
                data: {
                    greeting: 'Good morning!',
                    summary: 'You have 3 meetings today, 5 emails awaiting response, and 2 deals that need attention.',
                    priorities: [
                        { title: 'Q4 Review Meeting', type: 'meeting', urgency: 'high', time: '2:00 PM' },
                        { title: 'Follow up with Acme Corp', type: 'follow_up', urgency: 'high' },
                    ],
                    metrics: [
                        { label: 'Pipeline Value', value: '$2.4M', change: 12 },
                        { label: 'Open Deals', value: 18, change: 3 },
                    ],
                    alerts: [
                        { type: 'warning', message: '2 deals have been inactive for 7+ days' },
                    ],
                },
                confidence: 0.75,
                priority: 'high',
            },
        };

        return mockDataMap[insightType] || {
            title: `${contextType} Analysis`,
            description: `AI-powered analysis for ${contextType}`,
            data: {},
            confidence: 0.70,
            priority: 'medium',
        };
    }

    /**
     * Get pending insights for a user
     */
    async getInsights(
        workspaceId: string,
        userId: string,
        contextType?: string,
        contextId?: string
    ): Promise<IAgentInsight[]> {
        const query: any = {
            workspaceId: new Types.ObjectId(workspaceId),
            userId: new Types.ObjectId(userId),
            status: { $in: ['pending', 'shown'] },
            $or: [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: null },
            ],
        };

        if (contextType) {
            query.contextType = contextType;
        }

        // Only convert contextId to ObjectId if it's a valid 24-character hex string
        // Special values like 'today', 'workspace' are stored as-is or undefined
        if (contextId && contextId !== 'today' && contextId !== 'workspace') {
            // Check if it's a valid ObjectId format
            if (/^[0-9a-fA-F]{24}$/.test(contextId)) {
                query.contextId = new Types.ObjectId(contextId);
            }
            // If not a valid ObjectId, don't add to query (will match any contextId)
        }

        return AgentInsight.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .limit(10);
    }

    /**
     * Mark insight as shown
     */
    async markShown(insightId: string): Promise<void> {
        await AgentInsight.findByIdAndUpdate(insightId, {
            status: 'shown',
            shownAt: new Date(),
        });
    }

    /**
     * Mark insight as acted upon
     */
    async markActed(insightId: string, actionType: string): Promise<void> {
        await AgentInsight.findByIdAndUpdate(insightId, {
            status: 'acted',
            actedAt: new Date(),
        });
    }

    /**
     * Dismiss insight
     */
    async dismissInsight(insightId: string): Promise<void> {
        await AgentInsight.findByIdAndUpdate(insightId, {
            status: 'dismissed',
            dismissedAt: new Date(),
        });
    }

    /**
     * Record feedback
     */
    async recordFeedback(insightId: string, helpful: boolean, feedback?: string): Promise<void> {
        await AgentInsight.findByIdAndUpdate(insightId, {
            helpful,
            feedback,
        });
    }

    // ============ Private Methods ============

    private buildContactAnalysisPrompt(context: ContactContext): string {
        const openRate = context.engagementHistory.emailsSent > 0
            ? ((context.engagementHistory.emailsOpened / context.engagementHistory.emailsSent) * 100).toFixed(1)
            : 'N/A';

        return `Analyze this contact's engagement pattern and provide actionable insights.

Contact: ${context.contactData.name}
Company: ${context.contactData.company || 'Unknown'}
Status: ${context.contactData.status || 'Unknown'}
Tags: ${context.contactData.tags?.join(', ') || 'None'}

Engagement History:
- Emails sent: ${context.engagementHistory.emailsSent}
- Emails opened: ${context.engagementHistory.emailsOpened}
- Open rate: ${openRate}%
- Last email: ${context.engagementHistory.lastEmailDate || 'Never'}

Deal History:
- Current deals: ${context.dealHistory.currentDeals.length} ($${context.dealHistory.totalValue})
- Won deals: ${context.dealHistory.wonDeals.length}
- Lost deals: ${context.dealHistory.lostDeals.length}

Return JSON with:
{
  "title": "Brief insight title",
  "summary": "One sentence summary",
  "engagementLevel": "hot|warm|cold|ghosting",
  "riskFlags": ["list of concerns"],
  "bestTimeToContact": { "day": "Tuesday", "time": "2-4 PM", "confidence": 0.8 },
  "recommendedChannel": "email|phone|meeting",
  "actions": [
    { "type": "send_email", "label": "Send re-engagement email", "priority": 1 }
  ],
  "confidence": 0.75
}`;
    }

    private buildDealAnalysisPrompt(context: DealContext): string {
        return `Analyze this deal and predict win probability.

Deal: ${context.dealData.name}
Value: $${context.dealData.value.toLocaleString()}
Stage: ${context.dealData.stage}
Days in stage: ${context.dealData.daysInStage}
Expected close: ${context.dealData.expectedCloseDate || 'Not set'}
Last activity: ${context.dealData.lastActivityDate || 'Unknown'}

Historical context:
- Similar deals analyzed: ${context.historicalData.similarDeals.length}
- Pipeline win rate: ${context.historicalData.winRate.toFixed(1)}%

Return JSON with:
{
  "title": "Brief insight title",
  "summary": "One sentence assessment",
  "winProbability": 65,
  "riskLevel": "low|medium|high|critical",
  "riskFactors": [
    { "factor": "No activity in 7 days", "impact": "high", "recommendation": "Schedule follow-up" }
  ],
  "bottlenecks": ["List of blockers"],
  "predictedCloseDate": "2024-02-15",
  "actions": [
    { "type": "schedule_meeting", "label": "Schedule review call", "priority": 1, "expectedImpact": "+10% win rate" }
  ],
  "confidence": 0.7
}`;
    }

    private buildCampaignAnalysisPrompt(context: CampaignContext): string {
        const perf = context.performance;
        const openRate = perf && perf.sent > 0
            ? ((perf.opened / perf.sent) * 100).toFixed(1)
            : 'N/A';
        const clickRate = perf && perf.opened > 0
            ? ((perf.clicked / perf.opened) * 100).toFixed(1)
            : 'N/A';

        return `Analyze this campaign and suggest optimizations.

Campaign: ${context.campaignData.name}
Type: ${context.campaignData.type}
Status: ${context.campaignData.status}
Audience size: ${context.campaignData.audienceSize}
Subject: "${context.campaignData.content?.subject || 'Not set'}"
${perf ? `
Performance:
- Sent: ${perf.sent}
- Open rate: ${openRate}%
- Click rate: ${clickRate}%
- Replies: ${perf.replied}
` : 'No performance data yet'}

Return JSON with:
{
  "title": "Brief insight title",
  "summary": "One sentence assessment",
  "optimizations": [
    { "area": "subject_line", "current": "...", "suggested": "...", "expectedImpact": "+8% opens" }
  ],
  "abTestSuggestions": [
    { "variant_a": "...", "variant_b": "...", "testParameter": "subject" }
  ],
  "predictions": {
    "expectedOpenRate": 25,
    "expectedClickRate": 3,
    "expectedReplies": 10
  },
  "actions": [
    { "type": "edit_subject", "label": "Update subject line", "priority": 1 }
  ],
  "confidence": 0.75
}`;
    }

    private buildEmailAnalysisPrompt(context: EmailContext): string {
        return `Analyze this email and categorize it.

From: ${context.from}
Subject: ${context.subject}
Body preview: ${context.body.substring(0, 500)}

${context.contactData ? `
Sender is known contact:
- Name: ${context.contactData.firstName} ${context.contactData.lastName}
- Company: ${context.contactData.company}
` : 'Sender is not a known contact'}

Related deals: ${context.relatedDeals?.length || 0}

Return JSON with:
{
  "title": "Brief categorization",
  "summary": "One sentence summary",
  "category": "inquiry|complaint|followup|opportunity|fyi|spam",
  "urgency": "immediate|today|this_week|no_rush",
  "sentiment": "positive|neutral|negative|urgent",
  "actionItems": [
    { "action": "Schedule demo", "deadline": "2024-01-30" }
  ],
  "suggestedResponse": {
    "tone": "professional|friendly|apologetic",
    "template": "Draft response text...",
    "confidence": 0.8
  },
  "actions": [
    { "type": "reply", "label": "Reply with template", "priority": 1 }
  ],
  "confidence": 0.85
}`;
    }

    private buildWorkflowAnalysisPrompt(context: WorkflowContext): string {
        return `Analyze user action patterns and suggest automation opportunities.

Repetitive patterns detected:
${context.repetitivePatterns.map(p =>
            `- ${p.action}: ${p.frequency} times in 30 days`
        ).join('\n')}

Existing workflows: ${context.existingWorkflows.length}

Return JSON with:
{
  "suggestions": [
    {
      "name": "Auto-assign new deals",
      "description": "Automatically assign new deals to yourself",
      "pattern": { "trigger": "deal_created", "action": "assign_to_self" },
      "frequency": 45,
      "timeSavings": 120,
      "workflow": {
        "trigger": { "type": "deal_created" },
        "actions": [
          { "type": "update_field", "field": "assignedTo", "value": "{{user.id}}" }
        ]
      },
      "confidence": 0.85
    }
  ]
}`;
    }

    private parseAIResponse(content: string): any {
        try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {};
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return {};
        }
    }
}

export const insightService = new InsightService();
export default insightService;
