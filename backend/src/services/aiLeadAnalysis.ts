/**
 * AI Lead Analysis Service
 *
 * Uses AI (GPT-4/Claude) to analyze lead data and generate personalized messages.
 * Extracts pain points, buying signals, and creates tailored outreach.
 */

import { ScrapedWebsiteData } from "./webScraper";

interface LeadAnalysisResult {
    companyOverview: string;
    painPoints: string[];
    buyingSignals: string[];
    recommendedApproach: string;
    talkingPoints: string[];
    estimatedFitScore: number; // 0-100
}

interface PersonalizedMessage {
    subject: string;
    body: string;
    tone: 'professional' | 'casual' | 'friendly';
    channel: 'email' | 'linkedin' | 'sms';
}

/**
 * Analyze lead using AI
 */
export async function analyzeLeadWithAI(
    leadData: {
        contact?: any;
        company?: any;
        websiteData?: any;
        recentActivity?: any[];
    }
): Promise<LeadAnalysisResult> {

    try {
        console.log('🤖 Analyzing lead with AI...');

        // Prepare context for AI
        const context = buildAnalysisContext(leadData);

        // Call AI API (GPT-4 or Claude)
        const analysis = await callAIForAnalysis(context);

        return analysis;

    } catch (error: any) {
        console.error('AI analysis failed:', error.message);

        // Return basic analysis if AI fails
        return {
            companyOverview: leadData.company?.name || 'Unknown company',
            painPoints: [],
            buyingSignals: [],
            recommendedApproach: 'Standard outreach',
            talkingPoints: [],
            estimatedFitScore: 50,
        };
    }
}

/**
 * Generate personalized outreach message
 */
export async function generatePersonalizedMessage(
    leadData: {
        contact: any;
        company?: any;
        websiteData?: any;
        analysis?: LeadAnalysisResult;
    },
    options: {
        channel: 'email' | 'linkedin' | 'sms';
        tone?: 'professional' | 'casual' | 'friendly';
        includeCompanyResearch?: boolean;
    }
): Promise<PersonalizedMessage> {

    try {
        console.log(`🤖 Generating personalized ${options.channel} message...`);

        const prompt = buildMessageGenerationPrompt(leadData, options);

        // Call AI to generate message
        const message = await callAIForMessageGeneration(prompt, options);

        return message;

    } catch (error: any) {
        console.error('Message generation failed:', error.message);

        // Return template message if AI fails
        return {
            subject: `${leadData.contact.firstName}, let's connect`,
            body: `Hi ${leadData.contact.firstName},\n\nI came across ${leadData.company?.name || 'your company'} and thought you might be interested in how we can help.\n\nWould you be open to a quick call?\n\nBest regards`,
            tone: options.tone || 'professional',
            channel: options.channel,
        };
    }
}

/**
 * Extract pain points from company website
 */
export async function extractPainPointsFromWebsite(
    websiteData: any
): Promise<string[]> {

    try {
        const context = `
Website Content:
${websiteData.textContent?.substring(0, 3000)}

Headings:
${websiteData.headings?.join('\n')}

Extract the top 5 pain points or challenges this company might be facing based on their website content.
`;

        // Call AI to extract pain points
        const painPoints = await callAIForExtraction(context, 'pain points');

        return painPoints;

    } catch (error: any) {
        console.error('Pain point extraction failed:', error.message);
        return [];
    }
}

/**
 * Generate cold email subject lines (A/B test options)
 */
export async function generateSubjectLines(
    leadData: {
        contact: any;
        company?: any;
        painPoints?: string[];
    },
    count: number = 5
): Promise<string[]> {

    try {
        const prompt = `
Generate ${count} compelling email subject lines for a cold outreach email.

Contact: ${leadData.contact.firstName} ${leadData.contact.lastName}
Job Title: ${leadData.contact.jobTitle || 'Unknown'}
Company: ${leadData.company?.name || 'Unknown'}
Pain Points: ${leadData.painPoints?.join(', ') || 'None identified'}

Requirements:
- Keep under 50 characters
- Create curiosity without being clickbait
- Personalize when possible
- Vary the approach (question, benefit, curiosity, etc.)

Return only the subject lines, one per line.
`;

        const subjects = await callAIForExtraction(prompt, 'subject lines');

        return subjects.slice(0, count);

    } catch (error: any) {
        console.error('Subject line generation failed:', error.message);
        return [
            `${leadData.contact.firstName}, quick question`,
            `${leadData.company?.name || 'Your company'} + our solution`,
            `Thought you'd find this interesting`,
        ];
    }
}

// ============================================
// AI API CALLS (GPT-4 / Claude)
// ============================================

/**
 * Call AI for lead analysis
 */
async function callAIForAnalysis(context: string): Promise<LeadAnalysisResult> {

    // TODO: Implement actual AI API call (OpenAI GPT-4 or Anthropic Claude)

    const prompt = `
Analyze this lead and provide insights:

${context}

Provide:
1. Company overview (2-3 sentences)
2. Top 5 pain points they likely have
3. Buying signals (if any)
4. Recommended outreach approach
5. Talking points for sales call
6. Estimated fit score (0-100)

Format as JSON.
`;

    // Simulated AI response
    const analysis: LeadAnalysisResult = {
        companyOverview: 'Mid-size B2B SaaS company focused on enterprise solutions.',
        painPoints: [
            'Scaling sales team efficiently',
            'Lead qualification bottleneck',
            'High customer acquisition cost',
            'Manual data entry and CRM hygiene',
            'Difficulty identifying hot leads',
        ],
        buyingSignals: [
            'Visited pricing page multiple times',
            'Downloaded case study',
            'Senior decision-maker role',
        ],
        recommendedApproach: 'Focus on ROI and efficiency gains. Lead with case study from similar industry.',
        talkingPoints: [
            'Save 10+ hours/week on manual lead qualification',
            'Reduce CAC by 30% with better targeting',
            'Increase sales team productivity by 2x',
            'AI-powered lead scoring eliminates guesswork',
        ],
        estimatedFitScore: 85,
    };

    return analysis;

    // Actual implementation would be:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are an expert sales analyst.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
        }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
    */
}

/**
 * Call AI for message generation
 */
async function callAIForMessageGeneration(
    prompt: string,
    options: any
): Promise<PersonalizedMessage> {

    // TODO: Implement actual AI API call

    // Simulated AI response
    const message: PersonalizedMessage = {
        subject: 'Quick question about scaling your sales team',
        body: `Hi John,

I noticed you're VP of Sales at Acme Inc. Congrats on the recent growth!

With 500 employees, I imagine lead qualification is becoming a bottleneck. We recently helped a similar company (TechCorp) reduce their sales team's admin work by 10 hours/week with automated lead scoring.

Would you be open to a 15-minute call to see if we could do the same for Acme?

Best,
[Your Name]`,
        tone: options.tone || 'professional',
        channel: options.channel,
    };

    return message;
}

/**
 * Call AI for extraction tasks
 */
async function callAIForExtraction(prompt: string, type: string): Promise<string[]> {

    // TODO: Implement actual AI API call

    // Simulated extraction
    if (type === 'pain points') {
        return [
            'Inefficient lead qualification process',
            'High customer acquisition costs',
            'Difficulty identifying buying signals',
            'Manual data entry and CRM updates',
            'Lack of visibility into pipeline health',
        ];
    }

    if (type === 'subject lines') {
        return [
            'Quick question about your sales process',
            'Saw you\'re hiring - thought you\'d find this useful',
            'How TechCorp reduced CAC by 30%',
            'John, 2-minute video for you',
            'Your thoughts on lead qualification?',
        ];
    }

    return [];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build context for AI analysis
 */
function buildAnalysisContext(leadData: any): string {
    let context = '';

    if (leadData.contact) {
        context += `
Contact Information:
- Name: ${leadData.contact.firstName} ${leadData.contact.lastName}
- Job Title: ${leadData.contact.jobTitle || 'Unknown'}
- Email: ${leadData.contact.email || 'Unknown'}
- Company: ${leadData.contact.company || 'Unknown'}
`;
    }

    if (leadData.company) {
        context += `
Company Information:
- Name: ${leadData.company.name}
- Industry: ${leadData.company.industry || 'Unknown'}
- Employees: ${leadData.company.employees || 'Unknown'}
- Revenue: ${leadData.company.revenue || 'Unknown'}
`;
    }

    if (leadData.websiteData) {
        context += `
Website Analysis:
- Title: ${leadData.websiteData.title}
- Description: ${leadData.websiteData.description}
- Content Preview: ${leadData.websiteData.textContent?.substring(0, 500)}...
`;
    }

    if (leadData.recentActivity && leadData.recentActivity.length > 0) {
        context += `
Recent Activity:
${leadData.recentActivity.map((a: any) => `- ${a.description}`).join('\n')}
`;
    }

    return context;
}

/**
 * Build prompt for message generation
 */
function buildMessageGenerationPrompt(leadData: any, options: any): string {
    const contact = leadData.contact;
    const company = leadData.company;
    const analysis = leadData.analysis;

    return `
Generate a personalized ${options.channel} message.

Recipient:
- Name: ${contact.firstName} ${contact.lastName}
- Job Title: ${contact.jobTitle || 'Unknown'}
- Company: ${company?.name || contact.company || 'Unknown'}

Company Context:
${company ? `- Industry: ${company.industry}
- Size: ${company.employees} employees
- Revenue: ${company.revenue || 'Unknown'}` : 'Limited information available'}

${analysis ? `
Research Insights:
- Pain Points: ${analysis.painPoints.join(', ')}
- Buying Signals: ${analysis.buyingSignals.join(', ')}
- Recommended Approach: ${analysis.recommendedApproach}
` : ''}

Requirements:
- Tone: ${options.tone || 'professional'}
- Channel: ${options.channel}
- Keep it concise (150-200 words for email, 100 words for LinkedIn, 50 words for SMS)
- Focus on value, not selling
- Include clear call-to-action
- Personalize based on research

${options.channel === 'email' ? 'Provide both subject and body.' : 'Provide just the message.'}
`;
}

export default {
    analyzeLeadWithAI,
    generatePersonalizedMessage,
    extractPainPointsFromWebsite,
    generateSubjectLines,
};
