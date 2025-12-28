/**
 * Encryption Utilities
 *
 * Provides AES-256-GCM encryption for securing workflow credentials.
 * Each workspace has its own derived encryption key for added security.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from workspace ID and secret
 */
function deriveKey(workspaceId: string): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';

    if (secret === 'default-secret-change-in-production' && process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_SECRET environment variable must be set in production');
    }

    // Use scrypt for key derivation (more secure than simple hashing)
    return crypto.scryptSync(`${workspaceId}:${secret}`, 'salt', KEY_LENGTH);
}

/**
 * Encrypt data (credentials, API keys, etc.)
 *
 * @param data - Data to encrypt (will be JSON stringified)
 * @param workspaceId - Workspace ID for key derivation
 * @returns Encrypted string containing: encrypted data + IV + auth tag (JSON formatted)
 */
export function encryptCredentials(data: any, workspaceId: string): string {
    try {
        const key = deriveKey(workspaceId);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the data
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get authentication tag
        const authTag = cipher.getAuthTag();

        // Return as JSON string containing all components
        return JSON.stringify({
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
        });
    } catch (error: any) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt data
 *
 * @param encryptedData - Encrypted string from encryptCredentials
 * @param workspaceId - Workspace ID for key derivation
 * @returns Decrypted data (parsed from JSON)
 */
export function decryptCredentials(encryptedData: string, workspaceId: string): any {
    try {
        const { encrypted, iv, authTag } = JSON.parse(encryptedData);
        const key = deriveKey(workspaceId);

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(iv, 'hex')
        );

        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        // Decrypt the data
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error: any) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Check if data is encrypted
 *
 * @param data - String to check
 * @returns True if data appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
    try {
        const parsed = JSON.parse(data);
        return parsed.encrypted && parsed.iv && parsed.authTag;
    } catch {
        return false;
    }
}

/**
 * Encrypt credentials in workflow step config
 * Used before saving workflow to database
 *
 * @param config - Step config object
 * @param credentialFields - Array of field paths to encrypt (e.g., ['credentials.apiKey'])
 * @param workspaceId - Workspace ID
 * @returns Config with encrypted credential fields
 */
export function encryptStepCredentials(
    config: any,
    credentialFields: string[],
    workspaceId: string
): any {
    const configCopy = JSON.parse(JSON.stringify(config));

    for (const fieldPath of credentialFields) {
        const value = getNestedValue(configCopy, fieldPath);
        if (value && !isEncrypted(value)) {
            setNestedValue(configCopy, fieldPath, encryptCredentials(value, workspaceId));
        }
    }

    return configCopy;
}

/**
 * Decrypt credentials in workflow step config
 * Used during workflow execution
 *
 * @param config - Step config object
 * @param credentialFields - Array of field paths to decrypt
 * @param workspaceId - Workspace ID
 * @returns Config with decrypted credential fields
 */
export function decryptStepCredentials(
    config: any,
    credentialFields: string[],
    workspaceId: string
): any {
    const configCopy = JSON.parse(JSON.stringify(config));

    for (const fieldPath of credentialFields) {
        const value = getNestedValue(configCopy, fieldPath);
        if (value && isEncrypted(value)) {
            setNestedValue(configCopy, fieldPath, decryptCredentials(value, workspaceId));
        }
    }

    return configCopy;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}
