/**
 * AI Memory Service
 * 
 * Handles memory recall, learning, and fact extraction.
 * Makes AI agents smarter with each client interaction.
 */

import { Types } from 'mongoose';
import AIClientMemory, {
    IAIClientMemory,
    IMemoryFact,
    IMemoryInteraction,
    IMemoryInsight
} from '../models/AIClientMemory';
import Contact from '../models/Contact';
import { getProModel } from '../agents/modelFactory';

/**
 * Recalled memories formatted for agent context
 */
export interface RecalledMemory {
    facts: { key: string; value: string; confidence: number }[];
    preferences: { type: string; value: string }[];
    recentInteractions: { date: Date; summary: string; outcome: string }[];
    insights: { type: string; content: string }[];
    contextString: string; // Pre-formatted for prompt injection
}

/**
 * Learning input after an interaction
 */
export interface LearningInput {
    workspaceId: string;
    contactId: string;
    companyId?: string;
    agentType: string;
    query: string;
    response: string;
    outcome?: 'positive' | 'neutral' | 'negative';
    userFeedback?: number; // -1 to 1
}

class AIMemoryService {

    /**
     * Recall memories about a client for agent context
     */
    async recall(
        workspaceId: string,
        contactId: string
    ): Promise<RecalledMemory> {
        try {
            const memory = await AIClientMemory.findOne({
                workspaceId: new Types.ObjectId(workspaceId),
                contactId: new Types.ObjectId(contactId),
            }).lean();

            if (!memory) {
                return this.emptyRecall();
            }

            // Get high-confidence facts
            const facts = memory.facts
                .filter(f => f.confidence >= 40)
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10)
                .map(f => ({ key: f.key, value: f.value, confidence: f.confidence }));

            // Get strongest preferences
            const preferences = memory.preferences
                .sort((a, b) => b.strength - a.strength)
                .slice(0, 5)
                .map(p => ({ type: p.type, value: p.value }));

            // Get recent interactions
            const recentInteractions = memory.interactions
                .slice(-5)
                .reverse()
                .map(i => ({ date: i.date, summary: i.summary, outcome: i.outcome }));

            // Get valid insights
            const now = new Date();
            const insights = memory.insights
                .filter(i => !i.validUntil || i.validUntil > now)
                .filter(i => i.confidence >= 50)
                .slice(0, 5)
                .map(i => ({ type: i.type, content: i.content }));

            // Build context string for prompt injection
            const contextString = this.buildContextString(facts, preferences, recentInteractions, insights);

            return { facts, preferences, recentInteractions, insights, contextString };
        } catch (error) {
            console.error('Memory recall error:', error);
            return this.emptyRecall();
        }
    }

    /**
     * Learn from an interaction - extract facts and update memory
     */
    async learn(input: LearningInput): Promise<void> {
        try {
            const { workspaceId, contactId, companyId, agentType, query, response, outcome, userFeedback } = input;

            // Get or create memory record
            let memory = await AIClientMemory.findOne({
                workspaceId: new Types.ObjectId(workspaceId),
                contactId: new Types.ObjectId(contactId),
            });

            if (!memory) {
                memory = new AIClientMemory({
                    workspaceId: new Types.ObjectId(workspaceId),
                    contactId: new Types.ObjectId(contactId),
                    companyId: companyId ? new Types.ObjectId(companyId) : undefined,
                    facts: [],
                    preferences: [],
                    interactions: [],
                    insights: [],
                });
            }

            // Extract facts from the conversation
            const extractedFacts = await this.extractFacts(query, response);

            // Merge new facts with existing
            for (const newFact of extractedFacts) {
                const existingIndex = memory.facts.findIndex(f => f.key === newFact.key);

                if (existingIndex >= 0) {
                    // Update existing fact
                    const existing = memory.facts[existingIndex];
                    if (existing.value === newFact.value) {
                        // Confirmation - increase confidence
                        existing.confidence = Math.min(100, existing.confidence + 10);
                        existing.confirmedCount += 1;
                    } else {
                        // Different value - update if new is more confident
                        if (newFact.confidence > existing.confidence) {
                            memory.facts[existingIndex] = newFact;
                        }
                    }
                } else {
                    // New fact
                    memory.facts.push(newFact);
                }
            }

            // Detect and update preferences
            const detectedPrefs = this.detectPreferences(query, response);
            for (const pref of detectedPrefs) {
                const existingIndex = memory.preferences.findIndex(p => p.type === pref.type);
                if (existingIndex >= 0) {
                    if (memory.preferences[existingIndex].value === pref.value) {
                        memory.preferences[existingIndex].strength += 1;
                    }
                    memory.preferences[existingIndex].lastObserved = new Date();
                } else {
                    memory.preferences.push(pref);
                }
            }

            // Add interaction summary
            const interactionSummary = await this.summarizeInteraction(query, response);
            memory.interactions.push({
                date: new Date(),
                agentType,
                query: query.substring(0, 500),
                summary: interactionSummary,
                outcome: outcome || 'neutral',
                feedbackScore: userFeedback,
            });

            // Keep only last 50 interactions
            if (memory.interactions.length > 50) {
                memory.interactions = memory.interactions.slice(-50);
            }

            // Update metrics
            memory.totalInteractions += 1;
            memory.lastInteractionAt = new Date();

            const positiveCount = memory.interactions.filter(i => i.outcome === 'positive').length;
            memory.positiveOutcomeRate = positiveCount / memory.interactions.length;

            await memory.save();

            console.log(`🧠 Memory updated for contact ${contactId}: ${extractedFacts.length} facts, ${detectedPrefs.length} preferences`);
        } catch (error) {
            console.error('Memory learning error:', error);
        }
    }

    /**
     * Record user feedback to adjust confidence
     */
    async recordFeedback(
        contactId: string,
        workspaceId: string,
        helpful: boolean
    ): Promise<void> {
        const memory = await AIClientMemory.findOne({
            workspaceId: new Types.ObjectId(workspaceId),
            contactId: new Types.ObjectId(contactId),
        });

        if (memory && memory.interactions.length > 0) {
            const lastInteraction = memory.interactions[memory.interactions.length - 1];
            lastInteraction.feedbackScore = helpful ? 1 : -1;
            lastInteraction.outcome = helpful ? 'positive' : 'negative';
            await memory.save();
        }
    }

    /**
     * Extract facts from conversation using AI
     */
    private async extractFacts(query: string, response: string): Promise<IMemoryFact[]> {
        try {
            const model = getProModel();

            const prompt = `Extract key facts about this client from the conversation. Return JSON array.

Conversation:
User: ${query.substring(0, 1000)}
AI: ${response.substring(0, 1000)}

Extract facts like:
- budget_range: "$X-Y"
- decision_timeline: "Q1 2024"
- pain_points: "specific issues"
- team_size: "number"
- tech_stack: "technologies used"
- industry: "sector"
- decision_maker: "name/role"

Return ONLY valid JSON array:
[{"key": "fact_key", "value": "fact_value", "confidence": 70}]

If no clear facts found, return empty array: []`;

            const result = await model.invoke(prompt);
            const content = result.content?.toString() || '[]';

            // Extract JSON from response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map((f: any) => ({
                    key: f.key,
                    value: f.value,
                    confidence: f.confidence || 60,
                    source: 'agent_conversation',
                    extractedAt: new Date(),
                    confirmedCount: 1,
                }));
            }
        } catch (error) {
            console.warn('Fact extraction failed:', error);
        }
        return [];
    }

    /**
     * Detect preferences from communication patterns
     */
    private detectPreferences(query: string, response: string): any[] {
        const prefs: any[] = [];

        // Detect formality preference
        const formalIndicators = /please|kindly|would you|could you|dear|regards/gi;
        const casualIndicators = /hey|hi|thanks|cool|awesome|great/gi;

        const formalCount = (query.match(formalIndicators) || []).length;
        const casualCount = (query.match(casualIndicators) || []).length;

        if (formalCount > casualCount + 1) {
            prefs.push({ type: 'communication_style', value: 'formal', strength: 1, lastObserved: new Date() });
        } else if (casualCount > formalCount + 1) {
            prefs.push({ type: 'communication_style', value: 'casual', strength: 1, lastObserved: new Date() });
        }

        // Detect brevity preference
        if (query.length < 50) {
            prefs.push({ type: 'message_length', value: 'brief', strength: 1, lastObserved: new Date() });
        } else if (query.length > 300) {
            prefs.push({ type: 'message_length', value: 'detailed', strength: 1, lastObserved: new Date() });
        }

        return prefs;
    }

    /**
     * Summarize an interaction for memory storage
     */
    private async summarizeInteraction(query: string, response: string): Promise<string> {
        try {
            const model = getProModel();

            const prompt = `Summarize this interaction in 1-2 sentences for future reference:
User: ${query.substring(0, 500)}
AI: ${response.substring(0, 500)}

Summary:`;

            const result = await model.invoke(prompt);
            return result.content?.toString().substring(0, 500) || 'Interaction occurred';
        } catch {
            return `Query about: ${query.substring(0, 100)}...`;
        }
    }

    /**
     * Build context string for prompt injection
     */
    private buildContextString(
        facts: any[],
        preferences: any[],
        interactions: any[],
        insights: any[]
    ): string {
        if (facts.length === 0 && preferences.length === 0) {
            return '';
        }

        let context = '\n📋 CLIENT CONTEXT (from learned memory):\n';

        if (facts.length > 0) {
            context += 'Known facts:\n';
            facts.forEach(f => {
                context += `  • ${f.key}: ${f.value}\n`;
            });
        }

        if (preferences.length > 0) {
            const prefStr = preferences.map(p => `${p.type}=${p.value}`).join(', ');
            context += `Preferences: ${prefStr}\n`;
        }

        if (interactions.length > 0) {
            context += `Last interaction: ${interactions[0].summary}\n`;
        }

        if (insights.length > 0) {
            context += `Insights: ${insights.map(i => i.content).join('; ')}\n`;
        }

        return context;
    }

    private emptyRecall(): RecalledMemory {
        return {
            facts: [],
            preferences: [],
            recentInteractions: [],
            insights: [],
            contextString: '',
        };
    }

    /**
     * Get memory for a contact (for UI display)
     */
    async getMemory(workspaceId: string, contactId: string): Promise<IAIClientMemory | null> {
        return AIClientMemory.findOne({
            workspaceId: new Types.ObjectId(workspaceId),
            contactId: new Types.ObjectId(contactId),
        });
    }

    /**
     * Delete memory for a contact
     */
    async deleteMemory(workspaceId: string, contactId: string): Promise<void> {
        await AIClientMemory.deleteOne({
            workspaceId: new Types.ObjectId(workspaceId),
            contactId: new Types.ObjectId(contactId),
        });
    }
}

export const aiMemoryService = new AIMemoryService();
export default aiMemoryService;
