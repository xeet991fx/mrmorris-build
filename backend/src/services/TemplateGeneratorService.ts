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

// ============================================
// UNLAYER TEMPLATE GENERATOR
// ============================================

export interface ModifyUnlayerTemplateOptions {
    currentDesign: any; // Current Unlayer design JSON
    currentSubject: string;
    instruction: string; // User's modification instruction
}

/**
 * Modify an existing Unlayer email template design based on user instructions
 */
export async function modifyUnlayerTemplate(options: ModifyUnlayerTemplateOptions): Promise<UnlayerGeneratedTemplate> {
    const { currentDesign, currentSubject, instruction } = options;

    const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI2.getGenerativeModel({ model: "gemini-2.5-pro" });

    const systemPrompt = `You are an expert email template designer. You need to MODIFY an existing email template based on the user's instructions.

## Current Template:
The current Unlayer design JSON is provided below. You must analyze it and make the requested modifications while preserving the overall structure and styling unless specifically asked to change them.

## Current Subject Line:
${currentSubject}

## Current Design JSON:
${JSON.stringify(currentDesign, null, 2)}

## User's Modification Request:
${instruction}

## Output Requirements:
Return ONLY a valid JSON object with this structure:
{
    "subject": "Updated email subject line (keep same if not requested to change)",
    "body": "Plain text version of the updated email body",
    "design": { ... Modified Unlayer design JSON ... },
    "changes": ["List of changes made"]
}

## Modification Guidelines:
1. PRESERVE the existing structure unless specifically asked to change it
2. KEEP existing styles, colors, and formatting unless asked to change
3. MODIFY only what the user specifically requests
4. If adding new content, match the existing style
5. If changing colors/styling, apply consistently
6. Keep personalization variables like {{firstName}}, {{company}} intact unless asked to remove
7. Ensure the output is a valid Unlayer design JSON

## Content Types Reference:
1. TEXT: { "type": "text", "values": { "text": "<p>HTML content</p>", "containerPadding": "10px" }}
2. BUTTON: { "type": "button", "values": { "text": "Click Here", "href": { "url": "#" }, "buttonColors": { "color": "#ffffff", "backgroundColor": "#3AAEE0" }, "size": { "width": "auto" }, "textAlign": "center" }}
3. IMAGE: { "type": "image", "values": { "src": { "url": "https://via.placeholder.com/600x200" }, "containerPadding": "10px" }}
4. DIVIDER: { "type": "divider", "values": { "containerPadding": "10px", "border": { "borderTopWidth": "1px", "borderTopStyle": "solid", "borderTopColor": "#BBBBBB" }}}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or explanations.`;

    try {
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text().trim();

        // Extract JSON from response
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr);

        // Generate HTML from the modified design
        const html = generateHtmlFromDesign(parsed.design, parsed.subject);

        return {
            subject: parsed.subject || currentSubject,
            body: parsed.body || "",
            html: html,
            design: parsed.design,
        };
    } catch (error: any) {
        console.error("Unlayer template modification error:", error);
        throw new Error("Failed to modify template: " + error.message);
    }
}

export interface UnlayerGeneratedTemplate {
    subject: string;
    body: string;
    html: string;
    design: any; // Unlayer design JSON
}

/**
 * Generate an Unlayer email template design from a prompt
 */
export async function generateUnlayerTemplate(prompt: string): Promise<UnlayerGeneratedTemplate> {
    const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI2.getGenerativeModel({ model: "gemini-2.5-pro" });

    const systemPrompt = `You are an expert email template designer. Generate a professional email template based on the user's request.

## Output Requirements:
Return ONLY a valid JSON object with this structure:
{
    "subject": "Email subject line",
    "body": "Plain text version of the email body",
    "design": { ... Unlayer design JSON ... }
}

## Unlayer Design JSON Structure:
The design object must be a valid Unlayer editor design with this structure:
{
    "counters": { "u_column": 1, "u_row": 1, "u_content_text": 1, "u_content_button": 1, "u_content_image": 1 },
    "body": {
        "id": "unique-id",
        "rows": [
            {
                "id": "row-id",
                "cells": [1],
                "columns": [
                    {
                        "id": "col-id",
                        "contents": [
                            {
                                "id": "content-id",
                                "type": "text",
                                "values": {
                                    "containerPadding": "10px",
                                    "textAlign": "left",
                                    "lineHeight": "140%",
                                    "text": "<p style='font-size: 14px; line-height: 140%;'>Your text here</p>"
                                }
                            }
                        ],
                        "values": {}
                    }
                ],
                "values": {
                    "displayCondition": null,
                    "columns": false,
                    "backgroundColor": "",
                    "columnsBackgroundColor": "",
                    "backgroundImage": { "url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false },
                    "padding": "0px",
                    "hideDesktop": false,
                    "hideMobile": false,
                    "noStackMobile": false
                }
            }
        ],
        "values": {
            "textColor": "#000000",
            "backgroundColor": "#ffffff",
            "backgroundImage": { "url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false },
            "fontFamily": { "label": "Arial", "value": "arial,helvetica,sans-serif" },
            "contentWidth": "600px",
            "contentAlign": "center",
            "preheaderText": "",
            "linkStyle": { "body": true, "linkColor": "#0000ee", "linkHoverColor": "#0000ee", "linkUnderline": true, "linkHoverUnderline": true }
        }
    }
}

## Content Types:
1. TEXT: { "type": "text", "values": { "text": "<p>HTML content</p>", "containerPadding": "10px" }}
2. BUTTON: { "type": "button", "values": { "text": "Click Here", "href": { "url": "#" }, "buttonColors": { "color": "#ffffff", "backgroundColor": "#3AAEE0" }, "size": { "width": "auto" }, "textAlign": "center" }}
3. IMAGE: { "type": "image", "values": { "src": { "url": "https://via.placeholder.com/600x200" }, "containerPadding": "10px" }}
4. DIVIDER: { "type": "divider", "values": { "containerPadding": "10px", "border": { "borderTopWidth": "1px", "borderTopStyle": "solid", "borderTopColor": "#BBBBBB" }}}

## Design Guidelines:
- Create a professional, modern email layout
- Use proper spacing with padding values
- Include a header section with branding placeholder
- Include a main content section with the email message
- Include a call-to-action button if appropriate
- Include a footer section
- Use personalization variables like {{firstName}}, {{company}} where appropriate
- Use a clean color scheme (suggest primary color based on email purpose)

## Variable Placeholders:
Use these variables: {{firstName}}, {{lastName}}, {{company}}, {{email}}, {{senderName}}, {{senderCompany}}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or explanations.`;

    const fullPrompt = `${systemPrompt}\n\n## User Request:\n${prompt}`;

    try {
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text().trim();

        // Extract JSON from response
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr);

        // Generate HTML from the design
        const html = generateHtmlFromDesign(parsed.design, parsed.subject);

        return {
            subject: parsed.subject || "Untitled Email",
            body: parsed.body || "",
            html: html,
            design: parsed.design,
        };
    } catch (error: any) {
        console.error("Unlayer template generation error:", error);
        throw new Error("Failed to generate template: " + error.message);
    }
}

/**
 * Generate basic HTML from Unlayer design (for preview)
 */
function generateHtmlFromDesign(design: any, subject: string): string {
    if (!design || !design.body || !design.body.rows) {
        return `<!DOCTYPE html><html><head><title>${subject}</title></head><body><p>Template preview not available</p></body></html>`;
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
                if (content.type === "text") {
                    const padding = content.values?.containerPadding || "10px";
                    contentsHtml += `<div style="padding: ${padding};">${content.values?.text || ""}</div>`;
                } else if (content.type === "button") {
                    const btnValues = content.values || {};
                    const btnText = btnValues.text || "Click";
                    const btnBgColor = btnValues.buttonColors?.backgroundColor || "#3AAEE0";
                    const btnTextColor = btnValues.buttonColors?.color || "#ffffff";
                    const href = btnValues.href?.url || "#";
                    const padding = btnValues.containerPadding || "10px";
                    contentsHtml += `<div style="padding: ${padding}; text-align: center;">
                        <a href="${href}" style="display: inline-block; padding: 12px 24px; background-color: ${btnBgColor}; color: ${btnTextColor}; text-decoration: none; border-radius: 4px;">${btnText}</a>
                    </div>`;
                } else if (content.type === "image") {
                    const imgValues = content.values || {};
                    const src = imgValues.src?.url || "";
                    const padding = imgValues.containerPadding || "10px";
                    if (src) {
                        contentsHtml += `<div style="padding: ${padding};"><img src="${src}" style="max-width: 100%; height: auto;" /></div>`;
                    }
                } else if (content.type === "divider") {
                    const divValues = content.values || {};
                    const borderStyle = divValues.border?.borderTopStyle || "solid";
                    const borderWidth = divValues.border?.borderTopWidth || "1px";
                    const borderColor = divValues.border?.borderTopColor || "#BBBBBB";
                    const padding = divValues.containerPadding || "10px";
                    contentsHtml += `<div style="padding: ${padding};"><hr style="border: none; border-top: ${borderWidth} ${borderStyle} ${borderColor};" /></div>`;
                }
            }

            columnsHtml += `<td style="vertical-align: top;">${contentsHtml}</td>`;
        }

        const rowBgColor = row.values?.backgroundColor || "";
        const rowPadding = row.values?.padding || "0px";
        rowsHtml += `<tr><td style="background-color: ${rowBgColor}; padding: ${rowPadding};"><table width="100%" cellpadding="0" cellspacing="0"><tr>${columnsHtml}</tr></table></td></tr>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
        <tr>
            <td align="center">
                <table width="${contentWidth}" cellpadding="0" cellspacing="0" style="max-width: ${contentWidth}; color: ${textColor};">
                    ${rowsHtml}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
