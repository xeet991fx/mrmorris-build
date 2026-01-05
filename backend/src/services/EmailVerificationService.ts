/**
 * Email Verification Service
 *
 * Verifies email addresses using ZeroBounce or Hunter.io APIs
 * Helps improve deliverability by filtering out invalid/risky emails
 */

import axios from 'axios';

export type VerificationStatus =
    | 'valid'
    | 'invalid'
    | 'catch-all'
    | 'unknown'
    | 'spamtrap'
    | 'abuse'
    | 'do_not_mail';

export type VerificationProvider = 'zerobounce' | 'hunter' | 'none';

export interface VerificationResult {
    email: string;
    status: VerificationStatus;
    subStatus?: string;
    score?: number; // 0-100 (100 = best)
    provider: VerificationProvider;
    freeEmail: boolean;
    disposable: boolean;
    role: boolean; // Role-based email (info@, admin@, etc.)
    didYouMean?: string; // Suggested correction
    mxFound: boolean;
    mxRecord?: string;
    smtpProvider?: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    country?: string;
    region?: string;
    city?: string;
    zipcode?: string;
    processedAt: Date;
}

export class EmailVerificationService {
    private provider: VerificationProvider;
    private apiKey: string;

    constructor() {
        this.provider = (process.env.EMAIL_VERIFICATION_PROVIDER as VerificationProvider) || 'none';
        this.apiKey = process.env.EMAIL_VERIFICATION_API_KEY || '';
    }

    /**
     * Verify a single email address
     */
    async verifyEmail(email: string): Promise<VerificationResult | null> {
        if (this.provider === 'none' || !this.apiKey) {
            console.warn('Email verification not configured');
            return null;
        }

        try {
            if (this.provider === 'zerobounce') {
                return await this.verifyWithZeroBounce(email);
            } else if (this.provider === 'hunter') {
                return await this.verifyWithHunter(email);
            }

            return null;
        } catch (error: any) {
            console.error('Email verification error:', error.message);
            return null;
        }
    }

    /**
     * Verify multiple email addresses in bulk
     */
    async verifyBulk(emails: string[]): Promise<VerificationResult[]> {
        const results = await Promise.all(
            emails.map(async (email) => {
                try {
                    const result = await this.verifyEmail(email);
                    return result;
                } catch (error) {
                    console.error(`Failed to verify ${email}:`, error);
                    return null;
                }
            })
        );

        return results.filter((r): r is VerificationResult => r !== null);
    }

    /**
     * Verify email using ZeroBounce API
     * https://www.zerobounce.net/docs/email-validation-api-quickstart/
     */
    private async verifyWithZeroBounce(email: string): Promise<VerificationResult> {
        const response = await axios.get(
            'https://api.zerobounce.net/v2/validate',
            {
                params: {
                    api_key: this.apiKey,
                    email: email,
                    ip_address: '', // Optional
                },
                timeout: 10000,
            }
        );

        const data = response.data;

        // Map ZeroBounce status to our standard statuses
        let status: VerificationStatus = 'unknown';
        const zbStatus = data.status.toLowerCase();

        if (zbStatus === 'valid') status = 'valid';
        else if (zbStatus === 'invalid') status = 'invalid';
        else if (zbStatus === 'catch-all') status = 'catch-all';
        else if (zbStatus === 'spamtrap') status = 'spamtrap';
        else if (zbStatus === 'abuse') status = 'abuse';
        else if (zbStatus === 'do_not_mail') status = 'do_not_mail';
        else status = 'unknown';

        // Calculate score (ZeroBounce doesn't provide a score, so we derive one)
        let score = 0;
        if (status === 'valid') score = 100;
        else if (status === 'catch-all') score = 70;
        else if (status === 'unknown') score = 50;
        else if (status === 'invalid') score = 0;
        else if (status === 'spamtrap' || status === 'abuse' || status === 'do_not_mail') score = 0;

        return {
            email: data.address,
            status,
            subStatus: data.sub_status,
            score,
            provider: 'zerobounce',
            freeEmail: data.free_email || false,
            disposable: data.did_you_mean ? true : false,
            role: data.is_role_account || false,
            didYouMean: data.did_you_mean,
            mxFound: data.mx_found !== 'false',
            mxRecord: data.mx_record,
            smtpProvider: data.smtp_provider,
            firstName: data.firstname,
            lastName: data.lastname,
            gender: data.gender,
            country: data.country,
            region: data.region,
            city: data.city,
            zipcode: data.zipcode,
            processedAt: new Date(data.processed_at),
        };
    }

    /**
     * Verify email using Hunter.io API
     * https://hunter.io/api/v2/docs#email-verifier
     */
    private async verifyWithHunter(email: string): Promise<VerificationResult> {
        const response = await axios.get(
            'https://api.hunter.io/v2/email-verifier',
            {
                params: {
                    email: email,
                    api_key: this.apiKey,
                },
                timeout: 10000,
            }
        );

        const data = response.data.data;

        // Map Hunter status to our standard statuses
        let status: VerificationStatus = 'unknown';
        const hunterStatus = data.status.toLowerCase();

        if (hunterStatus === 'valid') status = 'valid';
        else if (hunterStatus === 'invalid') status = 'invalid';
        else if (hunterStatus === 'accept_all') status = 'catch-all';
        else if (hunterStatus === 'webmail') status = 'valid'; // Webmail is generally valid
        else if (hunterStatus === 'disposable') status = 'invalid';
        else status = 'unknown';

        return {
            email: data.email,
            status,
            score: data.score, // Hunter provides 0-100 score
            provider: 'hunter',
            freeEmail: data.webmail || false,
            disposable: data.disposable || false,
            role: data.role || false,
            mxFound: data.mx_records || false,
            smtpProvider: data.smtp_provider,
            firstName: data.first_name,
            lastName: data.last_name,
            processedAt: new Date(),
        };
    }

    /**
     * Check if an email should be skipped based on verification result
     */
    shouldSkipEmail(result: VerificationResult): boolean {
        // Skip if invalid, spamtrap, abuse, or do_not_mail
        if (
            result.status === 'invalid' ||
            result.status === 'spamtrap' ||
            result.status === 'abuse' ||
            result.status === 'do_not_mail'
        ) {
            return true;
        }

        // Skip if disposable
        if (result.disposable) {
            return true;
        }

        // Skip if score is too low (below 30)
        if (result.score !== undefined && result.score < 30) {
            return true;
        }

        return false;
    }

    /**
     * Get recommendations based on verification result
     */
    getRecommendations(result: VerificationResult): string[] {
        const recommendations: string[] = [];

        if (result.status === 'catch-all') {
            recommendations.push('This domain accepts all emails (catch-all). Delivery is not guaranteed.');
        }

        if (result.disposable) {
            recommendations.push('This is a disposable email address. Avoid sending marketing emails.');
        }

        if (result.role) {
            recommendations.push(
                'This is a role-based email (info@, admin@, etc.). Engagement may be lower.'
            );
        }

        if (result.freeEmail) {
            recommendations.push('This is a free email provider (Gmail, Yahoo, etc.).');
        }

        if (result.didYouMean) {
            recommendations.push(`Did you mean: ${result.didYouMean}?`);
        }

        if (!result.mxFound) {
            recommendations.push('No MX records found. This domain cannot receive emails.');
        }

        if (result.status === 'unknown') {
            recommendations.push(
                'Could not verify this email. Proceed with caution or try again later.'
            );
        }

        if (result.score !== undefined && result.score < 70) {
            recommendations.push(
                `Low deliverability score (${result.score}/100). Consider verifying manually.`
            );
        }

        return recommendations;
    }

    /**
     * Get account credits/balance (ZeroBounce only)
     */
    async getCredits(): Promise<number | null> {
        if (this.provider !== 'zerobounce' || !this.apiKey) {
            return null;
        }

        try {
            const response = await axios.get(
                'https://api.zerobounce.net/v2/getcredits',
                {
                    params: {
                        api_key: this.apiKey,
                    },
                    timeout: 5000,
                }
            );

            return parseInt(response.data.Credits);
        } catch (error: any) {
            console.error('Failed to get ZeroBounce credits:', error.message);
            return null;
        }
    }

    /**
     * Check if service is configured and available
     */
    isConfigured(): boolean {
        return this.provider !== 'none' && this.apiKey.length > 0;
    }
}

export const emailVerificationService = new EmailVerificationService();
