/**
 * Integration Metadata
 *
 * Centralized configuration for all integration nodes.
 * Includes app icons, colors, and metadata.
 */

import { SiSlack, SiWhatsapp, SiDiscord, SiGooglesheets, SiNotion } from "react-icons/si";

export interface IntegrationMetadata {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;          // Primary brand color
    bgColor: string;        // Background gradient
    domain: string;         // For Clearbit API fallback
    description: string;
}

export const INTEGRATIONS: Record<string, IntegrationMetadata> = {
    integration_slack: {
        name: "Slack",
        icon: SiSlack,
        color: "#4A154B",
        bgColor: "from-[#4A154B] to-[#36123A]",
        domain: "slack.com",
        description: "Team communication & collaboration",
    },
    integration_google_sheets: {
        name: "Google Sheets",
        icon: SiGooglesheets,
        color: "#0F9D58",
        bgColor: "from-[#0F9D58] to-[#0B8043]",
        domain: "google.com",
        description: "Spreadsheet data & automation",
    },
    integration_notion: {
        name: "Notion",
        icon: SiNotion,
        color: "#000000",
        bgColor: "from-[#000000] to-[#2B2B2B]",
        domain: "notion.so",
        description: "Notes, docs & knowledge base",
    },
    integration_whatsapp: {
        name: "WhatsApp",
        icon: SiWhatsapp,
        color: "#25D366",
        bgColor: "from-[#25D366] to-[#1DA851]",
        domain: "whatsapp.com",
        description: "Messaging & business communication",
    },
    integration_discord: {
        name: "Discord",
        icon: SiDiscord,
        color: "#5865F2",
        bgColor: "from-[#5865F2] to-[#4752C4]",
        domain: "discord.com",
        description: "Community & team chat",
    },
};

/**
 * Get integration metadata by type
 */
export function getIntegrationMeta(type: string): IntegrationMetadata | null {
    return INTEGRATIONS[type] || null;
}

/**
 * Get app icon URL from Clearbit (fallback for custom integrations)
 */
export function getClearbitLogoUrl(domain: string, size: number = 128): string {
    return `https://logo.clearbit.com/${domain}?size=${size}`;
}

/**
 * Get app icon URL from Google Favicon API (fallback)
 */
export function getGoogleFaviconUrl(domain: string, size: number = 128): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
