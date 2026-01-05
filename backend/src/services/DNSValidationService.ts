/**
 * DNS Validation Service
 *
 * Validates SPF, DKIM, and DMARC DNS records for email authentication
 * Ensures proper email authentication setup for better deliverability
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

export interface SPFResult {
    valid: boolean;
    record?: string;
    issues: string[];
    mechanisms: string[];
    hasAll: boolean;
    allQualifier?: string; // ~all, -all, +all, ?all
}

export interface DKIMResult {
    valid: boolean;
    record?: string;
    selector?: string;
    issues: string[];
    publicKey?: string;
}

export interface DMARCResult {
    valid: boolean;
    record?: string;
    policy?: 'none' | 'quarantine' | 'reject';
    subdomainPolicy?: 'none' | 'quarantine' | 'reject';
    percentage?: number;
    reportingEmails?: string[];
    issues: string[];
}

export interface DNSValidationResult {
    domain: string;
    spf: SPFResult;
    dkim: DKIMResult;
    dmarc: DMARCResult;
    mxRecords: string[];
    overall: {
        passed: boolean;
        score: number; // 0-100
        criticalIssues: string[];
        warnings: string[];
    };
    checkedAt: Date;
}

export class DNSValidationService {
    /**
     * Validate all DNS records for a domain
     */
    async validateDomain(
        domain: string,
        dkimSelector?: string
    ): Promise<DNSValidationResult> {
        const [spf, dkim, dmarc, mxRecords] = await Promise.all([
            this.validateSPF(domain),
            this.validateDKIM(domain, dkimSelector),
            this.validateDMARC(domain),
            this.getMXRecords(domain),
        ]);

        // Calculate overall score and issues
        const overall = this.calculateOverallScore(spf, dkim, dmarc, mxRecords);

        return {
            domain,
            spf,
            dkim,
            dmarc,
            mxRecords,
            overall,
            checkedAt: new Date(),
        };
    }

    /**
     * Validate SPF record
     */
    async validateSPF(domain: string): Promise<SPFResult> {
        const result: SPFResult = {
            valid: false,
            issues: [],
            mechanisms: [],
            hasAll: false,
        };

        try {
            const records = await resolveTxt(domain);
            const spfRecords = records.filter((r) =>
                r.join('').startsWith('v=spf1')
            );

            if (spfRecords.length === 0) {
                result.issues.push('No SPF record found');
                return result;
            }

            if (spfRecords.length > 1) {
                result.issues.push('Multiple SPF records found (only one allowed)');
                return result;
            }

            const spfRecord = spfRecords[0].join('');
            result.record = spfRecord;

            // Parse SPF record
            const parts = spfRecord.split(' ');
            result.mechanisms = parts.slice(1); // Skip 'v=spf1'

            // Check for 'all' mechanism
            const allMechanism = parts.find((p) =>
                /^[~\-+?]?all$/.test(p)
            );

            if (allMechanism) {
                result.hasAll = true;
                result.allQualifier = allMechanism;

                // Check qualifier
                if (allMechanism === '+all') {
                    result.issues.push(
                        'Using "+all" allows anyone to send on your behalf (security risk)'
                    );
                } else if (allMechanism === '?all') {
                    result.issues.push(
                        'Using "?all" (neutral) provides weak protection'
                    );
                }
            } else {
                result.issues.push('Missing "all" mechanism at the end of SPF record');
            }

            // Check for too many DNS lookups (SPF limit is 10)
            const lookupCount = parts.filter((p) =>
                /^(include:|a:|mx:|ptr:|exists:)/.test(p)
            ).length;

            if (lookupCount > 10) {
                result.issues.push(
                    `Too many DNS lookups (${lookupCount}/10 limit). This will cause SPF to fail.`
                );
            } else if (lookupCount > 8) {
                result.issues.push(
                    `High number of DNS lookups (${lookupCount}/10). Consider optimizing.`
                );
            }

            // Check record length (DNS TXT record limit is 255 characters per string)
            if (spfRecord.length > 450) {
                result.issues.push(
                    'SPF record is very long. May cause DNS issues.'
                );
            }

            result.valid = result.issues.length === 0;
        } catch (error: any) {
            if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                result.issues.push('Domain does not exist or has no DNS records');
            } else {
                result.issues.push(`DNS lookup failed: ${error.message}`);
            }
        }

        return result;
    }

    /**
     * Validate DKIM record
     */
    async validateDKIM(
        domain: string,
        selector: string = 'default'
    ): Promise<DKIMResult> {
        const result: DKIMResult = {
            valid: false,
            selector,
            issues: [],
        };

        // Common DKIM selectors to try if not provided
        const selectorsToTry = selector
            ? [selector]
            : ['default', 'google', 'k1', 'dkim', 'mail', 'selector1', 'selector2'];

        for (const sel of selectorsToTry) {
            try {
                const dkimDomain = `${sel}._domainkey.${domain}`;
                const records = await resolveTxt(dkimDomain);

                if (records.length > 0) {
                    const dkimRecord = records[0].join('');
                    result.record = dkimRecord;
                    result.selector = sel;

                    // Parse DKIM record
                    if (!dkimRecord.includes('v=DKIM1')) {
                        result.issues.push('DKIM record missing version tag (v=DKIM1)');
                    }

                    // Extract public key
                    const pMatch = dkimRecord.match(/p=([^;]+)/);
                    if (pMatch) {
                        result.publicKey = pMatch[1];

                        if (result.publicKey.length < 50) {
                            result.issues.push(
                                'DKIM public key is too short. May be invalid.'
                            );
                        }
                    } else {
                        result.issues.push('DKIM record missing public key (p=)');
                    }

                    result.valid = result.issues.length === 0;
                    break; // Found a valid selector, stop searching
                }
            } catch (error: any) {
                // Continue to next selector
                continue;
            }
        }

        if (!result.record) {
            result.issues.push(
                `No DKIM record found. Tried selectors: ${selectorsToTry.join(', ')}`
            );
        }

        return result;
    }

    /**
     * Validate DMARC record
     */
    async validateDMARC(domain: string): Promise<DMARCResult> {
        const result: DMARCResult = {
            valid: false,
            issues: [],
        };

        try {
            const dmarcDomain = `_dmarc.${domain}`;
            const records = await resolveTxt(dmarcDomain);

            if (records.length === 0) {
                result.issues.push('No DMARC record found');
                return result;
            }

            if (records.length > 1) {
                result.issues.push('Multiple DMARC records found (only one allowed)');
                return result;
            }

            const dmarcRecord = records[0].join('');
            result.record = dmarcRecord;

            // Parse DMARC record
            if (!dmarcRecord.startsWith('v=DMARC1')) {
                result.issues.push('DMARC record must start with v=DMARC1');
            }

            // Extract policy
            const pMatch = dmarcRecord.match(/p=(none|quarantine|reject)/);
            if (pMatch) {
                result.policy = pMatch[1] as 'none' | 'quarantine' | 'reject';

                if (result.policy === 'none') {
                    result.issues.push(
                        'DMARC policy is "none" (monitoring only). Consider using "quarantine" or "reject" for better protection.'
                    );
                }
            } else {
                result.issues.push('DMARC record missing policy (p=)');
            }

            // Extract subdomain policy
            const spMatch = dmarcRecord.match(/sp=(none|quarantine|reject)/);
            if (spMatch) {
                result.subdomainPolicy = spMatch[1] as 'none' | 'quarantine' | 'reject';
            }

            // Extract percentage
            const pctMatch = dmarcRecord.match(/pct=(\d+)/);
            if (pctMatch) {
                result.percentage = parseInt(pctMatch[1]);

                if (result.percentage < 100) {
                    result.issues.push(
                        `DMARC policy applies to only ${result.percentage}% of emails. Consider increasing to 100%.`
                    );
                }
            }

            // Extract reporting emails
            const ruaMatch = dmarcRecord.match(/rua=([^;]+)/);
            if (ruaMatch) {
                result.reportingEmails = ruaMatch[1]
                    .split(',')
                    .map((email) => email.trim().replace('mailto:', ''));
            } else {
                result.issues.push(
                    'No aggregate reporting address (rua=) configured. You will not receive DMARC reports.'
                );
            }

            result.valid = result.issues.filter((i) => !i.includes('Consider')).length === 0;
        } catch (error: any) {
            if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                result.issues.push('No DMARC record found');
            } else {
                result.issues.push(`DMARC lookup failed: ${error.message}`);
            }
        }

        return result;
    }

    /**
     * Get MX records for a domain
     */
    async getMXRecords(domain: string): Promise<string[]> {
        try {
            const records = await resolveMx(domain);
            return records
                .sort((a, b) => a.priority - b.priority)
                .map((r) => r.exchange);
        } catch (error: any) {
            console.error(`Failed to get MX records for ${domain}:`, error.message);
            return [];
        }
    }

    /**
     * Calculate overall score and issues
     */
    private calculateOverallScore(
        spf: SPFResult,
        dkim: DKIMResult,
        dmarc: DMARCResult,
        mxRecords: string[]
    ): {
        passed: boolean;
        score: number;
        criticalIssues: string[];
        warnings: string[];
    } {
        let score = 0;
        const criticalIssues: string[] = [];
        const warnings: string[] = [];

        // SPF scoring (30 points)
        if (spf.valid) {
            score += 30;
        } else if (spf.record) {
            score += 15; // Has SPF but with issues
            warnings.push(...spf.issues);
        } else {
            criticalIssues.push('Missing SPF record');
        }

        // DKIM scoring (30 points)
        if (dkim.valid) {
            score += 30;
        } else if (dkim.record) {
            score += 15; // Has DKIM but with issues
            warnings.push(...dkim.issues);
        } else {
            criticalIssues.push('Missing DKIM record');
        }

        // DMARC scoring (30 points)
        if (dmarc.valid) {
            score += 30;
        } else if (dmarc.record) {
            score += 15; // Has DMARC but with issues
            warnings.push(...dmarc.issues);
        } else {
            criticalIssues.push('Missing DMARC record');
        }

        // MX records (10 points)
        if (mxRecords.length > 0) {
            score += 10;
        } else {
            criticalIssues.push('No MX records found');
        }

        const passed = criticalIssues.length === 0 && score >= 70;

        return {
            passed,
            score,
            criticalIssues,
            warnings,
        };
    }

    /**
     * Generate setup instructions based on validation results
     */
    generateSetupInstructions(result: DNSValidationResult): {
        spf: string[];
        dkim: string[];
        dmarc: string[];
    } {
        const instructions = {
            spf: [] as string[],
            dkim: [] as string[],
            dmarc: [] as string[],
        };

        // SPF instructions
        if (!result.spf.record) {
            instructions.spf.push(
                '1. Create a TXT record at your domain root:',
                '   Name: @ (or your domain name)',
                '   Type: TXT',
                '   Value: v=spf1 include:_spf.google.com ~all',
                '',
                '2. Replace "_spf.google.com" with your email provider\'s SPF include',
                '3. Use "~all" for soft fail or "-all" for hard fail'
            );
        } else if (!result.spf.valid) {
            instructions.spf.push(
                'Fix the following SPF issues:',
                ...result.spf.issues.map((i) => `- ${i}`)
            );
        }

        // DKIM instructions
        if (!result.dkim.record) {
            instructions.dkim.push(
                '1. Generate a DKIM key pair (public and private)',
                '2. Add the public key as a TXT record:',
                '   Name: [selector]._domainkey (e.g., default._domainkey)',
                '   Type: TXT',
                '   Value: v=DKIM1; k=rsa; p=[your-public-key]',
                '',
                '3. Configure your email server to sign outgoing emails with the private key'
            );
        } else if (!result.dkim.valid) {
            instructions.dkim.push(
                'Fix the following DKIM issues:',
                ...result.dkim.issues.map((i) => `- ${i}`)
            );
        }

        // DMARC instructions
        if (!result.dmarc.record) {
            instructions.dmarc.push(
                '1. Create a TXT record for DMARC:',
                '   Name: _dmarc',
                '   Type: TXT',
                '   Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
                '',
                '2. Start with p=none to monitor, then move to p=quarantine or p=reject',
                '3. Add rua= for aggregate reports and ruf= for forensic reports'
            );
        } else if (!result.dmarc.valid) {
            instructions.dmarc.push(
                'Fix the following DMARC issues:',
                ...result.dmarc.issues.map((i) => `- ${i}`)
            );
        }

        return instructions;
    }
}

export const dnsValidationService = new DNSValidationService();
