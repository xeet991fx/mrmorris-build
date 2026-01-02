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

export default router;
