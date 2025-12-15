import { GoogleGenerativeAI } from "@google/generative-ai";
import { RawRow, ParseResult } from "./FileParserService";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Contact field schema for AI mapping
const CONTACT_FIELDS = {
    firstName: "First name of the person",
    lastName: "Last name of the person",
    email: "Email address",
    phone: "Phone number",
    company: "Company or organization name",
    jobTitle: "Job title or position",
    status: "Status: lead, prospect, customer, or inactive",
    source: "Lead source (website, referral, event, etc.)",
    tags: "Comma-separated tags",
    linkedin: "LinkedIn profile URL",
    twitter: "Twitter/X handle or URL",
    website: "Personal or company website",
    notes: "Notes or additional information",
    "address.street": "Street address",
    "address.city": "City",
    "address.state": "State or province",
    "address.country": "Country",
    "address.zipCode": "ZIP or postal code",
};

// Company field schema for AI mapping
const COMPANY_FIELDS = {
    name: "Company or organization name",
    industry: "Industry sector",
    website: "Company website URL",
    phone: "Company phone number",
    companySize: "Company size: 1-10, 11-50, 51-200, 201-500, 501-1000, or 1000+",
    annualRevenue: "Annual revenue (numeric)",
    employeeCount: "Number of employees (numeric)",
    status: "Status: lead, prospect, customer, or churned",
    source: "Lead source",
    tags: "Comma-separated tags",
    linkedinUrl: "LinkedIn company page URL",
    twitterUrl: "Twitter/X URL",
    facebookUrl: "Facebook page URL",
    notes: "Notes or additional information",
    "address.street": "Street address",
    "address.city": "City",
    "address.state": "State or province",
    "address.country": "Country",
    "address.zipCode": "ZIP or postal code",
};

export interface ExtractedContact {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    status?: "lead" | "prospect" | "customer" | "inactive";
    source?: string;
    tags?: string[];
    linkedin?: string;
    twitter?: string;
    website?: string;
    notes?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
}

export interface ExtractedCompany {
    name?: string;
    industry?: string;
    website?: string;
    phone?: string;
    companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
    annualRevenue?: number;
    employeeCount?: number;
    status?: "lead" | "prospect" | "customer" | "churned";
    source?: string;
    tags?: string[];
    linkedinUrl?: string;
    twitterUrl?: string;
    facebookUrl?: string;
    notes?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
    };
}

export interface ColumnMapping {
    sourceColumn: string;
    targetField: string;
    confidence: number;
}

export interface ExtractionResult<T> {
    data: T[];
    columnMappings: ColumnMapping[];
    warnings: string[];
    totalRows: number;
    validRows: number;
}

/**
 * AIDataExtractor - Uses Gemini 2.5 Pro to intelligently extract and map data
 */
export class AIDataExtractor {
    private model: any;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    /**
     * Extract contacts from parsed file data
     */
    async extractContacts(parseResult: ParseResult): Promise<ExtractionResult<ExtractedContact>> {
        const { headers, rows } = parseResult;
        const warnings: string[] = [];

        // Check if this is PDF raw data that needs AI extraction
        if (headers.includes("_rawLine")) {
            return this.extractContactsFromPDFText(rows);
        }

        // For structured data (CSV/Excel), use AI to map columns
        const columnMappings = await this.mapColumnsToFields(headers, "contacts");

        // Apply mappings to extract data
        const data: ExtractedContact[] = [];
        for (const row of rows) {
            const contact = this.applyContactMappings(row, columnMappings);

            // Validate: must have at least firstName or email
            if (contact.firstName || contact.email) {
                data.push(contact);
            } else {
                warnings.push(`Skipped row with insufficient data: ${JSON.stringify(row).substring(0, 100)}`);
            }
        }

        return {
            data,
            columnMappings,
            warnings,
            totalRows: rows.length,
            validRows: data.length,
        };
    }

    /**
     * Extract companies from parsed file data
     */
    async extractCompanies(parseResult: ParseResult): Promise<ExtractionResult<ExtractedCompany>> {
        const { headers, rows } = parseResult;
        const warnings: string[] = [];

        // Check if this is PDF raw data that needs AI extraction
        if (headers.includes("_rawLine")) {
            return this.extractCompaniesFromPDFText(rows);
        }

        // For structured data (CSV/Excel), use AI to map columns
        const columnMappings = await this.mapColumnsToFields(headers, "companies");

        // Apply mappings to extract data
        const data: ExtractedCompany[] = [];
        for (const row of rows) {
            const company = this.applyCompanyMappings(row, columnMappings);

            // Validate: must have company name
            if (company.name) {
                data.push(company);
            } else {
                warnings.push(`Skipped row with no company name: ${JSON.stringify(row).substring(0, 100)}`);
            }
        }

        return {
            data,
            columnMappings,
            warnings,
            totalRows: rows.length,
            validRows: data.length,
        };
    }

    /**
     * Use AI to map source columns to target fields
     */
    private async mapColumnsToFields(
        sourceColumns: string[],
        type: "contacts" | "companies"
    ): Promise<ColumnMapping[]> {
        const targetFields = type === "contacts" ? CONTACT_FIELDS : COMPANY_FIELDS;

        const prompt = `You are a data mapping assistant. Given these source column headers from a ${type} file:
${JSON.stringify(sourceColumns)}

Map them to these target fields:
${JSON.stringify(targetFields, null, 2)}

For each source column, determine the best matching target field. Consider:
- "Full Name" should map to both firstName and lastName (split later)
- "Name" for contacts usually means full name, for companies it's the company name
- Email variations like "E-mail", "Email Address" all map to email
- Phone variations like "Mobile", "Telephone", "Cell" all map to phone

Return a JSON array with this structure:
[{"sourceColumn": "column_name", "targetField": "field_name", "confidence": 0.0-1.0}]

Only include mappings with confidence > 0.5. Return ONLY the JSON array, no explanation.`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();

            // Clean up response - remove markdown code blocks if present
            text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");

            const mappings = JSON.parse(text) as ColumnMapping[];
            return mappings.filter((m) => m.confidence > 0.5);
        } catch (error) {
            console.error("AI column mapping failed:", error);
            // Fallback to basic matching
            return this.basicColumnMapping(sourceColumns, type);
        }
    }

    /**
     * Fallback basic column mapping without AI
     */
    private basicColumnMapping(
        sourceColumns: string[],
        type: "contacts" | "companies"
    ): ColumnMapping[] {
        const mappings: ColumnMapping[] = [];
        const normalizedTargets = type === "contacts"
            ? Object.keys(CONTACT_FIELDS)
            : Object.keys(COMPANY_FIELDS);

        for (const source of sourceColumns) {
            const normalized = source.toLowerCase().replace(/[^a-z0-9]/g, "");

            for (const target of normalizedTargets) {
                const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, "");

                if (normalized.includes(targetNorm) || targetNorm.includes(normalized)) {
                    mappings.push({ sourceColumn: source, targetField: target, confidence: 0.7 });
                    break;
                }
            }

            // Common aliases
            if (normalized.includes("mail")) {
                mappings.push({ sourceColumn: source, targetField: "email", confidence: 0.9 });
            } else if (normalized.includes("phone") || normalized.includes("mobile") || normalized.includes("cell")) {
                mappings.push({ sourceColumn: source, targetField: "phone", confidence: 0.9 });
            } else if (normalized.includes("firstname") || normalized === "first") {
                mappings.push({ sourceColumn: source, targetField: "firstName", confidence: 0.95 });
            } else if (normalized.includes("lastname") || normalized === "last") {
                mappings.push({ sourceColumn: source, targetField: "lastName", confidence: 0.95 });
            } else if ((normalized === "name" || normalized.includes("fullname")) && type === "contacts") {
                mappings.push({ sourceColumn: source, targetField: "fullName", confidence: 0.9 });
            } else if ((normalized === "name" || normalized.includes("company")) && type === "companies") {
                mappings.push({ sourceColumn: source, targetField: "name", confidence: 0.95 });
            }
        }

        return mappings;
    }

    /**
     * Apply column mappings to extract a contact
     */
    private applyContactMappings(row: RawRow, mappings: ColumnMapping[]): ExtractedContact {
        const contact: ExtractedContact = {};
        const addressFields: any = {};

        for (const mapping of mappings) {
            const value = row[mapping.sourceColumn];
            if (value === undefined || value === "") continue;

            const strValue = String(value).trim();

            // Handle special cases
            if (mapping.targetField === "fullName") {
                // Split full name
                const parts = strValue.split(/\s+/);
                contact.firstName = parts[0];
                contact.lastName = parts.slice(1).join(" ") || "";
            } else if (mapping.targetField.startsWith("address.")) {
                const addressField = mapping.targetField.replace("address.", "");
                addressFields[addressField] = strValue;
            } else if (mapping.targetField === "tags") {
                contact.tags = strValue.split(",").map((t) => t.trim()).filter(Boolean);
            } else if (mapping.targetField === "status") {
                const status = strValue.toLowerCase();
                if (["lead", "prospect", "customer", "inactive"].includes(status)) {
                    contact.status = status as any;
                }
            } else {
                (contact as any)[mapping.targetField] = strValue;
            }
        }

        if (Object.keys(addressFields).length > 0) {
            contact.address = addressFields;
        }

        return contact;
    }

    /**
     * Apply column mappings to extract a company
     */
    private applyCompanyMappings(row: RawRow, mappings: ColumnMapping[]): ExtractedCompany {
        const company: ExtractedCompany = {};
        const addressFields: any = {};

        for (const mapping of mappings) {
            const value = row[mapping.sourceColumn];
            if (value === undefined || value === "") continue;

            const strValue = String(value).trim();

            if (mapping.targetField.startsWith("address.")) {
                const addressField = mapping.targetField.replace("address.", "");
                addressFields[addressField] = strValue;
            } else if (mapping.targetField === "tags") {
                company.tags = strValue.split(",").map((t) => t.trim()).filter(Boolean);
            } else if (mapping.targetField === "status") {
                const status = strValue.toLowerCase();
                if (["lead", "prospect", "customer", "churned"].includes(status)) {
                    company.status = status as any;
                }
            } else if (mapping.targetField === "companySize") {
                if (["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].includes(strValue)) {
                    company.companySize = strValue as any;
                }
            } else if (mapping.targetField === "annualRevenue" || mapping.targetField === "employeeCount") {
                const num = parseInt(strValue.replace(/[^0-9]/g, ""));
                if (!isNaN(num)) {
                    (company as any)[mapping.targetField] = num;
                }
            } else {
                (company as any)[mapping.targetField] = strValue;
            }
        }

        if (Object.keys(addressFields).length > 0) {
            company.address = addressFields;
        }

        return company;
    }

    /**
     * Extract contacts from raw PDF text using AI
     */
    private async extractContactsFromPDFText(rows: RawRow[]): Promise<ExtractionResult<ExtractedContact>> {
        const text = rows.map((r) => r._rawLine).join("\n");

        const prompt = `Extract contact information from this text. Look for names, emails, phone numbers, companies, job titles, etc.

Text:
${text.substring(0, 8000)}

Return a JSON array of contacts with these fields where available:
- firstName, lastName, email, phone, company, jobTitle, linkedin, twitter, website, notes

Return ONLY a valid JSON array, no explanation. If no contacts found, return [].`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text().trim();
            responseText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

            const data = JSON.parse(responseText) as ExtractedContact[];

            return {
                data,
                columnMappings: [],
                warnings: ["Data extracted from PDF using AI - please verify accuracy"],
                totalRows: rows.length,
                validRows: data.length,
            };
        } catch (error) {
            console.error("PDF contact extraction failed:", error);
            return {
                data: [],
                columnMappings: [],
                warnings: ["Failed to extract contacts from PDF: " + (error as Error).message],
                totalRows: rows.length,
                validRows: 0,
            };
        }
    }

    /**
     * Extract companies from raw PDF text using AI
     */
    private async extractCompaniesFromPDFText(rows: RawRow[]): Promise<ExtractionResult<ExtractedCompany>> {
        const text = rows.map((r) => r._rawLine).join("\n");

        const prompt = `Extract company information from this text. Look for company names, websites, phone numbers, industries, etc.

Text:
${text.substring(0, 8000)}

Return a JSON array of companies with these fields where available:
- name, industry, website, phone, companySize, employeeCount, linkedinUrl, notes

Return ONLY a valid JSON array, no explanation. If no companies found, return [].`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text().trim();
            responseText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

            const data = JSON.parse(responseText) as ExtractedCompany[];

            return {
                data,
                columnMappings: [],
                warnings: ["Data extracted from PDF using AI - please verify accuracy"],
                totalRows: rows.length,
                validRows: data.length,
            };
        } catch (error) {
            console.error("PDF company extraction failed:", error);
            return {
                data: [],
                columnMappings: [],
                warnings: ["Failed to extract companies from PDF: " + (error as Error).message],
                totalRows: rows.length,
                validRows: 0,
            };
        }
    }
}

export const aiDataExtractor = new AIDataExtractor();
