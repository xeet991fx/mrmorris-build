/**
 * TokenRefreshService Tests
 * Story 5.2 - Automatic Token Refresh
 *
 * Tests for automatic OAuth token refresh functionality
 */

import { TokenRefreshService, TokenRefreshError, IntegrationExpiredError } from './TokenRefreshService';
import { OAuthService } from './OAuthService';
import IntegrationCredential from '../models/IntegrationCredential';
import { getRedisClient } from '../config/redis';

// Mock dependencies
jest.mock('../models/IntegrationCredential');
jest.mock('./OAuthService');
jest.mock('../config/redis');

const mockRedis = {
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
};

(getRedisClient as jest.Mock).mockReturnValue(mockRedis);

describe('TokenRefreshService', () => {
    let service: TokenRefreshService;
    const credentialId = '507f1f77bcf86cd799439011';
    const workspaceId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        jest.clearAllMocks();
        service = new TokenRefreshService();
    });

    // ==========================================================================
    // AC1: Automatic Token Refresh on Expiration Detection
    // ==========================================================================

    describe('AC1: Token refresh on expiration detection', () => {
        it('should refresh token when expired (10.1)', async () => {
            const expiredCredential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() - 1000), // Expired
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'old_token',
                    refresh_token: 'refresh_token_123',
                }),
                setCredentialData: jest.fn(),
                save: jest.fn(),
            };

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(expiredCredential),
            });

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            (OAuthService.refreshGoogleToken as jest.Mock).mockResolvedValue({
                access_token: 'new_access_token',
                expires_in: 3600,
                token_type: 'Bearer',
            });

            const result = await service.refreshToken(credentialId);

            expect(result).toBe('new_access_token');
            expect(expiredCredential.setCredentialData).toHaveBeenCalledWith(
                expect.objectContaining({
                    access_token: 'new_access_token',
                    refresh_token: 'refresh_token_123',
                })
            );
            expect(expiredCredential.status).toBe('Connected');
            expect(expiredCredential.save).toHaveBeenCalled();
        });

        it('should call ensureValidToken which triggers refresh for expiring token', async () => {
            const expiringCredential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() + 2 * 60 * 1000), // Expires in 2 minutes (within buffer)
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'expiring_token',
                    refresh_token: 'refresh_token_123',
                }),
                setCredentialData: jest.fn(),
                save: jest.fn(),
            };

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(expiringCredential),
            });

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            (OAuthService.refreshGoogleToken as jest.Mock).mockResolvedValue({
                access_token: 'refreshed_token',
                expires_in: 3600,
                token_type: 'Bearer',
            });

            const result = await service.ensureValidToken(credentialId);

            expect(result).toBe('refreshed_token');
            expect(OAuthService.refreshGoogleToken).toHaveBeenCalled();
        });

        it('should return existing token when not expired', async () => {
            const validCredential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'valid_token',
                }),
            };

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(validCredential),
            });

            const result = await service.ensureValidToken(credentialId);

            expect(result).toBe('valid_token');
            expect(OAuthService.refreshGoogleToken).not.toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // AC3: Expired Refresh Token Handling
    // ==========================================================================

    describe('AC3: Expired refresh token handling', () => {
        it('should mark status as Expired when refresh token is invalid (10.2)', async () => {
            const credential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() - 1000),
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'old_token',
                    refresh_token: 'invalid_refresh_token',
                }),
                setCredentialData: jest.fn(),
                save: jest.fn(),
            };

            // First two calls are with .select(), third is without (handleRefreshFailure)
            const selectMock = jest.fn().mockResolvedValue(credential);
            (IntegrationCredential.findById as jest.Mock)
                .mockReturnValueOnce({ select: selectMock })
                .mockResolvedValue(credential); // handleRefreshFailure calls findById directly

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            const refreshError = new Error('Refresh token is invalid or revoked');
            (refreshError as any).code = 'invalid_grant';
            (OAuthService.refreshGoogleToken as jest.Mock).mockRejectedValue(refreshError);

            await expect(service.refreshToken(credentialId)).rejects.toThrow();

            // Credential should be marked as Expired
            expect(credential.status).toBe('Expired');
            expect(credential.save).toHaveBeenCalled();
        });

        it('should throw IntegrationExpiredError when credential already expired', async () => {
            const expiredCredential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Expired',
                expiresAt: new Date(Date.now() - 1000),
                getCredentialData: jest.fn().mockReturnValue({ access_token: 'old' }),
            };

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(expiredCredential),
            });

            await expect(service.ensureValidToken(credentialId)).rejects.toThrow(IntegrationExpiredError);
        });
    });

    // ==========================================================================
    // AC4: Distributed Lock for Concurrent Refresh
    // ==========================================================================

    describe('AC4: Distributed lock prevents duplicate refresh (10.4)', () => {
        it('should wait when lock is held by another process', async () => {
            const credential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'refreshed_by_other',
                }),
            };

            // Lock not acquired (returns null)
            mockRedis.set.mockResolvedValue(null);
            // Lock released after waiting
            mockRedis.exists.mockResolvedValueOnce(1).mockResolvedValue(0);

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(credential),
            });

            const result = await service.refreshToken(credentialId);

            // Should return the token from credential (refreshed by other process)
            expect(result).toBe('refreshed_by_other');
            // Should not have tried to refresh
            expect(OAuthService.refreshGoogleToken).not.toHaveBeenCalled();
        });

        it('should acquire lock and refresh when available', async () => {
            const credential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() - 1000),
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'old',
                    refresh_token: 'refresh_123',
                }),
                setCredentialData: jest.fn(),
                save: jest.fn(),
            };

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(credential),
            });

            (OAuthService.refreshGoogleToken as jest.Mock).mockResolvedValue({
                access_token: 'new_token',
                expires_in: 3600,
            });

            await service.refreshToken(credentialId);

            // Should acquire lock
            expect(mockRedis.set).toHaveBeenCalledWith(
                `lock:token:${credentialId}`,
                '1',
                'EX',
                30,
                'NX'
            );
            // Should release lock
            expect(mockRedis.del).toHaveBeenCalledWith(`lock:token:${credentialId}`);
        });
    });

    // ==========================================================================
    // Provider-specific handling
    // ==========================================================================

    describe('Provider-specific handling', () => {
        it('should handle LinkedIn (no refresh token) correctly (10.5)', async () => {
            const linkedinCredential = {
                _id: credentialId,
                workspaceId,
                type: 'linkedin',
                status: 'Connected',
                expiresAt: new Date(Date.now() - 1000),
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'linkedin_token',
                    // No refresh_token
                }),
                setCredentialData: jest.fn(),
                save: jest.fn(),
            };

            (IntegrationCredential.findById as jest.Mock)
                .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(linkedinCredential) })
                .mockResolvedValue(linkedinCredential);

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            await expect(service.refreshToken(credentialId)).rejects.toThrow(TokenRefreshError);
            expect(linkedinCredential.status).toBe('Expired');
        });

        it('should return existing Slack token (no expiry) (10.5)', async () => {
            const slackCredential = {
                _id: credentialId,
                workspaceId,
                type: 'slack',
                status: 'Connected',
                expiresAt: null, // Slack doesn't expire
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'slack_bot_token',
                    botToken: 'xoxb-slack-token',
                }),
            };

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(slackCredential),
            });

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            const result = await service.refreshToken(credentialId);

            expect(result).toBe('slack_bot_token');
            expect(OAuthService.refreshGoogleToken).not.toHaveBeenCalled();
        });

        it('should refresh Google token correctly (10.6)', async () => {
            const gmailCredential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() - 1000),
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'old_gmail_token',
                    refresh_token: 'google_refresh_token',
                }),
                setCredentialData: jest.fn(),
                save: jest.fn(),
            };

            (IntegrationCredential.findById as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(gmailCredential),
            });

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            (OAuthService.refreshGoogleToken as jest.Mock).mockResolvedValue({
                access_token: 'new_gmail_token',
                expires_in: 3600,
                token_type: 'Bearer',
            });

            const result = await service.refreshToken(credentialId);

            expect(result).toBe('new_gmail_token');
            expect(OAuthService.refreshGoogleToken).toHaveBeenCalledWith('google_refresh_token');
        });
    });

    // ==========================================================================
    // Error handling
    // ==========================================================================

    describe('Error handling', () => {
        it('should throw TokenRefreshError when credential not found', async () => {
            // First call with .select() returns null
            (IntegrationCredential.findById as jest.Mock).mockReturnValueOnce({
                select: jest.fn().mockResolvedValue(null),
            });
            // Second call in handleRefreshFailure (without .select()) also returns null
            (IntegrationCredential.findById as jest.Mock).mockResolvedValueOnce(null);

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            await expect(service.refreshToken(credentialId)).rejects.toThrow(TokenRefreshError);
        });

        it('should throw TokenRefreshError for unknown integration type', async () => {
            const unknownCredential = {
                _id: credentialId,
                workspaceId,
                type: 'unknown_provider',
                status: 'Connected',
                getCredentialData: jest.fn().mockReturnValue({ access_token: 'token' }),
                save: jest.fn(),
            };

            (IntegrationCredential.findById as jest.Mock)
                .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(unknownCredential) })
                .mockResolvedValue(unknownCredential);

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            await expect(service.refreshToken(credentialId)).rejects.toThrow(TokenRefreshError);
        });

        it('should always release lock even on error', async () => {
            const credential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() - 1000),
                getCredentialData: jest.fn().mockReturnValue({
                    access_token: 'old',
                    refresh_token: 'refresh',
                }),
                save: jest.fn(),
            };

            (IntegrationCredential.findById as jest.Mock)
                .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(credential) })
                .mockResolvedValue(credential);

            mockRedis.set.mockResolvedValue('OK');
            mockRedis.del.mockResolvedValue(1);

            (OAuthService.refreshGoogleToken as jest.Mock).mockRejectedValue(new Error('Network error'));

            try {
                await service.refreshToken(credentialId);
            } catch (e) {
                // Expected to throw
            }

            // Lock should still be released
            expect(mockRedis.del).toHaveBeenCalledWith(`lock:token:${credentialId}`);
        });
    });

    // ==========================================================================
    // Integration status checks
    // ==========================================================================

    describe('getIntegrationStatus', () => {
        it('should return needs action for expiring integrations', async () => {
            const credential = {
                _id: credentialId,
                workspaceId,
                type: 'gmail',
                status: 'Connected',
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            };

            (IntegrationCredential.findById as jest.Mock).mockResolvedValue(credential);

            const status = await service.getIntegrationStatus(credentialId);

            expect(status.status).toBe('Connected');
            expect(status.needsAction).toBe(true);
            expect(status.actionMessage).toContain('3 days');
        });

        it('should return needs action for expired integrations', async () => {
            const credential = {
                _id: credentialId,
                type: 'gmail',
                status: 'Expired',
            };

            (IntegrationCredential.findById as jest.Mock).mockResolvedValue(credential);

            const status = await service.getIntegrationStatus(credentialId);

            expect(status.status).toBe('Expired');
            expect(status.needsAction).toBe(true);
            expect(status.actionMessage).toContain('expired');
        });
    });
});
