import { axiosInstance } from "../axios";

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
    saveTemplate?: boolean;
}

export interface GeneratedTemplate {
    name: string;
    subject?: string;
    body: string;
    variables: string[];
    suggestions?: string[];
}

export interface GenerateTemplateResponse {
    success: boolean;
    data?: {
        generated: GeneratedTemplate;
        saved?: any;
    };
    error?: string;
    message?: string;
}

// ============================================
// TEMPLATE TYPES CONFIG (for UI)
// ============================================

export const TEMPLATE_TYPES: { value: TemplateType; label: string; icon: string; description: string }[] = [
    { value: "email", label: "Email", icon: "📧", description: "Professional email templates" },
    { value: "linkedin", label: "LinkedIn", icon: "💼", description: "LinkedIn messages & InMails" },
    { value: "sms", label: "SMS", icon: "📱", description: "Short text messages" },
    { value: "slack", label: "Slack", icon: "💬", description: "Slack channel messages" },
    { value: "proposal", label: "Proposal", icon: "📄", description: "Business proposals & quotes" },
    { value: "other", label: "Other", icon: "✍️", description: "Custom template type" },
];

export const TEMPLATE_PURPOSES: { value: TemplatePurpose; label: string; description: string }[] = [
    { value: "welcome", label: "Welcome", description: "Welcoming new users or customers" },
    { value: "follow-up", label: "Follow-up", description: "Following up on previous interactions" },
    { value: "sales-pitch", label: "Sales Pitch", description: "Promoting products or services" },
    { value: "announcement", label: "Announcement", description: "Sharing news or updates" },
    { value: "thank-you", label: "Thank You", description: "Expressing gratitude" },
    { value: "introduction", label: "Introduction", description: "Introducing yourself or company" },
    { value: "reminder", label: "Reminder", description: "Reminding about events or actions" },
    { value: "custom", label: "Custom", description: "Custom purpose" },
];

export const TEMPLATE_TONES: { value: TemplateTone; label: string; emoji: string }[] = [
    { value: "professional", label: "Professional", emoji: "👔" },
    { value: "friendly", label: "Friendly", emoji: "😊" },
    { value: "casual", label: "Casual", emoji: "🙂" },
    { value: "formal", label: "Formal", emoji: "🎩" },
    { value: "persuasive", label: "Persuasive", emoji: "💡" },
];

export const TEMPLATE_LENGTHS: { value: TemplateLength; label: string; description: string }[] = [
    { value: "short", label: "Short", description: "Brief and to the point" },
    { value: "medium", label: "Medium", description: "Balanced with key details" },
    { value: "long", label: "Long", description: "Comprehensive and detailed" },
];

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Generate a template using AI
 */
export async function generateTemplate(
    workspaceId: string,
    options: GenerateTemplateOptions
): Promise<GenerateTemplateResponse> {
    try {
        const response = await axiosInstance.post(
            `/workspaces/${workspaceId}/email-templates/generate`,
            options
        );
        return response.data;
    } catch (error: any) {
        console.error("Generate template error:", error);
        return {
            success: false,
            error: error.response?.data?.error || error.message || "Failed to generate template",
        };
    }
}

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
}
