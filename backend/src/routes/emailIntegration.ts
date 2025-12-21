import express, { Response } from "express";
import { google } from "googleapis";
import { authenticate, AuthRequest } from "../middleware/auth";
import EmailIntegration from "../models/EmailIntegration";
import CalendarIntegration from "../models/CalendarIntegration";
import Project from "../models/Project";
import Contact from "../models/Contact";
import Company from "../models/Company";
import Activity from "../models/Activity";
import Opportunity from "../models/Opportunity";
import { triggerContactSync } from "../services/contactSyncService";
import { extractEmailParticipants, autoCreateContactFromEmail, isGenericCompanyEmail, cleanEmail } from "../services/emailContactExtractor";
import { parseEmailSignature, htmlToPlainText } from "../services/emailSignatureParser";

const router = express.Router();

// Gmail OAuth configuration - includes email, calendar, AND contacts scopes
const GMAIL_SCOPES = [
    // Email scopes
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    // Calendar scopes - integrated with Gmail OAuth
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    // Contacts/People API scopes - for contact sync
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/contacts.other.readonly",
];

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
    );
};

/**
 * GET /api/email/connect/gmail
 * Start Gmail OAuth flow
 */
router.get("/connect/gmail", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        // Validate workspace
        const workspace = await Project.findById(workspaceId);
        if (!workspace || workspace.userId.toString() !== (req.user?._id as any).toString()) {
            return res.status(403).json({
                success: false,
                error: "Invalid workspace",
            });
        }

        const oauth2Client = getOAuth2Client();

        // Store state for callback validation
        const state = Buffer.from(
            JSON.stringify({
                userId: req.user?._id,
                workspaceId,
            })
        ).toString("base64");

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: GMAIL_SCOPES,
            state,
            prompt: "consent", // Force consent to get refresh token
        });

        res.json({
            success: true,
            data: { authUrl },
        });
    } catch (error: any) {
        console.error("Gmail connect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to start Gmail connection",
        });
    }
});

/**
 * GET /api/email/callback/gmail
 * Gmail OAuth callback
 */
router.get("/callback/gmail", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            console.error("Gmail OAuth error:", error);
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=oauth_denied`
            );
        }

        if (!code || !state) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=invalid_callback`
            );
        }

        // Decode state
        let stateData: { userId: string; workspaceId: string };
        try {
            stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
        } catch (e) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=invalid_state`
            );
        }

        const oauth2Client = getOAuth2Client();

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code as string);

        if (!tokens.access_token || !tokens.refresh_token) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=no_tokens`
            );
        }

        // Get user email from Google
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();

        if (!userInfo.email) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/settings/integrations?error=no_email`
            );
        }

        // Calculate expiry
        const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

        // Create or update integration
        let integration = await EmailIntegration.findOne({
            userId: stateData.userId,
            workspaceId: stateData.workspaceId,
            provider: "gmail",
        });

        if (integration) {
            // Update existing
            integration.email = userInfo.email;
            integration.setTokens(tokens.access_token, tokens.refresh_token);
            integration.expiresAt = expiresAt;
            integration.isActive = true;
            integration.syncError = undefined;
        } else {
            // Create new
            integration = new EmailIntegration({
                userId: stateData.userId,
                workspaceId: stateData.workspaceId,
                provider: "gmail",
                email: userInfo.email,
                accessToken: "temp", // Will be set by setTokens
                refreshToken: "temp",
                expiresAt,
                isActive: true,
            });
            integration.setTokens(tokens.access_token, tokens.refresh_token);
        }

        await integration.save();

        // ALSO create/update Calendar integration with same tokens
        let calendarIntegration = await CalendarIntegration.findOne({
            userId: stateData.userId,
            workspaceId: stateData.workspaceId,
            email: userInfo.email,
            provider: "google",
        }).select("+accessToken +refreshToken");

        if (calendarIntegration) {
            // Update existing
            calendarIntegration.setTokens(tokens.access_token, tokens.refresh_token);
            calendarIntegration.expiresAt = expiresAt;
            calendarIntegration.isActive = true;
            calendarIntegration.syncError = undefined;
        } else {
            // Create new
            calendarIntegration = new CalendarIntegration({
                userId: stateData.userId,
                workspaceId: stateData.workspaceId,
                provider: "google",
                email: userInfo.email,
                expiresAt,
                isActive: true,
            });
            calendarIntegration.setTokens(tokens.access_token, tokens.refresh_token);
        }

        await calendarIntegration.save();
        console.log("✅ Gmail + Calendar integration saved for:", userInfo.email);

        // Redirect to success
        res.redirect(
            `${process.env.FRONTEND_URL}/projects/${stateData.workspaceId}/settings/integrations?success=gmail_connected`
        );
    } catch (error: any) {
        console.error("Gmail callback error:", error);
        res.redirect(
            `${process.env.FRONTEND_URL}/settings/integrations?error=callback_failed`
        );
    }
});

/**
 * GET /api/email/integrations
 * Get all email integrations for a workspace
 */
router.get("/integrations", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: "Workspace ID is required",
            });
        }

        // Validate workspace
        const workspace = await Project.findById(workspaceId);
        if (!workspace || workspace.userId.toString() !== (req.user?._id as any).toString()) {
            return res.status(403).json({
                success: false,
                error: "Invalid workspace",
            });
        }

        const integrations = await EmailIntegration.find({
            workspaceId,
            userId: req.user?._id,
        }).select("-accessToken -refreshToken"); // Don't return tokens

        res.json({
            success: true,
            data: { integrations },
        });
    } catch (error: any) {
        console.error("Get integrations error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch integrations",
        });
    }
});

/**
 * DELETE /api/email/:integrationId/disconnect
 * Disconnect an email integration
 */
router.delete("/:integrationId/disconnect", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;

        const integration = await EmailIntegration.findOneAndDelete({
            _id: integrationId,
            userId: req.user?._id,
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: "Integration not found",
            });
        }

        res.json({
            success: true,
            message: "Email integration disconnected",
        });
    } catch (error: any) {
        console.error("Disconnect error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to disconnect",
        });
    }
});

/**
 * POST /api/email/:integrationId/sync
 * Sync emails from Gmail
 */
router.post("/:integrationId/sync", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;

        // Get integration with tokens
        const integration = await EmailIntegration.findOne({
            _id: integrationId,
            userId: req.user?._id,
        }).select("+accessToken +refreshToken");

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: "Integration not found",
            });
        }

        if (!integration.isActive) {
            return res.status(400).json({
                success: false,
                error: "Integration is not active",
            });
        }

        // Set up OAuth client with tokens
        const oauth2Client = getOAuth2Client();
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

        // Get Gmail client
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Fetch recent emails (last 7 days)
        const lastSync = integration.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const query = `after:${Math.floor(lastSync.getTime() / 1000)}`;

        const messagesResponse = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 50,
        });

        const messages = messagesResponse.data.messages || [];
        let syncedCount = 0;
        let contactsCreated = 0;
        let contactsUpdated = 0;
        let companiesCreated = 0;
        let companiesUpdated = 0;
        let signaturesParsed = 0;
        let genericEmailsSkipped = 0;

        // Get contacts for matching
        const contacts = await Contact.find({ workspaceId: integration.workspaceId });
        const contactEmails = new Map(
            contacts.map((c) => [c.email?.toLowerCase(), c])
        );

        // Get companies for matching
        const companies = await Company.find({ workspaceId: integration.workspaceId });
        const companiesMap = new Map(
            companies.map((c) => [c.name.toLowerCase(), c])
        );

        console.log(`📧 Processing ${messages.length} emails for contact extraction...`);

        // Process each message
        for (const msg of messages) {
            try {
                const fullMessage = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "full",
                    metadataHeaders: ["From", "To", "Cc", "Subject", "Date"],
                });

                const headers = fullMessage.data.payload?.headers || [];
                const getHeader = (name: string) =>
                    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

                const from = getHeader("From");
                const to = getHeader("To");
                const cc = getHeader("Cc");
                const subject = getHeader("Subject");
                const dateStr = getHeader("Date");

                // EXTRACT EMAIL BODY FOR SIGNATURE PARSING
                let emailBody = '';
                const payload = fullMessage.data.payload;

                if (payload?.body?.data) {
                    emailBody = Buffer.from(payload.body.data, 'base64').toString();
                } else if (payload?.parts) {
                    // Handle multipart emails
                    for (const part of payload.parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            emailBody = Buffer.from(part.body.data, 'base64').toString();
                            break;
                        } else if (part.mimeType === 'text/html' && part.body?.data && !emailBody) {
                            const htmlBody = Buffer.from(part.body.data, 'base64').toString();
                            emailBody = htmlToPlainText(htmlBody);
                        }
                    }
                }

                // PARSE EMAIL SIGNATURE WITH AI
                let signatureData = null;
                if (emailBody && emailBody.length > 20) {
                    try {
                        signatureData = await parseEmailSignature(emailBody);
                        if (signatureData && Object.keys(signatureData).length > 0) {
                            signaturesParsed++;
                            console.log(`   📝 Parsed signature for ${from}: ${JSON.stringify(signatureData)}`);
                        }
                    } catch (sigError) {
                        console.error(`   ⚠️  Signature parsing failed for ${from}:`, sigError);
                    }
                }

                // AUTO-EXTRACT CONTACTS FROM EMAIL HEADERS
                // Note: extractEmailParticipants already filters out generic company emails
                const participants = extractEmailParticipants({ from, to, cc });

                // Count how many generic emails were filtered (for logging)
                const allEmails = [from, to, cc].filter(Boolean);
                for (const header of allEmails) {
                    const emails = header.includes(',') ? header.split(',') : [header];
                    for (const email of emails) {
                        const parsed = cleanEmail(email.match(/<(.+?)>/)?.[1] || email.trim().split(" ")[0]);
                        if (parsed && isGenericCompanyEmail(parsed)) {
                            genericEmailsSkipped++;
                            console.log(`   ⊘  Skipped generic email: ${parsed}`);
                        }
                    }
                }

                // Filter out the integration's own email
                const externalParticipants = participants.filter(
                    p => p.email.toLowerCase() !== integration.email.toLowerCase()
                );

                // Extract sender email to match with signature
                const fromEmail = from.match(/<(.+?)>/)?.[1] || from.split(" ")[0];
                const senderEmail = fromEmail.toLowerCase();

                // Auto-create/update contacts for each participant
                for (const participant of externalParticipants) {
                    try {
                        // ONLY apply signature data to the sender (From), not To/Cc recipients
                        const participantSignature = participant.email.toLowerCase() === senderEmail
                            ? signatureData
                            : null;

                        const result = await autoCreateContactFromEmail(
                            participant,
                            integration.workspaceId.toString(),
                            integration.userId.toString(),
                            contactEmails,
                            companiesMap,
                            participantSignature // Only sender gets signature data
                        );

                        // Personal emails create contacts
                        if (result.created) {
                            contactsCreated++;
                            const sigInfo = participantSignature ? ' [with signature]' : '';
                            console.log(`   👤 Created contact (personal email): ${participant.email}${sigInfo}`);
                        } else if (result.updated) {
                            contactsUpdated++;
                            const sigInfo = participantSignature ? ' [enriched]' : '';
                            console.log(`   ✏️  Updated contact: ${participant.email}${sigInfo}`);
                        }

                        // Work emails create companies
                        if (result.companyCreated) {
                            companiesCreated++;
                            console.log(`   🏢 Created company (work email): ${participant.email}`);
                        }

                        if (result.companyUpdated) {
                            companiesUpdated++;
                            console.log(`   🏢 Updated company: ${participant.email}`);
                        }
                    } catch (contactError) {
                        console.error(`   ❌ Failed to create contact ${participant.email}:`, contactError);
                    }
                }

                // Extract email addresses for activity matching (legacy code)
                const toEmail = to.match(/<(.+?)>/)?.[1] || to.split(" ")[0];

                // Check if either email matches a contact
                const matchedContact =
                    contactEmails.get(fromEmail.toLowerCase()) ||
                    contactEmails.get(toEmail.toLowerCase());

                if (matchedContact) {
                    // Find opportunity for this contact
                    const opportunity = await Opportunity.findOne({
                        workspaceId: integration.workspaceId,
                        contactId: matchedContact._id,
                        status: "open",
                    });

                    if (opportunity) {
                        // Check if activity already exists (by email subject + date)
                        const existingActivity = await Activity.findOne({
                            opportunityId: opportunity._id,
                            type: "email",
                            emailSubject: subject,
                        });

                        if (!existingActivity) {
                            // Create activity
                            const isInbound = fromEmail.toLowerCase() !== integration.email.toLowerCase();

                            await Activity.create({
                                workspaceId: integration.workspaceId,
                                userId: integration.userId,
                                opportunityId: opportunity._id,
                                type: "email",
                                title: isInbound ? `Email from ${fromEmail}` : `Email to ${toEmail}`,
                                emailSubject: subject,
                                direction: isInbound ? "inbound" : "outbound",
                                isAutoLogged: true,
                                createdAt: new Date(dateStr),
                            });

                            // Update opportunity
                            await Opportunity.findByIdAndUpdate(opportunity._id, {
                                lastActivityAt: new Date(),
                                $inc: { activityCount: 1, emailCount: 1 },
                            });

                            syncedCount++;
                        }
                    }
                }
            } catch (msgError) {
                console.error("Error processing message:", msgError);
            }
        }

        // Update last sync time
        integration.lastSyncAt = new Date();
        integration.syncError = undefined;
        await integration.save();

        console.log(`\n📊 Email Sync Complete:`);
        console.log(`   📧 Emails processed: ${messages.length}`);
        console.log(`   📝 Activities created: ${syncedCount}`);
        console.log(`   🏢 Companies: ${companiesCreated} created, ${companiesUpdated} updated`);
        console.log(`   👤 Contacts: ${contactsCreated} created, ${contactsUpdated} updated`);
        console.log(`   ✍️  Signatures parsed: ${signaturesParsed}`);
        console.log(`   ⊘  Generic emails skipped: ${genericEmailsSkipped}`);

        res.json({
            success: true,
            data: {
                messagesProcessed: messages.length,
                activitiesCreated: syncedCount,
                companiesCreated,
                companiesUpdated,
                contactsCreated,
                contactsUpdated,
                signaturesParsed,
                lastSyncAt: integration.lastSyncAt,
            },
        });
    } catch (error: any) {
        console.error("Sync error:", error);

        // Update integration with error
        try {
            await EmailIntegration.findByIdAndUpdate(req.params.integrationId, {
                syncError: error.message,
            });
        } catch (e) { }

        res.status(500).json({
            success: false,
            error: error.message || "Failed to sync emails",
        });
    }
});

/**
 * POST /api/email/sync-all-contacts
 * Manually trigger contact sync for all active integrations
 */
router.post("/sync-all-contacts", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const stats = await triggerContactSync();

        res.json({
            success: true,
            data: {
                totalIntegrations: stats.totalIntegrations,
                successful: stats.successful,
                failed: stats.failed,
                contactsCreated: stats.contactsCreated,
                contactsUpdated: stats.contactsUpdated,
                contactsSkipped: stats.contactsSkipped,
            },
        });
    } catch (error: any) {
        console.error("Manual contact sync error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to trigger contact sync",
        });
    }
});

/**
 * POST /api/email/:integrationId/sync-contacts
 * Sync contacts from Gmail using Google People API
 */
router.post("/:integrationId/sync-contacts", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { integrationId } = req.params;
        const { autoExtractFromEmails = false } = req.body;

        // Get integration with tokens
        const integration = await EmailIntegration.findOne({
            _id: integrationId,
            userId: req.user?._id,
        }).select("+accessToken +refreshToken");

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: "Integration not found",
            });
        }

        if (!integration.isActive) {
            return res.status(400).json({
                success: false,
                error: "Integration is not active",
            });
        }

        // Set up OAuth client with tokens
        const oauth2Client = getOAuth2Client();
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
        const errors: string[] = [];

        // Get existing contacts for deduplication (declared here for use in multiple sections)
        const existingContacts = await Contact.find({
            workspaceId: integration.workspaceId,
        });
        const emailToContactMap = new Map(
            existingContacts
                .filter(c => c.email)
                .map(c => [c.email!.toLowerCase(), c])
        );

        // Get People API client
        const people = google.people({ version: "v1", auth: oauth2Client });

        // Fetch contacts from Google
        try {
            const connectionsResponse = await people.people.connections.list({
                resourceName: "people/me",
                pageSize: 500, // Max allowed
                personFields: "names,emailAddresses,phoneNumbers,organizations,urls,addresses,biographies",
            });

            const connections = connectionsResponse.data.connections || [];

            console.log(`📊 Existing contacts in CRM: ${existingContacts.length} (${emailToContactMap.size} with emails)`);

            // Process each Google contact
            let noEmailCount = 0;
            for (const person of connections) {
                try {
                    // Extract primary email
                    const primaryEmail = person.emailAddresses?.find(e => e.metadata?.primary)?.value
                        || person.emailAddresses?.[0]?.value;

                    if (!primaryEmail) {
                        skippedCount++;
                        noEmailCount++;
                        continue; // Skip contacts without email
                    }

                    // Check if contact already exists
                    const existingContact = emailToContactMap.get(primaryEmail.toLowerCase());

                    // Extract contact data
                    const name = person.names?.find(n => n.metadata?.primary) || person.names?.[0];
                    const phone = person.phoneNumbers?.find(p => p.metadata?.primary)?.value
                        || person.phoneNumbers?.[0]?.value;
                    const org = person.organizations?.find(o => o.metadata?.primary) || person.organizations?.[0];
                    const url = person.urls?.find(u => u.type === "LinkedIn")?.value;
                    const address = person.addresses?.find(a => a.metadata?.primary) || person.addresses?.[0];
                    const bio = person.biographies?.find(b => b.metadata?.primary)?.value
                        || person.biographies?.[0]?.value;

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
                        notes: bio,
                        source: "gmail_sync",
                        status: "lead" as const,
                    };

                    // Debug: Log what data Gmail provided
                    const gmailHasData = {
                        name: !!(name?.givenName || name?.familyName),
                        phone: !!phone,
                        company: !!org?.name,
                        jobTitle: !!org?.title,
                        linkedin: !!url,
                        address: !!address,
                    };
                    const gmailFields = Object.keys(gmailHasData).filter(k => gmailHasData[k as keyof typeof gmailHasData]);
                    console.log(`   📋 ${primaryEmail}: Gmail has [${gmailFields.join(', ') || 'email only'}]`);

                    if (existingContact) {
                        // Update existing contact (only if new data is available)
                        const updateData: any = {};
                        if (contactData.phone && !existingContact.phone) updateData.phone = contactData.phone;
                        if (contactData.company && !existingContact.company) updateData.company = contactData.company;
                        if (contactData.jobTitle && !existingContact.jobTitle) updateData.jobTitle = contactData.jobTitle;
                        if (contactData.linkedin && !existingContact.linkedin) updateData.linkedin = contactData.linkedin;
                        if (contactData.address && !existingContact.address) updateData.address = contactData.address;

                        if (Object.keys(updateData).length > 0) {
                            await Contact.findByIdAndUpdate(existingContact._id, {
                                $set: updateData,
                            });
                            updatedCount++;
                            console.log(`   ✏️  Updated ${primaryEmail}: ${Object.keys(updateData).join(', ')}`);
                        } else {
                            skippedCount++;
                            console.log(`   ⏭️  Skipped ${primaryEmail}: already has all data`);
                        }
                    } else {
                        // Create new contact
                        await Contact.create({
                            ...contactData,
                            workspaceId: integration.workspaceId,
                            userId: integration.userId,
                        });
                        createdCount++;
                        console.log(`   ✅ Created ${primaryEmail}`);
                        emailToContactMap.set(primaryEmail.toLowerCase(), null as any); // Prevent duplicates in this sync
                    }
                } catch (contactError: any) {
                    console.error("Error processing contact:", contactError);
                    errors.push(contactError.message);
                }
            }

            // Log summary
            console.log(`\n📊 Contact Sync Summary:`);
            console.log(`   ✅ Created: ${createdCount}`);
            console.log(`   ✏️  Updated: ${updatedCount}`);
            console.log(`   ⏭️  Skipped: ${skippedCount} (${noEmailCount} had no email, ${skippedCount - noEmailCount} already complete)`);
            if (errors.length > 0) {
                console.log(`   ❌ Errors: ${errors.length}`);
            }
        } catch (apiError: any) {
            console.error("People API error:", apiError);

            // Check for insufficient scopes error (403)
            if (apiError.code === 403 || apiError.status === 403) {
                throw new Error("Insufficient permissions. Please disconnect and reconnect your Gmail account to grant contact access permissions.");
            }

            throw new Error(`Failed to fetch contacts from Gmail: ${apiError.message}`);
        }

        // Optional: Extract contacts from recent emails
        if (autoExtractFromEmails) {
            try {
                const gmail = google.gmail({ version: "v1", auth: oauth2Client });
                const messagesResponse = await gmail.users.messages.list({
                    userId: "me",
                    maxResults: 100, // Last 100 emails
                });

                const messages = messagesResponse.data.messages || [];
                const extractedEmails = new Set<string>();

                for (const msg of messages) {
                    try {
                        const fullMessage = await gmail.users.messages.get({
                            userId: "me",
                            id: msg.id!,
                            format: "metadata",
                            metadataHeaders: ["From", "To", "Cc"],
                        });

                        const headers = fullMessage.data.payload?.headers || [];
                        for (const header of headers) {
                            if (["from", "to", "cc"].includes(header.name?.toLowerCase() || "")) {
                                const emailMatch = header.value?.match(/<(.+?)>/) || header.value?.match(/([^\s]+@[^\s]+)/);
                                if (emailMatch) {
                                    const email = emailMatch[1] || emailMatch[0];
                                    extractedEmails.add(email.toLowerCase());
                                }
                            }
                        }
                    } catch (e) {
                        // Skip message on error
                    }
                }

                // Create contacts for new emails
                for (const email of extractedEmails) {
                    if (!emailToContactMap.has(email)) {
                        try {
                            const [localPart] = email.split("@");
                            const nameParts = localPart.split(/[._-]/);

                            await Contact.create({
                                firstName: nameParts[0] || "",
                                lastName: nameParts[1] || "",
                                email,
                                source: "email_extraction",
                                status: "lead",
                                workspaceId: integration.workspaceId,
                                userId: integration.userId,
                            });
                            createdCount++;
                            emailToContactMap.set(email, null as any);
                        } catch (e) {
                            // Skip on duplicate error
                        }
                    }
                }
            } catch (extractError) {
                console.error("Email extraction error:", extractError);
                // Don't fail the whole sync if extraction fails
            }
        }

        res.json({
            success: true,
            data: {
                created: createdCount,
                updated: updatedCount,
                skipped: skippedCount,
                errors: errors.slice(0, 10), // Limit error list
                syncedAt: new Date(),
            },
        });
    } catch (error: any) {
        console.error("Contact sync error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to sync contacts",
        });
    }
});

export default router;
