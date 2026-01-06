/**
 * Notion Integration Action
 *
 * Executes Notion operations within workflow steps.
 *
 * Supported operations:
 * - Create a page in a database
 * - Update a page
 * - Query a database
 * - Retrieve a page
 * - Archive a page
 */

import { Client } from '@notionhq/client';
import IntegrationCredential from '../../../models/IntegrationCredential';
import { logger } from '../../../utils/logger';
import { BaseActionExecutor, ActionContext, ActionResult } from './types';

export interface NotionActionConfig {
    credentialId: string;
    action: 'create_page' | 'update_page' | 'query_database' | 'retrieve_page' | 'archive_page';
    databaseId?: string;
    pageId?: string;
    properties?: any;
    filter?: any;
    sorts?: any;
}

/**
 * Notion Action Executor
 */
export class NotionActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as any as NotionActionConfig;

        if (!config.credentialId) {
            return this.error('Notion credential not configured');
        }

        if (!config.action) {
            return this.error('Notion action not specified');
        }

        try {
            // Fetch and decrypt credentials
            const credential = await IntegrationCredential.findById(config.credentialId).select('+encryptedData');

            if (!credential) {
                return this.error('Notion credential not found');
            }

            if (!credential.isValid) {
                return this.error('Notion credential is invalid. Please re-authenticate.');
            }

            const credentialData = credential.getCredentialData();

            // Initialize Notion client
            const notion = new Client({
                auth: credentialData.accessToken,
            });

            // Build data context for placeholder resolution
            const dataContext = { entity, enrollment, ...enrollment.dataContext };

            // Execute the appropriate action
            let result: any;
            switch (config.action) {
                case 'create_page':
                    result = await createPage(notion, config, dataContext);
                    break;
                case 'update_page':
                    result = await updatePage(notion, config, dataContext);
                    break;
                case 'query_database':
                    result = await queryDatabase(notion, config);
                    break;
                case 'retrieve_page':
                    result = await retrievePage(notion, config);
                    break;
                case 'archive_page':
                    result = await archivePage(notion, config);
                    break;
                default:
                    return this.error(`Unknown Notion action: ${config.action}`);
            }

            logger.info(`[NotionAction] ${config.action} successful`);
            return this.success(result);
        } catch (error: any) {
            logger.error('[NotionAction] Execution error:', error.message);
            return this.error(`Notion action failed: ${error.message}`);
        }
    }
}

/**
 * Create a page in a database
 */
async function createPage(
    notion: Client,
    config: NotionActionConfig,
    dataContext: any
): Promise<any> {
    if (!config.databaseId) {
        throw new Error('Database ID is required for create_page action');
    }

    // Parse properties (replace {{placeholders}} with actual values)
    const properties = parseProperties(config.properties || {}, dataContext);

    const response = await notion.pages.create({
        parent: {
            database_id: config.databaseId,
        },
        properties,
    });

    return {
        success: true,
        pageId: response.id,
        url: (response as any).url,
    };
}

/**
 * Update a page
 */
async function updatePage(
    notion: Client,
    config: NotionActionConfig,
    dataContext: any
): Promise<any> {
    if (!config.pageId) {
        throw new Error('Page ID is required for update_page action');
    }

    // Parse properties
    const properties = parseProperties(config.properties || {}, dataContext);

    const response = await notion.pages.update({
        page_id: config.pageId,
        properties,
    });

    return {
        success: true,
        pageId: response.id,
        url: (response as any).url,
    };
}

/**
 * Query a database
 */
async function queryDatabase(
    notion: Client,
    config: NotionActionConfig
): Promise<any> {
    if (!config.databaseId) {
        throw new Error('Database ID is required for query_database action');
    }

    const response = await (notion.databases as any).query({
        database_id: config.databaseId,
        filter: config.filter,
        sorts: config.sorts,
    });

    return {
        success: true,
        results: response.results,
        resultCount: response.results.length,
        hasMore: response.has_more,
    };
}

/**
 * Retrieve a page
 */
async function retrievePage(
    notion: Client,
    config: NotionActionConfig
): Promise<any> {
    if (!config.pageId) {
        throw new Error('Page ID is required for retrieve_page action');
    }

    const response = await notion.pages.retrieve({
        page_id: config.pageId,
    });

    return {
        success: true,
        page: response,
        pageId: response.id,
    };
}

/**
 * Archive a page
 */
async function archivePage(
    notion: Client,
    config: NotionActionConfig
): Promise<any> {
    if (!config.pageId) {
        throw new Error('Page ID is required for archive_page action');
    }

    const response = await notion.pages.update({
        page_id: config.pageId,
        archived: true,
    });

    return {
        success: true,
        pageId: response.id,
        archived: true,
    };
}

/**
 * Parse Notion properties, replacing {{placeholders}} with actual values
 */
function parseProperties(properties: any, dataContext: any): any {
    const parsed: any = {};

    for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
            // Replace {{placeholder}} syntax
            const resolvedValue = resolvePlaceholder(value, dataContext);

            // Notion properties need specific format
            // For simplicity, assume title and rich_text types
            if (key === 'Name' || key === 'Title') {
                parsed[key] = {
                    title: [
                        {
                            text: {
                                content: resolvedValue,
                            },
                        },
                    ],
                };
            } else {
                parsed[key] = {
                    rich_text: [
                        {
                            text: {
                                content: resolvedValue,
                            },
                        },
                    ],
                };
            }
        } else if (typeof value === 'object' && value !== null) {
            // Already in Notion property format
            parsed[key] = value;
        }
    }

    return parsed;
}

/**
 * Resolve {{placeholder}} syntax
 */
function resolvePlaceholder(value: string, dataContext: any): string {
    if (!value.includes('{{')) {
        return value;
    }

    return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const trimmedPath = path.trim();
        const resolvedValue = getValueByPath(dataContext, trimmedPath);
        return resolvedValue !== undefined ? String(resolvedValue) : match;
    });
}

/**
 * Get value from data context by path (e.g., "contact.email")
 */
function getValueByPath(dataContext: any, path: string): any {
    const parts = path.split('.');
    let value: any = dataContext;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return undefined;
        }
    }

    return value;
}
