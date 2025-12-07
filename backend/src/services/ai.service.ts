import { GoogleGenerativeAI } from "@google/generative-ai";
import { IOpportunity } from "../models/Opportunity";
import { IActivity } from "../models/Activity";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface AIInsights {
    dealScore: number;
    closeProbability: number;
    recommendedActions: string[];
    riskFactors: string[];
    confidence: number;
}

export interface NextActionSuggestion {
    action: string;
    reason: string;
    urgency: "high" | "medium" | "low";
}

/**
 * Analyze an opportunity and generate AI insights
 */
export async function analyzeDeal(
    opportunity: IOpportunity,
    activities: IActivity[]
): Promise<AIInsights> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Calculate basic metrics
        const daysInPipeline = Math.floor(
            (Date.now() - new Date(opportunity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        const daysSinceLastActivity = opportunity.lastActivityAt
            ? Math.floor(
                (Date.now() - new Date(opportunity.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
            )
            : daysInPipeline;

        const recentActivities = activities.slice(0, 10);
        const activitySummary = recentActivities.map((a) =>
            `- ${a.type}: ${a.title}${a.description ? ` (${a.description.substring(0, 100)})` : ""}`
        ).join("\n");

        const prompt = `You are a sales AI analyst. Analyze this sales opportunity and provide insights.

## Opportunity Details:
- Title: ${opportunity.title}
- Value: $${opportunity.value?.toLocaleString() || 0} ${opportunity.currency || "USD"}
- Current Probability: ${opportunity.probability || 50}%
- Days in Pipeline: ${daysInPipeline}
- Days Since Last Activity: ${daysSinceLastActivity}
- Total Activities: ${opportunity.activityCount || activities.length}
- Status: ${opportunity.status || "open"}

## Recent Activities (last 10):
${activitySummary || "No activities recorded yet"}

## Your Task:
Analyze this deal and return a JSON object with:
1. dealScore (0-100): Overall health score based on activity, engagement, and progress
2. closeProbability (0-100): AI-calculated probability to close
3. riskFactors (array of strings): 3-5 specific risk factors for this deal
4. recommendedActions (array of strings): 3-5 specific next actions to improve win rate
5. confidence (0-100): Your confidence in this analysis

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no explanations.

Example response format:
{"dealScore": 75, "closeProbability": 60, "riskFactors": ["No activity in 7 days", "No executive engagement"], "recommendedActions": ["Schedule follow-up call", "Send case study"], "confidence": 80}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Parse JSON response
        let insights: AIInsights;
        try {
            // Try to extract JSON from response (handle markdown code blocks if present)
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);
            insights = {
                dealScore: Math.min(100, Math.max(0, parsed.dealScore || 50)),
                closeProbability: Math.min(100, Math.max(0, parsed.closeProbability || 50)),
                recommendedActions: parsed.recommendedActions || [],
                riskFactors: parsed.riskFactors || [],
                confidence: Math.min(100, Math.max(0, parsed.confidence || 70)),
            };
        } catch (parseError) {
            console.error("Failed to parse AI response:", responseText);
            // Return default insights on parse failure
            insights = {
                dealScore: 50,
                closeProbability: opportunity.probability || 50,
                recommendedActions: ["Review deal status", "Contact prospect"],
                riskFactors: ["Unable to fully analyze - limited data"],
                confidence: 30,
            };
        }

        return insights;
    } catch (error: any) {
        console.error("AI analysis error:", error);
        throw new Error("Failed to analyze deal: " + error.message);
    }
}

/**
 * Get AI-powered next action suggestions
 */
export async function suggestNextActions(
    opportunity: IOpportunity,
    activities: IActivity[]
): Promise<NextActionSuggestion[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const recentActivities = activities.slice(0, 5);
        const activitySummary = recentActivities.map((a) =>
            `- ${a.type}: ${a.title} (${new Date(a.createdAt).toLocaleDateString()})`
        ).join("\n");

        const prompt = `You are a sales coach AI. Based on this opportunity, suggest 3 specific next actions.

## Opportunity:
- Title: ${opportunity.title}
- Value: $${opportunity.value?.toLocaleString() || 0}
- Stage: ${opportunity.stageId}
- Current Next Action: ${opportunity.nextAction || "None set"}
- Probability: ${opportunity.probability || 50}%

## Recent Activities:
${activitySummary || "No recent activities"}

## Your Task:
Suggest exactly 3 specific, actionable next steps. Return ONLY a JSON array.

Each action should have:
- action: Specific action to take (e.g., "Schedule demo with decision maker")
- reason: Why this action is important
- urgency: "high", "medium", or "low"

IMPORTANT: Return ONLY valid JSON array, no markdown, no explanations.

Example:
[{"action": "Schedule follow-up call", "reason": "No contact in 7 days", "urgency": "high"}]`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        try {
            // Extract JSON array from response
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const suggestions = JSON.parse(jsonStr);
            return suggestions.slice(0, 3).map((s: any) => ({
                action: s.action || "Follow up with prospect",
                reason: s.reason || "Stay engaged with the deal",
                urgency: ["high", "medium", "low"].includes(s.urgency) ? s.urgency : "medium",
            }));
        } catch (parseError) {
            console.error("Failed to parse suggestions:", responseText);
            return [
                { action: "Follow up with prospect", reason: "Maintain engagement", urgency: "medium" as const },
                { action: "Review deal progress", reason: "Assess deal health", urgency: "low" as const },
                { action: "Update deal information", reason: "Keep records current", urgency: "low" as const },
            ];
        }
    } catch (error: any) {
        console.error("AI suggestions error:", error);
        throw new Error("Failed to get suggestions: " + error.message);
    }
}

/**
 * Calculate AI-enhanced deal temperature
 */
export function calculateAITemperature(
    opportunity: IOpportunity,
    aiScore?: number
): "hot" | "warm" | "cold" {
    const score = aiScore ?? opportunity.aiInsights?.dealScore ?? 50;
    const daysSinceActivity = opportunity.lastActivityAt
        ? Math.floor(
            (Date.now() - new Date(opportunity.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        : 30;

    // Hot: High AI score and recent activity
    if (score >= 70 && daysSinceActivity <= 3) {
        return "hot";
    }

    // Cold: Low AI score or stale activity
    if (score < 40 || daysSinceActivity > 14) {
        return "cold";
    }

    // Warm: Everything else
    return "warm";
}
