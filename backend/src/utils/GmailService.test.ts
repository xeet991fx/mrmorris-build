/**
 * GmailService Tests - Story 3.7: Send Email Action
 *
 * Tests for Gmail API integration:
 * - AC1: Send email via Gmail API
 * - AC4: Gmail not connected error handling
 * - AC6: Retry with exponential backoff on 429 errors
 */

import GmailService, { buildMimeMessage } from './GmailService';
import axios from 'axios';
import EmailAccount from '../models/EmailAccount';

// Mock dependencies
jest.mock('axios');
jest.mock('../models/EmailAccount');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockEmailAccount = EmailAccount as jest.Mocked<typeof EmailAccount>;

describe('GmailService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // buildMimeMessage Tests
  // ==========================================================================

  describe('buildMimeMessage', () => {
    it('should build valid base64url-encoded MIME message', () => {
      const result = buildMimeMessage(
        'test@example.com',
        'sender@example.com',
        'Hello World',
        '<p>Test body</p>'
      );

      // Result should be base64url encoded (no +, /, or trailing =)
      expect(result).not.toMatch(/[+/=]/);

      // Decode and verify structure
      const decoded = Buffer.from(result, 'base64').toString('utf8');
      expect(decoded).toContain('MIME-Version: 1.0');
      expect(decoded).toContain('To: test@example.com');
      expect(decoded).toContain('From: sender@example.com');
      expect(decoded).toContain('Content-Type: text/html');
      expect(decoded).toContain('<p>Test body</p>');
    });

    it('should encode subject with UTF-8 for special characters', () => {
      const result = buildMimeMessage(
        'test@example.com',
        'sender@example.com',
        'Hello 日本語',
        'Body'
      );

      const decoded = Buffer.from(result, 'base64').toString('utf8');
      // Subject should be RFC 2047 encoded
      expect(decoded).toContain('Subject: =?UTF-8?B?');
    });
  });

  // ==========================================================================
  // getActiveGmailAccount Tests (AC4)
  // ==========================================================================

  describe('getActiveGmailAccount', () => {
    it('should return Gmail account when connected', async () => {
      const mockAccount = {
        _id: 'account_123',
        email: 'test@gmail.com',
        provider: 'gmail',
        status: 'active',
        accessToken: 'token_123',
        refreshToken: 'refresh_123',
      };

      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue(mockAccount);

      const result = await GmailService.getActiveGmailAccount(workspaceId);

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@gmail.com');
      expect(mockEmailAccount.findOne).toHaveBeenCalledWith({
        workspaceId: expect.any(Object),
        provider: 'gmail',
        status: { $in: ['active', 'warming_up'] },
      });
    });

    it('should return null when no Gmail account connected', async () => {
      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue(null);

      const result = await GmailService.getActiveGmailAccount(workspaceId);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // isGmailConnected Tests (AC4)
  // ==========================================================================

  describe('isGmailConnected', () => {
    it('should return true when Gmail is connected', async () => {
      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue({ _id: 'acc_123' });

      const result = await GmailService.isGmailConnected(workspaceId);

      expect(result).toBe(true);
    });

    it('should return false when Gmail is not connected', async () => {
      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue(null);

      const result = await GmailService.isGmailConnected(workspaceId);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // sendEmail Tests (AC1, AC6)
  // ==========================================================================

  describe('sendEmail', () => {
    it('should send email successfully via Gmail API', async () => {
      mockAxios.post.mockResolvedValue({
        data: { id: 'msg_123456' },
      });

      const result = await GmailService.sendEmail(
        'access_token_123',
        'recipient@example.com',
        'sender@example.com',
        'Test Subject',
        '<p>Test Body</p>'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123456');
      expect(result.retryAttempts).toBe(0);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({ raw: expect.any(String) }),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer access_token_123',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should retry on 429 rate limit error with exponential backoff (AC6)', async () => {
      // First call fails with 429, second succeeds
      mockAxios.post
        .mockRejectedValueOnce({
          response: { status: 429 },
          isAxiosError: true,
        })
        .mockResolvedValueOnce({
          data: { id: 'msg_success' },
        });

      const result = await GmailService.sendEmail(
        'token',
        'to@test.com',
        'from@test.com',
        'Subject',
        'Body'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_success');
      expect(result.retryAttempts).toBe(1);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should return error after all retries exhausted on 429 (AC6)', async () => {
      // All calls fail with 429
      mockAxios.post.mockRejectedValue({
        response: { status: 429 },
        isAxiosError: true,
      });

      const result = await GmailService.sendEmail(
        'token',
        'to@test.com',
        'from@test.com',
        'Subject',
        'Body'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit exceeded');
      expect(result.retryAttempts).toBe(3);
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should return error on 401 authentication failure', async () => {
      mockAxios.post.mockRejectedValue({
        response: { status: 401 },
        isAxiosError: true,
      });

      const result = await GmailService.sendEmail(
        'expired_token',
        'to@test.com',
        'from@test.com',
        'Subject',
        'Body'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('authorization expired');
      // Should not retry on auth errors
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // sendEmailWithWorkspaceAccount Tests (AC1, AC4)
  // ==========================================================================

  describe('sendEmailWithWorkspaceAccount', () => {
    it('should return error when Gmail not connected (AC4)', async () => {
      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue(null);

      const result = await GmailService.sendEmailWithWorkspaceAccount(
        workspaceId,
        'recipient@example.com',
        'Test Subject',
        'Test Body'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gmail integration not connected');
    });

    it('should send email using workspace Gmail account (AC1)', async () => {
      const mockAccount = {
        _id: 'account_123',
        email: 'sender@gmail.com',
        provider: 'gmail',
        status: 'active',
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        sentToday: 5,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue(mockAccount);
      mockAxios.post.mockResolvedValue({
        data: { id: 'msg_789' },
      });

      const result = await GmailService.sendEmailWithWorkspaceAccount(
        workspaceId,
        'recipient@example.com',
        'Hello',
        '<p>Body</p>'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_789');
      // Verify sent count was incremented
      expect(mockAccount.sentToday).toBe(6);
      expect(mockAccount.save).toHaveBeenCalled();
    });

    it('should refresh token when expired before sending', async () => {
      const mockAccount = {
        _id: 'account_123',
        email: 'sender@gmail.com',
        provider: 'gmail',
        status: 'active',
        accessToken: 'old_token',
        refreshToken: 'refresh_token',
        tokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        sentToday: 0,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (mockEmailAccount.findOne as jest.Mock).mockResolvedValue(mockAccount);

      // Token refresh call
      mockAxios.post.mockImplementation((url: string) => {
        if (url.includes('oauth2')) {
          return Promise.resolve({
            data: {
              access_token: 'new_token',
              expires_in: 3600,
            },
          });
        }
        // Gmail send call
        return Promise.resolve({
          data: { id: 'msg_new' },
        });
      });

      const result = await GmailService.sendEmailWithWorkspaceAccount(
        workspaceId,
        'to@test.com',
        'Subject',
        'Body'
      );

      expect(result.success).toBe(true);
      expect(mockAccount.accessToken).toBe('new_token');
      expect(mockAccount.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // refreshToken Tests
  // ==========================================================================

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
      });

      const result = await GmailService.refreshToken('refresh_token_123');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new_access_token');
      expect(result.expiresIn).toBe(3600);
    });

    it('should return error on refresh failure', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          data: { error_description: 'Invalid refresh token' },
        },
      });

      const result = await GmailService.refreshToken('invalid_refresh_token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });
  });
});
