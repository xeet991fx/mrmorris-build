/**
 * Form Google Sheet Sync Service
 *
 * Handles syncing form submissions to Google Sheets.
 * Supports both real-time and batch sync modes.
 */

import { google, sheets_v4 } from 'googleapis';
import Form from '../models/Form';
import Contact from '../models/Contact';
import FormSubmission from '../models/FormSubmission';
import IntegrationCredential from '../models/IntegrationCredential';
import { logger } from '../utils/logger';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/integrations/google_sheets/oauth/callback';

interface GoogleSheetsConfig {
    enabled: boolean;
    spreadsheetId: string;
    sheetName: string;
    syncMode: 'realtime' | 'batch';
    credentialId: string;
}

interface SyncResult {
    success: boolean;
    rowsAdded?: number;
    error?: string;
}

/**
 * Get authenticated Google Sheets client
 */
async function getGoogleSheetsClient(credentialId: string): Promise<sheets_v4.Sheets | null> {
    try {
        const credential = await IntegrationCredential.findById(credentialId).select('+encryptedData');

        if (!credential || !credential.isValid) {
            logger.error('[FormGoogleSheetSync] Invalid or missing credential');
            return null;
        }

        const credentialData = credential.getCredentialData();

        const auth = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        auth.setCredentials({
            access_token: credentialData.accessToken,
            refresh_token: credentialData.refreshToken,
            expiry_date: credentialData.expiryDate,
        });

        // Handle token refresh
        auth.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                credential.setCredentialData({
                    ...credentialData,
                    accessToken: tokens.access_token,
                    expiryDate: tokens.expiry_date,
                });
                await credential.save();
                logger.info('[FormGoogleSheetSync] Token refreshed and saved');
            }
        });

        return google.sheets({ version: 'v4', auth });
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Error getting Google Sheets client:', error.message);
        return null;
    }
}

/**
 * Ensure sheet exists and has headers
 */
async function ensureSheetHeaders(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    sheetName: string,
    formFields: Array<{ id: string; label: string }>
): Promise<boolean> {
    try {
        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        // Check if sheet exists
        const existingSheet = spreadsheet.data.sheets?.find(
            (s) => s.properties?.title === sheetName
        );

        if (!existingSheet) {
            // Create new sheet
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: sheetName,
                                },
                            },
                        },
                    ],
                },
            });
            logger.info(`[FormGoogleSheetSync] Created new sheet: ${sheetName}`);
        }

        // Check if headers exist
        const range = `${sheetName}!A1:Z1`;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const existingHeaders = response.data.values?.[0] || [];

        if (existingHeaders.length === 0) {
            // Add headers
            const headers = [
                'Submission Date',
                'Contact ID',
                ...formFields.map((f) => f.label),
            ];

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headers],
                },
            });

            // Format header row (bold, background color)
            const sheetId = existingSheet?.properties?.sheetId ||
                (await sheets.spreadsheets.get({ spreadsheetId })).data.sheets?.find(
                    (s) => s.properties?.title === sheetName
                )?.properties?.sheetId;

            if (sheetId !== undefined) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                repeatCell: {
                                    range: {
                                        sheetId,
                                        startRowIndex: 0,
                                        endRowIndex: 1,
                                    },
                                    cell: {
                                        userEnteredFormat: {
                                            backgroundColor: {
                                                red: 0.2,
                                                green: 0.5,
                                                blue: 0.8,
                                            },
                                            textFormat: {
                                                bold: true,
                                                foregroundColor: {
                                                    red: 1,
                                                    green: 1,
                                                    blue: 1,
                                                },
                                            },
                                        },
                                    },
                                    fields: 'userEnteredFormat(backgroundColor,textFormat)',
                                },
                            },
                            {
                                updateSheetProperties: {
                                    properties: {
                                        sheetId,
                                        gridProperties: {
                                            frozenRowCount: 1,
                                        },
                                    },
                                    fields: 'gridProperties.frozenRowCount',
                                },
                            },
                        ],
                    },
                });
            }

            logger.info(`[FormGoogleSheetSync] Added headers to sheet: ${sheetName}`);
        }

        return true;
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Error ensuring sheet headers:', error.message);
        return false;
    }
}

/**
 * Format submission data as a row for Google Sheets
 */
function formatSubmissionAsRow(
    submissionData: Record<string, any>,
    formFields: Array<{ id: string; label: string }>,
    contactId?: string,
    submittedAt?: Date
): any[] {
    const row = [
        submittedAt ? new Date(submittedAt).toISOString() : new Date().toISOString(),
        contactId || '',
    ];

    for (const field of formFields) {
        const value = submissionData[field.id];
        if (value === undefined || value === null) {
            row.push('');
        } else if (typeof value === 'object') {
            row.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
            row.push(value ? 'Yes' : 'No');
        } else {
            row.push(String(value));
        }
    }

    return row;
}

/**
 * Sync a single form submission to Google Sheet
 */
export async function syncFormSubmission(
    formId: string,
    submissionData: Record<string, any>,
    contactId: string | null,
    googleSheetsConfig: GoogleSheetsConfig
): Promise<SyncResult> {
    try {
        if (!googleSheetsConfig.enabled || !googleSheetsConfig.spreadsheetId || !googleSheetsConfig.credentialId) {
            return { success: false, error: 'Google Sheets integration not properly configured' };
        }

        const sheets = await getGoogleSheetsClient(googleSheetsConfig.credentialId);
        if (!sheets) {
            return { success: false, error: 'Failed to authenticate with Google Sheets' };
        }

        // Get form to get field labels
        const form = await Form.findById(formId).lean();
        if (!form) {
            return { success: false, error: 'Form not found' };
        }

        const formFields = form.fields.map((f: any) => ({ id: f.id, label: f.label }));

        // Ensure sheet and headers exist
        const headersOk = await ensureSheetHeaders(
            sheets,
            googleSheetsConfig.spreadsheetId,
            googleSheetsConfig.sheetName,
            formFields
        );

        if (!headersOk) {
            return { success: false, error: 'Failed to setup sheet headers' };
        }

        // Format and append row
        const row = formatSubmissionAsRow(
            submissionData,
            formFields,
            contactId || undefined,
            new Date()
        );

        await sheets.spreadsheets.values.append({
            spreadsheetId: googleSheetsConfig.spreadsheetId,
            range: `${googleSheetsConfig.sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row],
            },
        });

        logger.info(`[FormGoogleSheetSync] Successfully synced submission to Google Sheets`);
        return { success: true, rowsAdded: 1 };
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Error syncing submission:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Batch sync multiple submissions for a form
 */
export async function batchSyncSubmissions(formId: string): Promise<SyncResult> {
    try {
        const form = await Form.findById(formId);
        if (!form || !form.googleSheetsIntegration?.enabled) {
            return { success: false, error: 'Form not found or Google Sheets not enabled' };
        }

        const config = form.googleSheetsIntegration;
        if (!config.spreadsheetId || !config.credentialId) {
            return { success: false, error: 'Google Sheets integration not properly configured' };
        }

        const sheets = await getGoogleSheetsClient(config.credentialId);
        if (!sheets) {
            return { success: false, error: 'Failed to authenticate with Google Sheets' };
        }

        // Get unsynced submissions
        const unsyncedSubmissions = await FormSubmission.find({
            formId,
            $or: [
                { 'googleSheetSync.synced': { $ne: true } },
                { 'googleSheetSync': { $exists: false } },
            ],
        }).limit(100); // Process max 100 at a time

        if (unsyncedSubmissions.length === 0) {
            logger.info(`[FormGoogleSheetSync] No unsynced submissions for form ${formId}`);
            return { success: true, rowsAdded: 0 };
        }

        const formFields = form.fields.map((f: any) => ({ id: f.id, label: f.label }));

        // Ensure sheet and headers exist
        const headersOk = await ensureSheetHeaders(
            sheets,
            config.spreadsheetId,
            config.sheetName || 'Form Submissions',
            formFields
        );

        if (!headersOk) {
            return { success: false, error: 'Failed to setup sheet headers' };
        }

        // Format all rows
        const rows = unsyncedSubmissions.map((sub: any) =>
            formatSubmissionAsRow(
                sub.data,
                formFields,
                sub.contactId?.toString(),
                sub.createdAt
            )
        );

        // Batch append
        await sheets.spreadsheets.values.append({
            spreadsheetId: config.spreadsheetId,
            range: `${config.sheetName || 'Form Submissions'}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rows,
            },
        });

        // Mark submissions as synced
        const submissionIds = unsyncedSubmissions.map((s: any) => s._id);
        await FormSubmission.updateMany(
            { _id: { $in: submissionIds } },
            {
                $set: {
                    'googleSheetSync.synced': true,
                    'googleSheetSync.syncedAt': new Date(),
                    'googleSheetSync.spreadsheetId': config.spreadsheetId,
                    'googleSheetSync.sheetName': config.sheetName,
                },
            }
        );

        // Update form sync stats
        await Form.findByIdAndUpdate(formId, {
            $set: {
                'googleSheetsIntegration.lastSyncAt': new Date(),
            },
            $inc: {
                'googleSheetsIntegration.syncStats.totalSynced': rows.length,
            },
        });

        logger.info(`[FormGoogleSheetSync] Batch synced ${rows.length} submissions for form ${formId}`);
        return { success: true, rowsAdded: rows.length };
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Batch sync error:', error.message);

        // Update failed sync count
        await Form.findByIdAndUpdate(formId, {
            $inc: {
                'googleSheetsIntegration.syncStats.failedSyncs': 1,
            },
        });

        return { success: false, error: error.message };
    }
}

/**
 * Get user's Google spreadsheets list
 */
export async function getUserSpreadsheets(credentialId: string): Promise<Array<{ id: string; name: string }>> {
    try {
        const credential = await IntegrationCredential.findById(credentialId).select('+encryptedData');

        if (!credential || !credential.isValid) {
            logger.error('[FormGoogleSheetSync] Invalid or missing credential');
            return [];
        }

        const credentialData = credential.getCredentialData();

        const auth = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        auth.setCredentials({
            access_token: credentialData.accessToken,
            refresh_token: credentialData.refreshToken,
            expiry_date: credentialData.expiryDate,
        });

        const drive = google.drive({ version: 'v3', auth });

        // List only Google Spreadsheets
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            fields: 'files(id, name)',
            orderBy: 'modifiedTime desc',
            pageSize: 100,
        });

        return (response.data.files || []).map((file) => ({
            id: file.id || '',
            name: file.name || 'Untitled',
        }));
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Error fetching spreadsheets:', error.message);
        return [];
    }
}

/**
 * Get sheet tabs from a spreadsheet
 */
export async function getSpreadsheetSheets(
    credentialId: string,
    spreadsheetId: string
): Promise<Array<{ id: number; name: string }>> {
    try {
        const sheets = await getGoogleSheetsClient(credentialId);
        if (!sheets) {
            return [];
        }

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        return (spreadsheet.data.sheets || []).map((sheet) => ({
            id: sheet.properties?.sheetId || 0,
            name: sheet.properties?.title || 'Sheet',
        }));
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Error fetching sheets:', error.message);
        return [];
    }
}

/**
 * Get sync status for a form
 */
export async function getFormSyncStatus(formId: string): Promise<{
    enabled: boolean;
    lastSync?: Date;
    totalSynced: number;
    pendingSync: number;
    failedSyncs: number;
}> {
    try {
        const form = await Form.findById(formId).lean();
        if (!form) {
            return { enabled: false, totalSynced: 0, pendingSync: 0, failedSyncs: 0 };
        }

        const config = (form as any).googleSheetsIntegration;
        if (!config?.enabled) {
            return { enabled: false, totalSynced: 0, pendingSync: 0, failedSyncs: 0 };
        }

        // Count pending submissions
        const pendingSync = await FormSubmission.countDocuments({
            formId,
            $or: [
                { 'googleSheetSync.synced': { $ne: true } },
                { 'googleSheetSync': { $exists: false } },
            ],
        });

        return {
            enabled: true,
            lastSync: config.lastSyncAt,
            totalSynced: config.syncStats?.totalSynced || 0,
            pendingSync,
            failedSyncs: config.syncStats?.failedSyncs || 0,
        };
    } catch (error: any) {
        logger.error('[FormGoogleSheetSync] Error getting sync status:', error.message);
        return { enabled: false, totalSynced: 0, pendingSync: 0, failedSyncs: 0 };
    }
}

export default {
    syncFormSubmission,
    batchSyncSubmissions,
    getUserSpreadsheets,
    getSpreadsheetSheets,
    getFormSyncStatus,
};
