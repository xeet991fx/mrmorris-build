/**
 * Slack OAuth2 Integration Routes
 *
 * Handles OAuth2 authorization flow for Slack
 *
 * Mounted at: /api/integrations/slack
 */

import express from 'express';
import { WebClient } from '@slack/web-api';
import IntegrationCredential from '../../models/IntegrationCredential';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';

// Auto-construct redirect URI from BACKEND_URL (works for dev and production)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || `${BACKEND_URL}/api/integrations/slack/oauth/callback`;

// Slack OAuth scopes
const SLACK_SCOPES = [
    'channels:read',           // View basic information about public channels
    'channels:history',        // View messages in public channels
    'channels:manage',         // Manage public channels and create new ones
    'channels:join',           // Join public channels
    'chat:write',             // Send messages
    'chat:write.public',      // Send messages to channels app isn't a member of
    'users:read',             // View people in workspace
    'reactions:write',        // Add and edit emoji reactions
    'files:write',            // Upload, edit, and delete files
    'im:write',               // Start direct messages
];

/**
 * GET /api/integrations/slack/oauth/authorize
 *
 * Initiate OAuth2 flow - returns authorization URL
 */
router.get('/slack/oauth/authorize', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, action } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Generate Slack authorization URL
        const state = JSON.stringify({
            workspaceId,
            userId: req.user?._id.toString(),
            action,
        });

        const authUrl = `https://slack.com/oauth/v2/authorize?` +
            `client_id=${SLACK_CLIENT_ID}` +
            `&scope=${SLACK_SCOPES.join(',')}` +
            `&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}` +
            `&state=${encodeURIComponent(state)}`;

        res.json({ url: authUrl });
    } catch (error: any) {
        logger.error('[Slack OAuth] Authorization error:', error.message);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/integrations/slack/oauth/callback
 *
 * OAuth2 callback - exchanges code for tokens
 */
router.get('/slack/oauth/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Missing code or state parameter');
        }

        // Parse state
        const stateData = JSON.parse(state as string);
        const { workspaceId, userId } = stateData;

        // Exchange code for access token
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                code: code as string,
                redirect_uri: SLACK_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok) {
            throw new Error(tokenData.error || 'Failed to exchange code for token');
        }

        const { access_token, team, authed_user, bot_user_id } = tokenData;

        if (!access_token) {
            throw new Error('No access token received');
        }

        // Create Slack client to fetch team info
        const client = new WebClient(access_token);
        const teamInfo = await client.team.info();

        const teamName = teamInfo.team?.name || team.name || 'Unknown';
        const credentialName = `Slack - ${teamName}`;

        // Store credential
        const credential = new IntegrationCredential({
            workspaceId,
            type: 'slack',
            name: credentialName,
        });

        credential.setCredentialData({
            accessToken: access_token,
            teamId: team.id,
            teamName: teamName,
            botUserId: bot_user_id,
            authedUserId: authed_user?.id,
            scopes: tokenData.scope?.split(',') || SLACK_SCOPES,
        });

        await credential.save();

        // Validate credential
        await credential.validateCredential();

        logger.info(`[Slack OAuth] Credential created for workspace ${workspaceId}, team ${teamName}`);

        // Close popup window
        res.send(`
            <html>
                <head>
                    <title>Authorization Successful</title>
                </head>
                <body>
                    <h2>✓ Slack Workspace Connected</h2>
                    <p>Team: <strong>${teamName}</strong></p>
                    <p>You can close this window now.</p>
                    <script>
                        window.close();
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        logger.error('[Slack OAuth] Callback error:', error.message);
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
 * POST /api/integrations/slack/validate
 *
 * Validate Slack credential
 */
router.post('/slack/validate', authenticate, async (req: AuthRequest, res) => {
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

        // Validate
        const isValid = await credential.validateCredential();

        res.json({
            isValid,
            credentialId: credential._id,
            name: credential.name,
        });
    } catch (error: any) {
        logger.error('[Slack] Validation error:', error.message);
        res.status(500).json({ error: 'Failed to validate credential' });
    }
});

export default router;
