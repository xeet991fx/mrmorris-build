/**
 * GmailService.ts - Story 3.7: Send Email Action via Gmail API
 *
 * Provides Gmail API integration for sending emails through connected Gmail accounts.
 * Handles OAuth token refresh, MIME message building, and rate limit handling.
 *
 * AC1: Send email via Gmail API using connected EmailAccount
 * AC4: Handle Gmail not connected error
 * AC6: Retry with exponential backoff on 429 errors
 */

import axios, { AxiosError } from 'axios';
import EmailAccount, { IEmailAccount } from '../models/EmailAccount';
import mongoose from 'mongoose';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface GmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAttempts?: number;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// Retry configuration for Gmail API rate limits
const GMAIL_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build RFC 2822 MIME message for Gmail API
 * Gmail API requires base64url-encoded MIME messages
 */
export function buildMimeMessage(
  to: string,
  from: string,
  subject: string,
  body: string
): string {
  // Encode subject in base64 for UTF-8 support (RFC 2047)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const mimeMessage = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  // Gmail API requires base64url encoding (not standard base64)
  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// GMAIL SERVICE
// =============================================================================

class GmailService {
  /**
   * Get active Gmail account for workspace
   * Returns null if no active Gmail account is connected
   */
  async getActiveGmailAccount(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<IEmailAccount | null> {
    const account = await EmailAccount.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      provider: 'gmail',
      status: { $in: ['active', 'warming_up'] },
    });

    return account;
  }

  /**
   * Check if Gmail is connected for a workspace
   */
  async isGmailConnected(
    workspaceId: string | mongoose.Types.ObjectId
  ): Promise<boolean> {
    const account = await this.getActiveGmailAccount(workspaceId);
    return account !== null;
  }

  /**
   * Check if access token is expired and refresh if needed
   * Returns the valid access token or throws if refresh fails
   */
  async ensureValidToken(account: IEmailAccount): Promise<string> {
    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes

    if (account.tokenExpiry && account.tokenExpiry.getTime() - expiryBuffer > now.getTime()) {
      // Token is still valid
      return account.accessToken!;
    }

    // Token is expired or about to expire, refresh it
    const refreshResult = await this.refreshToken(account.refreshToken!);

    if (!refreshResult.success) {
      // Mark account as disconnected if refresh fails
      account.status = 'disconnected';
      await account.save();
      throw new Error('Gmail authorization expired. Please reconnect Gmail.');
    }

    // Update account with new tokens
    account.accessToken = refreshResult.accessToken!;
    account.tokenExpiry = new Date(Date.now() + refreshResult.expiresIn! * 1000);
    await account.save();

    return refreshResult.accessToken!;
  }

  /**
   * Refresh Gmail OAuth access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const response = await axios.post(GOOGLE_TOKEN_ENDPOINT, {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('Gmail token refresh failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || error.message,
      };
    }
  }

  /**
   * Send email via Gmail API with retry logic for rate limits
   */
  async sendEmail(
    accessToken: string,
    to: string,
    from: string,
    subject: string,
    body: string
  ): Promise<GmailSendResult> {
    const raw = buildMimeMessage(to, from, subject, body);
    let lastError: Error | null = null;
    let delayMs = GMAIL_RETRY_CONFIG.initialDelayMs;

    for (let attempt = 1; attempt <= GMAIL_RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          GMAIL_SEND_ENDPOINT,
          { raw },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          success: true,
          messageId: response.data.id,
          retryAttempts: attempt - 1,
        };
      } catch (error: any) {
        const axiosError = error as AxiosError;
        lastError = error;

        // Check if it's a 429 (Too Many Requests) - retry with backoff
        if (axiosError.response?.status === 429) {
          if (attempt < GMAIL_RETRY_CONFIG.maxRetries) {
            console.log(`Gmail API rate limit hit. Retry ${attempt}/${GMAIL_RETRY_CONFIG.maxRetries} after ${delayMs}ms`);
            await sleep(delayMs);
            delayMs *= GMAIL_RETRY_CONFIG.backoffMultiplier;
            continue;
          }
          // All retries exhausted for rate limit
          return {
            success: false,
            error: 'Gmail rate limit exceeded. Please wait and try again.',
            retryAttempts: attempt,
          };
        }

        // Check if it's an authentication error (401)
        if (axiosError.response?.status === 401) {
          return {
            success: false,
            error: 'Gmail authorization expired. Please reconnect Gmail.',
            retryAttempts: attempt - 1,
          };
        }

        // Other errors - don't retry
        const responseData = axiosError.response?.data as { error?: { message?: string } } | undefined;
        return {
          success: false,
          error: responseData?.error?.message || error.message,
          retryAttempts: attempt - 1,
        };
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      error: lastError?.message || 'Unknown Gmail API error',
      retryAttempts: GMAIL_RETRY_CONFIG.maxRetries,
    };
  }

  /**
   * Send email using workspace's connected Gmail account
   * This is the main entry point for sending emails via Gmail
   */
  async sendEmailWithWorkspaceAccount(
    workspaceId: string | mongoose.Types.ObjectId,
    to: string,
    subject: string,
    body: string
  ): Promise<GmailSendResult> {
    // Validate email address format
    if (!isValidEmail(to)) {
      return {
        success: false,
        error: `Invalid email address: ${to}`,
      };
    }

    // Get active Gmail account
    const account = await this.getActiveGmailAccount(workspaceId);

    if (!account) {
      return {
        success: false,
        error: 'Gmail integration not connected. Please connect Gmail in Settings > Integrations.',
      };
    }

    // Ensure token is valid (refresh if needed)
    let accessToken: string;
    try {
      accessToken = await this.ensureValidToken(account);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Send the email
    const result = await this.sendEmail(
      accessToken,
      to,
      account.email, // from address
      subject,
      body
    );

    // Update sent count atomically if successful (fixes race condition)
    if (result.success) {
      await EmailAccount.findByIdAndUpdate(
        account._id,
        {
          $inc: { sentToday: 1 },
          $set: { lastSentAt: new Date() },
        }
      );
    }

    return result;
  }
}

export default new GmailService();
