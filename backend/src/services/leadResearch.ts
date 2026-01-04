/**
 * Lead Research Service
 *
 * Combines web scraping and AI analysis to provide comprehensive lead research.
 * One-click research for any contact.
 */

import { Types } from "mongoose";
import Contact from "../models/Contact";
import Company from "../models/Company";
import { scrapeWebsite, scrapeMultiplePages, extractKeyInfo } from "./webScraper";
import {
    analyzeLeadWithAI,
    generatePersonalizedMessage,
    extractPainPointsFromWebsite,
    generateSubjectLines,
} from "./aiLeadAnalysis";

interface ComprehensiveLeadResearch {
    contact: any;
    company?: any;
    websiteData?: any;
    aiAnalysis: {
        companyOverview: string;
        painPoints: string[];
        buyingSignals: string[];
        recommendedApproach: string;
        talkingPoints: string[];
        estimatedFitScore: number;
    };
    personalizedMessages: {
        email?: any;
        linkedin?: any;
        sms?: any;
    };
    subjectLines: string[];
    researchedAt: Date;
}

/**
 * Perform comprehensive research on a lead
 */
export async function researchLead(
    contactId: string | Types.ObjectId,
    options: {
        scrapeWebsite?: boolean;
        generateMessages?: boolean;
        channels?: ('email' | 'linkedin' | 'sms')[];
    } = {}
): Promise<ComprehensiveLeadResearch> {

    try {
        console.log(`🔬 Starting comprehensive lead research...`);

        // Get contact and company data
        const contact = await Contact.findById(contactId).populate('companyId');
        if (!contact) {
            throw new Error('Contact not found');
        }

        const company = contact.companyId as any;

        // Scrape company website if URL available
        let websiteData = null;
        let extractedInfo = null;

        if (options.scrapeWebsite !== false && (company?.website || contact.website)) {
            const websiteUrl = company?.website || contact.website;
            console.log(`🌐 Scraping website: ${websiteUrl}`);

            websiteData = await scrapeWebsite(websiteUrl);

            if (websiteData) {
                extractedInfo = extractKeyInfo(websiteData);
                console.log(`✅ Extracted: ${extractedInfo.products.length} products, ${extractedInfo.services.length} services`);
            }
        }

        // Get recent activity for context
        const recentActivity = []; // TODO: Fetch from TrackingEvents or IntentSignals

        // Analyze with AI
        console.log(`🤖 Analyzing with AI...`);
        const aiAnalysis = await analyzeLeadWithAI({
            contact,
            company,
            websiteData,
            recentActivity,
        });

        // Generate personalized messages if requested
        const personalizedMessages: any = {};

        if (options.generateMessages !== false) {
            const channels = options.channels || ['email', 'linkedin'];

            for (const channel of channels) {
                console.log(`✍️ Generating ${channel} message...`);

                const message = await generatePersonalizedMessage(
                    { contact, company, websiteData, analysis: aiAnalysis },
                    { channel: channel as any, tone: 'professional', includeCompanyResearch: true }
                );

                personalizedMessages[channel] = message;
            }
        }

        // Generate email subject lines (A/B test options)
        console.log(`📝 Generating email subject lines...`);
        const subjectLines = await generateSubjectLines(
            {
                contact,
                company,
                painPoints: aiAnalysis.painPoints,
            },
            5
        );

        // Compile results
        const research: ComprehensiveLeadResearch = {
            contact: {
                _id: contact._id,
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                jobTitle: contact.jobTitle,
                company: contact.company,
                linkedin: contact.linkedin,
            },
            company: company ? {
                name: company.name,
                website: company.website,
                industry: company.industry,
                employees: company.employees,
                revenue: company.revenue,
            } : undefined,
            websiteData: websiteData ? {
                title: websiteData.title,
                description: websiteData.description,
                headings: websiteData.headings?.slice(0, 10),
                extractedInfo,
            } : undefined,
            aiAnalysis,
            personalizedMessages,
            subjectLines,
            researchedAt: new Date(),
        };

        console.log(`✅ Research complete! Fit score: ${aiAnalysis.estimatedFitScore}/100`);

        return research;

    } catch (error: any) {
        console.error('Lead research failed:', error.message);
        throw error;
    }
}

/**
 * Quick research (just AI analysis, no scraping)
 */
export async function quickResearch(
    contactId: string | Types.ObjectId
): Promise<{
    analysis: any;
    talkingPoints: string[];
    emailSubject: string;
}> {

    const contact = await Contact.findById(contactId).populate('companyId');
    if (!contact) {
        throw new Error('Contact not found');
    }

    const analysis = await analyzeLeadWithAI({
        contact,
        company: contact.companyId,
    });

    const subjectLines = await generateSubjectLines(
        {
            contact,
            company: contact.companyId as any,
            painPoints: analysis.painPoints,
        },
        3
    );

    return {
        analysis,
        talkingPoints: analysis.talkingPoints,
        emailSubject: subjectLines[0],
    };
}

/**
 * Batch research multiple leads
 */
export async function batchResearch(
    contactIds: (string | Types.ObjectId)[],
    options: {
        scrapeWebsite?: boolean;
        generateMessages?: boolean;
    } = {}
): Promise<ComprehensiveLeadResearch[]> {

    const results: ComprehensiveLeadResearch[] = [];

    for (const contactId of contactIds) {
        try {
            const research = await researchLead(contactId, options);
            results.push(research);

            // Rate limiting - wait 2 seconds between researches
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: any) {
            console.error(`Research failed for contact ${contactId}:`, error.message);
        }
    }

    return results;
}

/**
 * Research company by website URL
 */
export async function researchCompanyByWebsite(
    websiteUrl: string
): Promise<{
    websiteData: any;
    extractedInfo: any;
    painPoints: string[];
}> {

    const websiteData = await scrapeWebsite(websiteUrl);
    if (!websiteData) {
        throw new Error('Failed to scrape website');
    }

    const extractedInfo = extractKeyInfo(websiteData);
    const painPoints = await extractPainPointsFromWebsite(websiteData);

    return {
        websiteData: {
            title: websiteData.title,
            description: websiteData.description,
            headings: websiteData.headings,
        },
        extractedInfo,
        painPoints,
    };
}

export default {
    researchLead,
    quickResearch,
    batchResearch,
    researchCompanyByWebsite,
};
