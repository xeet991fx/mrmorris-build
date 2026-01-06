/**
 * Google Sheets Integration Action
 *
 * Executes Google Sheets operations within workflow steps.
 *
 * Supported operations:
 * - Read rows from a sheet
 * - Append rows to a sheet
 * - Update rows in a sheet
 * - Clear rows from a sheet
 * - Create a new sheet
 */

import { google, sheets_v4 } from 'googleapis';
import { IWorkflowStep } from '../../../models/Workflow';
import IntegrationCredential from '../../../models/IntegrationCredential';
import { logger } from '../../../utils/logger';
import { BaseActionExecutor, ActionContext, ActionResult } from './types';

export interface GoogleSheetsActionConfig {
    credentialId: string;
    action: 'read' | 'append' | 'update' | 'clear' | 'create_sheet';
    spreadsheetId: string;
    worksheetId?: string;
    range?: string;
    rowData?: any;
    values?: any[][];
    startRow?: number;
    endRow?: number;
    sheetName?: string;
}

/**
 * Google Sheets Action Executor
 */
export class GoogleSheetsActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as any as GoogleSheetsActionConfig;

        if (!config.credentialId) {
            return this.error('Google Sheets credential not configured');
        }

        if (!config.action) {
            return this.error('Google Sheets action not specified');
        }

        if (!config.spreadsheetId) {
            return this.error('Spreadsheet ID not specified');
        }

        try {
            // Fetch and decrypt credentials
            const credential = await IntegrationCredential.findById(config.credentialId).select('+encryptedData');

            if (!credential) {
                return this.error('Google Sheets credential not found');
            }

            if (!credential.isValid) {
                return this.error('Google Sheets credential is invalid. Please re-authenticate.');
            }

            const credentialData = credential.getCredentialData();

            // Initialize Google Sheets API
            const auth = new google.auth.OAuth2();
            auth.setCredentials({
                access_token: credentialData.accessToken,
                refresh_token: credentialData.refreshToken,
                expiry_date: credentialData.expiryDate,
            });

            const sheets = google.sheets({ version: 'v4', auth });

            // Build data context for placeholder resolution
            const dataContext = { entity, enrollment, ...enrollment.dataContext };

            // Execute the appropriate action
            let result: any;
            switch (config.action) {
                case 'read':
                    result = await readRows(sheets, config, dataContext);
                    break;
                case 'append':
                    result = await appendRow(sheets, config, dataContext);
                    break;
                case 'update':
                    result = await updateRows(sheets, config, dataContext);
                    break;
                case 'clear':
                    result = await clearRows(sheets, config);
                    break;
                case 'create_sheet':
                    result = await createSheet(sheets, config);
                    break;
                default:
                    return this.error(`Unknown Google Sheets action: ${config.action}`);
            }

            logger.info(`[GoogleSheetsAction] ${config.action} successful for spreadsheet ${config.spreadsheetId}`);
            return this.success(result);
        } catch (error: any) {
            logger.error('[GoogleSheetsAction] Execution error:', error.message);
            return this.error(`Google Sheets action failed: ${error.message}`);
        }
    }
}

/**
 * Read rows from a sheet
 */
async function readRows(
    sheets: sheets_v4.Sheets,
    config: GoogleSheetsActionConfig,
    dataContext: any
): Promise<any> {
    const range = config.range || 'A1:Z1000';

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range,
    });

    const rows = response.data.values || [];

    return {
        success: true,
        rows,
        rowCount: rows.length,
        range,
    };
}

/**
 * Append a row to a sheet
 */
async function appendRow(
    sheets: sheets_v4.Sheets,
    config: GoogleSheetsActionConfig,
    dataContext: any
): Promise<any> {
    const range = config.range || 'Sheet1!A:Z';

    // Parse row data (supports {{placeholder}} syntax)
    let values: any[][] = [];

    if (config.values) {
        values = config.values;
    } else if (config.rowData) {
        // Convert rowData object to array
        if (typeof config.rowData === 'string') {
            // Parse placeholder syntax
            const parsed = parseRowData(config.rowData, dataContext);
            values = [parsed];
        } else if (Array.isArray(config.rowData)) {
            values = [config.rowData];
        } else {
            // Object with key-value pairs
            values = [Object.values(config.rowData)];
        }
    }

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values,
        },
    });

    return {
        success: true,
        updatedRange: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows,
        updatedCells: response.data.updates?.updatedCells,
    };
}

/**
 * Update rows in a sheet
 */
async function updateRows(
    sheets: sheets_v4.Sheets,
    config: GoogleSheetsActionConfig,
    dataContext: any
): Promise<any> {
    if (!config.range) {
        throw new Error('Range is required for update operation');
    }

    // Parse row data
    let values: any[][] = [];

    if (config.values) {
        values = config.values;
    } else if (config.rowData) {
        if (typeof config.rowData === 'string') {
            const parsed = parseRowData(config.rowData, dataContext);
            values = [parsed];
        } else if (Array.isArray(config.rowData)) {
            values = [config.rowData];
        } else {
            values = [Object.values(config.rowData)];
        }
    }

    const response = await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values,
        },
    });

    return {
        success: true,
        updatedRange: response.data.updatedRange,
        updatedRows: response.data.updatedRows,
        updatedCells: response.data.updatedCells,
    };
}

/**
 * Clear rows from a sheet
 */
async function clearRows(
    sheets: sheets_v4.Sheets,
    config: GoogleSheetsActionConfig
): Promise<any> {
    if (!config.range) {
        throw new Error('Range is required for clear operation');
    }

    const response = await sheets.spreadsheets.values.clear({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
    });

    return {
        success: true,
        clearedRange: response.data.clearedRange,
    };
}

/**
 * Create a new sheet in the spreadsheet
 */
async function createSheet(
    sheets: sheets_v4.Sheets,
    config: GoogleSheetsActionConfig
): Promise<any> {
    if (!config.sheetName) {
        throw new Error('Sheet name is required for create_sheet operation');
    }

    const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.spreadsheetId,
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: config.sheetName,
                        },
                    },
                },
            ],
        },
    });

    const addedSheet = response.data.replies?.[0]?.addSheet;

    return {
        success: true,
        sheetId: addedSheet?.properties?.sheetId,
        sheetName: addedSheet?.properties?.title,
    };
}

/**
 * Parse row data with {{placeholder}} syntax
 */
function parseRowData(rowData: string, dataContext: any): any[] {
    // For simplicity, assume comma-separated values
    // In production, you'd want more sophisticated parsing
    const values = rowData.split(',').map(val => val.trim());

    // Replace {{placeholders}} with actual values
    return values.map(val => {
        if (val.startsWith('{{') && val.endsWith('}}')) {
            const path = val.slice(2, -2).trim();
            return getValueByPath(dataContext, path) || val;
        }
        return val;
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
