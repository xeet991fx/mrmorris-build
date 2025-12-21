/**
 * Contact Sync Service
 *
 * Automatically syncs contacts from integrated email accounts on a schedule
 */

import cron from "node-cron";
import { google } from "googleapis";
import EmailIntegration from "../models/EmailIntegration";
import Contact from "../models/Contact";

interface SyncStats {
    totalIntegrations: number;
    successful: number;
    failed: number;
    contactsCreated: number;
    contactsUpdated: number;
    contactsSkipped: number;
}

/**
 * Sync contacts for a single email integration
 */
async function syncContactsForIntegration(integrationId: string): Promise<{
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    error?: string;
}> {
    try {
        const integration = await EmailIntegration.findById(integrationId).select("+accessToken +refreshToken");

        if (!integration || !integration.isActive) {
            return {
                success: false,
                created: 0,
                updated: 0,
                skipped: 0,
                error: "Integration not active",
            };
        }

        // Set up OAuth client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
        );

        oauth2Client.setCredentials({
            access_token: integration.getAccessToken(),
            refresh_token: integration.getRefreshToken(),
        });

        // Handle token refresh
        oauth2Client.on("tokens", async (tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) => {
            if (tokens.access_token) {
                integration.setTokens(
                    tokens.access_token,
                    tokens.refresh_token || integration.getRefreshToken()
                );
                if (tokens.expiry_date) {
                    integration.expiresAt = new Date(tokens.expiry_date);
                }
                await integration.save();
            }
        });

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        // Get People API client
        const people = google.people({ version: "v1", auth: oauth2Client });

        // Fetch contacts from Google
        const connectionsResponse = await people.people.connections.list({
            resourceName: "people/me",
            pageSize: 500,
            personFields: "names,emailAddresses,phoneNumbers,organizations,urls,addresses",
        });

        const connections = connectionsResponse.data.connections || [];

        // Get existing contacts for deduplication
        const existingContacts = await Contact.find({
            workspaceId: integration.workspaceId,
        });
        const emailToContactMap = new Map(
            existingContacts
                .filter(c => c.email)
                .map(c => [c.email!.toLowerCase(), c])
        );

        // Process each Google contact
        for (const person of connections) {
            try {
                const primaryEmail = person.emailAddresses?.find(e => e.metadata?.primary)?.value
                    || person.emailAddresses?.[0]?.value;

                if (!primaryEmail) {
                    skippedCount++;
                    continue;
                }

                const existingContact = emailToContactMap.get(primaryEmail.toLowerCase());

                const name = person.names?.find(n => n.metadata?.primary) || person.names?.[0];
                const phone = person.phoneNumbers?.find(p => p.metadata?.primary)?.value
                    || person.phoneNumbers?.[0]?.value;
                const org = person.organizations?.find(o => o.metadata?.primary) || person.organizations?.[0];
                const url = person.urls?.find(u => u.type === "LinkedIn")?.value;
                const address = person.addresses?.find(a => a.metadata?.primary) || person.addresses?.[0];

                const contactData = {
                    firstName: name?.givenName || "",
                    lastName: name?.familyName || "",
                    email: primaryEmail,
                    phone: phone,
                    company: org?.name,
                    jobTitle: org?.title,
                    linkedin: url,
                    address: address ? {
                        street: address.streetAddress,
                        city: address.city,
                        state: address.region,
                        country: address.country,
                        zipCode: address.postalCode,
                    } : undefined,
                    source: "gmail_sync",
                    status: "lead" as const,
                };

                if (existingContact) {
                    const updateData: any = {};
                    if (contactData.phone && !existingContact.phone) updateData.phone = contactData.phone;
                    if (contactData.company && !existingContact.company) updateData.company = contactData.company;
                    if (contactData.jobTitle && !existingContact.jobTitle) updateData.jobTitle = contactData.jobTitle;
                    if (contactData.linkedin && !existingContact.linkedin) updateData.linkedin = contactData.linkedin;

                    if (Object.keys(updateData).length > 0) {
                        await Contact.findByIdAndUpdate(existingContact._id, { $set: updateData });
                        updatedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    await Contact.create({
                        ...contactData,
                        workspaceId: integration.workspaceId,
                        userId: integration.userId,
                    });
                    createdCount++;
                    emailToContactMap.set(primaryEmail.toLowerCase(), null as any);
                }
            } catch (error) {
                console.error("Error processing contact:", error);
                skippedCount++;
            }
        }

        // Update integration sync time
        await EmailIntegration.findByIdAndUpdate(integrationId, {
            lastSyncAt: new Date(),
            syncError: undefined,
        });

        return {
            success: true,
            created: createdCount,
            updated: updatedCount,
            skipped: skippedCount,
        };
    } catch (error: any) {
        console.error(`Contact sync error for integration ${integrationId}:`, error);

        // Update integration with error
        try {
            await EmailIntegration.findByIdAndUpdate(integrationId, {
                syncError: error.message,
            });
        } catch (e) { }

        return {
            success: false,
            created: 0,
            updated: 0,
            skipped: 0,
            error: error.message,
        };
    }
}

/**
 * Sync contacts for all active integrations
 */
export async function syncAllContacts(): Promise<SyncStats> {
    console.log("🔄 Starting scheduled contact sync...");

    const stats: SyncStats = {
        totalIntegrations: 0,
        successful: 0,
        failed: 0,
        contactsCreated: 0,
        contactsUpdated: 0,
        contactsSkipped: 0,
    };

    try {
        // Get all active email integrations
        const integrations = await EmailIntegration.find({
            isActive: true,
            provider: "gmail",
        });

        stats.totalIntegrations = integrations.length;

        if (integrations.length === 0) {
            console.log("📭 No active email integrations found");
            return stats;
        }

        console.log(`📬 Found ${integrations.length} active Gmail integrations`);

        // Sync each integration
        for (const integration of integrations) {
            const result = await syncContactsForIntegration(integration._id.toString());

            if (result.success) {
                stats.successful++;
                stats.contactsCreated += result.created;
                stats.contactsUpdated += result.updated;
                stats.contactsSkipped += result.skipped;

                console.log(`✅ Synced ${integration.email}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
            } else {
                stats.failed++;
                console.error(`❌ Failed to sync ${integration.email}: ${result.error}`);
            }
        }

        console.log(`✨ Contact sync complete: ${stats.successful}/${stats.totalIntegrations} successful`);
        console.log(`   Created: ${stats.contactsCreated}, Updated: ${stats.contactsUpdated}, Skipped: ${stats.contactsSkipped}`);
    } catch (error) {
        console.error("Contact sync job error:", error);
    }

    return stats;
}

/**
 * Schedule contact sync job
 * Runs daily at 2 AM
 */
export function startContactSyncScheduler() {
    // Run every day at 2 AM
    cron.schedule("0 2 * * *", async () => {
        await syncAllContacts();
    });

    console.log("📅 Contact sync scheduler started (daily at 2 AM)");

    // Also run immediately on startup (optional)
    // syncAllContacts();
}

/**
 * Manual trigger for contact sync (can be called from API)
 */
export async function triggerContactSync(): Promise<SyncStats> {
    return await syncAllContacts();
}
