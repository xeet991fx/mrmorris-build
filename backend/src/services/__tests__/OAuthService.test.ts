/**
 * OAuth Service Tests
 * Story 5.1 - OAuth Authentication Flow
 */

import { OAuthService } from '../OAuthService';
import { google } from 'googleapis';
import axios from 'axios';

// Mock googleapis
jest.mock('googleapis');
jest.mock('axios');

describe('OAuthService', () => {
    beforeEach(() => {
        // Set required environment variables for tests
        process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
        process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
        process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret';
    });

    afterEach(() => {
        // Clean up environment variables
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
        delete process.env.LINKEDIN_CLIENT_ID;
        delete process.env.LINKEDIN_CLIENT_SECRET;
    });
    describe('generateOAuthState', () => {
        it('should generate valid base64url encoded state', () => {
            const state = OAuthService.generateOAuthState('workspace-123', 'user-456', 'gmail');

            expect(state).toBeDefined();
            expect(typeof state).toBe('string');
            expect(state.length).toBeGreaterThan(0);

            // Should be valid base64url (no +, /, = characters)
            expect(state).not.toMatch(/[+/=]/);
        });

        it('should include workspaceId, userId, provider, timestamp, nonce', () => {
            const state = OAuthService.generateOAuthState('workspace-123', 'user-456', 'gmail');
            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));

            expect(decoded.workspaceId).toBe('workspace-123');
            expect(decoded.userId).toBe('user-456');
            expect(decoded.provider).toBe('gmail');
            expect(decoded.timestamp).toBeGreaterThan(0);
            expect(decoded.nonce).toBeDefined();
            expect(decoded.nonce.length).toBeGreaterThan(0);
        });

        it('should generate unique nonce for each call', () => {
            const state1 = OAuthService.generateOAuthState('workspace-123', 'user-456', 'gmail');
            const state2 = OAuthService.generateOAuthState('workspace-123', 'user-456', 'gmail');

            const decoded1 = JSON.parse(Buffer.from(state1, 'base64url').toString('utf-8'));
            const decoded2 = JSON.parse(Buffer.from(state2, 'base64url').toString('utf-8'));

            expect(decoded1.nonce).not.toBe(decoded2.nonce);
        });
    });

    describe('validateOAuthState', () => {
        it('should validate valid state successfully', () => {
            const state = OAuthService.generateOAuthState('workspace-123', 'user-456', 'gmail');
            const validated = OAuthService.validateOAuthState(state, 'gmail');

            expect(validated.workspaceId).toBe('workspace-123');
            expect(validated.userId).toBe('user-456');
            expect(validated.provider).toBe('gmail');
        });

        it('should reject state with wrong provider', () => {
            const state = OAuthService.generateOAuthState('workspace-123', 'user-456', 'gmail');

            expect(() => OAuthService.validateOAuthState(state, 'linkedin')).toThrow('provider mismatch');
        });

        it('should reject expired state (older than 10 minutes)', () => {
            // Create state with old timestamp
            const oldState = {
                workspaceId: 'workspace-123',
                userId: 'user-456',
                provider: 'gmail',
                timestamp: Date.now() - (11 * 60 * 1000), // 11 minutes ago
                nonce: 'abc123',
            };

            const stateParam = Buffer.from(JSON.stringify(oldState)).toString('base64url');

            expect(() => OAuthService.validateOAuthState(stateParam, 'gmail')).toThrow('expired');
        });

        it('should reject invalid base64 state', () => {
            expect(() => OAuthService.validateOAuthState('invalid-state!!!', 'gmail')).toThrow('Invalid state format');
        });

        it('should reject state with missing fields', () => {
            const incompleteState = {
                workspaceId: 'workspace-123',
                // Missing userId, provider, timestamp, nonce
            };

            const stateParam = Buffer.from(JSON.stringify(incompleteState)).toString('base64url');

            expect(() => OAuthService.validateOAuthState(stateParam, 'gmail')).toThrow('missing required fields');
        });
    });

    describe('exchangeGoogleCode', () => {
        it('should exchange code for access and refresh tokens', async () => {
            const mockTokens = {
                access_token: 'google-access-token',
                refresh_token: 'google-refresh-token',
                expiry_date: Date.now() + 3600000,
                scope: 'gmail.send gmail.readonly',
            };

            const mockGetToken = jest.fn().mockResolvedValue({ tokens: mockTokens });
            (google.auth.OAuth2 as jest.Mock).mockImplementation(() => ({
                getToken: mockGetToken,
            }));

            const result = await OAuthService.exchangeGoogleCode('auth-code-123', 'http://localhost/callback');

            expect(result.accessToken).toBe('google-access-token');
            expect(result.refreshToken).toBe('google-refresh-token');
            expect(result.expiresAt).toBeDefined();
            expect(result.scopes).toContain('gmail.send');
            expect(mockGetToken).toHaveBeenCalledWith('auth-code-123');
        });
    });

    describe('exchangeLinkedInCode', () => {
        it('should exchange code for access token (no refresh token)', async () => {
            const mockResponse = {
                data: {
                    access_token: 'linkedin-access-token',
                    expires_in: 5184000, // 60 days in seconds
                },
            };

            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            const result = await OAuthService.exchangeLinkedInCode('auth-code-456', 'http://localhost/callback');

            expect(result.accessToken).toBe('linkedin-access-token');
            expect(result.refreshToken).toBeUndefined(); // LinkedIn doesn't provide refresh tokens
            expect(result.expiresAt).toBeDefined();
            expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
            expect(result.scopes).toContain('w_member_social');
        });
    });

    describe('fetchGoogleProfile', () => {
        it('should fetch user profile from Google', async () => {
            const mockUserInfo = {
                data: {
                    email: 'john@example.com',
                    name: 'John Doe',
                    picture: 'https://example.com/avatar.jpg',
                },
            };

            const mockSetCredentials = jest.fn();
            const mockUserInfoGet = jest.fn().mockResolvedValue(mockUserInfo);

            (google.auth.OAuth2 as jest.Mock).mockImplementation(() => ({
                setCredentials: mockSetCredentials,
            }));

            (google.oauth2 as jest.Mock).mockReturnValue({
                userinfo: {
                    get: mockUserInfoGet,
                },
            });

            const profile = await OAuthService.fetchGoogleProfile('access-token-123');

            expect(profile.email).toBe('john@example.com');
            expect(profile.name).toBe('John Doe');
            expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg');
            expect(mockSetCredentials).toHaveBeenCalledWith({ access_token: 'access-token-123' });
        });
    });

    describe('fetchLinkedInProfile', () => {
        it('should fetch user profile from LinkedIn', async () => {
            const mockProfileResponse = {
                data: {
                    localizedFirstName: 'Jane',
                    localizedLastName: 'Smith',
                },
            };

            const mockEmailResponse = {
                data: {
                    elements: [
                        {
                            'handle~': {
                                emailAddress: 'jane@example.com',
                            },
                        },
                    ],
                },
            };

            (axios.get as jest.Mock)
                .mockResolvedValueOnce(mockProfileResponse) // Profile call
                .mockResolvedValueOnce(mockEmailResponse);  // Email call

            const profile = await OAuthService.fetchLinkedInProfile('linkedin-token');

            expect(profile.name).toBe('Jane Smith');
            expect(profile.email).toBe('jane@example.com');
            expect(profile.avatarUrl).toBeUndefined();
        });

        it('should handle missing email scope gracefully', async () => {
            const mockProfileResponse = {
                data: {
                    localizedFirstName: 'Jane',
                    localizedLastName: 'Smith',
                },
            };

            (axios.get as jest.Mock)
                .mockResolvedValueOnce(mockProfileResponse) // Profile call
                .mockRejectedValueOnce(new Error('Email scope not granted')); // Email call fails

            const profile = await OAuthService.fetchLinkedInProfile('linkedin-token');

            expect(profile.name).toBe('Jane Smith');
            expect(profile.email).toBeUndefined(); // Email should be undefined when call fails
        });
    });

    describe('generateGmailAuthUrl', () => {
        it('should generate valid Gmail authorization URL', () => {
            const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?...');

            (google.auth.OAuth2 as jest.Mock).mockImplementation(() => ({
                generateAuthUrl: mockGenerateAuthUrl,
            }));

            const url = OAuthService.generateGmailAuthUrl('state-123', 'http://localhost/callback');

            expect(url).toContain('https://accounts.google.com');
            expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    access_type: 'offline',
                    state: 'state-123',
                    prompt: 'consent',
                })
            );
        });
    });

    describe('generateLinkedInAuthUrl', () => {
        it('should generate valid LinkedIn authorization URL', () => {
            const url = OAuthService.generateLinkedInAuthUrl('state-456', 'http://localhost/callback');

            expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
            expect(url).toContain('state=state-456');
            expect(url).toContain('redirect_uri=');
            expect(url).toContain('w_member_social');
        });
    });

    describe('generateGoogleCalendarAuthUrl', () => {
        it('should generate valid Google Calendar authorization URL', () => {
            const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?...');

            (google.auth.OAuth2 as jest.Mock).mockImplementation(() => ({
                generateAuthUrl: mockGenerateAuthUrl,
            }));

            const url = OAuthService.generateGoogleCalendarAuthUrl('state-789', 'http://localhost/callback');

            expect(url).toContain('https://accounts.google.com');
            expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    access_type: 'offline',
                    state: 'state-789',
                    prompt: 'consent',
                })
            );
        });
    });
});
