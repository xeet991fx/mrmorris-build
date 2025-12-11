// Stub file - AI features removed
// These functions do nothing but prevent import errors

export interface AIInsights {
    dealScore: number;
    closeProbability: number;
    recommendedActions: string[];
    riskFactors: string[];
    confidence: number;
    confidenceLevel?: number;
    lastAnalyzedAt?: string;
}

export interface NextActionSuggestion {
    action: string;
    reason: string;
    urgency: "high" | "medium" | "low";
}

export async function analyzeOpportunity(
    workspaceId: string,
    opportunityId: string
): Promise<{ success: boolean; data?: { insights: AIInsights }; error?: string }> {
    return {
        success: false,
        error: "AI analysis feature is not available",
    };
}

export async function getAISuggestions(
    workspaceId: string,
    opportunityId: string
): Promise<{ success: boolean; data?: { suggestions: NextActionSuggestion[] }; error?: string }> {
    return {
        success: false,
        error: "AI suggestions feature is not available",
    };
}
