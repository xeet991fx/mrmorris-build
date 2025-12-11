/**
 * Enrichment API Client
 * Handles all Apollo.io enrichment-related API calls
 */

import { axiosInstance } from "../axios";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface EnrichedPerson {
    firstName?: string;
    lastName?: string;
    email?: string;
    linkedinUrl?: string;
    jobTitle?: string;
    company?: string;
    companyDomain?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    seniority?: string;
    department?: string;
}

export interface EnrichedCompany {
    name?: string;
    domain?: string;
    industry?: string;
    size?: string;
    employeeCount?: number;
    revenue?: string;
    website?: string;
    linkedinUrl?: string;
    description?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
}

export interface EnrichmentCredits {
    used: number;
    remaining: number;
}

export interface PersonEnrichRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    linkedinUrl?: string;
    organizationName?: string;
    domain?: string;
}

export interface CompanyEnrichRequest {
    name?: string;
    domain?: string;
}

export interface EnrichmentResponse<T> {
    success: boolean;
    data?: T;
    creditsUsed?: number;
    message?: string;
    error?: string;
}

export interface BulkEnrichResult {
    success: boolean;
    summary?: {
        total: number;
        success: number;
        failed: number;
    };
    results?: Array<{
        contactId: string;
        success: boolean;
        error?: string;
    }>;
    message?: string;
    error?: string;
}

export interface PeopleSearchRequest {
    personTitles?: string[];
    personSeniorities?: string[];
    organizationNames?: string[];
    organizationIndustries?: string[];
    personLocations?: string[];
    limit?: number;
}

export interface PeopleSearchResult {
    success: boolean;
    data?: {
        people: EnrichedPerson[];
        total: number;
    };
    creditsUsed?: number;
    message?: string;
    error?: string;
}

// ============================================
// CREDITS & STATUS
// ============================================

/**
 * Get Apollo API credits status
 */
export const getCreditsStatus = async (): Promise<{
    success: boolean;
    data?: EnrichmentCredits;
    message?: string;
    error?: string;
}> => {
    const response = await axiosInstance.get("/enrichment/credits");
    return response.data;
};

// ============================================
// PERSON ENRICHMENT
// ============================================

/**
 * Enrich a person by name/email/LinkedIn
 */
export const enrichPerson = async (
    data: PersonEnrichRequest
): Promise<EnrichmentResponse<EnrichedPerson>> => {
    const response = await axiosInstance.post("/enrichment/person", data);
    return response.data;
};

/**
 * Enrich a contact by ID and update the database
 */
export const enrichContact = async (
    contactId: string,
    workspaceId: string
): Promise<{
    success: boolean;
    data?: {
        contact: any;
        fieldsUpdated: number;
    };
    message?: string;
    error?: string;
}> => {
    const response = await axiosInstance.post(`/enrichment/contact/${contactId}`, {
        workspaceId,
    });
    return response.data;
};

// ============================================
// COMPANY ENRICHMENT
// ============================================

/**
 * Enrich a company by name or domain
 */
export const enrichCompany = async (
    data: CompanyEnrichRequest
): Promise<EnrichmentResponse<EnrichedCompany>> => {
    const response = await axiosInstance.post("/enrichment/company", data);
    return response.data;
};

/**
 * Enrich a company by ID and update the database
 */
export const enrichCompanyById = async (
    companyId: string
): Promise<{
    success: boolean;
    data?: {
        company: any;
        fieldsUpdated: number;
    };
    message?: string;
    error?: string;
}> => {
    const response = await axiosInstance.post(`/enrichment/company/${companyId}`);
    return response.data;
};

// ============================================
// LINKEDIN ENRICHMENT
// ============================================

/**
 * Find email from LinkedIn URL
 */
export const linkedinToEmail = async (
    linkedinUrl: string
): Promise<{
    success: boolean;
    data?: {
        email: string;
        firstName?: string;
        lastName?: string;
    };
    creditsUsed?: number;
    message?: string;
    error?: string;
}> => {
    const response = await axiosInstance.post("/enrichment/linkedin-to-email", {
        linkedinUrl,
    });
    return response.data;
};

// ============================================
// BULK ENRICHMENT
// ============================================

/**
 * Bulk enrich multiple contacts
 */
export const bulkEnrich = async (
    contactIds: string[],
    workspaceId: string
): Promise<BulkEnrichResult> => {
    const response = await axiosInstance.post("/enrichment/bulk", {
        contactIds,
        workspaceId,
    });
    return response.data;
};

// ============================================
// PEOPLE SEARCH
// ============================================

/**
 * Search for people using Apollo
 */
export const searchPeople = async (
    criteria: PeopleSearchRequest
): Promise<PeopleSearchResult> => {
    const response = await axiosInstance.post("/enrichment/search", criteria);
    return response.data;
};
