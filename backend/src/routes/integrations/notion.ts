/**
 * Notion OAuth2 Integration Routes
 *
 * Handles OAuth2 authorization flow for Notion
 *
 * Mounted at: /api/integrations/notion
 */

import express from 'express';
import axios from 'axios';
import IntegrationCredential from '../../models/IntegrationCredential';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || '';
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'http://localhost:4000/api/integrations/notion/oauth/callback';

/**
 * GET /api/integrations/notion/oauth/authorize
 *
 * Initiate OAuth2 flow - returns authorization URL
 */
router.get('/notion/oauth/authorize', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Generate authorization URL
        const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
            `client_id=${encodeURIComponent(NOTION_CLIENT_ID)}` +
            `&response_type=code` +
            `&owner=user` +
            `&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}` +
            `&state=${encodeURIComponent(JSON.stringify({ workspaceId, userId: req.user?._id.toString() }))}`;

        res.json({ url: authUrl });
    } catch (error: any) {
        logger.error('[Notion OAuth] Authorization error:', error.message);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/integrations/notion/oauth/callback
 *
 * OAuth2 callback - exchanges code for tokens
 */
router.get('/notion/oauth/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Missing code or state parameter');
        }

        // Parse state
        const stateData = JSON.parse(state as string);
        const { workspaceId, userId } = stateData;

        // Exchange code for tokens
        const authString = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');

        const response = await axios.post(
            'https://api.notion.com/v1/oauth/token',
            {
                grant_type: 'authorization_code',
                code,
                redirect_uri: NOTION_REDIRECT_URI,
            },
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const { access_token, workspace_name, workspace_id, bot_id } = response.data;

        if (!access_token) {
            throw new Error('No access token received');
        }

        const credentialName = `Notion - ${workspace_name || workspace_id || 'Workspace'}`;

        // Store credential
        const credential = new IntegrationCredential({
            workspaceId,
            type: 'notion',
            name: credentialName,
        });

        credential.setCredentialData({
            accessToken: access_token,
            workspaceName: workspace_name,
            workspaceId: workspace_id,
            botId: bot_id,
        });

        await credential.save();

        // Validate credential
        await credential.validateCredential();

        logger.info(`[Notion OAuth] Credential created for workspace ${workspaceId}`);

        // Close popup window
        res.send(`
            <html>
                <head>
                    <title>Authorization Successful</title>
                </head>
                <body>
                    <h2>✓ Notion Connected</h2>
                    <p>You can close this window now.</p>
                    <script>
                        window.close();
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        logger.error('[Notion OAuth] Callback error:', error.message);
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

export default router;
