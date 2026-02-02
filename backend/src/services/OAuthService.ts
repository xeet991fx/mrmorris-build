/**
 * OAuth Service
 * Story 5.1 - OAuth Authentication Flow
 *
 * Centralized OAuth logic for all providers (Gmail, LinkedIn, Google Calendar, etc.)
 */

import crypto from 'crypto';
import { google } from 'googleapis';
import axios from 'axios';

const STATE_EXPIRY_MINUTES = 10;

export interface OAuthState {
    workspaceId: string;
    userId: string;
    provider: string;
    timestamp: number;
    nonce: string;
}

export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes?: string[];
}

export interface UserProfile {
    email?: string;
    name?: string;
    avatarUrl?: string;
}

export class OAuthService {
    /**
     * Generate OAuth state parameter with CSRF protection
     * State includes: workspaceId, userId, provider, timestamp, nonce
     */
    static generateOAuthState(workspaceId: string, userId: string, provider: string): string {
        const state: OAuthState = {
            workspaceId,
            userId,
            provider,
            timestamp: Date.now(),
            nonce: crypto.randomBytes(16).toString('hex'),
        };

        return Buffer.from(JSON.stringify(state)).toString('base64url');
    }

    /**
     * Validate OAuth state parameter
     * Checks: format, timestamp expiration, workspace ownership
     *
     * @throws Error if validation fails
     */
    static validateOAuthState(stateParam: string, expectedProvider: string): OAuthState {
        try {
            // Decode state
            const stateJson = Buffer.from(stateParam, 'base64url').toString('utf-8');
            const state: OAuthState = JSON.parse(stateJson);

            // Validate required fields
            if (!state.workspaceId || !state.userId || !state.provider || !state.timestamp || !state.nonce) {
                throw new Error('Invalid state format: missing required fields');
            }

            // Validate provider matches
            if (state.provider !== expectedProvider) {
                throw new Error(`Invalid state: provider mismatch (expected ${expectedProvider}, got ${state.provider})`);
            }

            // Validate timestamp not expired (10-minute window)
            const expiryTime = state.timestamp + (STATE_EXPIRY_MINUTES * 60 * 1000);
            if (Date.now() > expiryTime) {
                throw new Error('Invalid state: expired (state older than 10 minutes)');
            }

            return state;
        } catch (error: any) {
            if (error.message.startsWith('Invalid state')) {
                throw error;
            }
            throw new Error(`Invalid state format: ${error.message}`);
        }
    }

    /**
     * Exchange authorization code for tokens (Gmail/Google Calendar/Sheets)
     */
    static async exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthTokens> {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri
        );

        const { tokens } = await oauth2Client.getToken(code);

        return {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
            scopes: tokens.scope?.split(' '),
        };
    }

    /**
     * Exchange authorization code for tokens (LinkedIn)
     * LinkedIn does NOT provide refresh tokens
     */
    static async exchangeLinkedInCode(code: string, redirectUri: string): Promise<OAuthTokens> {
        if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
            throw new Error('LinkedIn OAuth credentials not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.');
        }

        const tokenResponse = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            null,
            {
                params: {
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, expires_in } = tokenResponse.data;

        // LinkedIn tokens expire in 60 days (default)
        const expiresAt = new Date(Date.now() + (expires_in || 60 * 24 * 3600) * 1000);

        return {
            accessToken: access_token,
            refreshToken: undefined, // LinkedIn does not provide refresh tokens
            expiresAt,
            scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'], // Scopes from authorization
        };
    }

    /**
     * Fetch user profile from Google OAuth using userinfo endpoint
     */
    static async fetchGoogleProfile(accessToken: string): Promise<UserProfile> {
        try {
            // Use direct HTTP call to Google userinfo endpoint (more reliable than v3 API)
            const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = response.data;
            return {
                email: data.email || undefined,
                name: data.name || undefined,
                avatarUrl: data.picture || undefined,
            };
        } catch (error: any) {
            console.error('[OAuthService] Failed to fetch Google profile:', error.message);
            throw new Error(`Failed to fetch Google profile: ${error.message}`);
        }
    }

    /**
     * Fetch user profile from LinkedIn OAuth
     */
    static async fetchLinkedInProfile(accessToken: string): Promise<UserProfile> {
        // Fetch basic profile
        const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
            },
        });

        const { localizedFirstName, localizedLastName } = profileResponse.data;
        const name = `${localizedFirstName} ${localizedLastName}`.trim();

        // Fetch email separately
        let email: string | undefined;
        try {
            const emailResponse = await axios.get(
                'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'X-Restli-Protocol-Version': '2.0.0',
                    },
                }
            );

            email = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress;
        } catch (error) {
            // Email scope might not be granted
            console.warn('Failed to fetch LinkedIn email:', error);
        }

        return {
            email,
            name: name || undefined,
            avatarUrl: undefined, // LinkedIn profile picture requires additional API call
        };
    }

    /**
     * Generate authorization URL for Gmail
     */
    static generateGmailAuthUrl(state: string, redirectUri: string): string {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri
        );

        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ];

        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state,
            prompt: 'consent', // Force consent to get refresh token
        });
    }

    /**
     * Generate authorization URL for LinkedIn
     */
    static generateLinkedInAuthUrl(state: string, redirectUri: string): string {
        if (!process.env.LINKEDIN_CLIENT_ID) {
            throw new Error('LinkedIn OAuth credentials not configured. Set LINKEDIN_CLIENT_ID environment variable.');
        }

        const scopes = ['w_member_social', 'r_liteprofile', 'r_emailaddress'];

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.LINKEDIN_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: scopes.join(' '),
            state,
        });

        return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }

    /**
     * Generate authorization URL for Google Calendar
     */
    static generateGoogleCalendarAuthUrl(state: string, redirectUri: string): string {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri
        );

        const scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ];

        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state,
            prompt: 'consent',
        });
    }

    /**
     * Refresh Google OAuth access token using refresh token
     * Story 5.2 - Automatic Token Refresh
     *
     * @param refreshToken - The refresh token stored in IntegrationCredential
     * @returns New access token and expiry information
     * @throws Error if refresh fails (invalid_grant, revoked, etc.)
     */
    static async refreshGoogleToken(refreshToken: string): Promise<{
        access_token: string;
        expires_in: number;
        token_type: string;
    }> {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });

        try {
            // Use getAccessToken which handles refresh automatically
            const { token, res } = await oauth2Client.getAccessToken();

            if (!token) {
                throw new Error('Failed to refresh token: No access token returned');
            }

            // Get expiry from credentials
            const credentials = oauth2Client.credentials;
            const expiresIn = credentials.expiry_date
                ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
                : 3600; // Default 1 hour

            return {
                access_token: token,
                expires_in: expiresIn,
                token_type: 'Bearer',
            };
        } catch (error: any) {
            // Handle specific Google OAuth errors
            if (error.message?.includes('invalid_grant') ||
                error.message?.includes('Token has been revoked')) {
                const refreshError = new Error('Refresh token is invalid or revoked. Please reconnect the integration.');
                (refreshError as any).code = 'invalid_grant';
                throw refreshError;
            }
            throw error;
        }
    }
}

