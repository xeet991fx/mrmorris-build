/**
 * Token Refresh Service
 * Story 5.2 - Automatic Token Refresh
 *
 * Handles automatic OAuth token refresh for all integration providers.
 * Features:
 * - Distributed locking to prevent concurrent refresh attempts
 * - Provider-specific refresh logic (Google, LinkedIn, Slack)
 * - Retry logic with exponential backoff
 * - Status updates and failure handling
 */

import { Redis } from 'ioredis';
import IntegrationCredential, { IIntegrationCredential, IntegrationType } from '../models/IntegrationCredential';
import { OAuthService } from './OAuthService';
import { withRetry, isAuthError } from '../utils/retry';
import { getRedisClient } from '../config/redis';

/**
 * Error thrown when token refresh fails permanently
 */
export class TokenRefreshError extends Error {
    public readonly code?: string;
    public readonly isRetryable: boolean;

    constructor(message: string, code?: string, isRetryable = false) {
        super(message);
        this.name = 'TokenRefreshError';
        this.code = code;
        this.isRetryable = isRetryable;
    }
}

/**
 * Error thrown when integration is expired and cannot be refreshed
 */
export class IntegrationExpiredError extends Error {
    public readonly integrationType: string;
    public readonly workspaceId: string;

    constructor(integrationType: string, workspaceId: string, message?: string) {
        super(message || `${integrationType} integration expired. Please reconnect.`);
        this.name = 'IntegrationExpiredError';
        this.integrationType = integrationType;
        this.workspaceId = workspaceId;
    }
}

/**
 * Token Refresh Service
 * Manages automatic token refresh for OAuth integrations
 */
export class TokenRefreshService {
    private redis: Redis;
    private readonly LOCK_TTL_SECONDS = 30; // Lock TTL to prevent deadlocks
    private readonly TOKEN_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 mins before expiry

    constructor(redis?: Redis) {
        this.redis = redis || getRedisClient();
    }

    /**
     * Acquire a distributed lock for token refresh
     * Prevents concurrent refresh attempts for the same credential
     */
    private async acquireRefreshLock(credentialId: string): Promise<boolean> {
        const lockKey = `lock:token:${credentialId}`;
        const result = await this.redis.set(lockKey, '1', 'EX', this.LOCK_TTL_SECONDS, 'NX');
        return result === 'OK';
    }

    /**
     * Release the distributed lock
     */
    private async releaseRefreshLock(credentialId: string): Promise<void> {
        const lockKey = `lock:token:${credentialId}`;
        await this.redis.del(lockKey);
    }

    /**
     * Wait for another process to complete refresh
     * Polls until lock is released or timeout
     */
    private async waitForRefreshCompletion(credentialId: string, maxWaitMs = 35000): Promise<void> {
        const lockKey = `lock:token:${credentialId}`;
        const pollIntervalMs = 500;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const lockExists = await this.redis.exists(lockKey);
            if (!lockExists) {
                return; // Lock released, refresh complete
            }
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        // Timeout waiting - proceed anyway (lock will expire via TTL)
        console.warn(`Timeout waiting for refresh lock on credential ${credentialId}`);
    }

    /**
     * Check if token needs refresh (expired or expiring soon)
     */
    private needsRefresh(credential: IIntegrationCredential): boolean {
        if (!credential.expiresAt) {
            return false; // No expiry set, assume valid
        }

        const now = Date.now();
        const expiresAt = credential.expiresAt.getTime();

        // Refresh if expired or expiring within buffer window (5 mins)
        return expiresAt - now < this.TOKEN_BUFFER_MS;
    }

    /**
     * Refresh token for a specific integration credential
     * Uses distributed lock to prevent concurrent refreshes
     *
     * @param credentialId - MongoDB ID of the IntegrationCredential
     * @returns New access token
     * @throws TokenRefreshError on permanent failure
     */
    async refreshToken(credentialId: string): Promise<string> {
        // Try to acquire lock
        const lockAcquired = await this.acquireRefreshLock(credentialId);

        if (!lockAcquired) {
            // Another process is refreshing - wait for it
            console.info(`Waiting for concurrent refresh on credential ${credentialId}`);
            await this.waitForRefreshCompletion(credentialId);

            // Get the refreshed token
            const credential = await IntegrationCredential.findById(credentialId).select('+encryptedData');
            if (!credential) {
                throw new TokenRefreshError(`Credential not found: ${credentialId}`);
            }
            return credential.getCredentialData().access_token;
        }

        try {
            const credential = await IntegrationCredential.findById(credentialId).select('+encryptedData');
            if (!credential) {
                throw new TokenRefreshError(`Credential not found: ${credentialId}`);
            }

            const credData = credential.getCredentialData();
            let newAccessToken: string;
            let newExpiresAt: Date;

            // Provider-specific refresh logic
            switch (credential.type) {
                case 'gmail':
                case 'calendar':
                case 'google_sheets':
                    // Google OAuth refresh - requires refresh token
                    if (!credData.refresh_token) {
                        throw new TokenRefreshError(
                            `No refresh token for ${credential.type}. Please reconnect.`,
                            'no_refresh_token'
                        );
                    }

                    const result = await withRetry(
                        () => OAuthService.refreshGoogleToken(credData.refresh_token),
                        {
                            maxAttempts: 3,
                            baseDelayMs: 1000,
                            onRetry: (attempt, error, delayMs) => {
                                console.warn(`Retry ${attempt}/3 for ${credential.type} token refresh after ${delayMs}ms: ${error.message}`);
                            },
                        }
                    );

                    newAccessToken = result.access_token;
                    newExpiresAt = new Date(Date.now() + result.expires_in * 1000);
                    break;

                case 'linkedin':
                    // LinkedIn has NO refresh token - cannot refresh, must reconnect
                    throw new TokenRefreshError(
                        'LinkedIn tokens cannot be refreshed. Please reconnect the integration.',
                        'no_refresh_support'
                    );

                case 'slack':
                    // Slack tokens don't expire (long-lived) - just return existing token
                    console.info(`Slack token for credential ${credentialId} doesn't expire, returning existing token`);
                    return credData.access_token || credData.botToken;

                default:
                    throw new TokenRefreshError(
                        `Unknown integration type: ${credential.type}`,
                        'unknown_type'
                    );
            }

            // Update credential with new token
            credential.setCredentialData({
                ...credData,
                access_token: newAccessToken,
            });
            credential.expiresAt = newExpiresAt;
            credential.status = 'Connected';
            credential.lastUsed = new Date();
            await credential.save();

            console.info(`Token refreshed for ${credential.type} credential ${credentialId}, expires at ${newExpiresAt.toISOString()}`);
            return newAccessToken;

        } catch (error: any) {
            // Handle refresh failure
            await this.handleRefreshFailure(credentialId, error);
            throw error;
        } finally {
            await this.releaseRefreshLock(credentialId);
        }
    }

    /**
     * Ensure a valid access token is available
     * Refreshes if expired or near expiration
     *
     * @param credentialId - MongoDB ID of the IntegrationCredential
     * @returns Valid access token
     */
    async ensureValidToken(credentialId: string): Promise<string> {
        const credential = await IntegrationCredential.findById(credentialId).select('+encryptedData');

        if (!credential) {
            throw new TokenRefreshError(`Integration credential not found: ${credentialId}`);
        }

        // Check if credential is already marked as expired or error
        if (credential.status === 'Expired' || credential.status === 'Revoked') {
            throw new IntegrationExpiredError(
                credential.type,
                credential.workspaceId.toString()
            );
        }

        // Check if token needs refresh
        if (this.needsRefresh(credential)) {
            console.info(`Token for ${credential.type} credential ${credentialId} needs refresh`);
            return this.refreshToken(credentialId);
        }

        // Token still valid
        const credData = credential.getCredentialData();
        return credData.access_token || credData.botToken;
    }

    /**
     * Check if token is expired (for expiration check middleware)
     *
     * @param credentialId - MongoDB ID of the IntegrationCredential
     * @returns True if token is expired or near expiration
     */
    async isTokenExpired(credentialId: string): Promise<boolean> {
        const credential = await IntegrationCredential.findById(credentialId);

        if (!credential) {
            return true; // Treat missing credential as expired
        }

        if (credential.status === 'Expired' || credential.status === 'Revoked' || credential.status === 'Error') {
            return true;
        }

        return this.needsRefresh(credential);
    }

    /**
     * Handle token refresh failure
     * Story 5.3 Task 5.1, 5.2: Enhanced status detection for Revoked vs Expired vs Error
     * Updates credential status and prepares for notification
     */
    private async handleRefreshFailure(credentialId: string, error: any): Promise<void> {
        const credential = await IntegrationCredential.findById(credentialId);
        if (!credential) {
            return;
        }

        // Story 5.3 Task 5.1: Determine new status based on error type
        let newStatus: 'Expired' | 'Revoked' | 'Error';

        // Check for 401 Unauthorized - user revoked access on provider side
        const is401 = error.response?.status === 401 || error.status === 401 || error.statusCode === 401;
        const isInvalidGrant = error.code === 'invalid_grant' || error.message?.includes('invalid_grant');

        if (is401 || isInvalidGrant) {
            // Story 5.3 Task 5.1: 401 = Revoked status (user action on provider side)
            newStatus = 'Revoked';
            console.error(`Token revoked by user for ${credential.type} credential ${credentialId}: ${error.message}`);
        } else if (error.code === 'no_refresh_support' || error.code === 'no_refresh_token' || isAuthError(error)) {
            // Permanent failure - token expired naturally
            newStatus = 'Expired';
            console.error(`Token expired for ${credential.type} credential ${credentialId}: ${error.message}`);
        } else if (error.response?.status >= 500 || error.status >= 500 || error.statusCode >= 500) {
            // Story 5.3 Task 5.2: 5xx = temporary Error status (provider issue)
            newStatus = 'Error';
            console.warn(`Token refresh failed temporarily (5xx) for ${credential.type} credential ${credentialId}: ${error.message}`);
        } else {
            // Other temporary failures
            newStatus = 'Error';
            console.warn(`Token refresh failed temporarily for ${credential.type} credential ${credentialId}: ${error.message}`);
        }

        // Update credential status
        credential.status = newStatus;
        credential.validationError = error.message;
        credential.lastUsed = new Date();

        // Story 5.3 Task 5.3: Track when error first occurred for persistent error detection
        if (newStatus === 'Error' && (!credential.lastValidated || credential.status !== 'Error')) {
            // First error or status changed to Error - track timestamp
            credential.lastValidated = new Date();
        }

        await credential.save();

        console.info(`Updated credential ${credentialId} status to ${newStatus}`);
    }

    /**
     * Get integration status for display
     */
    async getIntegrationStatus(credentialId: string): Promise<{
        status: string;
        expiresAt?: Date;
        daysUntilExpiry?: number;
        needsAction: boolean;
        actionMessage?: string;
    }> {
        const credential = await IntegrationCredential.findById(credentialId);

        if (!credential) {
            return {
                status: 'Not Found',
                needsAction: true,
                actionMessage: 'Integration not found',
            };
        }

        const now = new Date();
        let daysUntilExpiry: number | undefined;

        if (credential.expiresAt) {
            daysUntilExpiry = Math.ceil(
                (credential.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            );
        }

        // Determine if action is needed
        let needsAction = false;
        let actionMessage: string | undefined;

        if (credential.status === 'Expired' || credential.status === 'Revoked') {
            needsAction = true;
            actionMessage = 'Integration expired. Click to reconnect.';
        } else if (credential.status === 'Error') {
            needsAction = true;
            actionMessage = 'Integration error. Try reconnecting.';
        } else if (daysUntilExpiry !== undefined && daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            needsAction = true;
            actionMessage = `Integration expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Reconnect soon.`;
        }

        return {
            status: credential.status,
            expiresAt: credential.expiresAt,
            daysUntilExpiry,
            needsAction,
            actionMessage,
        };
    }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();

export default TokenRefreshService;
