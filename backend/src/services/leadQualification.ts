/**
 * Lead Qualification Service
 *
 * Automatically qualifies leads based on company data, email validity,
 * job title, and behavioral signals. Separate from activity-based lead scoring.
 *
 * This service focuses on "Is this a good fit customer?" not "How engaged are they?"
 */

import { Types } from "mongoose";
import Contact from "../models/Contact";
import Company from "../models/Company";
import { enrichContact } from "./ApolloService";

// ============================================
// DISPOSABLE EMAIL PROVIDERS
// ============================================

const DISPOSABLE_EMAIL_DOMAINS = [
    'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'throwaway.email', 'maildrop.cc', 'yopmail.com',
    'trashmail.com', 'getnada.com', 'temp-mail.io', 'mohmal.com',
    'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'spam4.me',
    'tmail.com', 'tmailinator.com', 'emailondeck.com', 'mintemail.com'
];

const PERSONAL_EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'gmx.com',
    'yandex.com', 'live.com', 'msn.com', 'me.com', 'mac.com'
];

// ============================================
// QUALIFICATION CRITERIA
// ============================================

export interface QualificationCriteria {
    // Email validation
    requireBusinessEmail?: boolean;
    blockDisposableEmails?: boolean;

    // Company criteria
    minEmployees?: number;
    maxEmployees?: number;
    targetIndustries?: string[];
    excludedIndustries?: string[];

    // Job title criteria
    targetSeniorities?: string[]; // VP, Director, Manager, C-Level
    excludedTitles?: string[]; // Student, Intern, etc.

    // Geographic criteria
    targetCountries?: string[];
    excludedCountries?: string[];

    // Custom disqualification keywords
    disqualificationKeywords?: string[]; // In company name, email, etc.
}

export interface QualificationResult {
    qualified: boolean;
    qualityScore: number; // 0-100
    qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    reasons: string[];
    flags: {
        disposableEmail: boolean;
        personalEmail: boolean;
        missingCompanyData: boolean;
        belowEmployeeThreshold: boolean;
        excludedIndustry: boolean;
        excludedJobTitle: boolean;
        excludedCountry: boolean;
        containsDisqualificationKeyword: boolean;
    };
    enrichmentData?: {
        company?: string;
        jobTitle?: string;
        industry?: string;
        employeeCount?: number;
        revenue?: string;
        linkedIn?: string;
        phoneNumber?: string;
    };
    recommendedAction: 'assign_to_sales' | 'nurture' | 'disqualify' | 'enrich_first';
}

// ============================================
// DEFAULT QUALIFICATION RULES
// ============================================

const DEFAULT_CRITERIA: QualificationCriteria = {
    requireBusinessEmail: true,
    blockDisposableEmails: true,
    minEmployees: 10, // At least 10 employees
    targetSeniorities: ['VP', 'Director', 'Manager', 'C-Level', 'Head of', 'Chief'],
    excludedTitles: ['Student', 'Intern', 'Freelance', 'Unemployed'],
    disqualificationKeywords: ['test', 'example', 'demo', 'fake', 'sample'],
};

// ============================================
// CORE QUALIFICATION FUNCTIONS
// ============================================

/**
 * Qualify a lead based on contact and company data
 */
export async function qualifyLead(
    contactId: string | Types.ObjectId,
    criteria: QualificationCriteria = DEFAULT_CRITERIA
): Promise<QualificationResult> {

    const contact = await Contact.findById(contactId).populate('companyId');

    if (!contact) {
        throw new Error(`Contact not found: ${contactId}`);
    }

    const result: QualificationResult = {
        qualified: true,
        qualityScore: 100,
        qualityGrade: 'A',
        reasons: [],
        flags: {
            disposableEmail: false,
            personalEmail: false,
            missingCompanyData: false,
            belowEmployeeThreshold: false,
            excludedIndustry: false,
            excludedJobTitle: false,
            excludedCountry: false,
            containsDisqualificationKeyword: false,
        },
        recommendedAction: 'assign_to_sales',
    };

    // Check email validity
    if (contact.email) {
        const emailDomain = contact.email.split('@')[1]?.toLowerCase();

        // Check for disposable email
        if (criteria.blockDisposableEmails && DISPOSABLE_EMAIL_DOMAINS.includes(emailDomain)) {
            result.flags.disposableEmail = true;
            result.qualified = false;
            result.qualityScore -= 100;
            result.reasons.push('❌ Disposable email address detected');
        }

        // Check for personal email
        if (criteria.requireBusinessEmail && PERSONAL_EMAIL_DOMAINS.includes(emailDomain)) {
            result.flags.personalEmail = true;
            result.qualityScore -= 50;
            result.reasons.push('⚠️ Personal email address (not business email)');
        }
    }

    // Check for disqualification keywords
    if (criteria.disqualificationKeywords && criteria.disqualificationKeywords.length > 0) {
        const searchString = `${contact.email} ${contact.firstName} ${contact.lastName} ${contact.company}`.toLowerCase();

        for (const keyword of criteria.disqualificationKeywords) {
            if (searchString.includes(keyword.toLowerCase())) {
                result.flags.containsDisqualificationKeyword = true;
                result.qualified = false;
                result.qualityScore -= 80;
                result.reasons.push(`❌ Contains disqualification keyword: "${keyword}"`);
                break;
            }
        }
    }

    // Check job title
    if (contact.jobTitle) {
        const jobTitle = contact.jobTitle.toLowerCase();

        // Check excluded titles
        if (criteria.excludedTitles && criteria.excludedTitles.length > 0) {
            for (const excluded of criteria.excludedTitles) {
                if (jobTitle.includes(excluded.toLowerCase())) {
                    result.flags.excludedJobTitle = true;
                    result.qualified = false;
                    result.qualityScore -= 60;
                    result.reasons.push(`❌ Excluded job title: "${contact.jobTitle}"`);
                    break;
                }
            }
        }

        // Check for target seniority
        if (criteria.targetSeniorities && criteria.targetSeniorities.length > 0) {
            const hasSeniority = criteria.targetSeniorities.some(seniority =>
                jobTitle.includes(seniority.toLowerCase())
            );

            if (hasSeniority) {
                result.qualityScore += 20;
                result.reasons.push(`✅ Senior role: "${contact.jobTitle}"`);
            } else {
                result.qualityScore -= 30;
                result.reasons.push(`⚠️ Not a decision-maker role`);
            }
        }
    } else {
        result.qualityScore -= 10;
        result.reasons.push('⚠️ Missing job title');
    }

    // Check company data
    const company = contact.companyId as any;

    if (!company || !contact.company) {
        result.flags.missingCompanyData = true;
        result.qualityScore -= 20;
        result.reasons.push('⚠️ Missing company information');
    } else {
        // Check employee count
        if (company.employees && criteria.minEmployees) {
            const employeeCount = typeof company.employees === 'string'
                ? parseEmployeeRange(company.employees)
                : company.employees;

            if (employeeCount < criteria.minEmployees) {
                result.flags.belowEmployeeThreshold = true;
                result.qualityScore -= 40;
                result.reasons.push(`⚠️ Company too small: ${employeeCount} employees (min: ${criteria.minEmployees})`);
            } else {
                result.qualityScore += 15;
                result.reasons.push(`✅ Company size: ${employeeCount} employees`);
            }

            if (criteria.maxEmployees && employeeCount > criteria.maxEmployees) {
                result.qualityScore -= 20;
                result.reasons.push(`⚠️ Company too large: ${employeeCount} employees (max: ${criteria.maxEmployees})`);
            }
        }

        // Check industry
        if (company.industry) {
            // Check excluded industries
            if (criteria.excludedIndustries && criteria.excludedIndustries.length > 0) {
                const industryMatch = criteria.excludedIndustries.some(excluded =>
                    company.industry.toLowerCase().includes(excluded.toLowerCase())
                );

                if (industryMatch) {
                    result.flags.excludedIndustry = true;
                    result.qualified = false;
                    result.qualityScore -= 70;
                    result.reasons.push(`❌ Excluded industry: "${company.industry}"`);
                }
            }

            // Check target industries
            if (criteria.targetIndustries && criteria.targetIndustries.length > 0) {
                const industryMatch = criteria.targetIndustries.some(target =>
                    company.industry.toLowerCase().includes(target.toLowerCase())
                );

                if (industryMatch) {
                    result.qualityScore += 25;
                    result.reasons.push(`✅ Target industry: "${company.industry}"`);
                } else {
                    result.qualityScore -= 15;
                    result.reasons.push(`⚠️ Not in target industry`);
                }
            }
        }

        // Revenue is a good signal
        if (company.revenue) {
            result.qualityScore += 10;
            result.reasons.push(`✅ Revenue data available: ${company.revenue}`);
        }
    }

    // Check country
    if (contact.country) {
        if (criteria.excludedCountries && criteria.excludedCountries.includes(contact.country)) {
            result.flags.excludedCountry = true;
            result.qualified = false;
            result.qualityScore -= 50;
            result.reasons.push(`❌ Excluded country: "${contact.country}"`);
        }

        if (criteria.targetCountries && criteria.targetCountries.length > 0) {
            if (criteria.targetCountries.includes(contact.country)) {
                result.qualityScore += 10;
                result.reasons.push(`✅ Target country: "${contact.country}"`);
            } else {
                result.qualityScore -= 10;
                result.reasons.push(`⚠️ Not in target country`);
            }
        }
    }

    // Calculate final score and grade
    result.qualityScore = Math.max(0, Math.min(100, result.qualityScore));
    result.qualityGrade = scoreToGrade(result.qualityScore);

    // Determine recommended action
    if (!result.qualified || result.qualityScore < 30) {
        result.recommendedAction = 'disqualify';
    } else if (result.qualityScore < 50) {
        result.recommendedAction = 'nurture';
    } else if (result.flags.missingCompanyData && result.qualityScore < 70) {
        result.recommendedAction = 'enrich_first';
    } else {
        result.recommendedAction = 'assign_to_sales';
    }

    console.log(`
    🎯 Lead Qualification Result
    Contact: ${contact.firstName} ${contact.lastName} (${contact.email})
    Quality Score: ${result.qualityScore}/100 (Grade ${result.qualityGrade})
    Qualified: ${result.qualified ? '✅ YES' : '❌ NO'}
    Action: ${result.recommendedAction}
    Reasons:
    ${result.reasons.map(r => `  - ${r}`).join('\n')}
    `);

    return result;
}

/**
 * Enrich and qualify a lead in one step
 */
export async function enrichAndQualifyLead(
    contactId: string | Types.ObjectId,
    workspaceId: string | Types.ObjectId,
    criteria: QualificationCriteria = DEFAULT_CRITERIA
): Promise<QualificationResult> {

    console.log(`🔍 Starting enrichment and qualification for contact: ${contactId}`);

    // Step 1: Enrich with Apollo
    try {
        const enrichmentResult = await enrichContact(contactId, workspaceId);

        if (enrichmentResult.success) {
            console.log(`✅ Enrichment successful. Found: ${enrichmentResult.fieldsEnriched?.join(', ')}`);
        } else {
            console.log(`⚠️ Enrichment failed or no data found`);
        }
    } catch (enrichError: any) {
        console.error(`❌ Enrichment error:`, enrichError.message);
        // Continue with qualification even if enrichment fails
    }

    // Step 2: Qualify the lead
    const qualificationResult = await qualifyLead(contactId, criteria);

    return qualificationResult;
}

/**
 * Batch qualify multiple leads
 */
export async function batchQualifyLeads(
    contactIds: (string | Types.ObjectId)[],
    criteria: QualificationCriteria = DEFAULT_CRITERIA
): Promise<Map<string, QualificationResult>> {

    const results = new Map<string, QualificationResult>();

    for (const contactId of contactIds) {
        try {
            const result = await qualifyLead(contactId, criteria);
            results.set(contactId.toString(), result);
        } catch (error: any) {
            console.error(`Failed to qualify contact ${contactId}:`, error.message);
        }
    }

    return results;
}

/**
 * Get qualification statistics for a workspace
 */
export async function getQualificationStats(
    workspaceId: string | Types.ObjectId,
    criteria: QualificationCriteria = DEFAULT_CRITERIA
): Promise<{
    total: number;
    qualified: number;
    disqualified: number;
    needsEnrichment: number;
    gradeDistribution: Record<string, number>;
}> {

    const contacts = await Contact.find({ workspaceId }).select('_id');
    const total = contacts.length;

    let qualified = 0;
    let disqualified = 0;
    let needsEnrichment = 0;
    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    for (const contact of contacts) {
        const result = await qualifyLead(contact._id, criteria);

        if (result.qualified) qualified++;
        if (!result.qualified) disqualified++;
        if (result.recommendedAction === 'enrich_first') needsEnrichment++;

        gradeDistribution[result.qualityGrade]++;
    }

    return {
        total,
        qualified,
        disqualified,
        needsEnrichment,
        gradeDistribution,
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert score to grade
 */
function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 30) return 'D';
    return 'F';
}

/**
 * Parse employee range string (e.g., "50-100" -> 75)
 */
function parseEmployeeRange(range: string): number {
    if (range.includes('-')) {
        const parts = range.split('-').map(p => parseInt(p.trim()));
        return Math.floor((parts[0] + parts[1]) / 2);
    }

    if (range.includes('+')) {
        return parseInt(range.replace('+', ''));
    }

    return parseInt(range) || 0;
}

/**
 * Check if email is disposable
 */
export function isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Check if email is personal (not business)
 */
export function isPersonalEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return PERSONAL_EMAIL_DOMAINS.includes(domain);
}

/**
 * Check if email is business email
 */
export function isBusinessEmail(email: string): boolean {
    return !isPersonalEmail(email) && !isDisposableEmail(email);
}

export default {
    qualifyLead,
    enrichAndQualifyLead,
    batchQualifyLeads,
    getQualificationStats,
    isDisposableEmail,
    isPersonalEmail,
    isBusinessEmail,
    DEFAULT_CRITERIA,
};
