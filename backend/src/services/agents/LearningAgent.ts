/**
 * LearningAgent - Performance Optimization Agent
 * Analyzes workflow and campaign performance, suggests improvements
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAgent } from './BaseAgent';
import {
    AgentTask,
    AgentResult,
    AgentContext
} from './types';
import Workflow from '../../models/Workflow';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface LearningTaskPayload {
    action: 'analyze' | 'suggest' | 'report';
    workflowId?: string;
    timeRange?: 'week' | 'month' | 'quarter';
}

interface PerformanceMetrics {
    workflowId: string;
    workflowName: string;
    totalEnrollments: number;
    completionRate: number;
    averageCompletionTime: number; // days
    emailMetrics?: {
        sent: number;
        opened: number;
        clicked: number;
        openRate: number;
        clickRate: number;
    };
    goalConversionRate?: number;
}

export class LearningAgent extends BaseAgent {
    private model: any;

    constructor() {
        super('learning', {
            settings: {
                model: 'gemini-2.0-flash',
                minDataPoints: 10,
                poorPerformanceThreshold: 0.15, // 15% is considered poor
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.model = genAI.getGenerativeModel({
            model: this.config.settings.model || "gemini-2.0-flash"
        });
        this.log('Learning Agent initialized');
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'learning:task' ||
            task.type === 'analyze_performance' ||
            task.type === 'get_suggestions' ||
            task.type.startsWith('learning:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as LearningTaskPayload;

        switch (payload.action) {
            case 'analyze':
                return this.analyzePerformance(task.context, payload.workflowId);

            case 'suggest':
                return this.generateSuggestions(task.context, payload.workflowId);

            case 'report':
                return this.generateReport(task.context, payload.timeRange || 'week');

            default:
                return this.analyzePerformance(task.context);
        }
    }

    private async analyzePerformance(
        context: AgentContext,
        workflowId?: string
    ): Promise<AgentResult> {
        try {
            // Get workflows for analysis
            const workflows = await this.getWorkflows(context.workspaceId, workflowId);

            if (workflows.length === 0) {
                return this.success({
                    message: "No active workflows found to analyze.",
                    hasData: false,
                });
            }

            // Collect metrics for each workflow
            const metrics: PerformanceMetrics[] = [];

            for (const workflow of workflows) {
                const workflowMetrics = await this.calculateWorkflowMetrics(workflow);
                metrics.push(workflowMetrics);
            }

            // Identify issues
            const issues = this.identifyIssues(metrics);

            // Generate response
            const response = this.formatAnalysisResponse(metrics, issues);

            return this.success({
                metrics,
                issues,
                response,
                hasData: true,
            });

        } catch (error: any) {
            this.log('Analysis error:', error.message);
            return this.error(`Failed to analyze performance: ${error.message}`);
        }
    }

    private async generateSuggestions(
        context: AgentContext,
        workflowId?: string
    ): Promise<AgentResult> {
        // First get the analysis
        const analysisResult = await this.analyzePerformance(context, workflowId);

        if (!analysisResult.success || !analysisResult.data?.hasData) {
            return this.success({
                suggestions: [],
                message: "Need more data to generate suggestions. Keep running your workflows!",
            });
        }

        const { metrics, issues } = analysisResult.data;

        // Generate AI-powered suggestions
        const suggestions = await this.generateAISuggestions(metrics, issues);

        return this.success({
            suggestions,
            basedOn: {
                workflowsAnalyzed: metrics.length,
                issuesFound: issues.length,
            },
            response: this.formatSuggestionsResponse(suggestions),
        });
    }

    private async generateReport(
        context: AgentContext,
        timeRange: 'week' | 'month' | 'quarter'
    ): Promise<AgentResult> {
        const analysisResult = await this.analyzePerformance(context);

        if (!analysisResult.success) {
            return analysisResult;
        }

        const { metrics } = analysisResult.data;

        // Calculate summary stats
        const summary = this.calculateSummaryStats(metrics);

        // Generate report
        const report = this.formatReport(summary, timeRange);

        return this.success({
            summary,
            timeRange,
            report,
        });
    }

    private async getWorkflows(workspaceId: string, workflowId?: string): Promise<any[]> {
        const query: any = {
            workspaceId,
            status: 'active',
        };

        if (workflowId) {
            query._id = workflowId;
        }

        return Workflow.find(query).limit(50);
    }

    private async calculateWorkflowMetrics(workflow: any): Promise<PerformanceMetrics> {
        // Get stats from workflow document
        const stats = workflow.stats || {};

        return {
            workflowId: workflow._id.toString(),
            workflowName: workflow.name,
            totalEnrollments: stats.totalEnrolled || 0,
            completionRate: stats.totalCompleted && stats.totalEnrolled
                ? stats.totalCompleted / stats.totalEnrolled
                : 0,
            averageCompletionTime: 0, // Would need enrollment data
            emailMetrics: stats.emailsSent ? {
                sent: stats.emailsSent || 0,
                opened: stats.emailsOpened || 0,
                clicked: stats.emailsClicked || 0,
                openRate: stats.emailsSent ? (stats.emailsOpened || 0) / stats.emailsSent : 0,
                clickRate: stats.emailsOpened ? (stats.emailsClicked || 0) / stats.emailsOpened : 0,
            } : undefined,
            goalConversionRate: stats.goalsMet && stats.totalEnrolled
                ? stats.goalsMet / stats.totalEnrolled
                : undefined,
        };
    }

    private identifyIssues(metrics: PerformanceMetrics[]): string[] {
        const issues: string[] = [];
        const threshold = this.config.settings.poorPerformanceThreshold;

        for (const m of metrics) {
            // Low completion rate
            if (m.totalEnrollments > 10 && m.completionRate < threshold) {
                issues.push(`"${m.workflowName}" has low completion rate (${(m.completionRate * 100).toFixed(1)}%)`);
            }

            // Low email open rate
            if (m.emailMetrics && m.emailMetrics.sent > 10 && m.emailMetrics.openRate < threshold) {
                issues.push(`"${m.workflowName}" has low email open rate (${(m.emailMetrics.openRate * 100).toFixed(1)}%)`);
            }

            // Low click rate
            if (m.emailMetrics && m.emailMetrics.opened > 10 && m.emailMetrics.clickRate < 0.05) {
                issues.push(`"${m.workflowName}" has low email click rate (${(m.emailMetrics.clickRate * 100).toFixed(1)}%)`);
            }
        }

        return issues;
    }

    private async generateAISuggestions(
        metrics: PerformanceMetrics[],
        issues: string[]
    ): Promise<string[]> {
        if (issues.length === 0) {
            return ["Your workflows are performing well! Keep monitoring for trends."];
        }

        const prompt = `You are a CRM optimization expert. Based on these performance issues, provide 3-5 specific, actionable suggestions:

ISSUES:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Provide suggestions as a JSON array of strings. Each suggestion should be specific and actionable.
Example: ["Improve email subject lines with personalization", "Add a follow-up delay after emails"]

\`\`\`json
`;

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
            });

            const response = result.response.text();
            const jsonMatch = response.match(/\[[\s\S]*?\]/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            this.log('AI suggestion error:', error);
        }

        // Fallback suggestions
        return [
            "Review email subject lines for better engagement",
            "Consider adjusting workflow timing and delays",
            "Test different email content variations",
        ];
    }

    private calculateSummaryStats(metrics: PerformanceMetrics[]): any {
        const totalEnrollments = metrics.reduce((sum, m) => sum + m.totalEnrollments, 0);
        const avgCompletionRate = metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.completionRate, 0) / metrics.length
            : 0;

        let totalEmailsSent = 0;
        let totalEmailsOpened = 0;

        for (const m of metrics) {
            if (m.emailMetrics) {
                totalEmailsSent += m.emailMetrics.sent;
                totalEmailsOpened += m.emailMetrics.opened;
            }
        }

        return {
            workflowCount: metrics.length,
            totalEnrollments,
            avgCompletionRate,
            totalEmailsSent,
            avgEmailOpenRate: totalEmailsSent > 0 ? totalEmailsOpened / totalEmailsSent : 0,
        };
    }

    private formatAnalysisResponse(metrics: PerformanceMetrics[], issues: string[]): string {
        let response = `📊 **Performance Analysis**\n\n`;
        response += `**Workflows Analyzed:** ${metrics.length}\n\n`;

        if (issues.length > 0) {
            response += `⚠️ **Issues Found:**\n`;
            issues.forEach(issue => {
                response += `- ${issue}\n`;
            });
        } else {
            response += `✅ **All workflows performing well!**\n`;
        }

        return response;
    }

    private formatSuggestionsResponse(suggestions: string[]): string {
        let response = `💡 **Optimization Suggestions**\n\n`;
        suggestions.forEach((s, i) => {
            response += `${i + 1}. ${s}\n`;
        });
        return response;
    }

    private formatReport(summary: any, timeRange: string): string {
        let report = `📈 **Performance Report (${timeRange})**\n\n`;
        report += `**Overview:**\n`;
        report += `- Active Workflows: ${summary.workflowCount}\n`;
        report += `- Total Enrollments: ${summary.totalEnrollments}\n`;
        report += `- Avg Completion Rate: ${(summary.avgCompletionRate * 100).toFixed(1)}%\n`;
        report += `- Emails Sent: ${summary.totalEmailsSent}\n`;
        report += `- Avg Open Rate: ${(summary.avgEmailOpenRate * 100).toFixed(1)}%\n`;
        return report;
    }
}

export default LearningAgent;
