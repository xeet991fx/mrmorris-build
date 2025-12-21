/**
 * Email Signature Parser Service
 *
 * Uses AI (Gemini) to parse email signatures and extract structured data
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Lazy-loaded Flash model for fast parsing
let _flashModel: ChatVertexAI | null = null;
const getFlashModel = () => {
    if (!_flashModel) {
        _flashModel = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0,
            authOptions: {
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
            },
        });
    }
    return _flashModel;
};

export interface ParsedSignature {
    jobTitle?: string;
    phone?: string;
    mobilePhone?: string;
    company?: string;
    linkedin?: string;
    website?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
}

/**
 * Extract email signature from email body
 * Signatures typically come after "--" or at the end of the email
 */
function extractSignatureFromBody(emailBody: string): string | null {
    if (!emailBody || emailBody.length < 10) {
        return null;
    }

    // Common signature delimiters
    const delimiters = [
        /--\s*$/m,
        /^--$/m,
        /Best regards,?/i,
        /Kind regards,?/i,
        /Sincerely,?/i,
        /Thanks,?/i,
        /Cheers,?/i,
        /Sent from my/i,
    ];

    let signatureStart = -1;

    for (const delimiter of delimiters) {
        const match = emailBody.match(delimiter);
        if (match && match.index !== undefined) {
            signatureStart = match.index;
            break;
        }
    }

    if (signatureStart === -1) {
        // No delimiter found, take last 500 characters
        const lastPart = emailBody.slice(-500);
        // Check if it looks like a signature (has contact info)
        if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|linkedin\.com|@/.test(lastPart)) {
            return lastPart;
        }
        return null;
    }

    return emailBody.slice(signatureStart).slice(0, 500); // Limit to 500 chars
}

/**
 * Parse email signature using AI
 */
export async function parseEmailSignature(emailBody: string): Promise<ParsedSignature | null> {
    const signature = extractSignatureFromBody(emailBody);

    if (!signature || signature.trim().length < 10) {
        return null;
    }

    const prompt = `Extract structured contact information from this email signature.

EMAIL SIGNATURE:
${signature}

Extract the following if present:
- Job title (e.g., "CEO", "Software Engineer", "VP of Sales")
- Phone number (office phone)
- Mobile phone (if different from office)
- Company name (if mentioned)
- LinkedIn URL
- Website URL
- Address (street, city, state, country, zipCode)

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "jobTitle": "string or null",
  "phone": "string or null",
  "mobilePhone": "string or null",
  "company": "string or null",
  "linkedin": "string or null",
  "website": "string or null",
  "address": {
    "street": "string or null",
    "city": "string or null",
    "state": "string or null",
    "country": "string or null",
    "zipCode": "string or null"
  }
}

IMPORTANT:
- Use null for fields not found
- Extract phone numbers in clean format (e.g., "+1-555-123-4567")
- For LinkedIn, extract full URL
- For company, use official name from signature (not domain)
- For job title, use exact text from signature`;

    try {
        const response = await getFlashModel().invoke([
            new SystemMessage("You are an email signature parser. Respond only with valid JSON."),
            new HumanMessage(prompt),
        ]);

        const responseText = response.content as string;

        // Try to extract JSON
        let jsonText: string | null = null;

        // Method 1: Look for code block
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim();
        }

        // Method 2: Extract JSON object
        if (!jsonText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
        }

        // Method 3: Use entire response if starts with {
        if (!jsonText && responseText.trim().startsWith('{')) {
            jsonText = responseText.trim();
        }

        if (jsonText) {
            // Clean up JSON
            jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

            const parsed = JSON.parse(jsonText);

            // Clean up the parsed data
            const result: ParsedSignature = {};

            if (parsed.jobTitle && parsed.jobTitle !== "null") result.jobTitle = parsed.jobTitle;
            if (parsed.phone && parsed.phone !== "null") result.phone = parsed.phone;
            if (parsed.mobilePhone && parsed.mobilePhone !== "null") result.mobilePhone = parsed.mobilePhone;
            if (parsed.company && parsed.company !== "null") result.company = parsed.company;
            if (parsed.linkedin && parsed.linkedin !== "null") result.linkedin = parsed.linkedin;
            if (parsed.website && parsed.website !== "null") result.website = parsed.website;

            if (parsed.address && typeof parsed.address === 'object') {
                const addr: any = {};
                if (parsed.address.street && parsed.address.street !== "null") addr.street = parsed.address.street;
                if (parsed.address.city && parsed.address.city !== "null") addr.city = parsed.address.city;
                if (parsed.address.state && parsed.address.state !== "null") addr.state = parsed.address.state;
                if (parsed.address.country && parsed.address.country !== "null") addr.country = parsed.address.country;
                if (parsed.address.zipCode && parsed.address.zipCode !== "null") addr.zipCode = parsed.address.zipCode;

                if (Object.keys(addr).length > 0) {
                    result.address = addr;
                }
            }

            // Only return if we extracted something useful
            if (Object.keys(result).length > 0) {
                return result;
            }
        }

        return null;
    } catch (error) {
        console.error("Signature parsing error:", error);
        return null;
    }
}

/**
 * Extract plain text from HTML email body
 */
export function htmlToPlainText(html: string): string {
    if (!html) return '';

    return html
        // Remove script and style elements
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Replace common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        // Replace line breaks
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        // Remove remaining tags
        .replace(/<[^>]+>/g, '')
        // Clean up whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
