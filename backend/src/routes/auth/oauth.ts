/**
 * OAuth Routes
 * Story 5.1 - OAuth Authentication Flow
 *
 * Generic OAuth routes for all providers: Gmail, LinkedIn, Google Calendar
 */

import express from 'express';
import mongoose from 'mongoose';
import IntegrationCredential from '../../models/IntegrationCredential';
import Project from '../../models/Project';
import { OAuthService } from '../../services/OAuthService';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

type Provider = 'gmail' | 'linkedin' | 'google-calendar';

/**
 * GET /api/auth/oauth/:provider/authorize
 *
 * Initiate OAuth flow - returns authorization URL
 * Supported providers: gmail, linkedin, google-calendar
 */
router.get('/:provider/authorize', authenticate, async (req: AuthRequest, res) => {
    try {
        const provider = req.params.provider as Provider;
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Validate provider
        const validProviders: Provider[] = ['gmail', 'linkedin', 'google-calendar'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: `Invalid provider: ${provider}` });
        }

        // Validate workspace ownership (SECURITY: prevent user from connecting to other users' workspaces)
        const workspace = await Project.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        if (workspace.userId.toString() !== req.user!._id.toString()) {
            return res.status(403).json({ error: 'Access denied. You do not own this workspace.' });
        }

        // Generate state parameter with CSRF protection
        const state = OAuthService.generateOAuthState(
            workspaceId as string,
            req.user!._id.toString(),
            provider
        );

        // Generate authorization URL based on provider
        const redirectUri = `${BACKEND_URL}/api/auth/oauth/${provider}/callback`;
        let authUrl: string;

        switch (provider) {
            case 'gmail':
                authUrl = OAuthService.generateGmailAuthUrl(state, redirectUri);
                break;
            case 'linkedin':
                authUrl = OAuthService.generateLinkedInAuthUrl(state, redirectUri);
                break;
            case 'google-calendar':
                authUrl = OAuthService.generateGoogleCalendarAuthUrl(state, redirectUri);
                break;
            default:
                return res.status(400).json({ error: `Provider ${provider} not implemented` });
        }

        logger.info(`[OAuth] Authorization URL generated for ${provider}, workspace: ${workspaceId}`);

        res.json({ url: authUrl });
    } catch (error: any) {
        logger.error(`[OAuth] Authorization error for ${req.params.provider}:`, error.message);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/auth/oauth/:provider/callback
 *
 * OAuth callback - exchanges code for tokens and stores credentials
 * This endpoint is PUBLIC (no authentication) because it's called by OAuth provider
 */
router.get('/:provider/callback', async (req, res) => {
    try {
        const provider = req.params.provider as Provider;
        const { code, state, error } = req.query;

        // Handle user denial
        if (error === 'access_denied') {
            logger.warn(`[OAuth] User denied access for ${provider}`);
            return res.send(`
                <html>
                    <head>
                        <title>Authorization Canceled</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h2 { color: #dc3545; }
                        </style>
                    </head>
                    <body>
                        <h2>✗ Authorization Canceled</h2>
                        <p>Integration not connected.</p>
                        <p>You can close this window now.</p>
                        <script>
                            setTimeout(() => window.close(), 3000);
                        </script>
                    </body>
                </html>
            `);
        }

        if (!code || !state) {
            logger.error(`[OAuth] Missing code or state parameter for ${provider}`);
            return res.status(400).send('Missing code or state parameter');
        }

        // Validate state parameter (CSRF protection)
        let validatedState;
        try {
            validatedState = OAuthService.validateOAuthState(state as string, provider);
        } catch (error: any) {
            logger.error(`[OAuth] Invalid state for ${provider}:`, error.message);
            return res.send(`
                <html>
                    <head>
                        <title>Invalid OAuth State</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h2 { color: #dc3545; }
                        </style>
                    </head>
                    <body>
                        <h2>✗ Invalid OAuth State</h2>
                        <p>CSRF validation failed. Please try again.</p>
                        <p>Error: ${error.message}</p>
                        <p>You can close this window now.</p>
                    </body>
                </html>
            `);
        }

        const { workspaceId } = validatedState;
        const redirectUri = `${BACKEND_URL}/api/auth/oauth/${provider}/callback`;

        // Exchange code for tokens
        let tokens;
        try {
            switch (provider) {
                case 'gmail':
                    tokens = await OAuthService.exchangeGoogleCode(code as string, redirectUri);
                    break;
                case 'linkedin':
                    tokens = await OAuthService.exchangeLinkedInCode(code as string, redirectUri);
                    break;
                case 'google-calendar':
                    tokens = await OAuthService.exchangeGoogleCode(code as string, redirectUri);
                    break;
                default:
                    throw new Error(`Provider ${provider} not implemented`);
            }
        } catch (error: any) {
            logger.error(`[OAuth] Token exchange failed for ${provider}:`, error.message);
            return res.send(`
                <html>
                    <head>
                        <title>Token Exchange Failed</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h2 { color: #dc3545; }
                        </style>
                    </head>
                    <body>
                        <h2>✗ Token Exchange Failed</h2>
                        <p>${error.message}</p>
                        <p>Please try again.</p>
                    </body>
                </html>
            `);
        }

        // Fetch user profile
        let profile;
        try {
            switch (provider) {
                case 'gmail':
                case 'google-calendar':
                    profile = await OAuthService.fetchGoogleProfile(tokens.accessToken);
                    break;
                case 'linkedin':
                    profile = await OAuthService.fetchLinkedInProfile(tokens.accessToken);
                    break;
            }
        } catch (error: any) {
            logger.warn(`[OAuth] Profile fetch failed for ${provider} (non-critical):`, error.message);
            // Profile fetch is non-critical, continue without it
            profile = {};
        }

        // Map provider to IntegrationCredential type
        const integrationTypeMap: Record<Provider, 'gmail' | 'linkedin' | 'calendar'> = {
            'gmail': 'gmail',
            'linkedin': 'linkedin',
            'google-calendar': 'calendar',
        };

        const integrationType = integrationTypeMap[provider];
        const credentialName = `${provider === 'google-calendar' ? 'Google Calendar' : provider.charAt(0).toUpperCase() + provider.slice(1)}${profile.email ? ` - ${profile.email}` : ''}`;

        // Check if credential already exists (update if reconnecting)
        let credential = await IntegrationCredential.findOne({
            workspaceId,
            type: integrationType,
        });

        if (credential) {
            // Update existing credential
            logger.info(`[OAuth] Updating existing ${provider} credential for workspace ${workspaceId}`);
        } else {
            // Create new credential
            credential = new IntegrationCredential({
                workspaceId,
                type: integrationType,
                name: credentialName,
            });
            logger.info(`[OAuth] Creating new ${provider} credential for workspace ${workspaceId}`);
        }

        // Update credential fields
        credential.expiresAt = tokens.expiresAt;
        credential.scopes = tokens.scopes;
        credential.profileInfo = profile;
        credential.status = 'Connected';
        credential.isValid = true;
        credential.lastValidated = new Date();

        // Encrypt and store tokens
        credential.setCredentialData({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            scopes: tokens.scopes,
        });

        await credential.save();

        logger.info(`[OAuth] ${provider} credential saved for workspace ${workspaceId}`);

        // Return success HTML page with auto-close script
        res.send(`
            <html>
                <head>
                    <title>Authorization Successful</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h2 { color: #28a745; }
                    </style>
                </head>
                <body>
                    <h2>✓ ${provider.charAt(0).toUpperCase() + provider.slice(1)} Connected</h2>
                    ${profile.email ? `<p>Account: <strong>${profile.email}</strong></p>` : ''}
                    ${profile.name ? `<p>Name: ${profile.name}</p>` : ''}
                    <p>You can close this window now.</p>
                    <script>
                        setTimeout(() => window.close(), 2000);
                    </script>
                </body>
            </html>
        `);
    } catch (error: any) {
        logger.error(`[OAuth] Callback error for ${req.params.provider}:`, error.message);
        res.status(500).send(`
            <html>
                <head>
                    <title>Authorization Failed</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h2 { color: #dc3545; }
                    </style>
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
