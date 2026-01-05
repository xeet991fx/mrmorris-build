/**
 * Blacklist Monitor Service
 *
 * Checks if IP addresses or domains are listed on email blacklists (DNSBLs)
 * Helps maintain email sender reputation
 */

import dns from 'dns';
import { promisify } from 'util';
import axios from 'axios';

const resolve4 = promisify(dns.resolve4);

export interface BlacklistCheck {
    name: string;
    host: string;
    listed: boolean;
    checkedAt: Date;
    responseTime?: number;
    details?: string;
    severity: 'low' | 'medium' | 'high';
}

export interface BlacklistReport {
    target: string; // IP or domain
    targetType: 'ip' | 'domain';
    totalLists: number;
    listedOn: number;
    checks: BlacklistCheck[];
    overallStatus: 'clean' | 'warning' | 'critical';
    recommendations: string[];
    checkedAt: Date;
}

export class BlacklistMonitorService {
    // Major DNS-based blacklists (DNSBLs)
    private readonly blacklists = [
        {
            name: 'Spamhaus ZEN',
            host: 'zen.spamhaus.org',
            severity: 'high' as const,
            description: 'Combined Spamhaus blocklist',
        },
        {
            name: 'Spamhaus SBL',
            host: 'sbl.spamhaus.org',
            severity: 'high' as const,
            description: 'Spamhaus Block List',
        },
        {
            name: 'Spamhaus XBL',
            host: 'xbl.spamhaus.org',
            severity: 'high' as const,
            description: 'Exploits Block List',
        },
        {
            name: 'Spamcop',
            host: 'bl.spamcop.net',
            severity: 'high' as const,
            description: 'SpamCop Blocking List',
        },
        {
            name: 'Barracuda',
            host: 'b.barracudacentral.org',
            severity: 'medium' as const,
            description: 'Barracuda Reputation Block List',
        },
        {
            name: 'SORBS',
            host: 'dnsbl.sorbs.net',
            severity: 'medium' as const,
            description: 'Spam and Open Relay Blocking System',
        },
        {
            name: 'UCEPROTECT Level 1',
            host: 'dnsbl-1.uceprotect.net',
            severity: 'medium' as const,
            description: 'UCEPROTECT Network',
        },
        {
            name: 'PSBL',
            host: 'psbl.surriel.com',
            severity: 'low' as const,
            description: 'Passive Spam Block List',
        },
        {
            name: 'CBL',
            host: 'cbl.abuseat.org',
            severity: 'high' as const,
            description: 'Composite Blocking List',
        },
        {
            name: 'URIBL',
            host: 'multi.uribl.com',
            severity: 'medium' as const,
            description: 'URI Blacklist (for domains)',
        },
        {
            name: 'SURBL',
            host: 'multi.surbl.org',
            severity: 'medium' as const,
            description: 'Spam URI Realtime Blocklists',
        },
    ];

    /**
     * Check if an IP address is blacklisted
     */
    async checkIP(ipAddress: string): Promise<BlacklistReport> {
        const checks = await Promise.all(
            this.blacklists
                .filter((bl) => !bl.host.includes('uri')) // Skip URI-based lists for IPs
                .map((bl) => this.checkIPAgainstList(ipAddress, bl))
        );

        const listedOn = checks.filter((c) => c.listed).length;
        const totalLists = checks.length;

        let overallStatus: 'clean' | 'warning' | 'critical' = 'clean';
        if (listedOn > 0) {
            const hasHighSeverity = checks.some(
                (c) => c.listed && c.severity === 'high'
            );
            overallStatus = hasHighSeverity ? 'critical' : 'warning';
        }

        const recommendations = this.generateRecommendations(checks);

        return {
            target: ipAddress,
            targetType: 'ip',
            totalLists,
            listedOn,
            checks,
            overallStatus,
            recommendations,
            checkedAt: new Date(),
        };
    }

    /**
     * Check if a domain is blacklisted
     */
    async checkDomain(domain: string): Promise<BlacklistReport> {
        const checks = await Promise.all(
            this.blacklists
                .filter((bl) => bl.host.includes('uri') || bl.host.includes('surbl')) // Only URI-based lists for domains
                .map((bl) => this.checkDomainAgainstList(domain, bl))
        );

        const listedOn = checks.filter((c) => c.listed).length;
        const totalLists = checks.length;

        let overallStatus: 'clean' | 'warning' | 'critical' = 'clean';
        if (listedOn > 0) {
            const hasHighSeverity = checks.some(
                (c) => c.listed && c.severity === 'high'
            );
            overallStatus = hasHighSeverity ? 'critical' : 'warning';
        }

        const recommendations = this.generateRecommendations(checks);

        return {
            target: domain,
            targetType: 'domain',
            totalLists,
            listedOn,
            checks,
            overallStatus,
            recommendations,
            checkedAt: new Date(),
        };
    }

    /**
     * Check IP against a specific blacklist
     */
    private async checkIPAgainstList(
        ipAddress: string,
        blacklist: {
            name: string;
            host: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
        }
    ): Promise<BlacklistCheck> {
        const startTime = Date.now();

        try {
            // Reverse IP for DNSBL query
            const reversedIP = ipAddress.split('.').reverse().join('.');
            const query = `${reversedIP}.${blacklist.host}`;

            // Query the blacklist
            await resolve4(query);

            // If resolve succeeds, IP is listed
            return {
                name: blacklist.name,
                host: blacklist.host,
                listed: true,
                checkedAt: new Date(),
                responseTime: Date.now() - startTime,
                details: blacklist.description,
                severity: blacklist.severity,
            };
        } catch (error: any) {
            // If NXDOMAIN error, IP is not listed
            if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                return {
                    name: blacklist.name,
                    host: blacklist.host,
                    listed: false,
                    checkedAt: new Date(),
                    responseTime: Date.now() - startTime,
                    details: blacklist.description,
                    severity: blacklist.severity,
                };
            }

            // Other errors (timeout, DNS failure, etc.)
            return {
                name: blacklist.name,
                host: blacklist.host,
                listed: false,
                checkedAt: new Date(),
                responseTime: Date.now() - startTime,
                details: `Check failed: ${error.message}`,
                severity: blacklist.severity,
            };
        }
    }

    /**
     * Check domain against a specific blacklist
     */
    private async checkDomainAgainstList(
        domain: string,
        blacklist: {
            name: string;
            host: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
        }
    ): Promise<BlacklistCheck> {
        const startTime = Date.now();

        try {
            const query = `${domain}.${blacklist.host}`;

            // Query the blacklist
            await resolve4(query);

            // If resolve succeeds, domain is listed
            return {
                name: blacklist.name,
                host: blacklist.host,
                listed: true,
                checkedAt: new Date(),
                responseTime: Date.now() - startTime,
                details: blacklist.description,
                severity: blacklist.severity,
            };
        } catch (error: any) {
            // If NXDOMAIN error, domain is not listed
            if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                return {
                    name: blacklist.name,
                    host: blacklist.host,
                    listed: false,
                    checkedAt: new Date(),
                    responseTime: Date.now() - startTime,
                    details: blacklist.description,
                    severity: blacklist.severity,
                };
            }

            // Other errors
            return {
                name: blacklist.name,
                host: blacklist.host,
                listed: false,
                checkedAt: new Date(),
                responseTime: Date.now() - startTime,
                details: `Check failed: ${error.message}`,
                severity: blacklist.severity,
            };
        }
    }

    /**
     * Generate recommendations based on blacklist checks
     */
    private generateRecommendations(checks: BlacklistCheck[]): string[] {
        const recommendations: string[] = [];
        const listedChecks = checks.filter((c) => c.listed);

        if (listedChecks.length === 0) {
            recommendations.push('No blacklistings found. Your reputation is good!');
            return recommendations;
        }

        // High severity listings
        const highSeverity = listedChecks.filter((c) => c.severity === 'high');
        if (highSeverity.length > 0) {
            recommendations.push(
                `CRITICAL: Listed on ${highSeverity.length} high-severity blacklist(s): ${highSeverity.map((c) => c.name).join(', ')}`
            );
            recommendations.push(
                'Immediate action required: Stop sending emails and investigate the cause'
            );
            recommendations.push(
                'Common causes: Compromised server, spam complaints, sending to purchased lists'
            );
        }

        // Medium severity listings
        const mediumSeverity = listedChecks.filter((c) => c.severity === 'medium');
        if (mediumSeverity.length > 0) {
            recommendations.push(
                `WARNING: Listed on ${mediumSeverity.length} medium-severity blacklist(s): ${mediumSeverity.map((c) => c.name).join(', ')}`
            );
            recommendations.push(
                'Investigate and improve sending practices'
            );
        }

        // General recommendations
        recommendations.push('Steps to delist:');
        recommendations.push('1. Identify and fix the root cause (spam, compromised server, etc.)');
        recommendations.push('2. Visit each blacklist\'s website to request delisting');
        recommendations.push('3. Implement proper authentication (SPF, DKIM, DMARC)');
        recommendations.push('4. Monitor blacklist status regularly');

        // Specific delisting URLs
        if (listedChecks.some((c) => c.host.includes('spamhaus'))) {
            recommendations.push(
                'Spamhaus delisting: https://check.spamhaus.org/'
            );
        }
        if (listedChecks.some((c) => c.host.includes('spamcop'))) {
            recommendations.push(
                'SpamCop delisting: https://www.spamcop.net/bl.shtml'
            );
        }
        if (listedChecks.some((c) => c.host.includes('barracuda'))) {
            recommendations.push(
                'Barracuda delisting: https://www.barracudacentral.org/rbl/removal-request'
            );
        }

        return recommendations;
    }

    /**
     * Check using external API (more comprehensive but rate-limited)
     * Uses MXToolbox API if configured
     */
    async checkWithMXToolbox(target: string): Promise<any> {
        const apiKey = process.env.MXTOOLBOX_API_KEY;
        if (!apiKey) {
            throw new Error('MXToolbox API key not configured');
        }

        try {
            const response = await axios.get(
                `https://mxtoolbox.com/api/v1/Lookup/blacklist/${target}`,
                {
                    headers: {
                        Authorization: apiKey,
                    },
                    timeout: 10000,
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('MXToolbox API error:', error.message);
            throw error;
        }
    }

    /**
     * Get delisting instructions for a specific blacklist
     */
    getDelistingInstructions(blacklistName: string): string[] {
        const instructions: { [key: string]: string[] } = {
            'Spamhaus ZEN': [
                '1. Visit https://check.spamhaus.org/',
                '2. Enter your IP address',
                '3. If listed, check the reason and take corrective action',
                '4. Submit a delisting request explaining what you fixed',
                '5. Wait 24-48 hours for review',
            ],
            'Spamcop': [
                '1. Visit https://www.spamcop.net/bl.shtml',
                '2. Enter your IP address',
                '3. If listed, wait 24 hours (automatic delisting)',
                '4. Fix the underlying issue to prevent relisting',
            ],
            'Barracuda': [
                '1. Visit https://www.barracudacentral.org/rbl/removal-request',
                '2. Fill out the removal request form',
                '3. Explain what caused the listing and how you fixed it',
                '4. Submit the request',
                '5. Monitor for delisting confirmation',
            ],
            'SORBS': [
                '1. Visit http://www.sorbs.net/lookup.shtml',
                '2. Enter your IP address',
                '3. Follow the delisting instructions for your specific listing type',
                '4. Note: Some SORBS listings require a fee for expedited delisting',
            ],
        };

        return (
            instructions[blacklistName] || [
                '1. Search for "[blacklist name] delisting" in your browser',
                '2. Visit the blacklist\'s official website',
                '3. Follow their delisting procedure',
                '4. Fix the root cause before requesting delisting',
            ]
        );
    }
}

export const blacklistMonitorService = new BlacklistMonitorService();
