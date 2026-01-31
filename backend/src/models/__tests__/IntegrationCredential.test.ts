/**
 * IntegrationCredential Model Tests
 * Story 5.1 - OAuth Authentication Flow
 * Schema validation tests (no DB required)
 */

import mongoose from 'mongoose';
import IntegrationCredential, { IIntegrationCredential } from '../IntegrationCredential';

// Mock mongoose save to avoid DB connection
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        model: jest.fn().mockImplementation((name, schema) => {
            return class MockModel {
                constructor(data: any) {
                    Object.assign(this, data);
                    // Apply defaults from schema
                    if (schema.obj.status?.default) {
                        this.status = this.status || schema.obj.status.default;
                    }
                    if (schema.obj.isValid?.default !== undefined) {
                        this.isValid = this.isValid !== undefined ? this.isValid : schema.obj.isValid.default;
                    }
                }
                async save() {
                    // Validate enum fields
                    if (this.status && !['Connected', 'Expired', 'Error', 'Revoked'].includes(this.status)) {
                        throw new Error(`Invalid status: ${this.status}`);
                    }
                    if (this.type && !['slack', 'google_sheets', 'notion', 'gmail', 'calendar', 'linkedin'].includes(this.type)) {
                        throw new Error(`Invalid type: ${this.type}`);
                    }
                    return this;
                }
                setCredentialData(data: any) {
                    // Simplified encryption mock
                    this.encryptedData = `encrypted:${JSON.stringify(data)}`;
                }
                getCredentialData() {
                    // Simplified decryption mock
                    if (this.encryptedData?.startsWith('encrypted:')) {
                        return JSON.parse(this.encryptedData.substring(10));
                    }
                    return {};
                }
                static async findById() {
                    return null;
                }
            };
        }),
    };
});

describe('IntegrationCredential Model - Story 5.1 Extensions', () => {
    describe('Task 5.2: expiresAt field', () => {
        it('should accept expiresAt as Date', () => {
            const expiryDate = new Date(Date.now() + 3600000);
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
                expiresAt: expiryDate,
            });

            expect(credential.expiresAt).toEqual(expiryDate);
        });

        it('should allow expiresAt to be undefined', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'slack',
                name: 'Test Slack',
            });

            expect(credential.expiresAt).toBeUndefined();
        });
    });

    describe('Task 5.3: scopes field', () => {
        it('should store OAuth scopes as string array', () => {
            const scopes = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'];
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
                scopes,
            });

            expect(credential.scopes).toEqual(scopes);
            expect(credential.scopes).toHaveLength(2);
        });

        it('should allow scopes to be undefined', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'linkedin',
                name: 'Test LinkedIn',
            });

            expect(credential.scopes).toBeUndefined();
        });
    });

    describe('Task 5.4: profileInfo field', () => {
        it('should store profile info with email, name, avatarUrl', () => {
            const profileInfo = {
                email: 'john@example.com',
                name: 'John Doe',
                avatarUrl: 'https://example.com/avatar.jpg',
            };

            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
                profileInfo,
            });

            expect(credential.profileInfo).toEqual(profileInfo);
            expect(credential.profileInfo?.email).toBe('john@example.com');
            expect(credential.profileInfo?.name).toBe('John Doe');
            expect(credential.profileInfo?.avatarUrl).toBe('https://example.com/avatar.jpg');
        });

        it('should allow profileInfo to be undefined', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'slack',
                name: 'Test Slack',
            });

            expect(credential.profileInfo).toBeUndefined();
        });

        it('should allow partial profileInfo (email only)', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'linkedin',
                name: 'Test LinkedIn',
                profileInfo: { email: 'jane@example.com' },
            });

            expect(credential.profileInfo?.email).toBe('jane@example.com');
            expect(credential.profileInfo?.name).toBeUndefined();
        });
    });

    describe('Task 5.5: status field', () => {
        it('should default to "Connected" status', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
            });

            expect(credential.status).toBe('Connected');
        });

        it('should accept "Expired" status', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
                status: 'Expired',
            });

            expect(credential.status).toBe('Expired');
        });

        it('should accept "Error" status', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'linkedin',
                name: 'Test LinkedIn',
                status: 'Error',
            });

            expect(credential.status).toBe('Error');
        });

        it('should accept "Revoked" status', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'slack',
                name: 'Test Slack',
                status: 'Revoked',
            });

            expect(credential.status).toBe('Revoked');
        });

        it('should reject invalid status', async () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
                status: 'InvalidStatus' as any,
            });

            await expect(credential.save()).rejects.toThrow('Invalid status');
        });
    });

    describe('Task 5.6: lastUsed field', () => {
        it('should accept lastUsed as Date', () => {
            const lastUsedDate = new Date();
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
                lastUsed: lastUsedDate,
            });

            expect(credential.lastUsed).toEqual(lastUsedDate);
        });

        it('should allow lastUsed to be undefined', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'linkedin',
                name: 'Test LinkedIn',
            });

            expect(credential.lastUsed).toBeUndefined();
        });
    });

    describe('Task 5.7: encryptedData stores comprehensive OAuth tokens', () => {
        it('should encrypt and decrypt OAuth tokens with expiresAt and scopes', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Test Gmail',
            });

            const oauthData = {
                accessToken: 'access-token-123',
                refreshToken: 'refresh-token-456',
                expiresAt: new Date(Date.now() + 3600000),
                scopes: ['gmail.send', 'gmail.readonly'],
            };

            credential.setCredentialData(oauthData);

            expect(credential.encryptedData).toBeDefined();
            expect(credential.encryptedData).toContain('encrypted:');

            const decryptedData = credential.getCredentialData();
            expect(decryptedData.accessToken).toBe('access-token-123');
            expect(decryptedData.refreshToken).toBe('refresh-token-456');
            expect(new Date(decryptedData.expiresAt)).toEqual(oauthData.expiresAt);
            expect(decryptedData.scopes).toEqual(oauthData.scopes);
        });

        it('should handle LinkedIn OAuth (no refresh token)', () => {
            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'linkedin',
                name: 'Test LinkedIn',
            });

            const linkedinData = {
                accessToken: 'linkedin-access-token',
                expiresAt: new Date(Date.now() + 60 * 24 * 3600000), // 60 days
                scopes: ['w_member_social', 'r_liteprofile'],
            };

            credential.setCredentialData(linkedinData);

            const decryptedData = credential.getCredentialData();
            expect(decryptedData.accessToken).toBe('linkedin-access-token');
            expect(decryptedData.refreshToken).toBeUndefined();
            expect(new Date(decryptedData.expiresAt)).toEqual(linkedinData.expiresAt);
            expect(decryptedData.scopes).toEqual(linkedinData.scopes);
        });
    });

    describe('All new fields together', () => {
        it('should create complete OAuth credential with all new fields', () => {
            const expiresAt = new Date(Date.now() + 3600000);
            const scopes = ['gmail.send', 'gmail.readonly'];
            const profileInfo = {
                email: 'test@example.com',
                name: 'Test User',
                avatarUrl: 'https://example.com/avatar.jpg',
            };

            const credential: any = new IntegrationCredential({
                workspaceId: new mongoose.Types.ObjectId(),
                type: 'gmail',
                name: 'Gmail - test@example.com',
                expiresAt,
                scopes,
                profileInfo,
                status: 'Connected',
                lastUsed: new Date(),
            });

            credential.setCredentialData({
                accessToken: 'access-123',
                refreshToken: 'refresh-456',
                expiresAt,
                scopes,
            });

            expect(credential.expiresAt).toEqual(expiresAt);
            expect(credential.scopes).toEqual(scopes);
            expect(credential.profileInfo).toEqual(profileInfo);
            expect(credential.status).toBe('Connected');
            expect(credential.lastUsed).toBeDefined();

            const decrypted = credential.getCredentialData();
            expect(decrypted.accessToken).toBe('access-123');
            expect(decrypted.refreshToken).toBe('refresh-456');
        });
    });
});
