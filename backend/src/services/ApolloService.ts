/**
 * Apollo.io Service
 * 
 * Provides contact and company enrichment using Apollo.io API.
 * Features:
 * - Person enrichment (find email, phone, LinkedIn from name/company)
 * - Company enrichment
 * - People search
 * - LinkedIn URL to email conversion
 */

import axios, { AxiosInstance } from "axios";
import Contact from "../models/Contact";
import Company from "../models/Company";
import { Types } from "mongoose";

// ============================================
// TYPES
// ============================================

export interface ApolloPersonResult {
    id: string;
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    email_status: string;
    linkedin_url: string;
    title: string;
    photo_url: string;
    phone_numbers: Array<{
        raw_number: string;
        sanitized_number: string;
        type: string;
    }>;
    organization: {
        id: string;
        name: string;
        website_url: string;
        linkedin_url: string;
        industry: string;
        estimated_num_employees: number;
    };
    city: string;
    state: string;
    country: string;
    seniority: string;
    departments: string[];
}

export interface ApolloCompanyResult {
    id: string;
    name: string;
    website_url: string;
    linkedin_url: string;
    phone: string;
    industry: string;
    estimated_num_employees: number;
    city: string;
    state: string;
    country: string;
    logo_url: string;
    founded_year: number;
    short_description: string;
    annual_revenue: number;
    technologies: string[];
}

export interface ApolloSearchFilters {
    personTitles?: string[];
    personSeniorities?: string[];
    organizationIds?: string[];
    organizationNames?: string[];
    organizationIndustries?: string[];
    personLocations?: string[];
    emailStatus?: string[];
    limit?: number;
    page?: number;
}

export interface EnrichmentResult {
    success: boolean;
    data?: any;
    error?: string;
    creditsUsed?: number;
}

// ============================================
// APOLLO SERVICE
// ============================================

class ApolloService {
    private client: AxiosInstance;
    private apiKey: string;
    private baseUrl = "https://api.apollo.io/v1";
    private creditsLowThreshold = 100; // Alert when credits drop below this
    private lastCreditCheck: Date | null = null;
    private cachedCredits: number | null = null;

    constructor() {
        this.apiKey = process.env.APOLLO_API_KEY || "";
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "X-Api-Key": this.apiKey,  // Apollo requires API key in this header
            },
        });
    }

    /**
     * Check if Apollo API is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    /**
     * Get remaining API credits
     */
    async getRemainingCredits(): Promise<{ credits: number; error?: string }> {
        if (!this.isConfigured()) {
            return { credits: 0, error: "Apollo API key not configured" };
        }

        // Cache credits for 1 hour to avoid excessive API calls
        const now = new Date();
        if (this.lastCreditCheck && this.cachedCredits !== null) {
            const hoursSinceCheck = (now.getTime() - this.lastCreditCheck.getTime()) / (1000 * 60 * 60);
            if (hoursSinceCheck < 1) {
                return { credits: this.cachedCredits };
            }
        }

        try {
            // Apollo's credit info endpoint
            const response = await this.client.get("/auth/health", {
                params: { api_key: this.apiKey },
            });

            const credits = response.data?.credits_remaining || 0;
            this.cachedCredits = credits;
            this.lastCreditCheck = now;

            // Alert if credits are low
            if (credits < this.creditsLowThreshold && credits > 0) {
                console.warn(`⚠️ Apollo credits running low: ${credits} remaining`);
                // TODO: Send notification email to admin
            } else if (credits === 0) {
                console.error(`❌ Apollo credits exhausted! Enrichment will fail.`);
                // TODO: Send urgent notification to admin
            }

            return { credits };
        } catch (error: any) {
            console.error("Failed to check Apollo credits:", error.message);
            return { credits: 0, error: error.message };
        }
    }

    /**
     * Check if we have enough credits before making API call
     */
    private async checkCredits(): Promise<{ hasCredits: boolean; error?: string }> {
        const { credits, error } = await this.getRemainingCredits();

        if (error) {
            return { hasCredits: false, error };
        }

        if (credits === 0) {
            return {
                hasCredits: false,
                error: "Apollo credits exhausted. Please add more credits to your Apollo.io account.",
            };
        }

        if (credits < 10) {
            console.warn(`⚠️ Apollo credits critically low: ${credits} remaining`);
        }

        return { hasCredits: true };
    }

    /**
     * Enrich a person by name, email, or company
     */
    async enrichPerson(params: {
        firstName?: string;
        lastName?: string;
        email?: string;
        linkedinUrl?: string;
        organizationName?: string;
        domain?: string;
    }): Promise<EnrichmentResult> {
        if (!this.isConfigured()) {
            return { success: false, error: "Apollo API key not configured" };
        }

        // Check credits before making API call
        const creditCheck = await this.checkCredits();
        if (!creditCheck.hasCredits) {
            return { success: false, error: creditCheck.error || "No credits available" };
        }

        try {
            const response = await this.client.post("/people/match", {
                api_key: this.apiKey,
                first_name: params.firstName,
                last_name: params.lastName,
                email: params.email,
                linkedin_url: params.linkedinUrl,
                organization_name: params.organizationName,
                domain: params.domain,
                reveal_personal_emails: true,
                reveal_phone_number: true,
            });

            if (response.data?.person) {
                console.log(`✅ Apollo: Enriched person - ${response.data.person.name}`);
                return {
                    success: true,
                    data: response.data.person as ApolloPersonResult,
                    creditsUsed: 1,
                };
            }

            return { success: false, error: "No match found" };
        } catch (error: any) {
            console.error("Apollo enrichPerson error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    /**
     * Find email from LinkedIn URL
     */
    async findEmailFromLinkedIn(linkedinUrl: string): Promise<EnrichmentResult> {
        if (!this.isConfigured()) {
            return { success: false, error: "Apollo API key not configured" };
        }

        // Check credits before making API call
        const creditCheck = await this.checkCredits();
        if (!creditCheck.hasCredits) {
            return { success: false, error: creditCheck.error || "No credits available" };
        }

        try {
            const response = await this.client.post("/people/match", {
                api_key: this.apiKey,
                linkedin_url: linkedinUrl,
                reveal_personal_emails: true,
            });

            if (response.data?.person?.email) {
                console.log(`✅ Apollo: Found email for LinkedIn - ${response.data.person.email}`);
                return {
                    success: true,
                    data: {
                        email: response.data.person.email,
                        emailStatus: response.data.person.email_status,
                        person: response.data.person,
                    },
                    creditsUsed: 1,
                };
            }

            return { success: false, error: "No email found for this LinkedIn profile" };
        } catch (error: any) {
            console.error("Apollo findEmailFromLinkedIn error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    /**
     * Enrich a company by name or domain
     */
    async enrichCompany(params: {
        name?: string;
        domain?: string;
    }): Promise<EnrichmentResult> {
        if (!this.isConfigured()) {
            return { success: false, error: "Apollo API key not configured" };
        }

        // Check credits before making API call
        const creditCheck = await this.checkCredits();
        if (!creditCheck.hasCredits) {
            return { success: false, error: creditCheck.error || "No credits available" };
        }

        try {
            const response = await this.client.post("/organizations/enrich", {
                api_key: this.apiKey,
                name: params.name,
                domain: params.domain,
            });

            if (response.data?.organization) {
                console.log(`✅ Apollo: Enriched company - ${response.data.organization.name}`);
                return {
                    success: true,
                    data: response.data.organization as ApolloCompanyResult,
                    creditsUsed: 1,
                };
            }

            return { success: false, error: "No match found" };
        } catch (error: any) {
            console.error("Apollo enrichCompany error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    /**
     * Search for people with filters
     */
    async searchPeople(filters: ApolloSearchFilters): Promise<EnrichmentResult> {
        if (!this.isConfigured()) {
            return { success: false, error: "Apollo API key not configured" };
        }

        // Check credits before making API call
        const creditCheck = await this.checkCredits();
        if (!creditCheck.hasCredits) {
            return { success: false, error: creditCheck.error || "No credits available" };
        }

        try {
            const response = await this.client.post("/mixed_people/search", {
                api_key: this.apiKey,
                person_titles: filters.personTitles,
                person_seniorities: filters.personSeniorities,
                organization_ids: filters.organizationIds,
                q_organization_name: filters.organizationNames?.join(" OR "),
                organization_industry_tag_ids: filters.organizationIndustries,
                person_locations: filters.personLocations,
                email_status: filters.emailStatus || ["verified"],
                per_page: filters.limit || 25,
                page: filters.page || 1,
            });

            console.log(`✅ Apollo: Found ${response.data?.people?.length || 0} people`);
            return {
                success: true,
                data: {
                    people: response.data.people as ApolloPersonResult[],
                    totalCount: response.data.pagination?.total_entries || 0,
                    page: response.data.pagination?.page || 1,
                    totalPages: response.data.pagination?.total_pages || 1,
                },
                creditsUsed: response.data?.people?.length || 0,
            };
        } catch (error: any) {
            console.error("Apollo searchPeople error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    /**
     * Enrich and update a Contact in database
     */
    async enrichContact(contactId: string, workspaceId: Types.ObjectId): Promise<EnrichmentResult> {
        const contact = await Contact.findById(contactId);
        if (!contact) {
            return { success: false, error: "Contact not found" };
        }

        const result = await this.enrichPerson({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            linkedinUrl: contact.linkedin,
            organizationName: contact.company,
        });

        if (!result.success || !result.data) {
            return result;
        }

        const apolloData = result.data as ApolloPersonResult;
        const fieldsEnriched: string[] = [];
        const updates: any = {
            "apolloEnrichment.enrichedAt": new Date(),
            "apolloEnrichment.apolloId": apolloData.id,
            "apolloEnrichment.dataSource": "apollo",
            "apolloEnrichment.creditsUsed": result.creditsUsed || 1,
        };

        // Update fields if not already set
        if (!contact.email && apolloData.email) {
            updates.email = apolloData.email;
            fieldsEnriched.push("email");
        }

        if (!contact.linkedin && apolloData.linkedin_url) {
            updates.linkedin = apolloData.linkedin_url;
            fieldsEnriched.push("linkedin");
        }

        if (!contact.title && !contact.jobTitle && apolloData.title) {
            updates.title = apolloData.title;
            updates.jobTitle = apolloData.title;
            fieldsEnriched.push("title");
        }

        if (!contact.phone && apolloData.phone_numbers?.[0]) {
            updates.phone = apolloData.phone_numbers[0].sanitized_number;
            fieldsEnriched.push("phone");
        }

        if (apolloData.city) {
            updates["address.city"] = apolloData.city;
            updates["location.city"] = apolloData.city;
        }
        if (apolloData.state) {
            updates["address.state"] = apolloData.state;
            updates["location.state"] = apolloData.state;
        }
        if (apolloData.country) {
            updates["address.country"] = apolloData.country;
            updates["location.country"] = apolloData.country;
        }

        updates["apolloEnrichment.fieldsEnriched"] = fieldsEnriched;

        await Contact.findByIdAndUpdate(contactId, { $set: updates });

        console.log(`✅ Apollo: Updated contact ${contact.firstName} ${contact.lastName}`);
        return {
            success: true,
            data: {
                contact: { ...contact.toObject(), ...updates },
                enrichedFields: fieldsEnriched,
            },
            creditsUsed: result.creditsUsed,
        };
    }

    /**
     * Enrich and update a Company in database
     */
    async enrichCompanyRecord(companyId: string): Promise<EnrichmentResult> {
        const company = await Company.findById(companyId);
        if (!company) {
            return { success: false, error: "Company not found" };
        }

        const result = await this.enrichCompany({
            name: company.name,
            domain: company.website?.replace(/https?:\/\//, "").replace(/\/$/, ""),
        });

        if (!result.success || !result.data) {
            return result;
        }

        const apolloData = result.data as ApolloCompanyResult;
        const fieldsEnriched: string[] = [];
        const updates: any = {
            "apolloEnrichment.enrichedAt": new Date(),
            "apolloEnrichment.apolloId": apolloData.id,
            "apolloEnrichment.dataSource": "apollo",
            "apolloEnrichment.creditsUsed": result.creditsUsed || 1,
        };

        if (!company.website && apolloData.website_url) {
            updates.website = apolloData.website_url;
            fieldsEnriched.push("website");
        }
        if (!company.linkedinUrl && apolloData.linkedin_url) {
            updates.linkedinUrl = apolloData.linkedin_url;
            fieldsEnriched.push("linkedinUrl");
        }
        if (!company.phone && apolloData.phone) {
            updates.phone = apolloData.phone;
            fieldsEnriched.push("phone");
        }
        if (!company.industry && apolloData.industry) {
            updates.industry = apolloData.industry;
            fieldsEnriched.push("industry");
        }
        if (!company.companySize && apolloData.estimated_num_employees) {
            updates.companySize = this.mapEmployeesToSize(apolloData.estimated_num_employees);
            updates.employeeCount = apolloData.estimated_num_employees;
            fieldsEnriched.push("companySize");
        }
        if (apolloData.short_description) {
            updates.notes = apolloData.short_description;
            fieldsEnriched.push("notes");
        }
        if (apolloData.annual_revenue) {
            updates.annualRevenue = apolloData.annual_revenue;
            fieldsEnriched.push("annualRevenue");
        }

        updates["apolloEnrichment.fieldsEnriched"] = fieldsEnriched;

        await Company.findByIdAndUpdate(companyId, { $set: updates });

        console.log(`✅ Apollo: Updated company ${company.name}`);
        return {
            success: true,
            data: {
                company: { ...company.toObject(), ...updates },
                enrichedFields: fieldsEnriched,
            },
            creditsUsed: result.creditsUsed,
        };
    }

    /**
     * Bulk enrich contacts
     */
    async bulkEnrichContacts(
        contactIds: string[],
        workspaceId: Types.ObjectId
    ): Promise<{
        success: number;
        failed: number;
        results: Array<{ contactId: string; success: boolean; error?: string }>;
    }> {
        const results: Array<{ contactId: string; success: boolean; error?: string }> = [];
        let success = 0;
        let failed = 0;

        for (const contactId of contactIds) {
            try {
                const result = await this.enrichContact(contactId, workspaceId);
                if (result.success) {
                    success++;
                    results.push({ contactId, success: true });
                } else {
                    failed++;
                    results.push({ contactId, success: false, error: result.error });
                }

                // Rate limiting - wait 500ms between requests
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error: any) {
                failed++;
                results.push({ contactId, success: false, error: error.message });
            }
        }

        console.log(`📊 Apollo bulk enrich: ${success} success, ${failed} failed`);
        return { success, failed, results };
    }

    /**
     * Map employee count to company size category
     */
    private mapEmployeesToSize(employees: number): string {
        if (employees < 10) return "1-10";
        if (employees < 50) return "11-50";
        if (employees < 200) return "51-200";
        if (employees < 500) return "201-500";
        if (employees < 1000) return "501-1000";
        if (employees < 5000) return "1001-5000";
        if (employees < 10000) return "5001-10000";
        return "10000+";
    }
}

export default new ApolloService();
