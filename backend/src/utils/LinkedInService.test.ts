/**
 * LinkedInService Tests - Story 3.8: LinkedIn Invitation Action
 *
 * Tests for LinkedIn API integration:
 * - AC1: Send invitation with custom note (variable resolution)
 * - AC2: Use contact LinkedIn URL
 * - AC3: Handle missing LinkedIn URL (skip, don't fail)
 * - AC4: Rate limiting (100/day)
 * - AC5: Auto-pause on limit exceeded
 * - AC6: Handle expired credentials
 */

import LinkedInService, {
  isValidLinkedInUrl,
  extractProfileId,
  truncateNote,
} from './LinkedInService';
import axios from 'axios';
import IntegrationCredential from '../models/IntegrationCredential';

// Mock dependencies
jest.mock('axios');
jest.mock('../models/IntegrationCredential', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockIntegrationCredential = IntegrationCredential as jest.Mocked<typeof IntegrationCredential>;

describe('LinkedInService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // isValidLinkedInUrl Tests
  // ==========================================================================

  describe('isValidLinkedInUrl', () => {
    it('should return true for valid LinkedIn URLs', () => {
      expect(isValidLinkedInUrl('https://linkedin.com/in/john-doe')).toBe(true);
      expect(isValidLinkedInUrl('https://www.linkedin.com/in/john-doe')).toBe(true);
      expect(isValidLinkedInUrl('http://linkedin.com/in/jane-smith-123')).toBe(true);
      expect(isValidLinkedInUrl('https://linkedin.com/in/user123/')).toBe(true);
    });

    it('should return false for invalid LinkedIn URLs', () => {
      expect(isValidLinkedInUrl('https://linkedin.com/company/acme')).toBe(false);
      expect(isValidLinkedInUrl('https://twitter.com/johndoe')).toBe(false);
      expect(isValidLinkedInUrl('linkedin.com/in/johndoe')).toBe(false);
      expect(isValidLinkedInUrl('')).toBe(false);
      expect(isValidLinkedInUrl('not a url')).toBe(false);
    });
  });

  // ==========================================================================
  // extractProfileId Tests
  // ==========================================================================

  describe('extractProfileId', () => {
    it('should extract profile ID from valid URLs', () => {
      expect(extractProfileId('https://linkedin.com/in/john-doe')).toBe('john-doe');
      expect(extractProfileId('https://www.linkedin.com/in/jane-smith-123')).toBe('jane-smith-123');
      expect(extractProfileId('https://linkedin.com/in/user123/')).toBe('user123');
    });

    it('should return null for invalid URLs', () => {
      expect(extractProfileId('https://linkedin.com/company/acme')).toBeNull();
      expect(extractProfileId('invalid')).toBeNull();
      expect(extractProfileId('')).toBeNull();
    });
  });

  // ==========================================================================
  // truncateNote Tests
  // ==========================================================================

  describe('truncateNote', () => {
    it('should return note unchanged if under 300 chars', () => {
      const shortNote = 'Hello, I would like to connect!';
      expect(truncateNote(shortNote)).toBe(shortNote);
    });

    it('should truncate note to 300 chars with ellipsis', () => {
      const longNote = 'A'.repeat(400);
      const result = truncateNote(longNote);
      expect(result.length).toBe(300);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle exactly 300 chars', () => {
      const exactNote = 'A'.repeat(300);
      expect(truncateNote(exactNote)).toBe(exactNote);
    });
  });

  // ==========================================================================
  // getActiveLinkedInAccount Tests (AC6)
  // ==========================================================================

  describe('getActiveLinkedInAccount', () => {
    it('should return LinkedIn account when connected', async () => {
      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'token_123',
          refresh_token: 'refresh_123',
          expiry_date: Date.now() + 3600000,
          sentToday: 5,
        }),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      const result = await LinkedInService.getActiveLinkedInAccount(workspaceId);

      expect(result).toBeTruthy();
      expect(result?.accessToken).toBe('token_123');
      expect(result?.sentToday).toBe(5);
    });

    it('should return null when no LinkedIn account connected', async () => {
      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await LinkedInService.getActiveLinkedInAccount(workspaceId);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // isLinkedInConnected Tests
  // ==========================================================================

  describe('isLinkedInConnected', () => {
    it('should return true when LinkedIn is connected', async () => {
      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'token_123',
        }),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      const result = await LinkedInService.isLinkedInConnected(workspaceId);

      expect(result).toBe(true);
    });

    it('should return false when LinkedIn is not connected', async () => {
      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await LinkedInService.isLinkedInConnected(workspaceId);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // checkDailyLimit Tests (AC4, AC5)
  // ==========================================================================

  describe('checkDailyLimit', () => {
    it('should allow when under limit', async () => {
      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'token_123',
          sentToday: 50,
          lastSentAt: new Date().toISOString(),
        }),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      const result = await LinkedInService.checkDailyLimit(workspaceId);

      expect(result.allowed).toBe(true);
      expect(result.usageToday).toBe(50);
      expect(result.limit).toBe(100);
    });

    it('should not allow when at limit', async () => {
      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'token_123',
          sentToday: 100,
          lastSentAt: new Date().toISOString(),
        }),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      const result = await LinkedInService.checkDailyLimit(workspaceId);

      expect(result.allowed).toBe(false);
      expect(result.usageToday).toBe(100);
    });

    it('should reset counter for new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'token_123',
          sentToday: 100, // Was at limit yesterday
          lastSentAt: yesterday.toISOString(),
        }),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      const result = await LinkedInService.checkDailyLimit(workspaceId);

      expect(result.allowed).toBe(true);
      expect(result.usageToday).toBe(0); // Reset for new day
    });
  });

  // ==========================================================================
  // sendInvitation Tests (AC1, AC6)
  // ==========================================================================

  describe('sendInvitation', () => {
    it('should send invitation successfully via LinkedIn API', async () => {
      mockAxios.post.mockResolvedValue({
        data: { id: 'invitation_123' },
      });

      const result = await LinkedInService.sendInvitation(
        'access_token_123',
        'https://linkedin.com/in/john-doe',
        'Hello, let\'s connect!'
      );

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe('invitation_123');
      expect(result.retryAttempts).toBe(0);
    });

    it('should return error for invalid profile URL', async () => {
      const result = await LinkedInService.sendInvitation(
        'token',
        'invalid-url',
        'Note'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid LinkedIn profile URL');
    });

    it('should retry on 429 rate limit error with exponential backoff', async () => {
      // First call fails with 429, second succeeds
      mockAxios.post
        .mockRejectedValueOnce({
          response: { status: 429 },
          isAxiosError: true,
        })
        .mockResolvedValueOnce({
          data: { id: 'invitation_success' },
        });

      const result = await LinkedInService.sendInvitation(
        'token',
        'https://linkedin.com/in/john-doe',
        'Note'
      );

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe('invitation_success');
      expect(result.retryAttempts).toBe(1);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should return error after all retries exhausted on 429', async () => {
      mockAxios.post.mockRejectedValue({
        response: { status: 429 },
        isAxiosError: true,
      });

      const result = await LinkedInService.sendInvitation(
        'token',
        'https://linkedin.com/in/john-doe',
        'Note'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit exceeded');
      expect(result.retryAttempts).toBe(3);
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should return error on 401 authentication failure (AC6)', async () => {
      mockAxios.post.mockRejectedValue({
        response: { status: 401 },
        isAxiosError: true,
      });

      const result = await LinkedInService.sendInvitation(
        'expired_token',
        'https://linkedin.com/in/john-doe',
        'Note'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('authorization expired');
      // Should not retry on auth errors
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should return error on 403 forbidden (API access)', async () => {
      mockAxios.post.mockRejectedValue({
        response: { status: 403 },
        isAxiosError: true,
      });

      const result = await LinkedInService.sendInvitation(
        'token',
        'https://linkedin.com/in/john-doe',
        'Note'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('access denied');
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // sendInvitationWithWorkspaceAccount Tests (AC1, AC2, AC3)
  // ==========================================================================

  describe('sendInvitationWithWorkspaceAccount', () => {
    it('should return skipped result for missing LinkedIn URL (AC3)', async () => {
      const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
        workspaceId,
        null,
        'Note',
        'John Doe'
      );

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.error).toContain('does not have LinkedIn URL');
      expect(result.error).toContain('John Doe');
    });

    it('should return skipped result for undefined LinkedIn URL (AC3)', async () => {
      const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
        workspaceId,
        undefined,
        'Note',
        'Jane Smith'
      );

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.error).toContain('Jane Smith');
    });

    it('should return error for invalid LinkedIn URL', async () => {
      const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
        workspaceId,
        'not-a-linkedin-url',
        'Note',
        'John'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid LinkedIn profile URL');
    });

    it('should return error when LinkedIn not connected', async () => {
      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
        workspaceId,
        'https://linkedin.com/in/john-doe',
        'Note'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('LinkedIn integration not connected');
    });

    it('should return error when rate limit exceeded (AC4, AC5)', async () => {
      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'token_123',
          sentToday: 100, // At limit
          lastSentAt: new Date().toISOString(),
        }),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
        workspaceId,
        'https://linkedin.com/in/john-doe',
        'Note'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('daily limit reached');
    });

    it('should send invitation using workspace LinkedIn account (AC1, AC2)', async () => {
      const mockCredential = {
        workspaceId,
        type: 'linkedin',
        isValid: true,
        getCredentialData: jest.fn().mockReturnValue({
          access_token: 'valid_token',
          refresh_token: 'refresh_token',
          expiry_date: Date.now() + 3600000,
          sentToday: 5,
          lastSentAt: new Date().toISOString(),
        }),
        setCredentialData: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
      };

      (mockIntegrationCredential.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockCredential),
      });

      mockAxios.post.mockResolvedValue({
        data: { id: 'invitation_789' },
      });

      const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
        workspaceId,
        'https://linkedin.com/in/jane-doe',
        'Hi Jane, let\'s connect!',
        'Jane Doe'
      );

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe('invitation_789');
    });
  });

  // ==========================================================================
  // refreshToken Tests (AC6)
  // ==========================================================================

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
      });

      const result = await LinkedInService.refreshToken('refresh_token_123');

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

      const result = await LinkedInService.refreshToken('invalid_refresh_token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });
  });
});
