/**
 * Google Sheets OAuth2 Integration Routes
 *
 * Handles OAuth2 authorization flow for Google Sheets
 *
 * Mounted at: /api/integrations/google_sheets
 */

import express from 'express';
import { google } from 'googleapis';
import IntegrationCredential from '../../models/IntegrationCredential';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/integrations/google_sheets/oauth/callback';

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
];

/**
 * GET /api/integrations/google_sheets/oauth/authorize
 *
 * Initiate OAuth2 flow - returns authorization URL
 */
router.get('/google_sheets/oauth/authorize', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        // Generate authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: JSON.stringify({
                workspaceId,
                userId: req.user?._id.toString(),
            }),
            prompt: 'consent', // Force consent screen to get refresh token
        });

        res.json({ url: authUrl });
    } catch (error: any) {
        logger.error('[GoogleSheets OAuth] Authorization error:', error.message);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/integrations/google_sheets/oauth/callback
 *
 * OAuth2 callback - exchanges code for tokens
 */
router.get('/google_sheets/oauth/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Missing code or state parameter');
        }

        // Parse state
        const stateData = JSON.parse(state as string);
        const { workspaceId, userId } = stateData;

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code as string);

        if (!tokens.access_token) {
            throw new Error('No access token received');
        }

        // Set credentials to fetch user info
        oauth2Client.setCredentials(tokens);

        // Fetch user's Google account info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        const email = userInfo.data.email || 'Unknown';
        const credentialName = `Google Sheets - ${email}`;

        // Store credential
        const credential = new IntegrationCredential({
            workspaceId,
            type: 'google_sheets',
            name: credentialName,
        });

        credential.setCredentialData({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            email,
        });

        await credential.save();

        // Validate credential
        await credential.validateCredential();

        logger.info(`[GoogleSheets OAuth] Credential created for workspace ${workspaceId}`);

        // Close popup window
        res.send(`
            <html>
                <head>
                    <title>Authorization Successful</title>
                </head>
                <body>
                    <h2>✓ Google Sheets Connected</h2>
                    <p>You can close this window now.</p>
                    <script>
                        window.close();
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        logger.error('[GoogleSheets OAuth] Callback error:', error.message);
        res.status(500).send(`
            <html>
                <head>
                    <title>Authorization Failed</title>
                </head>
                <body>
                    <h2>✗ Authorization Failed</h2>
                    <p>${error.message}</p>
                    <p>Please close this window and try again.</p>
                </body>
            </html>
        `);
    }
});

/**
 * POST /api/integrations/google_sheets/refresh_token
 *
 * Refresh access token using refresh token
 */
router.post('/google_sheets/refresh_token', authenticate, async (req: AuthRequest, res) => {
    try {
        const { credentialId } = req.body;

        if (!credentialId) {
            return res.status(400).json({ error: 'credentialId is required' });
        }

        // Fetch credential
        const credential = await IntegrationCredential.findById(credentialId).select('+encryptedData');

        if (!credential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        const credentialData = credential.getCredentialData();

        if (!credentialData.refreshToken) {
            return res.status(400).json({ error: 'No refresh token available' });
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            refresh_token: credentialData.refreshToken,
        });

        // Refresh token
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update credential
        credential.setCredentialData({
            ...credentialData,
            accessToken: credentials.access_token,
            expiryDate: credentials.expiry_date,
        });

        await credential.save();

        logger.info(`[GoogleSheets] Token refreshed for credential ${credentialId}`);

        res.json({ success: true, message: 'Token refreshed successfully' });
    } catch (error: any) {
        logger.error('[GoogleSheets] Token refresh error:', error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// ============================================
// FORM GOOGLE SHEETS INTEGRATION ROUTES
// ============================================

import { getUserSpreadsheets, getSpreadsheetSheets, getFormSyncStatus, batchSyncSubmissions } from '../../services/FormGoogleSheetSync';
import Form from '../../models/Form';
import { triggerFormSync } from '../../jobs/googleSheetFormSyncJob';

/**
 * GET /api/integrations/google_sheets/spreadsheets
 *
 * List user's Google Spreadsheets
 */
router.get('/google_sheets/spreadsheets', authenticate, async (req: AuthRequest, res) => {
    try {
        const { credentialId } = req.query;

        if (!credentialId) {
            return res.status(400).json({ error: 'credentialId is required' });
        }

        const spreadsheets = await getUserSpreadsheets(credentialId as string);
        res.json({ success: true, spreadsheets });
    } catch (error: any) {
        logger.error('[GoogleSheets] List spreadsheets error:', error.message);
        res.status(500).json({ error: 'Failed to list spreadsheets' });
    }
});

/**
 * GET /api/integrations/google_sheets/sheets
 *
 * List sheets (tabs) in a spreadsheet
 */
router.get('/google_sheets/sheets', authenticate, async (req: AuthRequest, res) => {
    try {
        const { credentialId, spreadsheetId } = req.query;

        if (!credentialId || !spreadsheetId) {
            return res.status(400).json({ error: 'credentialId and spreadsheetId are required' });
        }

        const sheets = await getSpreadsheetSheets(credentialId as string, spreadsheetId as string);
        res.json({ success: true, sheets });
    } catch (error: any) {
        logger.error('[GoogleSheets] List sheets error:', error.message);
        res.status(500).json({ error: 'Failed to list sheets' });
    }
});

/**
 * POST /api/integrations/google_sheets/forms/:formId/sync
 *
 * Trigger manual sync for a form
 */
router.post('/google_sheets/forms/:formId/sync', authenticate, async (req: AuthRequest, res) => {
    try {
        const { formId } = req.params;

        // Verify form exists and has Google Sheets integration enabled
        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        if (!form.googleSheetsIntegration?.enabled) {
            return res.status(400).json({ error: 'Google Sheets integration is not enabled for this form' });
        }

        // Trigger immediate sync
        const result = await batchSyncSubmissions(formId);

        if (result.success) {
            res.json({
                success: true,
                message: `Successfully synced ${result.rowsAdded || 0} submissions to Google Sheets`,
                rowsAdded: result.rowsAdded,
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Sync failed',
            });
        }
    } catch (error: any) {
        logger.error('[GoogleSheets] Manual sync error:', error.message);
        res.status(500).json({ error: 'Failed to sync to Google Sheets' });
    }
});

/**
 * GET /api/integrations/google_sheets/forms/:formId/sync-status
 *
 * Get sync status for a form
 */
router.get('/google_sheets/forms/:formId/sync-status', authenticate, async (req: AuthRequest, res) => {
    try {
        const { formId } = req.params;

        const status = await getFormSyncStatus(formId);
        res.json({ success: true, ...status });
    } catch (error: any) {
        logger.error('[GoogleSheets] Get sync status error:', error.message);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});

/**
 * PUT /api/integrations/google_sheets/forms/:formId/config
 *
 * Update Google Sheets integration config for a form
 */
router.put('/google_sheets/forms/:formId/config', authenticate, async (req: AuthRequest, res) => {
    try {
        const { formId } = req.params;
        const { enabled, spreadsheetId, sheetName, syncMode, credentialId } = req.body;

        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Update Google Sheets integration config
        form.googleSheetsIntegration = {
            enabled: enabled ?? false,
            spreadsheetId: spreadsheetId || '',
            sheetName: sheetName || 'Form Submissions',
            syncMode: syncMode || 'realtime',
            credentialId: credentialId || '',
            lastSyncAt: form.googleSheetsIntegration?.lastSyncAt,
            syncStats: form.googleSheetsIntegration?.syncStats || {
                totalSynced: 0,
                failedSyncs: 0,
            },
        };

        await form.save();

        logger.info(`[GoogleSheets] Updated form ${formId} Google Sheets config`);
        res.json({ success: true, googleSheetsIntegration: form.googleSheetsIntegration });
    } catch (error: any) {
        logger.error('[GoogleSheets] Update config error:', error.message);
        res.status(500).json({ error: 'Failed to update Google Sheets configuration' });
    }
});

export default router;

