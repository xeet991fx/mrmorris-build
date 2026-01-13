/**
 * Email Contact Extractor Service
 *
 * Automatically extracts contacts from email headers and creates/updates them in CRM
 */

import Contact from "../models/Contact";
import Company from "../models/Company";
import { ParsedSignature } from "./emailSignatureParser";

/**
 * Parse email header to extract email address and name
 * Handles formats like:
 * - "John Doe <john@acme.com>"
 * - "john@acme.com"
 * - "John Doe john@acme.com"
 */
export function parseEmailHeader(header: string): { email: string; name: string } | null {
    if (!header || !header.trim()) {
        return null;
    }

    const trimmed = header.trim();

    // Format: "Name <email@domain.com>"
    const nameEmailMatch = trimmed.match(/^([^<]+)\s*<([^>]+)>$/);
    if (nameEmailMatch) {
        const name = nameEmailMatch[1].trim().replace(/['"]/g, ''); // Remove quotes
        const email = nameEmailMatch[2].trim();
        return { email, name };
    }

    // Format: "email@domain.com"
    const emailOnlyMatch = trimmed.match(/^([^\s]+@[^\s]+)$/);
    if (emailOnlyMatch) {
        return { email: emailOnlyMatch[1], name: '' };
    }

    // Format: "Name email@domain.com" (space separated)
    const spaceMatch = trimmed.match(/^(.+?)\s+([^\s]+@[^\s]+)$/);
    if (spaceMatch) {
        return { email: spaceMatch[2], name: spaceMatch[1].trim() };
    }

    return null;
}

/**
 * Parse name into first and last name
 * If no name provided, use email local part as firstName
 */
export function parseName(fullName: string, email?: string): { firstName: string; lastName: string } {
    if (!fullName || !fullName.trim()) {
        // If no name, use email local part (before @)
        if (email) {
            const localPart = email.split('@')[0];
            // Clean up the local part (remove dots, numbers, etc.)
            const cleanName = localPart.replace(/[._-]/g, ' ').replace(/\d+/g, '').trim() || localPart;
            return { firstName: cleanName, lastName: '' };
        }
        return { firstName: 'Unknown', lastName: '' };
    }

    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 0) {
        return { firstName: email ? email.split('@')[0] : 'Unknown', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    // First part is first name, rest is last name
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    return { firstName, lastName };
}

/**
 * Clean email address (remove angle brackets, quotes, spaces)
 */
export function cleanEmail(email: string): string {
    if (!email) return '';

    // Remove angle brackets, quotes, and trim
    return email
        .replace(/[<>"']/g, '')
        .trim()
        .toLowerCase();
}

/**
 * Check if email is from a personal email provider (Gmail, Yahoo, etc.)
 */
export function isPersonalEmail(email: string): boolean {
    if (!email || !email.includes('@')) {
        return false;
    }

    // Clean email first (remove <, >, etc.)
    const cleaned = cleanEmail(email);
    const domain = cleaned.split('@')[1];

    const personalProviders = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
        'zoho.com', 'yandex.com', 'gmx.com', 'live.com',
        'msn.com', 'me.com', 'mac.com', 'qq.com', '163.com',
        'rediffmail.com', 'mailinator.com', 'guerrillamail.com'
    ];

    return personalProviders.includes(domain);
}

/**
 * Extract company name from email domain
 * Examples:
 * - john@acme.com -> "Acme"
 * - user@tech.startup.io -> "Startup"
 * - admin@gmail.com -> null (common email provider)
 */
export function extractCompanyFromDomain(email: string): string | null {
    if (!email || !email.includes('@')) {
        return null;
    }

    // Clean email first
    const cleaned = cleanEmail(email);
    const domain = cleaned.split('@')[1];

    // Skip personal email providers
    if (isPersonalEmail(cleaned)) {
        return null;
    }

    // Extract main domain part (e.g., "acme" from "acme.com" or "mail.acme.com")
    const domainParts = domain.split('.');

    // If domain is like "mail.acme.com", take second-to-last part
    const mainPart = domainParts.length > 2 ? domainParts[domainParts.length - 2] : domainParts[0];

    // Capitalize first letter
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
}

/**
 * Check if an email is a generic company/role-based email (not a personal contact)
 * These should NOT be created as contacts or companies
 */
export function isGenericCompanyEmail(email: string): boolean {
    if (!email) return false;

    // Clean email first
    const cleaned = cleanEmail(email);
    const localPart = cleaned.split('@')[0];

    const genericPrefixes = [
        'support', 'info', 'sales', 'contact', 'admin', 'help', 'service',
        'hello', 'noreply', 'no-reply', 'team', 'office', 'enquiries', 'inquiries',
        'hr', 'jobs', 'careers', 'billing', 'accounts', 'accounting', 'marketing',
        'press', 'media', 'feedback', 'abuse', 'webmaster', 'postmaster',
        'notifications', 'alerts', 'updates', 'newsletter', 'news',
        'customerservice', 'customer-service', 'techsupport', 'tech-support',
        'reservations', 'bookings', 'orders', 'receipts', 'invoices',
        'legal', 'compliance', 'security', 'privacy', 'unsubscribe',
        'donotreply', 'do-not-reply', 'mailer', 'daemon', 'bounce'
    ];

    // Check if local part matches or starts with generic prefix (with ., -, or _)
    return genericPrefixes.some(prefix =>
        localPart === prefix ||
        localPart.startsWith(prefix + '.') ||
        localPart.startsWith(prefix + '-') ||
        localPart.startsWith(prefix + '_')
    );
}

/**
 * Parse multiple email addresses from a header (handles To, Cc with multiple recipients)
 */
export function parseMultipleEmails(header: string): Array<{ email: string; name: string }> {
    if (!header || !header.trim()) {
        return [];
    }

    // Split by comma, but not commas inside quotes or angle brackets
    const recipients: Array<{ email: string; name: string }> = [];
    const parts = header.split(',');

    for (const part of parts) {
        const parsed = parseEmailHeader(part.trim());
        if (parsed && parsed.email) {
            recipients.push(parsed);
        }
    }

    return recipients;
}

/**
 * Extract all unique email addresses from email headers
 * Only extracts From and To - CC and BCC are intentionally excluded
 * to avoid creating contacts from carbon-copied recipients
 */
export function extractEmailParticipants(headers: {
    from?: string;
    to?: string;
    cc?: string;
    bcc?: string;
}): Array<{ email: string; name: string; company?: string }> {
    const participants: Array<{ email: string; name: string; company?: string }> = [];
    const seenEmails = new Set<string>();

    // Parse From
    if (headers.from) {
        const parsed = parseEmailHeader(headers.from);
        if (parsed && !seenEmails.has(parsed.email.toLowerCase())) {
            // Skip generic company emails
            if (!isGenericCompanyEmail(parsed.email)) {
                seenEmails.add(parsed.email.toLowerCase());
                participants.push({
                    ...parsed,
                    company: extractCompanyFromDomain(parsed.email) || undefined,
                });
            }
        }
    }

    // Parse To
    if (headers.to) {
        const toList = parseMultipleEmails(headers.to);
        for (const item of toList) {
            if (!seenEmails.has(item.email.toLowerCase())) {
                // Skip generic company emails
                if (!isGenericCompanyEmail(item.email)) {
                    seenEmails.add(item.email.toLowerCase());
                    participants.push({
                        ...item,
                        company: extractCompanyFromDomain(item.email) || undefined,
                    });
                }
            }
        }
    }

    // NOTE: CC and BCC recipients are intentionally NOT extracted as contacts
    // They are typically not the primary correspondents and should not be auto-created

    return participants;
}

/**
 * Find or create Company from email domain
 * Returns Company._id if it's a work email, null for personal emails
 */
export async function findOrCreateCompanyFromEmail(
    email: string,
    workspaceId: string,
    userId: string,
    existingCompaniesMap: Map<string, any>
): Promise<{ companyId: string | null; companyName: string | null }> {
    const companyName = extractCompanyFromDomain(email);

    // No company (personal email)
    if (!companyName) {
        return { companyId: null, companyName: null };
    }

    const companyNameLower = companyName.toLowerCase();

    // Check if company already exists in map
    const existingCompany = existingCompaniesMap.get(companyNameLower);
    if (existingCompany) {
        return { companyId: existingCompany._id.toString(), companyName };
    }

    // Check if company exists in database
    const dbCompany = await Company.findOne({
        workspaceId,
        name: { $regex: new RegExp(`^${companyName}$`, 'i') }, // Case-insensitive match
    });

    if (dbCompany) {
        existingCompaniesMap.set(companyNameLower, dbCompany);
        return { companyId: dbCompany._id.toString(), companyName };
    }

    // Create new company
    const domain = email.split('@')[1];
    const newCompany = await Company.create({
        workspaceId,
        userId,
        name: companyName,
        website: `https://${domain}`,
        source: 'email_extraction',
        status: 'lead',
    });

    existingCompaniesMap.set(companyNameLower, newCompany);
    console.log(`   🏢 Created company: ${companyName}`);

    return { companyId: newCompany._id.toString(), companyName };
}

/**
 * Auto-create or update contact from email participant
 * NEW LOGIC:
 * - Personal emails (Gmail, Yahoo, etc.) → Create Contact ONLY (no company)
 * - Work emails (acme.com, etc.) → Create Company ONLY (no contact)
 */
export async function autoCreateContactFromEmail(
    participant: { email: string; name: string; company?: string },
    workspaceId: string,
    userId: string,
    existingContactsMap: Map<string, any>,
    existingCompaniesMap: Map<string, any>,
    signatureData?: ParsedSignature | null
): Promise<{ created: boolean; updated: boolean; contact: any; companyCreated: boolean; companyUpdated: boolean }> {
    // Clean email first (remove <, >, quotes, etc.)
    const cleanedEmail = cleanEmail(participant.email);
    const emailLower = cleanedEmail.toLowerCase();
    const isPersonal = isPersonalEmail(cleanedEmail);

    // WORK EMAIL → Create Company ONLY, no contact
    if (!isPersonal) {
        const companyNameFromSignature = signatureData?.company;
        let { companyId, companyName } = await findOrCreateCompanyFromEmail(
            cleanedEmail,
            workspaceId,
            userId,
            existingCompaniesMap
        );

        const companyCreated = !!companyId && companyName !== null;
        let companyUpdated = false;

        // Update company with signature data if available
        if (companyId && signatureData) {
            const companyUpdateData: any = {};

            if (signatureData.website && signatureData.website !== `https://${cleanedEmail.split('@')[1]}`) {
                companyUpdateData.website = signatureData.website;
            }

            if (signatureData.phone) {
                companyUpdateData.phone = signatureData.phone;
            }

            if (signatureData.address) {
                companyUpdateData.address = signatureData.address;
            }

            // Use company name from signature if provided (more accurate than domain)
            if (companyNameFromSignature && companyNameFromSignature !== companyName) {
                companyUpdateData.name = companyNameFromSignature;
                companyName = companyNameFromSignature;
            }

            if (Object.keys(companyUpdateData).length > 0) {
                await Company.findByIdAndUpdate(companyId, { $set: companyUpdateData });
                companyUpdated = true;
                console.log(`   🏢 Updated company with signature data: ${companyName}`);
            }
        }

        // Return company data, no contact created
        return {
            created: false,
            updated: false,
            contact: null,
            companyCreated,
            companyUpdated
        };
    }

    // PERSONAL EMAIL → Create Contact ONLY, no company

    // Check if contact already exists
    const existingContact = existingContactsMap.get(emailLower);

    if (existingContact) {
        // Update only if we have new data and existing fields are empty
        const updateData: any = {};

        if (participant.name) {
            const { firstName, lastName } = parseName(participant.name, cleanedEmail);
            if (firstName && !existingContact.firstName) {
                updateData.firstName = firstName;
            }
            if (lastName && !existingContact.lastName) {
                updateData.lastName = lastName;
            }
        }

        // Add signature data if available (for personal emails)
        if (signatureData) {
            if (signatureData.jobTitle && !existingContact.jobTitle) {
                updateData.jobTitle = signatureData.jobTitle;
            }
            if (signatureData.phone && !existingContact.phone) {
                updateData.phone = signatureData.phone;
            }
            if (signatureData.linkedin && !existingContact.linkedin) {
                updateData.linkedin = signatureData.linkedin;
            }
            if (signatureData.address && !existingContact.address) {
                updateData.address = signatureData.address;
            }
        }

        if (Object.keys(updateData).length > 0) {
            await Contact.findByIdAndUpdate(existingContact._id, { $set: updateData });
            return { created: false, updated: true, contact: existingContact, companyCreated: false, companyUpdated: false };
        }

        return { created: false, updated: false, contact: existingContact, companyCreated: false, companyUpdated: false };
    }

    // Create new contact for personal email (no company link)
    const { firstName, lastName } = parseName(participant.name, cleanedEmail);

    const newContact = await Contact.create({
        workspaceId,
        userId,
        firstName, // Will use email local part if no name
        lastName: lastName || '',
        email: cleanedEmail,
        phone: signatureData?.phone || signatureData?.mobilePhone,
        jobTitle: signatureData?.jobTitle,
        linkedin: signatureData?.linkedin,
        address: signatureData?.address,
        source: 'email_extraction',
        status: 'lead',
    });

    // Add to map to prevent duplicates in this batch
    existingContactsMap.set(emailLower, newContact);

    return { created: true, updated: false, contact: newContact, companyCreated: false, companyUpdated: false };
}
