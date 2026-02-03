/**
 * AI Form Generator Service
 * Uses business profile to generate intelligent, contextual forms
 */

import { IntelligentOnboardingService } from "./IntelligentOnboardingService";
import { IBusinessProfile } from "../models/BusinessProfile";
import { getProModel } from "../chatbot/modelFactory";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "select" | "multiselect" | "textarea" | "number" | "date" | "radio" | "checkbox" | "rating";
  label: string;
  placeholder?: string;
  required: boolean;
  width?: "full" | "half";
  options?: string[];
  mapToField?: string;
  validation?: any;
}

interface GeneratedForm {
  name: string;
  description: string;
  fields: FormField[];
  successMessage: string;
  redirectUrl?: string;
  tags: string[];
  reasoning: string;
}

export class AIFormGeneratorService {
  /**
   * Generate form using business profile context with Gemini 2.5 Pro
   * Uses advanced prompt engineering for conversion-optimized forms
   */
  static async generateFormWithContext(
    workspaceId: string,
    formGoal: string,
    useProfileContext: boolean = true
  ): Promise<GeneratedForm> {
    let profileContext = "";

    if (useProfileContext) {
      const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
      if (profile) {
        profileContext = this.buildProfileContext(profile);
      }
    }

    const model = getProModel();

    // ENHANCED PROMPT with conversion psychology
    const prompt = `You are an ELITE conversion rate optimization expert and form designer powered by Gemini 2.5 Pro.

Your forms consistently achieve 40%+ conversion rates through psychological optimization.

${profileContext}

## FORM GOAL: "${formGoal}"

## YOUR EXPERTISE IN CONVERSION OPTIMIZATION:

1. **FIELD ORDERING PSYCHOLOGY**
   - Start with the EASIEST field (usually first name) - reduces cognitive load
   - Place email AFTER name - they're already invested
   - Put optional fields LAST - feels like bonus info, not requirement
   - Never start with complex fields (company size, budget)

2. **LABEL OPTIMIZATION**
   - Use benefit-focused labels: "Work Email" → "Best Email to Reach You"
   - Add subtle urgency: "Company" → "Company You're Representing"
   - Reduce friction: "Phone Number" → "Phone (optional - for faster response)"

3. **PSYCHOLOGICAL TRIGGERS TO INCLUDE**
   - Social proof hint in description
   - Scarcity if appropriate (limited spots, exclusive access)
   - Commitment-consistency (small yes leads to big yes)

4. **SMART VALIDATION**
   - Email: Use "email" type, validate format
   - Phone: Accept international formats
   - Company: No strict validation (reduces friction)

5. **CONVERSION BOOSTERS TO ADD**
   - Placeholder text that SHOWS value (not "Enter your email")
   - Help text for complex fields
   - Smart defaults for select fields

## GENERATE A JSON FORM:

{
  "name": "Compelling form name that implies value",
  "description": "Brief trust-building description with social proof hint",
  "fields": [
    {
      "id": "unique_snake_case_id",
      "type": "text|email|phone|select|multiselect|textarea|number|date|radio|checkbox|rating",
      "label": "Conversion-optimized label",
      "placeholder": "Value-showing placeholder example",
      "required": true/false,
      "width": "full|half",
      "options": ["for select/radio - order by popularity"],
      "mapToField": "firstName|lastName|email|phone|company|jobTitle",
      "helpText": "Optional micro-copy to boost completion"
    }
  ],
  "successMessage": "Exciting confirmation that sets expectations",
  "redirectUrl": "optional thank you page",
  "tags": ["relevant", "auto-tags"],
  "reasoning": "Explain your conversion optimization choices",
  "abVariants": [
    {
      "name": "Variant B - Shorter",
      "description": "What changes and why it might convert better"
    }
  ]
}

## CRITICAL RULES:
1. Maximum 6-8 fields (every extra field = -10% conversions)
2. Required fields: name + email minimum
3. B2B: Add company + job title
4. Order from easiest to hardest
5. Use half-width for name fields (looks smaller = less friction)
6. Include reasoning for every design choice
7. Suggest one A/B variant to test

Return ONLY valid JSON. No markdown formatting.`;

    const result = await model.invoke(prompt);
    const content = typeof result.content === "string" ? result.content : String(result.content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response - no JSON found");
    }

    const generatedForm = JSON.parse(jsonMatch[0]);

    // Validate and clean
    return {
      name: generatedForm.name || "Lead Capture Form",
      description: generatedForm.description || "",
      fields: this.validateFields(generatedForm.fields || []),
      successMessage: generatedForm.successMessage || "Thank you! We'll be in touch within 24 hours.",
      tags: generatedForm.tags || [],
      reasoning: generatedForm.reasoning || "",
    };
  }

  /**
   * Generate form fields based on profile (without AI)
   */
  static async generateFieldsFromProfile(workspaceId: string): Promise<FormField[]> {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return this.getDefaultFields();

    const fields: FormField[] = [
      {
        id: "firstName",
        type: "text",
        label: "First Name",
        required: true,
        width: "half",
        mapToField: "firstName",
      },
      {
        id: "lastName",
        type: "text",
        label: "Last Name",
        required: true,
        width: "half",
        mapToField: "lastName",
      },
      {
        id: "email",
        type: "email",
        label: profile.salesModel === "b2b" ? "Work Email" : "Email Address",
        required: true,
        mapToField: "email",
      },
    ];

    // B2B specific fields
    if (profile.salesModel === "b2b" || profile.salesModel === "b2b2c") {
      fields.push({
        id: "company",
        type: "text",
        label: "Company Name",
        required: true,
        mapToField: "company",
      });

      // Job title with smart options
      if (profile.targetAudience?.jobTitles && profile.targetAudience.jobTitles.length > 0) {
        fields.push({
          id: "jobTitle",
          type: "select",
          label: "Job Title",
          required: false,
          mapToField: "jobTitle",
          options: this.formatJobTitles(profile.targetAudience.jobTitles),
        });
      } else {
        fields.push({
          id: "jobTitle",
          type: "text",
          label: "Job Title",
          required: false,
          mapToField: "jobTitle",
        });
      }

      // Company size
      if (profile.targetAudience?.companySize && profile.targetAudience.companySize.length > 0) {
        fields.push({
          id: "companySize",
          type: "select",
          label: "Company Size",
          required: false,
          options: profile.targetAudience.companySize,
        });
      }
    }

    // Phone if they use phone channel
    if (profile.channels?.phone) {
      fields.push({
        id: "phone",
        type: "phone",
        label: "Phone Number",
        required: false,
        mapToField: "phone",
      });
    }

    // Industry-specific question
    if (profile.industry === "saas") {
      fields.push({
        id: "currentSolution",
        type: "text",
        label: "What tool are you currently using?",
        placeholder: "e.g., HubSpot, Salesforce",
        required: false,
      });
    } else if (profile.industry === "real_estate") {
      fields.push({
        id: "propertyType",
        type: "select",
        label: "Property Type of Interest",
        required: false,
        options: ["Residential", "Commercial", "Industrial", "Land"],
      });
    } else if (profile.industry === "consulting") {
      fields.push({
        id: "serviceInterest",
        type: "textarea",
        label: "What services are you interested in?",
        required: false,
      });
    }

    // Message/requirements field
    fields.push({
      id: "message",
      type: "textarea",
      label: this.getMessageLabel(profile),
      placeholder: "Tell us more about your needs...",
      required: false,
    });

    return fields;
  }

  /**
   * Build profile context for AI
   */
  private static buildProfileContext(profile: IBusinessProfile): string {
    return `
**BUSINESS CONTEXT**:
- Industry: ${profile.industry}${profile.industrySpecific ? ` (${profile.industrySpecific})` : ""}
- Sales Model: ${profile.salesModel?.toUpperCase()}
- Company Size: ${profile.companySize}
- Team Size: ${profile.teamSize}
- Sales Cycle: ${profile.salesCycle}
- Average Deal Size: ${profile.averageDealSize || "Not specified"}
- Primary Goal: ${profile.primaryGoal}
- Target Audience: ${profile.targetAudience?.jobTitles?.join(", ") || "Not specified"}
- Company Sizes Targeted: ${profile.targetAudience?.companySize?.join(", ") || "Any"}
- Active Channels: ${this.formatChannels(profile.channels)}
- Pain Points: ${profile.painPoints?.join(", ") || "None specified"}

**FORM REQUIREMENTS**:
- Form should match the ${profile.industry} industry
- Optimize for ${profile.salesModel?.toUpperCase()} sales
- Keep it suitable for a ${profile.salesCycle} sales cycle
- Fields should help qualify leads for ${profile.primaryGoal}`;
  }

  /**
   * Format channels for display
   */
  private static formatChannels(channels?: any): string {
    if (!channels) return "None specified";
    const active = [];
    if (channels.email) active.push("Email");
    if (channels.phone) active.push("Phone");
    if (channels.social) active.push("Social");
    if (channels.ads) active.push("Ads");
    if (channels.content) active.push("Content");
    if (channels.events) active.push("Events");
    return active.length > 0 ? active.join(", ") : "None specified";
  }

  /**
   * Format job titles for select options
   */
  private static formatJobTitles(titles: string[]): string[] {
    const titleMap: any = {
      ceo: "CEO / Founder",
      cto: "CTO / VP Engineering",
      cmo: "CMO / VP Marketing",
      cfo: "CFO / VP Finance",
      sales_leader: "VP Sales / Sales Director",
      hr_leader: "CHRO / HR Director",
      operations: "COO / Operations Manager",
      manager: "Department Manager",
      individual: "Individual Contributor",
    };

    return titles.map((t) => titleMap[t] || t);
  }

  /**
   * Get message label based on profile
   */
  private static getMessageLabel(profile: IBusinessProfile): string {
    if (profile.primaryGoal === "generate_leads") {
      return "What are you looking for?";
    }
    if (profile.primaryGoal === "close_deals") {
      return "Tell us about your requirements";
    }
    if (profile.salesModel === "b2b") {
      return "How can we help your business?";
    }
    return "Message";
  }

  /**
   * Validate and clean fields
   */
  private static validateFields(fields: any[]): FormField[] {
    // Valid mapToField values from the Form model
    const validMapToFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'website'];

    return fields.map((field) => {
      // Only keep mapToField if it's a valid value
      const mapToField = validMapToFields.includes(field.mapToField) ? field.mapToField : undefined;

      return {
        id: field.id || `field_${Date.now()}`,
        type: field.type || "text",
        label: field.label || "Untitled Field",
        placeholder: field.placeholder,
        required: field.required !== false,
        width: field.width || "full",
        options: field.options,
        mapToField,
        helpText: field.helpText,
      };
    });
  }

  /**
   * Get default fields
   */
  private static getDefaultFields(): FormField[] {
    return [
      {
        id: "name",
        type: "text",
        label: "Full Name",
        required: true,
        mapToField: "firstName",
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        mapToField: "email",
      },
      {
        id: "message",
        type: "textarea",
        label: "Message",
        required: false,
      },
    ];
  }
}
