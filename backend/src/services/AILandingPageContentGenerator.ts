/**
 * AI Landing Page Content Generator
 * 
 * Generates high-converting landing page copy using Gemini 2.5 Pro.
 * Creates personalized headlines, value props, and CTAs based on business context.
 */

import { getProModel } from '../agents/modelFactory';
import { IntelligentOnboardingService } from './IntelligentOnboardingService';

export interface GeneratedPageContent {
    hero: {
        headline: string;
        subheadline: string;
        ctaText: string;
        ctaSecondary?: string;
    };
    features: {
        sectionTitle: string;
        items: Array<{
            title: string;
            description: string;
            icon?: string;
        }>;
    };
    benefits: {
        sectionTitle: string;
        items: string[];
    };
    socialProof: {
        headline: string;
        stats: Array<{ value: string; label: string }>;
        testimonials: Array<{
            quote: string;
            author: string;
            role: string;
            company: string;
        }>;
    };
    cta: {
        headline: string;
        subheadline: string;
        buttonText: string;
    };
    seo: {
        title: string;
        description: string;
        keywords: string[];
    };
    reasoning: string;
}

export class AILandingPageContentGenerator {

    /**
     * Generate complete landing page content using AI
     */
    static async generateContent(
        workspaceId: string,
        pageDescription: string,
        options?: {
            tone?: 'professional' | 'casual' | 'bold' | 'friendly';
            industry?: string;
            targetAudience?: string;
        }
    ): Promise<GeneratedPageContent> {
        const model = getProModel();

        // Get business profile for context
        let businessContext = '';
        try {
            const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
            if (profile) {
                businessContext = `
## BUSINESS CONTEXT:
- Company Name: ${profile.companyName || 'Not specified'}
- Industry: ${profile.industry}${profile.industrySpecific ? ` (${profile.industrySpecific})` : ''}
- Sales Model: ${profile.salesModel?.toUpperCase()}
- Target Audience: ${profile.targetAudience?.jobTitles?.join(', ') || 'General'}
- Company Sizes: ${profile.targetAudience?.companySize?.join(', ') || 'All sizes'}
- Pain Points: ${profile.painPoints?.join(', ') || 'Not specified'}
- Primary Goal: ${profile.primaryGoal}
- Average Deal: ${profile.averageDealSize || 'Not specified'}
`;
            }
        } catch (e) {
            console.warn('Could not load business profile:', e);
        }

        const prompt = `You are the world's best landing page copywriter, powered by Gemini 2.5 Pro.

You've written copy for billion-dollar SaaS companies and consistently achieve 30%+ conversion rates.

${businessContext}

## PAGE DESCRIPTION: "${pageDescription}"
${options?.tone ? `## TONE: ${options.tone}` : ''}
${options?.industry ? `## INDUSTRY: ${options.industry}` : ''}
${options?.targetAudience ? `## TARGET AUDIENCE: ${options.targetAudience}` : ''}

## YOUR COPYWRITING PRINCIPLES:

1. **HEADLINES THAT CONVERT**
   - Lead with the outcome, not the product
   - Use specific numbers when possible
   - Create urgency without being pushy
   - Target the visitor's #1 desire
   - BAD: "Welcome to Our Platform"
   - GOOD: "Close 40% More Deals with AI-Powered Insights"

2. **SUBHEADLINES THAT CLARIFY**
   - Explain HOW they get the benefit
   - Address the skeptic's first question
   - Keep it under 20 words

3. **FEATURES → BENEFITS**
   - Every feature must answer "So what?"
   - Focus on outcomes, not capabilities
   - Use the "which means..." test

4. **SOCIAL PROOF PSYCHOLOGY**
   - Specific numbers beat vague claims
   - Use relatable testimonials
   - Include recognizable company names if B2B

5. **CTA OPTIMIZATION**
   - Use action verbs (Get, Start, Unlock, Discover)
   - Imply value received, not action taken
   - BAD: "Submit" or "Sign Up"
   - GOOD: "Get My Free Analysis" or "Start Closing More Deals"

## GENERATE COMPLETE PAGE CONTENT AS JSON:

{
  "hero": {
    "headline": "Powerful, benefit-focused headline (max 10 words)",
    "subheadline": "Clarifying statement that explains the how (max 20 words)",
    "ctaText": "Action-oriented button text",
    "ctaSecondary": "Optional secondary CTA like 'See Demo' or 'Learn More'"
  },
  "features": {
    "sectionTitle": "Section heading that promises value",
    "items": [
      {
        "title": "Feature as benefit (max 5 words)",
        "description": "How this helps the user (max 15 words)",
        "icon": "suggested icon name (analytics, lightning, shield, etc.)"
      }
    ]
  },
  "benefits": {
    "sectionTitle": "Why visitors should care",
    "items": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"]
  },
  "socialProof": {
    "headline": "Trust-building section title",
    "stats": [
      { "value": "10K+", "label": "Active Users" },
      { "value": "98%", "label": "Customer Satisfaction" }
    ],
    "testimonials": [
      {
        "quote": "Specific, believable testimonial with a result",
        "author": "Jane Smith",
        "role": "VP of Sales",
        "company": "TechCorp"
      }
    ]
  },
  "cta": {
    "headline": "Final conversion push headline",
    "subheadline": "Remove last objection or add urgency",
    "buttonText": "High-converting CTA"
  },
  "seo": {
    "title": "SEO-optimized page title (50-60 chars)",
    "description": "Meta description with keywords (150-160 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "reasoning": "Brief explanation of your copywriting strategy"
}

## CRITICAL RULES:
1. Generate 4-6 features, 3-4 benefits, 2-3 stats, 1-2 testimonials
2. Make everything specific to the page description
3. Use the business context to personalize
4. No generic filler text
5. Every word must earn its place

Return ONLY valid JSON. No markdown.`;

        const result = await model.invoke(prompt);
        const content = typeof result.content === 'string' ? result.content : String(result.content);

        // Extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid AI response - no JSON found');
        }

        return JSON.parse(jsonMatch[0]) as GeneratedPageContent;
    }

    /**
     * Generate headlines only (for quick iterations)
     */
    static async generateHeadlines(
        pageDescription: string,
        count: number = 5
    ): Promise<string[]> {
        const model = getProModel();

        const prompt = `Generate ${count} high-converting landing page headlines for: "${pageDescription}"

Rules:
- Lead with outcomes/benefits
- Use specific numbers when possible
- Maximum 10 words each
- No generic phrases

Return as JSON array: ["Headline 1", "Headline 2", ...]`;

        const result = await model.invoke(prompt);
        const content = typeof result.content === 'string' ? result.content : String(result.content);

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return ['Transform Your Business Today'];
    }

    /**
     * Improve existing copy
     */
    static async improveCopy(
        currentCopy: string,
        goal: string
    ): Promise<{ improved: string; explanation: string }> {
        const model = getProModel();

        const prompt = `Improve this landing page copy for better conversions.

CURRENT COPY: "${currentCopy}"
GOAL: ${goal}

Return JSON: { "improved": "better version", "explanation": "what you changed and why" }`;

        const result = await model.invoke(prompt);
        const content = typeof result.content === 'string' ? result.content : String(result.content);

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { improved: currentCopy, explanation: 'Could not improve' };
    }
}

export default AILandingPageContentGenerator;
