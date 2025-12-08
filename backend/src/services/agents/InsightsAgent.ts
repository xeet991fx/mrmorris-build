/**
 * InsightsAgent - Data Analytics & Insights Agent
 * Analyzes CRM data patterns and generates proactive insights
 */

import { BaseAgent } from './BaseAgent';
import { AgentTask, AgentResult } from './types';

interface InsightsTaskPayload {
    action: 'daily_report' | 'trend_analysis' | 'anomaly_detection' | 'forecast' | 'segment_analysis';
    timeRange?: 'day' | 'week' | 'month' | 'quarter';
    entityType?: 'contacts' | 'deals' | 'workflows' | 'emails';
}

interface InsightData {
    type: string;
    title: string;
    description: string;
    value?: number | string;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
    priority: 'low' | 'medium' | 'high';
    actionable?: string;
}

export class InsightsAgent extends BaseAgent {
    constructor() {
        super('insights', {
            settings: {
                dailyReportTime: '09:00',
                anomalyThreshold: 2.0, // standard deviations
                minDataPointsForTrend: 7,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.log('Insights Agent initialized');
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'insights:task' ||
            task.type === 'get_insights' ||
            task.type === 'daily_report' ||
            task.type.startsWith('insights:') ||
            task.type.startsWith('analytics:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as InsightsTaskPayload;

        switch (payload.action) {
            case 'daily_report':
                return this.generateDailyReport(task.context.workspaceId);

            case 'trend_analysis':
                return this.analyzeTrends(task.context.workspaceId, payload);

            case 'anomaly_detection':
                return this.detectAnomalies(task.context.workspaceId, payload);

            case 'forecast':
                return this.generateForecast(task.context.workspaceId, payload);

            case 'segment_analysis':
                return this.analyzeSegments(task.context.workspaceId);

            default:
                return this.generateDailyReport(task.context.workspaceId);
        }
    }

    private async generateDailyReport(workspaceId: string): Promise<AgentResult> {
        try {
            const insights: InsightData[] = [];

            // Contact insights
            const contactStats = await this.getContactStats(workspaceId);
            insights.push({
                type: 'contacts',
                title: 'New Contacts',
                description: `${contactStats.newToday} new contacts added today`,
                value: contactStats.newToday,
                change: contactStats.changePercent,
                trend: contactStats.changePercent > 0 ? 'up' : contactStats.changePercent < 0 ? 'down' : 'stable',
                priority: contactStats.newToday > 10 ? 'high' : 'medium',
            });

            // Deal insights
            const dealStats = await this.getDealStats(workspaceId);
            insights.push({
                type: 'deals',
                title: 'Pipeline Value',
                description: `$${dealStats.totalValue.toLocaleString()} in active deals`,
                value: dealStats.totalValue,
                change: dealStats.valueChange,
                trend: dealStats.valueChange > 0 ? 'up' : 'down',
                priority: 'high',
                actionable: dealStats.stuckDeals > 0 ? `${dealStats.stuckDeals} deals stuck for 7+ days` : undefined,
            });

            // Email insights
            const emailStats = await this.getEmailStats(workspaceId);
            insights.push({
                type: 'emails',
                title: 'Email Performance',
                description: `${(emailStats.openRate * 100).toFixed(1)}% open rate this week`,
                value: emailStats.openRate,
                trend: emailStats.openRate > 0.2 ? 'up' : 'down',
                priority: emailStats.openRate < 0.15 ? 'high' : 'low',
                actionable: emailStats.openRate < 0.15 ? 'Consider A/B testing subject lines' : undefined,
            });

            // Workflow insights
            const workflowStats = await this.getWorkflowStats(workspaceId);
            insights.push({
                type: 'workflows',
                title: 'Workflow Activity',
                description: `${workflowStats.activeEnrollments} active enrollments`,
                value: workflowStats.activeEnrollments,
                priority: 'medium',
            });

            const report = this.formatDailyReport(insights);

            return this.success({
                insights,
                report,
                generatedAt: new Date(),
            });

        } catch (error: any) {
            return this.error(`Failed to generate daily report: ${error.message}`);
        }
    }

    private async analyzeTrends(
        workspaceId: string,
        payload: InsightsTaskPayload
    ): Promise<AgentResult> {
        const { timeRange = 'week', entityType = 'deals' } = payload;

        const trends: InsightData[] = [];

        // Analyze trends based on entity type
        switch (entityType) {
            case 'contacts':
                trends.push({
                    type: 'trend',
                    title: 'Contact Growth Trend',
                    description: 'Analyzing contact acquisition over time',
                    trend: 'up',
                    priority: 'medium',
                });
                break;

            case 'deals':
                trends.push({
                    type: 'trend',
                    title: 'Deal Velocity',
                    description: 'Average time to close deals',
                    value: '14 days',
                    trend: 'stable',
                    priority: 'medium',
                });
                break;

            case 'emails':
                trends.push({
                    type: 'trend',
                    title: 'Email Engagement Trend',
                    description: 'Open and click rates over time',
                    trend: 'down',
                    priority: 'high',
                    actionable: 'Email engagement is declining. Consider refreshing templates.',
                });
                break;
        }

        return this.success({
            trends,
            timeRange,
            entityType,
            response: this.formatTrendAnalysis(trends),
        });
    }

    private async detectAnomalies(
        workspaceId: string,
        payload: InsightsTaskPayload
    ): Promise<AgentResult> {
        const anomalies: InsightData[] = [];

        // Check for unusual patterns
        // Would analyze data for statistical anomalies

        // Example anomalies
        anomalies.push({
            type: 'anomaly',
            title: 'Unusual Activity Detected',
            description: 'Email bounce rate spiked 3x above normal',
            priority: 'high',
            actionable: 'Check email list quality and sender reputation',
        });

        return this.success({
            anomalies,
            detected: anomalies.length,
            response: this.formatAnomalies(anomalies),
        });
    }

    private async generateForecast(
        workspaceId: string,
        payload: InsightsTaskPayload
    ): Promise<AgentResult> {
        const forecasts: InsightData[] = [];

        // Generate forecasts
        forecasts.push({
            type: 'forecast',
            title: 'Revenue Forecast',
            description: 'Based on current pipeline and historical conversion rates',
            value: '$125,000',
            priority: 'high',
        });

        forecasts.push({
            type: 'forecast',
            title: 'Deals Expected to Close',
            description: 'In the next 30 days',
            value: 12,
            priority: 'medium',
        });

        return this.success({
            forecasts,
            period: 'next_30_days',
            response: this.formatForecasts(forecasts),
        });
    }

    private async analyzeSegments(workspaceId: string): Promise<AgentResult> {
        const segments: InsightData[] = [];

        // Analyze contact segments
        segments.push({
            type: 'segment',
            title: 'High-Value Prospects',
            description: '45 contacts with high engagement score',
            value: 45,
            priority: 'high',
            actionable: 'Consider prioritizing outreach to this segment',
        });

        segments.push({
            type: 'segment',
            title: 'At-Risk Customers',
            description: '12 customers with declining engagement',
            value: 12,
            priority: 'high',
            actionable: 'Set up re-engagement workflow',
        });

        return this.success({
            segments,
            response: this.formatSegmentAnalysis(segments),
        });
    }

    // Data fetching methods (would query actual database)
    private async getContactStats(workspaceId: string): Promise<any> {
        return {
            newToday: 8,
            total: 1250,
            changePercent: 12.5,
        };
    }

    private async getDealStats(workspaceId: string): Promise<any> {
        return {
            totalValue: 450000,
            valueChange: 15,
            activeDeals: 32,
            stuckDeals: 3,
        };
    }

    private async getEmailStats(workspaceId: string): Promise<any> {
        return {
            sent: 250,
            opened: 75,
            clicked: 18,
            openRate: 0.30,
            clickRate: 0.24,
        };
    }

    private async getWorkflowStats(workspaceId: string): Promise<any> {
        return {
            activeWorkflows: 5,
            activeEnrollments: 120,
            completedToday: 15,
        };
    }

    // Formatting methods
    private formatDailyReport(insights: InsightData[]): string {
        let report = `📊 **Daily Insights Report**\n\n`;

        for (const insight of insights) {
            const trendIcon = insight.trend === 'up' ? '📈' : insight.trend === 'down' ? '📉' : '➡️';
            report += `${trendIcon} **${insight.title}**\n`;
            report += `${insight.description}\n`;
            if (insight.actionable) {
                report += `💡 _${insight.actionable}_\n`;
            }
            report += '\n';
        }

        return report;
    }

    private formatTrendAnalysis(trends: InsightData[]): string {
        let response = `📈 **Trend Analysis**\n\n`;
        for (const trend of trends) {
            response += `• **${trend.title}**: ${trend.description}\n`;
        }
        return response;
    }

    private formatAnomalies(anomalies: InsightData[]): string {
        if (anomalies.length === 0) {
            return '✅ No anomalies detected.';
        }

        let response = `⚠️ **Anomalies Detected (${anomalies.length})**\n\n`;
        for (const anomaly of anomalies) {
            response += `• **${anomaly.title}**: ${anomaly.description}\n`;
            if (anomaly.actionable) {
                response += `  💡 ${anomaly.actionable}\n`;
            }
        }
        return response;
    }

    private formatForecasts(forecasts: InsightData[]): string {
        let response = `🔮 **Forecasts**\n\n`;
        for (const forecast of forecasts) {
            response += `• **${forecast.title}**: ${forecast.value}\n`;
            response += `  _${forecast.description}_\n`;
        }
        return response;
    }

    private formatSegmentAnalysis(segments: InsightData[]): string {
        let response = `👥 **Segment Analysis**\n\n`;
        for (const segment of segments) {
            response += `• **${segment.title}** (${segment.value})\n`;
            response += `  ${segment.description}\n`;
            if (segment.actionable) {
                response += `  💡 ${segment.actionable}\n`;
            }
        }
        return response;
    }
}

export default InsightsAgent;
