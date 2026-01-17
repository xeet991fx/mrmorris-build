import { axiosInstance } from "../axios";

// ============================================
// TYPES
// ============================================

export type TemplateType = "email" | "linkedin" | "sms" | "slack" | "proposal" | "other";
export type TemplatePurpose = "welcome" | "follow-up" | "sales-pitch" | "announcement" | "thank-you" | "introduction" | "reminder" | "custom";
export type TemplateTone = "professional" | "friendly" | "casual" | "formal" | "persuasive" | "urgent" | "empathetic";
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
    companyName?: string;
    productService?: string;
    callToAction?: string;
    painPoints?: string;
    uniqueValue?: string;
    saveTemplate?: boolean;
}

// Industries for selection
export const INDUSTRIES: { value: string; label: string }[] = [
    { value: "technology", label: "Technology & SaaS" },
    { value: "ecommerce", label: "E-commerce & Retail" },
    { value: "healthcare", label: "Healthcare & Medical" },
    { value: "finance", label: "Finance & Banking" },
    { value: "education", label: "Education & Training" },
    { value: "realestate", label: "Real Estate" },
    { value: "marketing", label: "Marketing & Advertising" },
    { value: "consulting", label: "Consulting & Services" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "hospitality", label: "Hospitality & Travel" },
    { value: "other", label: "Other" },
];

// Target audiences
export const TARGET_AUDIENCES: { value: string; label: string }[] = [
    { value: "b2b-executives", label: "B2B Executives & Decision Makers" },
    { value: "b2b-managers", label: "B2B Managers & Team Leads" },
    { value: "b2b-technical", label: "B2B Technical Professionals" },
    { value: "b2c-consumers", label: "B2C General Consumers" },
    { value: "b2c-millennials", label: "B2C Millennials & Gen Z" },
    { value: "b2c-professionals", label: "B2C Working Professionals" },
    { value: "startups", label: "Startup Founders" },
    { value: "small-business", label: "Small Business Owners" },
    { value: "enterprise", label: "Enterprise Companies" },
    { value: "other", label: "Other" },
];

// Call to action options
export const CTA_OPTIONS: { value: string; label: string; example: string }[] = [
    { value: "schedule-demo", label: "Schedule a Demo", example: "Book a 15-minute demo call" },
    { value: "start-trial", label: "Start Free Trial", example: "Try free for 14 days" },
    { value: "learn-more", label: "Learn More", example: "Discover how we can help" },
    { value: "contact-us", label: "Contact Us", example: "Get in touch with our team" },
    { value: "buy-now", label: "Buy Now / Purchase", example: "Get started today" },
    { value: "download", label: "Download Resource", example: "Download the free guide" },
    { value: "register", label: "Register / Sign Up", example: "Create your free account" },
    { value: "reply", label: "Reply to Email", example: "Just hit reply to let me know" },
    { value: "custom", label: "Custom CTA", example: "Your own call to action" },
];

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
    { value: "email", label: "Email", icon: "email", description: "Professional email templates" },
    { value: "linkedin", label: "LinkedIn", icon: "linkedin", description: "LinkedIn messages & InMails" },
    { value: "sms", label: "SMS", icon: "sms", description: "Short text messages" },
    { value: "slack", label: "Slack", icon: "slack", description: "Slack channel messages" },
    { value: "proposal", label: "Proposal", icon: "proposal", description: "Business proposals & quotes" },
    { value: "other", label: "Other", icon: "other", description: "Custom template type" },
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

export const TEMPLATE_TONES: { value: TemplateTone; label: string; description: string }[] = [
    { value: "professional", label: "Professional", description: "Polished and business-appropriate" },
    { value: "friendly", label: "Friendly", description: "Warm and approachable" },
    { value: "casual", label: "Casual", description: "Relaxed and conversational" },
    { value: "formal", label: "Formal", description: "Traditional and respectful" },
    { value: "persuasive", label: "Persuasive", description: "Compelling and action-oriented" },
    { value: "urgent", label: "Urgent", description: "Time-sensitive and immediate" },
    { value: "empathetic", label: "Empathetic", description: "Understanding and supportive" },
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
