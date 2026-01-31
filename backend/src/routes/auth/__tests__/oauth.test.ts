/**
 * OAuth Routes Tests
 * Story 5.1 - OAuth Authentication Flow
 *
 * Unit tests for OAuth authorize and callback endpoints
 */

import request from 'supertest';
import express from 'express';
import { OAuthService } from '../../../services/OAuthService';
import IntegrationCredential from '../../../models/IntegrationCredential';
import Project from '../../../models/Project';
import oauthRoutes from '../oauth';
import { authenticate } from '../../../middleware/auth';

// Mock dependencies
jest.mock('../../../services/OAuthService');
jest.mock('../../../models/IntegrationCredential');
jest.mock('../../../models/Project');
jest.mock('../../../middleware/auth');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const app = express();
app.use(express.json());
app.use('/api/auth/oauth', oauthRoutes);

describe('OAuth Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Set required environment variables for tests
        process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
        process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
        process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret';

        // Mock authenticate middleware
        (authenticate as jest.Mock).mockImplementation((req, res, next) => {
            req.user = {
                _id: 'user123',
                email: 'test@example.com',
            };
            next();
        });

        // Mock Project.findById to return valid workspace owned by user
        (Project.findById as jest.Mock).mockResolvedValue({
            _id: 'workspace123',
            userId: 'user123',
            name: 'Test Workspace',
        });
    });

    afterEach(() => {
        // Clean up environment variables
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
        delete process.env.LINKEDIN_CLIENT_ID;
        delete process.env.LINKEDIN_CLIENT_SECRET;
    });

    describe('GET /api/auth/oauth/:provider/authorize', () => {
        it('should return Gmail authorization URL', async () => {
            const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...';
            const mockState = 'encoded-state-parameter';

            (OAuthService.generateOAuthState as jest.Mock).mockReturnValue(mockState);
            (OAuthService.generateGmailAuthUrl as jest.Mock).mockReturnValue(mockAuthUrl);

            const response = await request(app)
                .get('/api/auth/oauth/gmail/authorize')
                .query({ workspaceId: 'workspace123' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ url: mockAuthUrl });
            expect(OAuthService.generateOAuthState).toHaveBeenCalledWith(
                'workspace123',
                'user123',
                'gmail'
            );
            expect(OAuthService.generateGmailAuthUrl).toHaveBeenCalledWith(
                mockState,
                expect.stringContaining('/api/auth/oauth/gmail/callback')
            );
        });

        it('should return LinkedIn authorization URL', async () => {
            const mockAuthUrl = 'https://www.linkedin.com/oauth/v2/authorization?client_id=...';
            const mockState = 'encoded-state-parameter';

            (OAuthService.generateOAuthState as jest.Mock).mockReturnValue(mockState);
            (OAuthService.generateLinkedInAuthUrl as jest.Mock).mockReturnValue(mockAuthUrl);

            const response = await request(app)
                .get('/api/auth/oauth/linkedin/authorize')
                .query({ workspaceId: 'workspace123' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ url: mockAuthUrl });
            expect(OAuthService.generateLinkedInAuthUrl).toHaveBeenCalled();
        });

        it('should return Google Calendar authorization URL', async () => {
            const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...';
            const mockState = 'encoded-state-parameter';

            (OAuthService.generateOAuthState as jest.Mock).mockReturnValue(mockState);
            (OAuthService.generateGoogleCalendarAuthUrl as jest.Mock).mockReturnValue(mockAuthUrl);

            const response = await request(app)
                .get('/api/auth/oauth/google-calendar/authorize')
                .query({ workspaceId: 'workspace123' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ url: mockAuthUrl });
        });

        it('should return 400 if workspaceId is missing', async () => {
            const response = await request(app)
                .get('/api/auth/oauth/gmail/authorize');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('workspaceId is required');
        });

        it('should return 400 for invalid provider', async () => {
            const response = await request(app)
                .get('/api/auth/oauth/invalid-provider/authorize')
                .query({ workspaceId: 'workspace123' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid provider');
        });

        it('should return 404 if workspace does not exist', async () => {
            (Project.findById as jest.Mock).mockResolvedValue(null);

            const response = await request(app)
                .get('/api/auth/oauth/gmail/authorize')
                .query({ workspaceId: 'nonexistent-workspace' });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Workspace not found');
        });

        it('should return 403 if user does not own workspace', async () => {
            (Project.findById as jest.Mock).mockResolvedValue({
                _id: 'workspace123',
                userId: 'different-user-456', // Different user owns this workspace
                name: 'Someone Elses Workspace',
            });

            const response = await request(app)
                .get('/api/auth/oauth/gmail/authorize')
                .query({ workspaceId: 'workspace123' });

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Access denied');
        });

        it('should handle service errors gracefully', async () => {
            (OAuthService.generateOAuthState as jest.Mock).mockImplementation(() => {
                throw new Error('State generation failed');
            });

            const response = await request(app)
                .get('/api/auth/oauth/gmail/authorize')
                .query({ workspaceId: 'workspace123' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to generate authorization URL');
        });
    });

    describe('GET /api/auth/oauth/:provider/callback', () => {
        const mockTokens = {
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
            expiresAt: new Date('2026-02-01'),
            scopes: ['scope1', 'scope2'],
        };

        const mockProfile = {
            email: 'john@gmail.com',
            name: 'John Doe',
            avatarUrl: 'https://example.com/avatar.jpg',
        };

        beforeEach(() => {
            (OAuthService.validateOAuthState as jest.Mock).mockReturnValue({
                workspaceId: 'workspace123',
                userId: 'user123',
                provider: 'gmail',
                timestamp: Date.now(),
                nonce: 'random-nonce',
            });

            (OAuthService.exchangeGoogleCode as jest.Mock).mockResolvedValue(mockTokens);
            (OAuthService.fetchGoogleProfile as jest.Mock).mockResolvedValue(mockProfile);

            // Mock IntegrationCredential.findOne to return null (new credential)
            (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);

            // Mock IntegrationCredential constructor and save
            const mockCredential = {
                workspaceId: 'workspace123',
                type: 'gmail',
                name: 'Gmail - john@gmail.com',
                expiresAt: mockTokens.expiresAt,
                scopes: mockTokens.scopes,
                profileInfo: mockProfile,
                status: 'Connected',
                isValid: true,
                lastValidated: expect.any(Date),
                setCredentialData: jest.fn(),
                save: jest.fn().mockResolvedValue(true),
            };

            (IntegrationCredential as any).mockImplementation(() => mockCredential);
        });

        it('should exchange Gmail code for tokens and store credential', async () => {
            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'encoded-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Gmail Connected');
            expect(response.text).toContain('john@gmail.com');
            expect(response.text).toContain('window.close()');

            expect(OAuthService.validateOAuthState).toHaveBeenCalledWith('encoded-state', 'gmail');
            expect(OAuthService.exchangeGoogleCode).toHaveBeenCalledWith(
                'auth-code-123',
                expect.stringContaining('/api/auth/oauth/gmail/callback')
            );
            expect(OAuthService.fetchGoogleProfile).toHaveBeenCalledWith('access-token-123');
        });

        it('should exchange LinkedIn code for tokens and store credential', async () => {
            (OAuthService.validateOAuthState as jest.Mock).mockReturnValue({
                workspaceId: 'workspace123',
                userId: 'user123',
                provider: 'linkedin',
                timestamp: Date.now(),
                nonce: 'random-nonce',
            });

            (OAuthService.exchangeLinkedInCode as jest.Mock).mockResolvedValue({
                accessToken: 'linkedin-token',
                expiresAt: new Date('2026-04-01'),
                scopes: ['w_member_social'],
            });

            (OAuthService.fetchLinkedInProfile as jest.Mock).mockResolvedValue({
                email: 'john@example.com',
                name: 'John Doe',
            });

            const response = await request(app)
                .get('/api/auth/oauth/linkedin/callback')
                .query({
                    code: 'linkedin-code',
                    state: 'encoded-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Linkedin Connected');
            expect(OAuthService.exchangeLinkedInCode).toHaveBeenCalled();
            expect(OAuthService.fetchLinkedInProfile).toHaveBeenCalled();
        });

        it('should handle user denial (access_denied error)', async () => {
            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    error: 'access_denied',
                    state: 'encoded-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Authorization Canceled');
            expect(response.text).toContain('Integration not connected');
            expect(OAuthService.exchangeGoogleCode).not.toHaveBeenCalled();
        });

        it('should handle invalid state parameter', async () => {
            (OAuthService.validateOAuthState as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid state: expired');
            });

            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'invalid-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Invalid OAuth State');
            expect(response.text).toContain('CSRF validation failed');
        });

        it('should handle token exchange failure', async () => {
            (OAuthService.exchangeGoogleCode as jest.Mock).mockRejectedValue(
                new Error('Token exchange failed')
            );

            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'invalid-code',
                    state: 'encoded-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Token Exchange Failed');
            expect(response.text).toContain('Please try again');
        });

        it('should handle missing code parameter', async () => {
            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    state: 'encoded-state',
                });

            expect(response.status).toBe(400);
            expect(response.text).toContain('Missing code or state parameter');
        });

        it('should update existing credential when reconnecting', async () => {
            const existingCredential = {
                workspaceId: 'workspace123',
                type: 'gmail',
                name: 'Gmail - old@gmail.com',
                expiresAt: null,
                scopes: [],
                profileInfo: {},
                status: 'Expired',
                isValid: false,
                setCredentialData: jest.fn(),
                save: jest.fn().mockResolvedValue(true),
            };

            (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(existingCredential);

            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'encoded-state',
                });

            expect(response.status).toBe(200);
            expect(existingCredential.save).toHaveBeenCalled();
            expect(existingCredential.setCredentialData).toHaveBeenCalledWith({
                accessToken: 'access-token-123',
                refreshToken: 'refresh-token-456',
                expiresAt: mockTokens.expiresAt,
                scopes: mockTokens.scopes,
            });
        });

        it('should continue if profile fetch fails (non-critical)', async () => {
            (OAuthService.fetchGoogleProfile as jest.Mock).mockRejectedValue(
                new Error('Profile fetch failed')
            );

            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'encoded-state',
                });

            // Should still succeed even if profile fetch fails
            expect(response.status).toBe(200);
            expect(response.text).toContain('Gmail Connected');
        });

        it('should handle Google Calendar callback', async () => {
            (OAuthService.validateOAuthState as jest.Mock).mockReturnValue({
                workspaceId: 'workspace123',
                userId: 'user123',
                provider: 'google-calendar',
                timestamp: Date.now(),
                nonce: 'random-nonce',
            });

            const response = await request(app)
                .get('/api/auth/oauth/google-calendar/callback')
                .query({
                    code: 'calendar-code',
                    state: 'encoded-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Google-calendar Connected');
            expect(OAuthService.exchangeGoogleCode).toHaveBeenCalled();
        });

        it('should encrypt tokens before storing', async () => {
            const mockCredential = {
                setCredentialData: jest.fn(),
                save: jest.fn().mockResolvedValue(true),
            };

            (IntegrationCredential as any).mockImplementation(() => mockCredential);

            await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'encoded-state',
                });

            expect(mockCredential.setCredentialData).toHaveBeenCalledWith({
                accessToken: 'access-token-123',
                refreshToken: 'refresh-token-456',
                expiresAt: mockTokens.expiresAt,
                scopes: mockTokens.scopes,
            });
        });
    });

    describe('Security - CSRF Protection', () => {
        it('should reject expired state parameter', async () => {
            (OAuthService.validateOAuthState as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid state: expired (state older than 10 minutes)');
            });

            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'expired-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Invalid OAuth State');
            expect(response.text).toContain('CSRF validation failed');
        });

        it('should reject state with provider mismatch', async () => {
            (OAuthService.validateOAuthState as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid state: provider mismatch');
            });

            const response = await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'wrong-provider-state',
                });

            expect(response.status).toBe(200);
            expect(response.text).toContain('Invalid OAuth State');
        });
    });

    describe('Workspace Isolation', () => {
        it('should store credential with correct workspaceId', async () => {
            (OAuthService.validateOAuthState as jest.Mock).mockReturnValue({
                workspaceId: 'workspace-abc',
                userId: 'user123',
                provider: 'gmail',
                timestamp: Date.now(),
                nonce: 'random-nonce',
            });

            await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'encoded-state',
                });

            expect(IntegrationCredential).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: 'workspace-abc',
                })
            );

            expect(IntegrationCredential.findOne).toHaveBeenCalledWith({
                workspaceId: 'workspace-abc',
                type: 'gmail',
            });
        });

        it('should query existing credentials by workspaceId from state', async () => {
            // Reset mock to default workspace123
            (OAuthService.validateOAuthState as jest.Mock).mockReturnValue({
                workspaceId: 'workspace123',
                userId: 'user123',
                provider: 'gmail',
                timestamp: Date.now(),
                nonce: 'random-nonce',
            });

            await request(app)
                .get('/api/auth/oauth/gmail/callback')
                .query({
                    code: 'auth-code-123',
                    state: 'encoded-state',
                });

            expect(IntegrationCredential.findOne).toHaveBeenCalledWith({
                workspaceId: 'workspace123',
                type: 'gmail',
            });
        });
    });
});
