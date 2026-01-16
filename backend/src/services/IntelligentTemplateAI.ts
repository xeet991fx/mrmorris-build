import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRedisClient } from "../config/redis";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================
// CONCURRENCY LIMITER
// ============================================

class ConcurrencyLimiter {
    private running: number = 0;
    private queue: Array<() => void> = [];
    private readonly maxConcurrent: number;
    private readonly perUserLimits: Map<string, number> = new Map();
    private readonly maxPerUser: number;

    constructor(maxConcurrent: number = 20, maxPerUser: number = 3) {
        this.maxConcurrent = maxConcurrent;
        this.maxPerUser = maxPerUser;
    }

    async acquire(userId?: string): Promise<() => void> {
        // Check per-user limit
        if (userId) {
            const userCount = this.perUserLimits.get(userId) || 0;
            if (userCount >= this.maxPerUser) {
                throw new Error(`Too many concurrent requests. Please wait for previous requests to complete.`);
            }
            this.perUserLimits.set(userId, userCount + 1);
        }

        // Wait for slot if at capacity
        if (this.running >= this.maxConcurrent) {
            await new Promise<void>((resolve) => {
                this.queue.push(resolve);
            });
        }

        this.running++;

        // Return release function
        return () => {
            this.running--;
            if (userId) {
                const count = this.perUserLimits.get(userId) || 1;
                if (count <= 1) {
                    this.perUserLimits.delete(userId);
                } else {
                    this.perUserLimits.set(userId, count - 1);
                }
            }
            const next = this.queue.shift();
            if (next) next();
        };
    }

    getStats() {
        return {
            running: this.running,
            queued: this.queue.length,
            maxConcurrent: this.maxConcurrent,
        };
    }
}

// Global limiter: 20 concurrent AI requests, 3 per user
export const aiConcurrencyLimiter = new ConcurrencyLimiter(20, 3);

// ============================================
// TYPES
// ============================================

export interface ConversationMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    designSnapshot?: any;
}

export interface TemplateContext {
    templateId: string;
    templateName: string;
    templateSubject: string;
    templateCategory: string;
    templateDescription?: string;
    workspaceName?: string;
    industry?: string;
    brandColors?: string[];
    targetAudience?: string;
}

export interface AISession {
    sessionId: string;
    templateContext: TemplateContext;
    conversationHistory: ConversationMessage[];
    originalDesign: any;
    currentDesign: any;
    designSummary: string; // Compact summary instead of full JSON
    modificationCount: number;
    createdAt: Date;
    lastUpdatedAt: Date;
    cachedSuggestions?: string[];
    suggestionsTimestamp?: Date;
}

export interface IntelligentModifyOptions {
    sessionId?: string;
    instruction: string;
    currentDesign: any;
    currentSubject: string;
    templateContext?: Partial<TemplateContext>;
    userId?: string; // For per-user rate limiting
}

export interface IntelligentResponse {
    subject: string;
    body: string;
    html: string;
    design: any;
    aiMessage: string;
    suggestions: string[];
    changes: string[];
    sessionId: string;
}

// Session storage - Redis for production, in-memory fallback
const SESSION_PREFIX = "ai_session:";
const SESSION_TTL = 3600; // 1 hour TTL for sessions
const localSessions: Map<string, AISession> = new Map(); // Fallback

// ============================================
// DESIGN SUMMARIZER - Key optimization!
// ============================================

function summarizeDesign(design: any): string {
    if (!design?.body?.rows) {
        return "Empty template";
    }

    const rows = design.body.rows;
    const bodyValues = design.body.values || {};

    const sections: string[] = [];

    rows.forEach((row: any, rowIndex: number) => {
        const rowContents: string[] = [];

        (row.columns || []).forEach((col: any) => {
            (col.contents || []).forEach((content: any) => {
                const type = content.type;
                const values = content.values || {};

                switch (type) {
                    case "text":
                    case "heading":
                        // Extract just the text content, remove HTML
                        const text = (values.text || "")
                            .replace(/<[^>]*>/g, " ")
                            .replace(/\s+/g, " ")
                            .trim()
                            .substring(0, 100);
                        rowContents.push(`${type}: "${text}${text.length >= 100 ? "..." : ""}"`);
                        break;
                    case "button":
                        rowContents.push(`button: "${values.text || "Click"}" -> ${values.href?.url || "#"}`);
                        break;
                    case "image":
                        rowContents.push(`image: ${values.src?.url ? "has image" : "placeholder"}`);
                        break;
                    case "divider":
                        rowContents.push("divider");
                        break;
                    case "html":
                        const htmlText = (values.html || "")
                            .replace(/<[^>]*>/g, " ")
                            .replace(/\s+/g, " ")
                            .trim()
                            .substring(0, 80);
                        rowContents.push(`html-block: "${htmlText}..."`);
                        break;
                    case "social":
                        rowContents.push("social-icons");
                        break;
                    default:
                        rowContents.push(type);
                }
            });
        });

        if (rowContents.length > 0) {
            const rowBg = row.values?.backgroundColor;
            sections.push(`Row ${rowIndex + 1}${rowBg ? ` (bg: ${rowBg})` : ""}: [${rowContents.join(", ")}]`);
        }
    });

    const style = [];
    if (bodyValues.backgroundColor) style.push(`bg: ${bodyValues.backgroundColor}`);
    if (bodyValues.textColor) style.push(`text: ${bodyValues.textColor}`);
    if (bodyValues.contentWidth) style.push(`width: ${bodyValues.contentWidth}`);
    if (bodyValues.fontFamily?.label) style.push(`font: ${bodyValues.fontFamily.label}`);

    return `TEMPLATE STRUCTURE:
Style: ${style.join(", ") || "default"}
Sections:
${sections.join("\n")}`;
}

// ============================================
// INTELLIGENT TEMPLATE AI SERVICE - OPTIMIZED
// ============================================

export class IntelligentTemplateAI {
    private fastModel; // For quick tasks
    private proModel;  // For complex generation

    constructor() {
        // Use Flash for analysis and simple tasks (faster, cheaper)
        this.fastModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        // Use Pro only for complex template generation
        this.proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    }

    private generateSessionId(): string {
        return `s_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    // Redis session storage with fallback to local memory
    async getSessionAsync(sessionId?: string): Promise<AISession | null> {
        if (!sessionId) return null;

        try {
            const redis = getRedisClient();
            const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
            if (data) {
                const session = JSON.parse(data);
                // Convert date strings back to Date objects
                session.createdAt = new Date(session.createdAt);
                session.lastUpdatedAt = new Date(session.lastUpdatedAt);
                if (session.suggestionsTimestamp) {
                    session.suggestionsTimestamp = new Date(session.suggestionsTimestamp);
                }
                session.conversationHistory = session.conversationHistory.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                }));
                return session;
            }
        } catch (error) {
            console.log("Redis unavailable, using local session storage");
        }

        // Fallback to local storage
        return localSessions.get(sessionId) || null;
    }

    // Sync version for backward compatibility
    getSession(sessionId?: string): AISession | null {
        if (!sessionId) return null;
        return localSessions.get(sessionId) || null;
    }

    async saveSession(session: AISession): Promise<void> {
        try {
            const redis = getRedisClient();
            await redis.setex(
                `${SESSION_PREFIX}${session.sessionId}`,
                SESSION_TTL,
                JSON.stringify(session)
            );
        } catch (error) {
            // Fallback to local storage
            localSessions.set(session.sessionId, session);

            // Cleanup old local sessions (keep last 200)
            if (localSessions.size > 200) {
                const oldest = Array.from(localSessions.entries())
                    .sort((a, b) => a[1].lastUpdatedAt.getTime() - b[1].lastUpdatedAt.getTime())
                    .slice(0, localSessions.size - 200);
                oldest.forEach(([id]) => localSessions.delete(id));
            }
        }
    }

    async createSession(templateContext: TemplateContext, originalDesign: any): Promise<AISession> {
        const sessionId = this.generateSessionId();
        const session: AISession = {
            sessionId,
            templateContext,
            conversationHistory: [],
            originalDesign: JSON.parse(JSON.stringify(originalDesign)),
            currentDesign: JSON.parse(JSON.stringify(originalDesign)),
            designSummary: summarizeDesign(originalDesign),
            modificationCount: 0,
            createdAt: new Date(),
            lastUpdatedAt: new Date(),
        };

        await this.saveSession(session);
        return session;
    }

    /**
     * OPTIMIZED: Compact prompt for modifications
     */
    private buildCompactPrompt(session: AISession, instruction: string): string {
        const ctx = session.templateContext;

        // Only last 3 conversation turns
        const recentHistory = session.conversationHistory
            .slice(-6)
            .map(m => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`)
            .join("\n");

        return `You are an email template design expert. Modify the template based on the user's request.

TEMPLATE: "${ctx.templateName}" (${ctx.templateCategory})
SUBJECT: "${ctx.templateSubject}"

CURRENT STRUCTURE:
${session.designSummary}

${recentHistory ? `RECENT CONVERSATION:\n${recentHistory}\n` : ""}
CURRENT DESIGN JSON:
${JSON.stringify(session.currentDesign, null, 0)}

USER REQUEST: ${instruction}

OUTPUT (JSON only, no markdown):
{
  "subject": "updated subject if changed, otherwise keep same",
  "design": { /* COMPLETE modified Unlayer design JSON */ },
  "aiMessage": "Brief friendly message (1 sentence)",
  "changes": ["change 1", "change 2"],
  "suggestions": ["next suggestion 1", "next suggestion 2"]
}

RULES:
- Return COMPLETE valid Unlayer JSON in "design"
- Keep {{firstName}}, {{company}} variables
- Make only requested changes
- Preserve structure unless asked to change`;
    }

    /**
     * Analyze design - uses FAST model with caching
     */
    async analyzeDesign(design: any, context: TemplateContext): Promise<string[]> {
        // Check cache first (using Redis)
        const cacheKey = `analyze_${context.templateId}`;

        try {
            const redis = getRedisClient();
            const cached = await redis.get(`${SESSION_PREFIX}cache_${cacheKey}`);
            if (cached) {
                const data = JSON.parse(cached);
                console.log("Using cached suggestions from Redis");
                return data.suggestions;
            }
        } catch (error) {
            // Redis unavailable, continue without cache
        }

        const summary = summarizeDesign(design);

        const prompt = `Analyze this email template and give 4 specific improvement suggestions:

Template: "${context.templateName}" (${context.templateCategory})
Subject: "${context.templateSubject}"

Structure:
${summary}

Return JSON array only: ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]`;

        try {
            const result = await this.fastModel.generateContent(prompt);
            const text = result.response.text().trim();
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
                const suggestions = JSON.parse(match[0]);

                // Cache in Redis for 5 minutes
                try {
                    const redis = getRedisClient();
                    await redis.setex(
                        `${SESSION_PREFIX}cache_${cacheKey}`,
                        300, // 5 minutes
                        JSON.stringify({ suggestions })
                    );
                } catch (error) {
                    // Ignore cache errors
                }

                return suggestions;
            }
        } catch (error) {
            console.error("Analyze error:", error);
        }

        return [
            "Add a compelling call-to-action button",
            "Include social media links in footer",
            "Add a header image for visual impact",
            "Consider adding customer testimonials",
        ];
    }

    /**
     * OPTIMIZED: Modify template with compact prompts and concurrency limiting
     */
    async modifyTemplate(options: IntelligentModifyOptions): Promise<IntelligentResponse> {
        const {
            sessionId,
            instruction,
            currentDesign,
            currentSubject,
            templateContext,
            userId,
        } = options;

        // Acquire concurrency slot (will queue if at capacity)
        const release = await aiConcurrencyLimiter.acquire(userId);

        try {
            // Get or create session (async)
            let session = sessionId ? await this.getSessionAsync(sessionId) : null;

            if (!session) {
                const ctx: TemplateContext = {
                    templateId: templateContext?.templateId || "unknown",
                    templateName: templateContext?.templateName || "Email Template",
                    templateSubject: currentSubject,
                    templateCategory: templateContext?.templateCategory || "custom",
                    templateDescription: templateContext?.templateDescription,
                };
                session = await this.createSession(ctx, currentDesign);
            }

            // Update current state
            session.currentDesign = currentDesign;
            session.designSummary = summarizeDesign(currentDesign);

            // Add user message
            session.conversationHistory.push({
                role: "user",
                content: instruction,
                timestamp: new Date(),
            });

            // Build compact prompt
            const prompt = this.buildCompactPrompt(session, instruction);

            // Use Pro model for modifications (needs accuracy)
            const result = await this.proModel.generateContent(prompt);
            const responseText = result.response.text().trim();

            // Extract JSON
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            // Update session
            session.currentDesign = parsed.design;
            session.designSummary = summarizeDesign(parsed.design);
            session.modificationCount++;
            session.lastUpdatedAt = new Date();

            // Add assistant message
            session.conversationHistory.push({
                role: "assistant",
                content: parsed.aiMessage || "Done!",
                timestamp: new Date(),
                designSnapshot: parsed.design,
            });

            // Save session to Redis
            await this.saveSession(session);

            // Generate HTML
            const html = this.generateHtmlFromDesign(parsed.design, parsed.subject || currentSubject);

            return {
                subject: parsed.subject || currentSubject,
                body: "",
                html,
                design: parsed.design,
                aiMessage: parsed.aiMessage || "Changes applied!",
                suggestions: parsed.suggestions || [],
                changes: parsed.changes || [],
                sessionId: session.sessionId,
            };
        } catch (error: any) {
            console.error("Modify error:", error);
            throw new Error("Failed to process: " + error.message);
        } finally {
            // Always release the concurrency slot
            release();
        }
    }

    /**
     * Generate new template - uses Pro model
     */
    async generateTemplate(prompt: string, context?: Partial<TemplateContext>): Promise<IntelligentResponse> {
        const systemPrompt = `Create a professional email template. Return JSON only:

{
  "subject": "Subject line with {{firstName}}",
  "design": { /* Complete Unlayer design JSON */ },
  "aiMessage": "Brief description",
  "suggestions": ["improvement 1"],
  "changes": ["Created template"]
}

Include: header, main content, CTA button, footer.
Use variables: {{firstName}}, {{company}}

REQUEST: ${prompt}`;

        try {
            const result = await this.proModel.generateContent(systemPrompt);
            const responseText = result.response.text().trim();

            let jsonStr = responseText;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);
            const html = this.generateHtmlFromDesign(parsed.design, parsed.subject);

            const ctx: TemplateContext = {
                templateId: "new",
                templateName: parsed.subject || "New Template",
                templateSubject: parsed.subject || "Untitled",
                templateCategory: context?.templateCategory || "custom",
            };
            const session = await this.createSession(ctx, parsed.design);

            return {
                subject: parsed.subject || "Untitled Email",
                body: "",
                html,
                design: parsed.design,
                aiMessage: parsed.aiMessage || "Template created!",
                suggestions: parsed.suggestions || [],
                changes: parsed.changes || ["Created new template"],
                sessionId: session.sessionId,
            };
        } catch (error: any) {
            console.error("Generate error:", error);
            throw new Error("Failed to generate: " + error.message);
        }
    }

    getConversationHistory(sessionId: string): ConversationMessage[] {
        return this.getSession(sessionId)?.conversationHistory || [];
    }

    undoToMessage(sessionId: string, messageIndex: number): any | null {
        const session = this.getSession(sessionId);
        if (!session) return null;

        for (let i = Math.min(messageIndex, session.conversationHistory.length - 1); i >= 0; i--) {
            const msg = session.conversationHistory[i];
            if (msg.role === "assistant" && msg.designSnapshot) {
                session.currentDesign = msg.designSnapshot;
                session.designSummary = summarizeDesign(msg.designSnapshot);
                session.conversationHistory = session.conversationHistory.slice(0, i + 1);
                return msg.designSnapshot;
            }
        }

        session.currentDesign = session.originalDesign;
        session.designSummary = summarizeDesign(session.originalDesign);
        session.conversationHistory = [];
        return session.originalDesign;
    }

    resetToOriginal(sessionId: string): any | null {
        const session = this.getSession(sessionId);
        if (!session) return null;

        session.currentDesign = JSON.parse(JSON.stringify(session.originalDesign));
        session.designSummary = summarizeDesign(session.originalDesign);
        session.conversationHistory = [];
        session.modificationCount = 0;
        return session.originalDesign;
    }

    private generateHtmlFromDesign(design: any, subject: string): string {
        if (!design?.body?.rows) {
            return `<!DOCTYPE html><html><head><title>${subject}</title></head><body><p>Preview not available</p></body></html>`;
        }

        const bodyValues = design.body.values || {};
        const bgColor = bodyValues.backgroundColor || "#ffffff";
        const textColor = bodyValues.textColor || "#000000";
        const contentWidth = bodyValues.contentWidth || "600px";

        let rowsHtml = "";

        for (const row of design.body.rows) {
            let columnsHtml = "";

            for (const col of row.columns || []) {
                let contentsHtml = "";

                for (const content of col.contents || []) {
                    const type = content.type;
                    const values = content.values || {};
                    const padding = values.containerPadding || "10px";

                    if (type === "text" || type === "heading") {
                        contentsHtml += `<div style="padding: ${padding};">${values.text || ""}</div>`;
                    } else if (type === "button") {
                        const btnBg = values.buttonColors?.backgroundColor || "#3AAEE0";
                        const btnColor = values.buttonColors?.color || "#ffffff";
                        contentsHtml += `<div style="padding: ${padding}; text-align: center;">
                            <a href="${values.href?.url || "#"}" style="display: inline-block; padding: 12px 24px; background-color: ${btnBg}; color: ${btnColor}; text-decoration: none; border-radius: 4px; font-weight: bold;">${values.text || "Click"}</a>
                        </div>`;
                    } else if (type === "image" && values.src?.url) {
                        contentsHtml += `<div style="padding: ${padding};"><img src="${values.src.url}" alt="${values.altText || ""}" style="max-width: 100%; height: auto;" /></div>`;
                    } else if (type === "divider") {
                        const border = values.border || {};
                        contentsHtml += `<div style="padding: ${padding};"><hr style="border: none; border-top: ${border.borderTopWidth || "1px"} ${border.borderTopStyle || "solid"} ${border.borderTopColor || "#BBBBBB"};" /></div>`;
                    } else if (type === "html") {
                        contentsHtml += `<div style="padding: ${padding};">${values.html || ""}</div>`;
                    }
                }

                columnsHtml += `<td style="vertical-align: top;">${contentsHtml}</td>`;
            }

            const rowBg = row.values?.backgroundColor || "";
            rowsHtml += `<tr><td style="background-color: ${rowBg};"><table width="100%" cellpadding="0" cellspacing="0"><tr>${columnsHtml}</tr></table></td></tr>`;
        }

        return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin: 0; padding: 0; background-color: ${bgColor};">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
<tr><td align="center">
<table width="${contentWidth}" cellpadding="0" cellspacing="0" style="max-width: ${contentWidth}; color: ${textColor};">
${rowsHtml}
</table>
</td></tr></table>
</body></html>`;
    }

    /**
     * STREAMING: Modify template with real-time response
     */
    async *modifyTemplateStream(options: IntelligentModifyOptions): AsyncGenerator<{ type: string; data: any }> {
        const {
            sessionId,
            instruction,
            currentDesign,
            currentSubject,
            templateContext,
        } = options;

        // Emit processing start
        yield { type: "status", data: { message: "Processing your request..." } };

        // Get or create session
        let session = sessionId ? await this.getSessionAsync(sessionId) : null;

        if (!session) {
            const ctx: TemplateContext = {
                templateId: templateContext?.templateId || "unknown",
                templateName: templateContext?.templateName || "Email Template",
                templateSubject: currentSubject,
                templateCategory: templateContext?.templateCategory || "custom",
                templateDescription: templateContext?.templateDescription,
            };
            session = await this.createSession(ctx, currentDesign);
            yield { type: "session", data: { sessionId: session.sessionId } };
        }

        // Update current state
        session.currentDesign = currentDesign;
        session.designSummary = summarizeDesign(currentDesign);

        // Add user message
        session.conversationHistory.push({
            role: "user",
            content: instruction,
            timestamp: new Date(),
        });

        yield { type: "status", data: { message: "Analyzing template..." } };

        // Build compact prompt
        const prompt = this.buildCompactPrompt(session, instruction);

        try {
            yield { type: "status", data: { message: "Generating changes..." } };

            // Use streaming for Pro model
            const result = await this.proModel.generateContentStream(prompt);

            let fullResponse = "";
            let chunkCount = 0;

            for await (const chunk of result.stream) {
                const text = chunk.text();
                fullResponse += text;
                chunkCount++;

                // Emit progress every few chunks
                if (chunkCount % 3 === 0) {
                    yield { type: "progress", data: { chunks: chunkCount } };
                }
            }

            yield { type: "status", data: { message: "Applying changes..." } };

            // Extract JSON
            let jsonStr = fullResponse;
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            // Update session
            session.currentDesign = parsed.design;
            session.designSummary = summarizeDesign(parsed.design);
            session.modificationCount++;
            session.lastUpdatedAt = new Date();

            // Add assistant message
            session.conversationHistory.push({
                role: "assistant",
                content: parsed.aiMessage || "Done!",
                timestamp: new Date(),
                designSnapshot: parsed.design,
            });

            // Generate HTML
            const html = this.generateHtmlFromDesign(parsed.design, parsed.subject || currentSubject);

            // Emit final result
            yield {
                type: "complete",
                data: {
                    subject: parsed.subject || currentSubject,
                    body: "",
                    html,
                    design: parsed.design,
                    aiMessage: parsed.aiMessage || "Changes applied!",
                    suggestions: parsed.suggestions || [],
                    changes: parsed.changes || [],
                    sessionId: session.sessionId,
                },
            };
        } catch (error: any) {
            yield { type: "error", data: { message: error.message || "Failed to process request" } };
        }
    }
}

// Export singleton
export const intelligentTemplateAI = new IntelligentTemplateAI();
