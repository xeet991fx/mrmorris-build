import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================
// TYPES
// ============================================

export type TemplateType = "email" | "linkedin" | "sms" | "slack" | "proposal" | "other";
export type TemplatePurpose = "welcome" | "follow-up" | "sales-pitch" | "announcement" | "thank-you" | "introduction" | "reminder" | "custom";
export type TemplateTone = "professional" | "friendly" | "casual" | "formal" | "persuasive";
export type TemplateLength = "short" | "medium" | "long";

export interface GenerateTemplateOptions {
    templateType: TemplateType;
    purpose: TemplatePurpose;
    tone: TemplateTone;
    length: TemplateLength;
    additionalDetails?: string;
    sampleImage?: string; // Base64 encoded image
    industry?: string;
    targetAudience?: string;
}

export interface GeneratedTemplate {
    name: string;
    subject?: string; // For email/linkedin
    body: string;
    variables: string[];
    suggestions?: string[];
}

// ============================================
// TEMPLATE TYPE CONFIGURATIONS
// ============================================

const TEMPLATE_TYPE_CONFIGS: Record<TemplateType, { hasSubject: boolean; maxLength: Record<TemplateLength, string> }> = {
    email: {
        hasSubject: true,
        maxLength: {
            short: "1-2 paragraphs, around 50-100 words",
            medium: "3-4 paragraphs, around 150-250 words",
            long: "5+ paragraphs, around 300-500 words",
        },
    },
    linkedin: {
        hasSubject: true,
        maxLength: {
            short: "1 paragraph, around 50 words",
            medium: "2-3 paragraphs, around 100-150 words",
            long: "3-4 paragraphs, around 200-300 words",
        },
    },
    sms: {
        hasSubject: false,
        maxLength: {
            short: "1 sentence, under 50 characters",
            medium: "1-2 sentences, under 100 characters",
            long: "2-3 sentences, under 160 characters",
        },
    },
    slack: {
        hasSubject: false,
        maxLength: {
            short: "1-2 sentences",
            medium: "1 paragraph",
            long: "2-3 paragraphs",
        },
    },
    proposal: {
        hasSubject: true,
        maxLength: {
            short: "3-4 paragraphs with key points",
            medium: "5-7 paragraphs with details",
            long: "Full proposal with sections",
        },
    },
    other: {
        hasSubject: true,
        maxLength: {
            short: "1-2 paragraphs",
            medium: "3-4 paragraphs",
            long: "5+ paragraphs",
        },
    },
};

const PURPOSE_DESCRIPTIONS: Record<TemplatePurpose, string> = {
    welcome: "Welcoming a new user, customer, or subscriber",
    "follow-up": "Following up after a meeting, call, or previous interaction",
    "sales-pitch": "Promoting a product or service to generate interest or sales",
    announcement: "Announcing news, updates, or important information",
    "thank-you": "Expressing gratitude and appreciation",
    introduction: "Introducing yourself, your company, or a product",
    reminder: "Reminding about an event, deadline, or action needed",
    custom: "Custom purpose as described in additional details",
};

const TONE_DESCRIPTIONS: Record<TemplateTone, string> = {
    professional: "Business-appropriate, respectful, and polished",
    friendly: "Warm, approachable, and personable",
    casual: "Relaxed, conversational, and informal",
    formal: "Traditional, proper, and ceremonious",
    persuasive: "Compelling, convincing, and action-oriented",
};

// ============================================
// TEMPLATE GENERATOR SERVICE
// ============================================

export class TemplateGeneratorService {
    private model;

    constructor() {
        // Use Gemini 2.5 Pro for best results
        this.model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    }

    /**
     * Generate a template using AI based on user requirements
     */
    async generateTemplate(options: GenerateTemplateOptions): Promise<GeneratedTemplate> {
        const {
            templateType,
            purpose,
            tone,
            length,
            additionalDetails,
            sampleImage,
            industry,
            targetAudience,
        } = options;

        const config = TEMPLATE_TYPE_CONFIGS[templateType];
        const purposeDesc = PURPOSE_DESCRIPTIONS[purpose];
        const toneDesc = TONE_DESCRIPTIONS[tone];
        const lengthDesc = config.maxLength[length];

        // Build the prompt
        const prompt = this.buildPrompt({
            templateType,
            hasSubject: config.hasSubject,
            purposeDesc,
            toneDesc,
            lengthDesc,
            additionalDetails,
            industry,
            targetAudience,
        });

        try {
            let result;

            // If sample image is provided, use multimodal generation
            if (sampleImage) {
                const imagePart = {
                    inlineData: {
                        data: sampleImage.replace(/^data:image\/\w+;base64,/, ""),
                        mimeType: "image/png",
                    },
                };

                const imagePrompt = `${prompt}\n\nIMPORTANT: I've also provided a sample image for reference. Please analyze the style, format, and structure from this image and incorporate similar elements into the generated template.`;

                result = await this.model.generateContent([imagePrompt, imagePart]);
            } else {
                result = await this.model.generateContent(prompt);
            }

            const responseText = result.response.text().trim();
            return this.parseResponse(responseText, templateType, config.hasSubject);
        } catch (error: any) {
            console.error("Template generation error:", error);
            throw new Error("Failed to generate template: " + error.message);
        }
    }

    /**
     * Build the AI prompt based on options
     */
    private buildPrompt(params: {
        templateType: TemplateType;
        hasSubject: boolean;
        purposeDesc: string;
        toneDesc: string;
        lengthDesc: string;
        additionalDetails?: string;
        industry?: string;
        targetAudience?: string;
    }): string {
        const {
            templateType,
            hasSubject,
            purposeDesc,
            toneDesc,
            lengthDesc,
            additionalDetails,
            industry,
            targetAudience,
        } = params;

        const templateTypeName = templateType.charAt(0).toUpperCase() + templateType.slice(1);

        let prompt = `You are an expert copywriter and template creator. Generate a high-quality ${templateTypeName} template based on the following requirements:

## Requirements:
- **Type**: ${templateTypeName} ${templateType === "email" ? "email" : templateType === "linkedin" ? "message/InMail" : templateType === "sms" ? "text message" : templateType === "slack" ? "message" : "template"}
- **Purpose**: ${purposeDesc}
- **Tone**: ${toneDesc}
- **Length**: ${lengthDesc}`;

        if (industry) {
            prompt += `\n- **Industry**: ${industry}`;
        }

        if (targetAudience) {
            prompt += `\n- **Target Audience**: ${targetAudience}`;
        }

        if (additionalDetails) {
            prompt += `\n- **Additional Context**: ${additionalDetails}`;
        }

        prompt += `

## Personalization Variables:
Use these placeholder variables where appropriate (wrap in double curly braces):
- {{firstName}} - Recipient's first name
- {{lastName}} - Recipient's last name
- {{company}} - Recipient's company name
- {{email}} - Recipient's email
- {{senderName}} - Sender's name
- {{senderCompany}} - Sender's company
- {{customField1}} - Any custom value

## Output Format:
Return ONLY a valid JSON object with the following structure:
{
    "name": "A descriptive name for this template (e.g., 'Friendly Welcome Email')",
    ${hasSubject ? '"subject": "The subject line with variables if needed",' : ''}
    "body": "The template body content with proper formatting and variables",
    "variables": ["list", "of", "variables", "used"],
    "suggestions": ["Optional tip 1 for using this template", "Optional tip 2"]
}

IMPORTANT:
- Make the template engaging and effective
- Use natural language that sounds human, not robotic
- Include appropriate variables for personalization
- For email/LinkedIn, include a compelling subject line
- Keep formatting clean and professional
- Return ONLY valid JSON, no markdown code blocks`;

        return prompt;
    }

    /**
     * Parse AI response into structured template
     */
    private parseResponse(
        responseText: string,
        templateType: TemplateType,
        hasSubject: boolean
    ): GeneratedTemplate {
        try {
            // Try to extract JSON from response
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            return {
                name: parsed.name || `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`,
                subject: hasSubject ? parsed.subject : undefined,
                body: parsed.body || "",
                variables: parsed.variables || [],
                suggestions: parsed.suggestions || [],
            };
        } catch (parseError) {
            console.error("Failed to parse AI response:", responseText);

            // Return a fallback template
            return {
                name: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`,
                subject: hasSubject ? "Hello {{firstName}}" : undefined,
                body: responseText, // Use raw response as body
                variables: ["firstName"],
                suggestions: ["Edit this template to match your needs"],
            };
        }
    }
}

// Export singleton instance
export const templateGeneratorService = new TemplateGeneratorService();
