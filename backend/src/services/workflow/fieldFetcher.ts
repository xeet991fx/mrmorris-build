/**
 * Field Fetcher Service
 *
 * Centralized service to fetch live data from third-party APIs (Slack, Google Sheets, Notion, etc.)
 * for populating dropdown fields in workflow configurations.
 *
 * Features:
 * - Decrypts credentials from database
 * - Initializes API clients
 * - Fetches field options from APIs
 * - Caches results for 15 minutes
 * - Transforms API responses to standardized format
 */

import IntegrationCredential, { IntegrationType } from '../../models/IntegrationCredential';
import { WebClient } from '@slack/web-api';
import { google } from 'googleapis';
import { Client as NotionClient } from '@notionhq/client';

export type FieldType =
    | 'channel'
    | 'user'
    | 'spreadsheet'
    | 'worksheet'
    | 'database'
    | 'page';

export interface FieldFetchRequest {
    integrationType: IntegrationType;
    fieldType: FieldType;
    workspaceId: string;
    credentialId: string;
    parentData?: any; // For dependent fields (e.g., worksheets depend on selected spreadsheet)
}

export interface FieldOption {
    value: string;
    label: string;
    metadata?: any; // Additional data (e.g., channel type, user email, etc.)
}

// In-memory cache with 15 minute TTL
interface CacheEntry {
    data: FieldOption[];
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Main Field Fetcher Service
 */
export class FieldFetcherService {
    /**
     * Fetch field options from third-party API
     */
    async fetchFields(request: FieldFetchRequest): Promise<FieldOption[]> {
        const { integrationType, fieldType, workspaceId, credentialId, parentData } = request;

        // Check cache first
        const cacheKey = this.getCacheKey(request);
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            console.log(`[FieldFetcher] Cache hit: ${cacheKey}`);
            return cached.data;
        }

        try {
            // Fetch and decrypt credentials
            const credential = await IntegrationCredential.findById(credentialId)
                .select('+encryptedData')
                .exec();

            if (!credential) {
                throw new Error('Credential not found');
            }

            if (credential.workspaceId.toString() !== workspaceId) {
                throw new Error('Credential does not belong to this workspace');
            }

            if (!credential.isValid) {
                throw new Error('Credential is invalid or expired');
            }

            const credentialData = credential.getCredentialData();

            // Fetch based on integration type
            let result: FieldOption[];

            switch (integrationType) {
                case 'slack':
                    result = await this.fetchSlackFields(fieldType, credentialData);
                    break;

                case 'google_sheets':
                    result = await this.fetchGoogleSheetsFields(fieldType, credentialData, parentData);
                    break;

                case 'notion':
                    result = await this.fetchNotionFields(fieldType, credentialData, parentData);
                    break;

                default:
                    throw new Error(`Unsupported integration type: ${integrationType}`);
            }

            // Cache the result
            cache.set(cacheKey, {
                data: result,
                expiresAt: Date.now() + CACHE_TTL,
            });

            console.log(`[FieldFetcher] Fetched ${result.length} options for ${integrationType}:${fieldType}`);
            return result;
        } catch (error: any) {
            console.error(`[FieldFetcher] Error fetching fields:`, error.message);
            throw new Error(`Failed to fetch ${fieldType} options: ${error.message}`);
        }
    }

    /**
     * Fetch Slack fields (channels, users, etc.)
     */
    private async fetchSlackFields(
        fieldType: FieldType,
        credentialData: any
    ): Promise<FieldOption[]> {
        const client = new WebClient(credentialData.botToken);

        switch (fieldType) {
            case 'channel':
                return await this.fetchSlackChannels(client);

            case 'user':
                return await this.fetchSlackUsers(client);

            default:
                throw new Error(`Unsupported Slack field type: ${fieldType}`);
        }
    }

    /**
     * Fetch Slack channels
     */
    private async fetchSlackChannels(client: WebClient): Promise<FieldOption[]> {
        const response = await client.conversations.list({
            types: 'public_channel,private_channel',
            exclude_archived: true,
            limit: 1000,
        });

        if (!response.channels) {
            return [];
        }

        return response.channels.map((channel: any) => ({
            value: channel.id,
            label: `#${channel.name}`,
            metadata: {
                type: channel.is_private ? 'private' : 'public',
                memberCount: channel.num_members || 0,
            },
        }));
    }

    /**
     * Fetch Slack users
     */
    private async fetchSlackUsers(client: WebClient): Promise<FieldOption[]> {
        const response = await client.users.list({
            limit: 1000,
        });

        if (!response.members) {
            return [];
        }

        return response.members
            .filter((user: any) => !user.is_bot && !user.deleted)
            .map((user: any) => ({
                value: user.id,
                label: user.real_name || user.name,
                metadata: {
                    email: user.profile?.email,
                    displayName: user.profile?.display_name,
                },
            }));
    }

    /**
     * Fetch Google Sheets fields (spreadsheets, worksheets, etc.)
     */
    private async fetchGoogleSheetsFields(
        fieldType: FieldType,
        credentialData: any,
        parentData?: any
    ): Promise<FieldOption[]> {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({
            access_token: credentialData.access_token,
            refresh_token: credentialData.refresh_token,
            expiry_date: credentialData.expiry_date,
        });

        switch (fieldType) {
            case 'spreadsheet':
                return await this.fetchGoogleSheets(auth);

            case 'worksheet':
                if (!parentData?.parentValue) {
                    throw new Error('Spreadsheet ID required for fetching worksheets');
                }
                return await this.fetchGoogleWorksheets(auth, parentData.parentValue);

            default:
                throw new Error(`Unsupported Google Sheets field type: ${fieldType}`);
        }
    }

    /**
     * Fetch Google Sheets spreadsheets
     */
    private async fetchGoogleSheets(auth: any): Promise<FieldOption[]> {
        const drive = google.drive({ version: 'v3', auth });

        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            fields: 'files(id, name, modifiedTime)',
            pageSize: 100,
            orderBy: 'modifiedTime desc',
        });

        if (!response.data.files) {
            return [];
        }

        return response.data.files.map((file: any) => ({
            value: file.id,
            label: file.name,
            metadata: {
                modifiedTime: file.modifiedTime,
            },
        }));
    }

    /**
     * Fetch Google Sheets worksheets (tabs within a spreadsheet)
     */
    private async fetchGoogleWorksheets(auth: any, spreadsheetId: string): Promise<FieldOption[]> {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        if (!response.data.sheets) {
            return [];
        }

        return response.data.sheets.map((sheet: any) => ({
            value: sheet.properties.sheetId.toString(),
            label: sheet.properties.title,
            metadata: {
                index: sheet.properties.index,
                rowCount: sheet.properties.gridProperties?.rowCount,
                columnCount: sheet.properties.gridProperties?.columnCount,
            },
        }));
    }

    /**
     * Fetch Notion fields (databases, pages, etc.)
     */
    private async fetchNotionFields(
        fieldType: FieldType,
        credentialData: any,
        parentData?: any
    ): Promise<FieldOption[]> {
        const notion = new NotionClient({ auth: credentialData.access_token });

        switch (fieldType) {
            case 'database':
                return await this.fetchNotionDatabases(notion);

            case 'page':
                return await this.fetchNotionPages(notion, parentData?.parentValue);

            default:
                throw new Error(`Unsupported Notion field type: ${fieldType}`);
        }
    }

    /**
     * Fetch Notion databases
     */
    private async fetchNotionDatabases(notion: NotionClient): Promise<FieldOption[]> {
        const response = await notion.search({
            filter: {
                value: 'database' as any,
                property: 'object',
            },
            page_size: 100,
        });

        return response.results.map((database: any) => ({
            value: database.id,
            label: database.title?.[0]?.plain_text || 'Untitled Database',
            metadata: {
                url: database.url,
                createdTime: database.created_time,
            },
        }));
    }

    /**
     * Fetch Notion pages
     * @param databaseId Optional database ID to filter pages
     */
    private async fetchNotionPages(
        notion: NotionClient,
        databaseId?: string
    ): Promise<FieldOption[]> {
        let response;

        if (databaseId) {
            // Query pages in specific database
            response = await (notion.databases as any).query({
                database_id: databaseId,
                page_size: 100,
            });
        } else {
            // Search all pages
            response = await notion.search({
                filter: {
                    value: 'page',
                    property: 'object',
                },
                page_size: 100,
            });
        }

        return response.results.map((page: any) => ({
            value: page.id,
            label: this.getNotionPageTitle(page),
            metadata: {
                url: page.url,
                createdTime: page.created_time,
            },
        }));
    }

    /**
     * Extract title from Notion page properties
     */
    private getNotionPageTitle(page: any): string {
        // Try to get title from properties
        if (page.properties) {
            const titleProp = Object.values(page.properties).find(
                (prop: any) => prop.type === 'title'
            ) as any;

            if (titleProp?.title?.[0]?.plain_text) {
                return titleProp.title[0].plain_text;
            }
        }

        return 'Untitled Page';
    }

    /**
     * Generate cache key for request
     */
    private getCacheKey(request: FieldFetchRequest): string {
        const { workspaceId, integrationType, fieldType, credentialId, parentData } = request;
        const parentStr = parentData ? JSON.stringify(parentData) : '';
        return `field-fetch:${workspaceId}:${integrationType}:${fieldType}:${credentialId}:${parentStr}`;
    }

    /**
     * Clear cache for specific workspace or all cache
     */
    static clearCache(workspaceId?: string): void {
        if (workspaceId) {
            // Clear cache entries for specific workspace
            const keysToDelete: string[] = [];
            cache.forEach((_, key) => {
                if (key.includes(`:${workspaceId}:`)) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach(key => cache.delete(key));
            console.log(`[FieldFetcher] Cleared ${keysToDelete.length} cache entries for workspace ${workspaceId}`);
        } else {
            // Clear entire cache
            cache.clear();
            console.log('[FieldFetcher] Cleared entire cache');
        }
    }
}

// Periodically clean expired cache entries
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    cache.forEach((entry, key) => {
        if (entry.expiresAt < now) {
            cache.delete(key);
            cleanedCount++;
        }
    });

    if (cleanedCount > 0) {
        console.log(`[FieldFetcher] Cleaned ${cleanedCount} expired cache entries`);
    }
}, 5 * 60 * 1000); // Run every 5 minutes
