/**
 * Salesforce Service
 *
 * Handles OAuth authentication and bidirectional sync with Salesforce
 */

import jsforce, { Connection } from 'jsforce';
import SalesforceIntegration, { ISalesforceIntegration } from '../models/SalesforceIntegration';
import FieldMapping from '../models/FieldMapping';
import SyncLog from '../models/SyncLog';
import Contact from '../models/Contact';
import Company from '../models/Company';
import Opportunity from '../models/Opportunity';
import { encryptCredentials, decryptCredentials } from '../utils/encryption';
import { Types } from 'mongoose';

export class SalesforceService {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;

    constructor() {
        this.clientId = process.env.SALESFORCE_CLIENT_ID || '';
        this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET || '';
        this.redirectUri = process.env.SALESFORCE_REDIRECT_URI || '';
    }

    /**
     * Get OAuth authorization URL
     */
    getAuthUrl(state: string): string {
        const oauth2 = new jsforce.OAuth2({
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            redirectUri: this.redirectUri,
        });

        return oauth2.getAuthorizationUrl({ state });
    }

    /**
     * Handle OAuth callback and create integration
     */
    async handleOAuthCallback(
        code: string,
        workspaceId: string,
        userId: string
    ): Promise<ISalesforceIntegration> {
        const oauth2 = new jsforce.OAuth2({
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            redirectUri: this.redirectUri,
        });

        const conn = new jsforce.Connection({ oauth2 });
        await conn.authorize(code);

        // Get org info
        const identity = await conn.identity();
        const orgInfo = await conn.query('SELECT Id, Name FROM Organization LIMIT 1');

        // Create integration
        const integration = await SalesforceIntegration.create({
            workspaceId: new Types.ObjectId(workspaceId),
            userId: new Types.ObjectId(userId),
            accessToken: encryptCredentials(conn.accessToken!, workspaceId),
            refreshToken: encryptCredentials(conn.refreshToken!, workspaceId),
            instanceUrl: conn.instanceUrl!,
            organizationId: identity.organization_id,
            organizationName: orgInfo.records[0]?.Name,
            userEmail: identity.email,
            userId_sf: identity.user_id,
            syncStatus: 'active',
            nextSyncAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        });

        // Create default field mappings
        await this.createDefaultFieldMappings(integration._id.toString(), workspaceId);

        return integration;
    }

    /**
     * Get authenticated Salesforce connection
     */
    async getConnection(integrationId: string): Promise<Connection> {
        const integration = await SalesforceIntegration.findById(integrationId);
        if (!integration) {
            throw new Error('Salesforce integration not found');
        }

        const workspaceId = integration.workspaceId.toString();
        const accessToken = decryptCredentials(integration.accessToken, workspaceId);
        const refreshToken = decryptCredentials(integration.refreshToken, workspaceId);

        const oauth2 = new jsforce.OAuth2({
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            redirectUri: this.redirectUri,
        });

        const conn = new jsforce.Connection({
            oauth2,
            instanceUrl: integration.instanceUrl,
            accessToken,
            refreshToken,
        });

        // Handle token refresh
        conn.on('refresh', async (newAccessToken) => {
            integration.accessToken = encryptCredentials(newAccessToken, workspaceId);
            await integration.save();
        });

        return conn;
    }

    /**
     * Create default field mappings
     */
    private async createDefaultFieldMappings(integrationId: string, workspaceId: string) {
        const objectTypes = ['contact', 'account', 'opportunity'];

        for (const objectType of objectTypes) {
            await FieldMapping.create({
                workspaceId: new Types.ObjectId(workspaceId),
                integrationId: new Types.ObjectId(integrationId),
                objectType,
                mappings: (FieldMapping as any).getDefaultMappings(objectType),
                useDefaultMappings: true,
            });
        }
    }

    /**
     * Perform bidirectional sync
     */
    async performSync(integrationId: string): Promise<any> {
        const integration = await SalesforceIntegration.findById(integrationId);
        if (!integration || integration.syncStatus !== 'active') {
            throw new Error('Integration not active');
        }

        // Create sync log
        const syncLog = await SyncLog.create({
            workspaceId: integration.workspaceId,
            integrationId: integration._id,
            operation: 'incremental_sync',
            status: 'running',
            triggeredBy: 'automatic',
            startedAt: new Date(),
        });

        try {
            const results = {
                contacts: { synced: 0, errors: 0 },
                accounts: { synced: 0, errors: 0 },
                opportunities: { synced: 0, errors: 0 },
            };

            // Sync contacts
            if (integration.syncContacts) {
                const contactResults = await this.syncContacts(integration, syncLog);
                results.contacts = contactResults;
            }

            // Sync accounts (companies)
            if (integration.syncAccounts) {
                const accountResults = await this.syncAccounts(integration, syncLog);
                results.accounts = accountResults;
            }

            // Sync opportunities
            if (integration.syncOpportunities) {
                const oppResults = await this.syncOpportunities(integration, syncLog);
                results.opportunities = oppResults;
            }

            // Update sync log
            syncLog.status = 'completed';
            syncLog.completedAt = new Date();
            syncLog.duration = Date.now() - syncLog.startedAt.getTime();
            syncLog.summary.successful = results.contacts.synced + results.accounts.synced + results.opportunities.synced;
            syncLog.summary.errors = results.contacts.errors + results.accounts.errors + results.opportunities.errors;
            await syncLog.save();

            // Update integration stats
            integration.lastSyncAt = new Date();
            integration.nextSyncAt = new Date(Date.now() + integration.syncFrequency * 60 * 1000);
            integration.stats.totalSynced += syncLog.summary.successful;
            integration.stats.lastSyncDuration = syncLog.duration;
            await integration.save();

            return results;
        } catch (error: any) {
            syncLog.status = 'failed';
            syncLog.completedAt = new Date();
            syncLog.syncErrors.push({
                message: error.message,
                timestamp: new Date(),
                stack: error.stack,
            });
            await syncLog.save();

            integration.syncStatus = 'error';
            integration.lastError = {
                message: error.message,
                timestamp: new Date(),
                details: error,
            };
            await integration.save();

            throw error;
        }
    }

    /**
     * Sync contacts bidirectionally
     */
    private async syncContacts(integration: any, syncLog: any): Promise<{ synced: number; errors: number }> {
        const conn = await this.getConnection(integration._id.toString());
        const fieldMapping = await FieldMapping.findOne({
            workspaceId: integration.workspaceId,
            objectType: 'contact',
        });

        let synced = 0;
        let errors = 0;

        // Sync CRM -> Salesforce (pending contacts)
        const pendingContacts = await Contact.find({
            workspaceId: integration.workspaceId,
            salesforceSyncStatus: { $in: ['pending', null] },
        }).limit(100);

        for (const contact of pendingContacts) {
            try {
                const sfData = this.mapToSalesforce(contact.toObject(), fieldMapping?.mappings || []);

                if (contact.salesforceId) {
                    // Update existing
                    await conn.sobject('Contact').update({
                        Id: contact.salesforceId,
                        ...sfData,
                    });
                } else {
                    // Create new
                    const result = await conn.sobject('Contact').create(sfData) as unknown as { id: string; success: boolean };
                    contact.salesforceId = result.id;
                }

                contact.salesforceSyncStatus = 'synced';
                contact.salesforceSyncedAt = new Date();
                await contact.save();

                synced++;
            } catch (error: any) {
                contact.salesforceSyncStatus = 'error';
                contact.salesforceSyncError = error.message;
                await contact.save();
                errors++;
            }
        }

        // Sync Salesforce -> CRM (modified contacts)
        if (integration.syncDirection === 'bidirectional' || integration.syncDirection === 'salesforce_to_crm') {
            const since = integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
            const sfContacts = await conn.query(
                `SELECT Id, FirstName, LastName, Email, Phone, Company, Title, LastModifiedDate
                 FROM Contact
                 WHERE LastModifiedDate > ${since.toISOString()}
                 LIMIT 100`
            );

            for (const sfContact of sfContacts.records as any[]) {
                try {
                    let contact = await Contact.findOne({
                        workspaceId: integration.workspaceId,
                        salesforceId: sfContact.Id,
                    });

                    const crmData = this.mapFromSalesforce(sfContact, fieldMapping?.mappings || []);

                    if (contact) {
                        // Update existing
                        Object.assign(contact, crmData);
                        contact.salesforceSyncedAt = new Date();
                        contact.salesforceSyncStatus = 'synced';
                        await contact.save();
                    } else {
                        // Create new
                        contact = await Contact.create({
                            workspaceId: integration.workspaceId,
                            userId: integration.userId,
                            ...crmData,
                            salesforceId: sfContact.Id,
                            salesforceSyncedAt: new Date(),
                            salesforceSyncStatus: 'synced',
                        });
                    }

                    synced++;
                } catch (error: any) {
                    errors++;
                }
            }
        }

        return { synced, errors };
    }

    /**
     * Sync accounts (companies)
     */
    private async syncAccounts(integration: any, syncLog: any): Promise<{ synced: number; errors: number }> {
        const conn = await this.getConnection(integration._id.toString());
        const fieldMapping = await FieldMapping.findOne({
            workspaceId: integration.workspaceId,
            objectType: 'account',
        });

        let synced = 0;
        let errors = 0;

        // Similar logic to syncContacts but for Company <-> Account
        const pendingCompanies = await Company.find({
            workspaceId: integration.workspaceId,
            salesforceSyncStatus: { $in: ['pending', null] },
        }).limit(100);

        for (const company of pendingCompanies) {
            try {
                const sfData = this.mapToSalesforce(company.toObject(), fieldMapping?.mappings || []);

                if (company.salesforceId) {
                    await conn.sobject('Account').update({
                        Id: company.salesforceId,
                        ...sfData,
                    });
                } else {
                    const result = await conn.sobject('Account').create(sfData) as unknown as { id: string; success: boolean };
                    company.salesforceId = result.id;
                }

                company.salesforceSyncStatus = 'synced';
                company.salesforceSyncedAt = new Date();
                await company.save();

                synced++;
            } catch (error: any) {
                company.salesforceSyncStatus = 'error';
                company.salesforceSyncError = error.message;
                await company.save();
                errors++;
            }
        }

        return { synced, errors };
    }

    /**
     * Sync opportunities
     */
    private async syncOpportunities(integration: any, syncLog: any): Promise<{ synced: number; errors: number }> {
        const conn = await this.getConnection(integration._id.toString());
        const fieldMapping = await FieldMapping.findOne({
            workspaceId: integration.workspaceId,
            objectType: 'opportunity',
        });

        let synced = 0;
        let errors = 0;

        const pendingOpps = await Opportunity.find({
            workspaceId: integration.workspaceId,
            salesforceSyncStatus: { $in: ['pending', null] },
        }).limit(100);

        for (const opp of pendingOpps) {
            try {
                const sfData = this.mapToSalesforce(opp.toObject(), fieldMapping?.mappings || []);

                if (opp.salesforceId) {
                    await conn.sobject('Opportunity').update({
                        Id: opp.salesforceId,
                        ...sfData,
                    });
                } else {
                    const result = await conn.sobject('Opportunity').create(sfData) as unknown as { id: string; success: boolean };
                    opp.salesforceId = result.id;
                }

                opp.salesforceSyncStatus = 'synced';
                opp.salesforceSyncedAt = new Date();
                await opp.save();

                synced++;
            } catch (error: any) {
                opp.salesforceSyncStatus = 'error';
                opp.salesforceSyncError = error.message;
                await opp.save();
                errors++;
            }
        }

        return { synced, errors };
    }

    /**
     * Map CRM object to Salesforce format
     */
    private mapToSalesforce(crmObject: any, mappings: any[]): any {
        const sfObject: any = {};

        for (const mapping of mappings) {
            const value = crmObject[mapping.crmField];
            if (value !== undefined && value !== null) {
                sfObject[mapping.salesforceField] = value;
            }
        }

        return sfObject;
    }

    /**
     * Map Salesforce object to CRM format
     */
    private mapFromSalesforce(sfObject: any, mappings: any[]): any {
        const crmObject: any = {};

        for (const mapping of mappings) {
            const value = sfObject[mapping.salesforceField];
            if (value !== undefined && value !== null) {
                crmObject[mapping.crmField] = value;
            }
        }

        return crmObject;
    }

    /**
     * Disconnect integration
     */
    async disconnect(integrationId: string): Promise<void> {
        const integration = await SalesforceIntegration.findById(integrationId);
        if (!integration) return;

        integration.syncStatus = 'disconnected';
        await integration.save();
    }
}

export const salesforceService = new SalesforceService();
