/**
 * GeoIP Service
 * 
 * Provides IP-to-location lookup using ip-api.com (free tier: 45 req/min)
 * Includes in-memory caching to reduce API calls and handle rate limits.
 */

interface GeoLocation {
    country: string;
    countryCode: string;
    city: string;
    region: string;
    timezone: string;
    isp: string;
    lat?: number;
    lon?: number;
}

// Simple in-memory cache with TTL
const geoCache = new Map<string, { data: GeoLocation | null; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10000;

// Rate limiting
let requestCount = 0;
let windowStart = Date.now();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 40; // Stay under 45/min limit

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
    const now = Date.now();
    if (geoCache.size > MAX_CACHE_SIZE) {
        for (const [key, entry] of geoCache) {
            if (entry.expiresAt < now) {
                geoCache.delete(key);
            }
        }
    }
}

/**
 * Check if we should rate limit the request
 */
function shouldRateLimit(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
        windowStart = now;
        requestCount = 0;
    }

    if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }

    requestCount++;
    return false;
}

/**
 * Normalize IP address (handle IPv6 localhost, etc.)
 */
function normalizeIP(ip: string): string {
    // Handle IPv6 localhost
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        return '127.0.0.1';
    }

    // Handle IPv6-mapped IPv4
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    return ip;
}

/**
 * Check if IP is a private/local address
 */
function isPrivateIP(ip: string): boolean {
    const normalizedIP = normalizeIP(ip);

    // Localhost
    if (normalizedIP === '127.0.0.1' || normalizedIP === 'localhost') {
        return true;
    }

    // Private IPv4 ranges
    const privateRanges = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./, // Link-local
    ];

    return privateRanges.some(range => range.test(normalizedIP));
}

/**
 * Lookup geolocation for an IP address
 * Returns null if lookup fails or IP is private
 */
export async function lookupIP(ip: string): Promise<GeoLocation | null> {
    const normalizedIP = normalizeIP(ip);

    // Skip private IPs
    if (isPrivateIP(normalizedIP)) {
        return null;
    }

    // Check cache first
    const cached = geoCache.get(normalizedIP);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    // Rate limit check
    if (shouldRateLimit()) {
        console.warn('[GeoIP] Rate limit reached, skipping lookup');
        return null;
    }

    try {
        // Use ip-api.com (free, no API key required)
        const response = await fetch(
            `http://ip-api.com/json/${normalizedIP}?fields=status,message,country,countryCode,region,city,timezone,isp,lat,lon`,
            {
                signal: AbortSignal.timeout(3000), // 3 second timeout
            }
        );

        if (!response.ok) {
            console.error(`[GeoIP] HTTP error: ${response.status}`);
            return null;
        }

        const data = await response.json() as {
            status: string;
            message?: string;
            country?: string;
            countryCode?: string;
            region?: string;
            city?: string;
            timezone?: string;
            isp?: string;
            lat?: number;
            lon?: number;
        };

        if (data.status === 'fail') {
            console.warn(`[GeoIP] Lookup failed: ${data.message}`);
            // Cache failures to avoid retrying bad IPs
            geoCache.set(normalizedIP, { data: null, expiresAt: Date.now() + CACHE_TTL_MS });
            return null;
        }

        const geoLocation: GeoLocation = {
            country: data.country || 'Unknown',
            countryCode: data.countryCode || '',
            city: data.city || 'Unknown',
            region: data.region || '',
            timezone: data.timezone || '',
            isp: data.isp || '',
            lat: data.lat,
            lon: data.lon,
        };

        // Cache successful result
        geoCache.set(normalizedIP, { data: geoLocation, expiresAt: Date.now() + CACHE_TTL_MS });

        // Cleanup periodically
        cleanupCache();

        return geoLocation;
    } catch (error: any) {
        // Handle timeout and network errors gracefully
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            console.warn('[GeoIP] Lookup timed out');
        } else {
            console.error('[GeoIP] Lookup error:', error.message);
        }
        return null;
    }
}

/**
 * Batch lookup multiple IPs (returns map of IP -> GeoLocation)
 * Useful for backfilling historical data
 */
export async function lookupIPBatch(ips: string[]): Promise<Map<string, GeoLocation | null>> {
    const results = new Map<string, GeoLocation | null>();

    // Process sequentially to respect rate limits
    for (const ip of ips) {
        results.set(ip, await lookupIP(ip));
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}

export default {
    lookupIP,
    lookupIPBatch,
};
