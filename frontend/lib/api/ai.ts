/**
 * AI API Client
 * Handles AI analysis and suggestions for opportunities
 */

import { axiosInstance } from '../axios';

export interface AIInsights {
    dealScore: number;
    closeProbability: number;
    recommendedActions: string[];
    riskFactors: string[];
    lastAnalyzedAt: string;
    confidenceLevel: number;
}

export interface NextActionSuggestion {
    action: string;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
}

/**
 * Trigger AI analysis for an opportunity
 */
export async function analyzeOpportunity(
    workspaceId: string,
    opportunityId: string
) {
    try {
        const response = await axiosInstance.post(
            `/workspaces/${workspaceId}/opportunities/${opportunityId}/analyze`,
            {}
        );
        return response.data;
    } catch (error: any) {
        console.error('AI analysis error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Get AI-powered next action suggestions
 */
export async function getAISuggestions(
    workspaceId: string,
    opportunityId: string
) {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/opportunities/${opportunityId}/suggestions`
        );
        return response.data;
    } catch (error: any) {
        console.error('AI suggestions error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Get cached AI insights (without triggering new analysis)
 */
export async function getAIInsights(
    workspaceId: string,
    opportunityId: string
) {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/opportunities/${opportunityId}/insights`
        );
        return response.data;
    } catch (error: any) {
        console.error('Get AI insights error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}
