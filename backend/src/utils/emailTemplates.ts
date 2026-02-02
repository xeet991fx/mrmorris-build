/**
 * Email Template Utilities
 * Story 5.3 - Integration Expiration Notifications
 * Task 3.1, 3.2: Email template rendering
 * Code Review Fix: Added XSS protection, template caching, error handling
 */

import fs from 'fs';
import path from 'path';

interface IntegrationExpiringData {
    userName: string;
    integrationName: string;
    daysRemaining: number;
    dayText: string;
    urgencyClass: string;
    reconnectUrl: string;
    affectedAgents?: string[];
}

interface IntegrationExpiredData {
    userName: string;
    integrationName: string;
    reconnectUrl: string;
    affectedAgents?: string[];
}

/**
 * Template cache for production performance
 */
const templateCache = new Map<string, string>();

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
    };
    return text.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Load template from filesystem with caching and error handling
 */
function loadTemplate(templatePath: string): string {
    // Check cache first (only in production)
    if (process.env.NODE_ENV === 'production' && templateCache.has(templatePath)) {
        return templateCache.get(templatePath)!;
    }

    try {
        const template = fs.readFileSync(templatePath, 'utf-8');

        // Cache in production
        if (process.env.NODE_ENV === 'production') {
            templateCache.set(templatePath, template);
        }

        return template;
    } catch (error: any) {
        console.error(`Failed to load email template from ${templatePath}:`, error);
        throw new Error(`Email template not found: ${templatePath}`);
    }
}

/**
 * Simple template renderer (replaces {{variable}} with values)
 * Supports conditional blocks: {{#if var}}...{{/if}}
 * Supports loops: {{#each array}}{{this}}{{/each}}
 * XSS Protection: Escapes HTML in variable values
 */
function renderTemplate(template: string, data: Record<string, any>): string {
    let result = template;

    // Handle {{#if}} blocks
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
        const value = data[key];
        if (value && (!Array.isArray(value) || value.length > 0)) {
            return content;
        }
        return '';
    });

    // Handle {{#each}} blocks (with HTML escaping for items)
    result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
        const array = data[key];
        if (Array.isArray(array) && array.length > 0) {
            return array.map(item => content.replace(/\{\{this\}\}/g, escapeHtml(String(item)))).join('');
        }
        return '';
    });

    // Handle simple {{variable}} replacements (with HTML escaping)
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (data[key] !== undefined) {
            const value = String(data[key]);
            // Don't escape class names (urgencyClass) or URLs
            if (key === 'urgencyClass' || key.includes('Url') || key.includes('url')) {
                return value;
            }
            return escapeHtml(value);
        }
        return '';
    });

    return result;
}

/**
 * Load and render integration expiring email template
 */
export function renderIntegrationExpiringEmail(data: IntegrationExpiringData): string {
    const templatePath = path.join(__dirname, '../templates/emails/integration-expiring.html');
    const template = loadTemplate(templatePath);
    return renderTemplate(template, data);
}

/**
 * Load and render integration expired email template
 */
export function renderIntegrationExpiredEmail(data: IntegrationExpiredData): string {
    const templatePath = path.join(__dirname, '../templates/emails/integration-expired.html');
    const template = loadTemplate(templatePath);
    return renderTemplate(template, data);
}
