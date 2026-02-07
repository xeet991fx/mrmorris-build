/**
 * LinkedIn Integration Service
 *
 * Handles LinkedIn OAuth authentication, profile fetching, and CRM integration.
 * 
 * IMPORTANT: LinkedIn API has significant restrictions:
 * - Basic/Consumer API: Only allows fetching the authenticated user's profile
 * - Marketing Solutions API: Allows company page management, ads
 * - Sales Navigator API: Allows contact lookup (requires enterprise agreement)
 * 
 * For arbitrary profile lookups, use Apollo.io enrichment (already integrated)
 */

import axios, { AxiosInstance } from "axios";
import IntegrationCredential from "../models/IntegrationCredential";
import Contact from "../models/Contact";
import mongoose, { Types } from "mongoose";

// LinkedIn API Configuration
const LINKEDIN_CONFIG = {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    profileUrl: "https://api.linkedin.com/v2/me",
    emailUrl: "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
};

// LinkedIn OAuth Scopes
export const LINKEDIN_SCOPES = [
    "openid",
    "profile",
    "email",
    "w_member_social", // For posting (optional)
];

// Types
export interface LinkedInProfile {
    profileUrl: string;
    linkedInId?: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    currentCompany?: string;
    email?: string;
    pictureUrl?: string;
    location?: string;
}

export interface ConnectionRequest {
    profileUrl: string;
    note?: string;
    contactId?: string;
}

export interface LinkedInMessage {
    profileUrl: string;
    message: string;
    contactId?: string;
}

export interface OAuthTokens {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
}

interface LinkedInCredentialData {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
}

/**
 * LinkedIn Service Class
 */
class LinkedInService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            timeout: 10000,
        });
    }

    /**
     * Check if LinkedIn integration is configured
     */
    isConfigured(): boolean {
        return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    }

    /**
     * Generate LinkedIn OAuth authorization URL
     */
    getOAuthUrl(workspaceId: string, userId: string): string {
        if (!this.isConfigured()) {
            throw new Error("LinkedIn integration not configured");
        }

        const state = Buffer.from(
            JSON.stringify({ workspaceId, userId })
        ).toString("base64");

        const redirectUri = `${process.env.BACKEND_URL}/api/linkedin/callback`;

        const params = new URLSearchParams({
            response_type: "code",
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            redirect_uri: redirectUri,
            state,
            scope: LINKEDIN_SCOPES.join(" "),
        });

        return `${LINKEDIN_CONFIG.authUrl}?${params.toString()}`;
    }

    /**
     * Exchange OAuth authorization code for tokens
     */
    async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
        if (!this.isConfigured()) {
            throw new Error("LinkedIn integration not configured");
        }

        const redirectUri = `${process.env.BACKEND_URL}/api/linkedin/callback`;

        const response = await this.client.post(
            LINKEDIN_CONFIG.tokenUrl,
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: process.env.LINKEDIN_CLIENT_ID!,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
            }).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        return response.data;
    }

    /**
     * Get user's LinkedIn profile using OpenID Connect userinfo endpoint
     * (Works with basic LinkedIn API access)
     */
    async getCurrentUserProfile(accessToken: string): Promise<LinkedInProfile> {
        try {
            // Use OpenID Connect userinfo endpoint (works with openid scope)
            const response = await this.client.get(LINKEDIN_CONFIG.userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = response.data;

            return {
                profileUrl: `https://linkedin.com/in/${data.sub}`,
                linkedInId: data.sub,
                firstName: data.given_name,
                lastName: data.family_name,
                email: data.email,
                pictureUrl: data.picture,
                headline: data.name, // Full name as headline fallback
            };
        } catch (error: any) {
            console.error("Failed to fetch LinkedIn profile:", error.response?.data || error.message);
            throw new Error(`Failed to fetch LinkedIn profile: ${error.message}`);
        }
    }

    /**
     * Get stored LinkedIn credentials for a workspace
     */
    async getCredentials(workspaceId: string): Promise<LinkedInCredentialData | null> {
        const credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "linkedin",
        }).select("+encryptedData");

        if (!credential) {
            return null;
        }

        // Check if token is expired
        if (credential.expiresAt && new Date() > credential.expiresAt) {
            credential.status = "Expired";
            await credential.save();
            return null;
        }

        return credential.getCredentialData();
    }

    /**
     * Check if LinkedIn is connected for a workspace
     */
    async isConnected(workspaceId: string): Promise<boolean> {
        const credentials = await this.getCredentials(workspaceId);
        return credentials !== null;
    }

    /**
     * Validate LinkedIn token by making a test API call
     */
    async validateToken(accessToken: string): Promise<boolean> {
        try {
            await this.client.get(LINKEDIN_CONFIG.userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Extract LinkedIn profile ID/username from URL
     */
    extractProfileUsername(url: string): string | null {
        const patterns = [
            /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i,
            /linkedin\.com\/pub\/([a-zA-Z0-9_-]+)/i,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    /**
     * Validate LinkedIn profile URL format
     */
    isValidLinkedInUrl(url: string): boolean {
        const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9_-]+\/?$/;
        return linkedinRegex.test(url);
    }

    /**
     * Normalize LinkedIn URL to canonical format
     */
    normalizeLinkedInUrl(url: string): string {
        // Handle various formats
        let normalized = url.trim();

        // If just a username, convert to full URL
        if (!normalized.includes("linkedin.com")) {
            normalized = `https://linkedin.com/in/${normalized}`;
        }

        // Ensure https
        if (normalized.startsWith("http://")) {
            normalized = normalized.replace("http://", "https://");
        }

        // Add https if missing
        if (!normalized.startsWith("https://")) {
            normalized = `https://${normalized}`;
        }

        // Add www if missing
        if (!normalized.includes("www.")) {
            normalized = normalized.replace("linkedin.com", "www.linkedin.com");
        }

        // Remove trailing slash
        if (normalized.endsWith("/")) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    }

    /**
     * Update contact with LinkedIn URL (normalized)
     */
    async updateContactLinkedIn(
        contactId: string,
        linkedInUrl: string,
        workspaceId: string
    ): Promise<{ success: boolean; contact?: any; error?: string }> {
        try {
            const normalizedUrl = this.normalizeLinkedInUrl(linkedInUrl);

            const contact = await Contact.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(contactId),
                    workspaceId: new mongoose.Types.ObjectId(workspaceId),
                },
                {
                    $set: {
                        linkedin: normalizedUrl,
                        "socialProfiles.linkedin": normalizedUrl,
                    },
                },
                { new: true }
            );

            if (!contact) {
                return { success: false, error: "Contact not found" };
            }

            return { success: true, contact };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send LinkedIn connection request (placeholder - requires special API access)
     * NOTE: LinkedIn's basic API does not support sending connection requests.
     * This would require LinkedIn Marketing Solutions API or browser automation.
     */
    async sendConnectionRequest(
        request: ConnectionRequest
    ): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            // LinkedIn basic API does not support sending connection requests
            // This is a placeholder for future implementation with:
            // 1. LinkedIn Marketing Solutions API
            // 2. Browser automation (Puppeteer/Playwright)
            // 3. Third-party services (Phantombuster, etc.)

            console.log(`[LinkedIn] Connection request to: ${request.profileUrl}`);
            console.log(`[LinkedIn] Note: ${request.note || "No note"}`);

            // For now, just log and return simulated success
            return {
                success: true,
                message: "Connection request simulated (LinkedIn basic API does not support this)",
            };
        } catch (error: any) {
            console.error("LinkedIn connection request failed:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send LinkedIn message (placeholder - requires special API access)
     * NOTE: LinkedIn's basic API does not support sending messages.
     */
    async sendLinkedInMessage(
        message: LinkedInMessage
    ): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            // LinkedIn basic API does not support sending messages
            // This is a placeholder for future implementation

            console.log(`[LinkedIn] Message to: ${message.profileUrl}`);
            console.log(`[LinkedIn] Message: ${message.message}`);

            return {
                success: true,
                message: "LinkedIn message simulated (LinkedIn basic API does not support this)",
            };
        } catch (error: any) {
            console.error("LinkedIn message failed:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Check LinkedIn connection status (placeholder)
     */
    async checkConnectionStatus(
        profileUrl: string
    ): Promise<{ connected: boolean; pending: boolean }> {
        try {
            // LinkedIn basic API does not support checking connection status
            console.log(`[LinkedIn] Checking connection status for: ${profileUrl}`);

            return {
                connected: false,
                pending: false,
            };
        } catch (error: any) {
            console.error("Connection status check failed:", error);
            return {
                connected: false,
                pending: false,
            };
        }
    }

    /**
     * Get LinkedIn profile data (placeholder - basic API only returns authenticated user)
     * For arbitrary profile lookup, use Apollo.io enrichment instead.
     */
    async getLinkedInProfile(profileUrl: string): Promise<LinkedInProfile | null> {
        try {
            console.log(`[LinkedIn] Profile lookup for: ${profileUrl}`);

            // LinkedIn basic API does not allow fetching arbitrary profiles
            // Use Apollo.io for profile enrichment instead

            // Return the URL as a placeholder
            return {
                profileUrl: this.normalizeLinkedInUrl(profileUrl),
                firstName: undefined,
                lastName: undefined,
            };
        } catch (error: any) {
            console.error("LinkedIn profile fetch failed:", error);
            return null;
        }
    }

    /**
     * Extract LinkedIn URL from text (email signature, etc.)
     */
    extractLinkedInUrl(text: string): string | null {
        const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/i;
        const match = text.match(linkedinRegex);
        return match ? this.normalizeLinkedInUrl(match[0]) : null;
    }

    /**
     * Track LinkedIn interaction (stored in rate limiting fields)
     */
    async trackLinkedInAction(workspaceId: string): Promise<void> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "linkedin",
        });

        if (!credential) {
            return;
        }

        // Reset counter if it's a new day
        if (!credential.linkedinLastSentDate ||
            credential.linkedinLastSentDate.getTime() < today.getTime()) {
            credential.linkedinSentToday = 1;
            credential.linkedinLastSentDate = new Date();
        } else {
            credential.linkedinSentToday = (credential.linkedinSentToday || 0) + 1;
        }

        await credential.save();
    }

    /**
     * Check if rate limit is exceeded for LinkedIn actions
     * LinkedIn typically limits to ~100 connection requests per week
     */
    async checkRateLimit(workspaceId: string): Promise<{ allowed: boolean; remaining: number }> {
        const DAILY_LIMIT = 20; // Conservative daily limit

        const credential = await IntegrationCredential.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "linkedin",
        });

        if (!credential) {
            return { allowed: false, remaining: 0 };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Reset counter if it's a new day
        if (!credential.linkedinLastSentDate ||
            credential.linkedinLastSentDate.getTime() < today.getTime()) {
            return { allowed: true, remaining: DAILY_LIMIT };
        }

        const sentToday = credential.linkedinSentToday || 0;
        const remaining = Math.max(0, DAILY_LIMIT - sentToday);

        return {
            allowed: remaining > 0,
            remaining,
        };
    }
}

// Export singleton instance
const linkedInService = new LinkedInService();
export default linkedInService;

// Also export named functions for backward compatibility
export const {
    sendConnectionRequest,
    sendLinkedInMessage,
    checkConnectionStatus,
    getLinkedInProfile,
    extractLinkedInUrl,
    isValidLinkedInUrl,
} = {
    sendConnectionRequest: linkedInService.sendConnectionRequest.bind(linkedInService),
    sendLinkedInMessage: linkedInService.sendLinkedInMessage.bind(linkedInService),
    checkConnectionStatus: linkedInService.checkConnectionStatus.bind(linkedInService),
    getLinkedInProfile: linkedInService.getLinkedInProfile.bind(linkedInService),
    extractLinkedInUrl: linkedInService.extractLinkedInUrl.bind(linkedInService),
    isValidLinkedInUrl: linkedInService.isValidLinkedInUrl.bind(linkedInService),
};
