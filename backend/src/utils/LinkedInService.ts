/**
 * LinkedInService.ts - Story 3.8: LinkedIn Invitation Action
 *
 * Provides LinkedIn API integration for sending connection requests.
 * Handles OAuth token refresh, rate limiting, and retry logic.
 * Follows GmailService.ts pattern for consistency.
 *
 * AC1: Send LinkedIn invitation with custom note
 * AC2: Use contact LinkedIn URL
 * AC5: Daily limit reached - auto pause
 * AC6: Handle expired credentials
 */

import axios, { AxiosError } from 'axios';
import IntegrationCredential from '../models/IntegrationCredential';
import mongoose from 'mongoose';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface LinkedInSendResult {
  success: boolean;
  invitationId?: string;
  error?: string;
  retryAttempts?: number;
  skipped?: boolean;  // True if contact had no LinkedIn URL
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface LinkedInAccount {
  workspaceId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  status: 'active' | 'disconnected';
  sentToday: number;
  lastSentAt?: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// LinkedIn API endpoints
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_TOKEN_ENDPOINT = 'https://www.linkedin.com/oauth/v2/accessToken';

// Rate limits per LinkedIn API Terms of Service
const LINKEDIN_DAILY_LIMIT = 100; // Max 100 invitations per day

// Retry configuration
const LINKEDIN_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

// LinkedIn profile URL validation regex
const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)\/?$/;

// Note character limit per LinkedIn API
const MAX_NOTE_LENGTH = 300;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate LinkedIn profile URL format
 */
export function isValidLinkedInUrl(url: string): boolean {
  return LINKEDIN_URL_REGEX.test(url);
}

/**
 * Extract profile ID from LinkedIn URL
 * Example: https://linkedin.com/in/john-doe-123 -> john-doe-123
 */
export function extractProfileId(url: string): string | null {
  const match = url.match(LINKEDIN_URL_REGEX);
  return match ? match[2] : null;
}

/**
 * Truncate note to LinkedIn's 300 character limit
 */
export function truncateNote(note: string): string {
  if (note.length <= MAX_NOTE_LENGTH) {
    return note;
  }
  return note.substring(0, MAX_NOTE_LENGTH - 3) + '...';
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if current date has passed the counter reset time (midnight UTC)
 * Uses UTC-based comparison for consistency across timezones
 */
function shouldResetDailyCounter(lastSentAt?: Date): boolean {
  if (!lastSentAt) return true;

  const now = new Date();
  const lastSent = new Date(lastSentAt);

  // Use UTC date comparison for consistency across timezones
  const nowUTC = now.toISOString().split('T')[0];
  const lastUTC = lastSent.toISOString().split('T')[0];

  return nowUTC !== lastUTC;
}

// =============================================================================
// LINKEDIN SERVICE
// =============================================================================

class LinkedInService {
  /**
   * Get active LinkedIn integration for workspace
   * Uses IntegrationCredential model with 'linkedin' type
   */
  async getActiveLinkedInAccount(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<LinkedInAccount | null> {
    try {
      const credential = await IntegrationCredential.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        type: 'linkedin',
        isValid: true,
      }).select('+encryptedData');

      if (!credential) {
        return null;
      }

      const data = credential.getCredentialData();

      return {
        workspaceId: workspaceId.toString(),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expiry_date ? new Date(data.expiry_date) : undefined,
        status: credential.isValid ? 'active' : 'disconnected',
        sentToday: data.sentToday || 0,
        lastSentAt: data.lastSentAt ? new Date(data.lastSentAt) : undefined,
      };
    } catch (error: any) {
      console.error('Failed to get LinkedIn account:', error.message);
      return null;
    }
  }

  /**
   * Check if LinkedIn is connected for a workspace
   */
  async isLinkedInConnected(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<boolean> {
    const account = await this.getActiveLinkedInAccount(workspaceId);
    return account !== null && account.status === 'active';
  }

  /**
   * Check if daily rate limit allows sending
   * Returns current usage and limit info
   * Uses atomic operations on schema-level fields (not encrypted data)
   */
  async checkDailyLimit(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<{ allowed: boolean; usageToday: number; limit: number }> {
    const credential = await IntegrationCredential.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      type: 'linkedin',
      isValid: true,
    });

    if (!credential) {
      return { allowed: false, usageToday: 0, limit: LINKEDIN_DAILY_LIMIT };
    }

    // Check if we need to reset (new day in UTC)
    let usageToday = credential.linkedinSentToday || 0;
    if (shouldResetDailyCounter(credential.linkedinLastSentDate)) {
      // Reset counter atomically for new day
      await IntegrationCredential.findByIdAndUpdate(credential._id, {
        $set: { linkedinSentToday: 0, linkedinLastSentDate: new Date() },
      });
      usageToday = 0;
    }

    return {
      allowed: usageToday < LINKEDIN_DAILY_LIMIT,
      usageToday,
      limit: LINKEDIN_DAILY_LIMIT,
    };
  }

  /**
   * Check if access token is expired and refresh if needed
   * Returns the valid access token or throws if refresh fails
   */
  async ensureValidToken(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<string> {
    const credential = await IntegrationCredential.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      type: 'linkedin',
      isValid: true,
    }).select('+encryptedData');

    if (!credential) {
      throw new Error('LinkedIn integration not connected. Please connect LinkedIn in Settings > Integrations.');
    }

    const data = credential.getCredentialData();

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const tokenExpiry = data.expiry_date ? new Date(data.expiry_date) : null;

    if (tokenExpiry && tokenExpiry.getTime() - expiryBuffer > now.getTime()) {
      // Token is still valid
      return data.access_token;
    }

    // Token is expired or about to expire, refresh it
    if (!data.refresh_token) {
      // Mark credential as invalid
      credential.isValid = false;
      credential.validationError = 'Token expired and no refresh token available';
      await credential.save();
      throw new Error('LinkedIn authorization expired. Please reconnect LinkedIn.');
    }

    const refreshResult = await this.refreshToken(data.refresh_token);

    if (!refreshResult.success) {
      // Mark credential as invalid if refresh fails
      credential.isValid = false;
      credential.validationError = refreshResult.error || 'Token refresh failed';
      await credential.save();
      throw new Error('LinkedIn authorization expired. Please reconnect LinkedIn.');
    }

    // Update credential with new tokens
    const newData = {
      ...data,
      access_token: refreshResult.accessToken!,
      expiry_date: Date.now() + refreshResult.expiresIn! * 1000,
    };
    credential.setCredentialData(newData);
    await credential.save();

    return refreshResult.accessToken!;
  }

  /**
   * Refresh LinkedIn OAuth access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    // Validate environment configuration
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn OAuth not configured');
      return {
        success: false,
        error: 'LinkedIn OAuth not configured. Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET environment variables.',
      };
    }

    try {
      const response = await axios.post(
        LINKEDIN_TOKEN_ENDPOINT,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('LinkedIn token refresh failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || error.message,
      };
    }
  }

  /**
   * Send LinkedIn connection request with retry logic for rate limits
   *
   * Note: LinkedIn's actual API for sending invitations requires specific partner
   * access or use of the Marketing API. This implementation assumes such access
   * is available. In practice, you may need to use:
   * - LinkedIn Marketing API with approved app
   * - Phantombuster or similar automation tool
   * - Browser automation (with careful ToS consideration)
   */
  async sendInvitation(
    accessToken: string,
    profileUrl: string,
    note?: string
  ): Promise<LinkedInSendResult> {
    // Validate profile URL
    if (!isValidLinkedInUrl(profileUrl)) {
      return {
        success: false,
        error: `Invalid LinkedIn profile URL: ${profileUrl}`,
      };
    }

    const profileId = extractProfileId(profileUrl);
    if (!profileId) {
      return {
        success: false,
        error: 'Could not extract profile ID from URL',
      };
    }

    // Truncate note if too long
    const truncatedNote = note ? truncateNote(note) : undefined;

    let lastError: Error | null = null;
    let delayMs = LINKEDIN_RETRY_CONFIG.initialDelayMs;

    for (let attempt = 1; attempt <= LINKEDIN_RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // LinkedIn API v2 invitation endpoint
        // Note: This requires appropriate API access/permissions
        const response = await axios.post(
          `${LINKEDIN_API_BASE}/invitations`,
          {
            invitee: {
              'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                profileId: `urn:li:fsd_profile:${profileId}`,
              },
            },
            ...(truncatedNote && {
              message: {
                'com.linkedin.voyager.growth.invitation.FormattedInvitation': {
                  body: truncatedNote,
                },
              },
            }),
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': '202401',
            },
          }
        );

        return {
          success: true,
          invitationId: response.data.id || response.data.value?.id,
          retryAttempts: attempt - 1,
        };
      } catch (error: any) {
        const axiosError = error as AxiosError;
        lastError = error;

        // Check if it's a 429 (Too Many Requests) - retry with backoff
        if (axiosError.response?.status === 429) {
          if (attempt < LINKEDIN_RETRY_CONFIG.maxRetries) {
            console.log(`LinkedIn API rate limit hit. Retry ${attempt}/${LINKEDIN_RETRY_CONFIG.maxRetries} after ${delayMs}ms`);
            await sleep(delayMs);
            delayMs *= LINKEDIN_RETRY_CONFIG.backoffMultiplier;
            continue;
          }
          // All retries exhausted for rate limit
          return {
            success: false,
            error: 'LinkedIn API rate limit exceeded. Please wait and try again.',
            retryAttempts: attempt,
          };
        }

        // Check if it's an authentication error (401)
        if (axiosError.response?.status === 401) {
          return {
            success: false,
            error: 'LinkedIn authorization expired. Please reconnect LinkedIn.',
            retryAttempts: attempt - 1,
          };
        }

        // Check if it's a forbidden error (403) - likely API access issue
        if (axiosError.response?.status === 403) {
          return {
            success: false,
            error: 'LinkedIn API access denied. Please check your integration permissions.',
            retryAttempts: attempt - 1,
          };
        }

        // Other errors - don't retry
        const errorMessage = (axiosError.response?.data as any)?.message
          || axiosError.message
          || 'Unknown LinkedIn API error';
        return {
          success: false,
          error: errorMessage,
          retryAttempts: attempt - 1,
        };
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      error: lastError?.message || 'Unknown LinkedIn API error',
      retryAttempts: LINKEDIN_RETRY_CONFIG.maxRetries,
    };
  }

  /**
   * Send invitation using workspace's connected LinkedIn account
   * This is the main entry point for sending LinkedIn invitations
   *
   * AC2: Use contact LinkedIn URL
   * AC3: Handle missing LinkedIn URL (skip, don't fail)
   * AC5: Check daily limit
   * AC6: Handle expired credentials
   */
  async sendInvitationWithWorkspaceAccount(
    workspaceId: string | mongoose.Types.ObjectId,
    profileUrl: string | undefined | null,
    note?: string,
    contactName?: string
  ): Promise<LinkedInSendResult> {
    // AC3: Handle missing LinkedIn URL
    if (!profileUrl) {
      const name = contactName || 'Unknown';
      console.log(`Skipping LinkedIn invitation: Contact '${name}' does not have LinkedIn URL`);
      return {
        success: false,
        skipped: true,
        error: `Contact '${name}' does not have LinkedIn URL. Skipping.`,
      };
    }

    // Validate URL format
    if (!isValidLinkedInUrl(profileUrl)) {
      const name = contactName || 'Unknown';
      return {
        success: false,
        error: `Invalid LinkedIn profile URL for contact '${name}'.`,
      };
    }

    // Check if LinkedIn is connected
    const isConnected = await this.isLinkedInConnected(workspaceId);
    if (!isConnected) {
      return {
        success: false,
        error: 'LinkedIn integration not connected. Please connect LinkedIn in Settings > Integrations.',
      };
    }

    // Check daily rate limit (AC4, AC5)
    const rateLimit = await this.checkDailyLimit(workspaceId);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `LinkedIn daily limit reached (${rateLimit.limit} invitations/day). Agent auto-paused. Limit resets tomorrow.`,
      };
    }

    // Ensure token is valid (refresh if needed) (AC6)
    let accessToken: string;
    try {
      accessToken = await this.ensureValidToken(workspaceId);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Send the invitation
    const result = await this.sendInvitation(accessToken, profileUrl, note);

    // Update sent count atomically if successful
    if (result.success) {
      await this.incrementSentCount(workspaceId);
    }

    return result;
  }

  /**
   * Increment the daily sent count for a workspace
   * Uses atomic $inc operation to prevent race conditions (Task 6.4)
   */
  async incrementSentCount(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const now = new Date();
      const todayUTC = now.toISOString().split('T')[0];

      // First, check if we need to reset for a new day
      const credential = await IntegrationCredential.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        type: 'linkedin',
        isValid: true,
      });

      if (!credential) return;

      // Check if last sent was on a different day (UTC)
      const lastSentUTC = credential.linkedinLastSentDate
        ? credential.linkedinLastSentDate.toISOString().split('T')[0]
        : null;

      if (lastSentUTC !== todayUTC) {
        // New day - reset counter and set to 1 atomically
        await IntegrationCredential.findByIdAndUpdate(credential._id, {
          $set: {
            linkedinSentToday: 1,
            linkedinLastSentDate: now,
          },
        });
      } else {
        // Same day - use atomic $inc
        await IntegrationCredential.findByIdAndUpdate(credential._id, {
          $inc: { linkedinSentToday: 1 },
          $set: { linkedinLastSentDate: now },
        });
      }
    } catch (error: any) {
      console.error('Failed to increment LinkedIn sent count:', error.message);
    }
  }
}

export default new LinkedInService();
