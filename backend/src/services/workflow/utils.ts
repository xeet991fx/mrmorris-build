/**
 * Workflow Utility Functions
 * 
 * Shared utility functions for workflow processing including
 * delay calculations, placeholder replacement, and entity helpers.
 */

import { Types } from "mongoose";
import Contact from "../../models/Contact";
import Opportunity from "../../models/Opportunity";
import Company from "../../models/Company";

// ============================================
// DELAY CALCULATION
// ============================================

const DELAY_MULTIPLIERS: Record<string, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Calculate delay in milliseconds based on step config
 */
export function calculateDelayMs(
    delayValue: number = 1,
    delayUnit: string = "days"
): number {
    return delayValue * (DELAY_MULTIPLIERS[delayUnit] || DELAY_MULTIPLIERS.days);
}

// ============================================
// PLACEHOLDER REPLACEMENT
// ============================================

/**
 * Replace template placeholders like {{firstName}}, {{contact.name}}, or @contact.firstName with actual values
 * Story 5.4 AC2: Support both {{}} and @ syntax for variable resolution
 */
export function replacePlaceholders(text: string, entity: any): string {
    if (!text) return "";

    // First, replace @contact.field and @company.field patterns (Story 5.4 AC2)
    let result = text.replace(/@(contact|company)\.([\w.]+)/g, (match, entityType, field) => {
        // For @contact.*, use the entity directly
        // For @company.*, try entity.company or entity.companyName
        if (entityType === 'contact') {
            const value = getNestedValue(entity, field);
            return value !== undefined ? String(value) : match;
        } else if (entityType === 'company') {
            // Try entity.company[field] or entity.companyField
            const companyValue = getNestedValue(entity, 'company') || entity.companyName || entity.company;
            if (typeof companyValue === 'object') {
                const value = getNestedValue(companyValue, field);
                return value !== undefined ? String(value) : match;
            } else if (field === 'name') {
                return companyValue ? String(companyValue) : match;
            }
            return match;
        }
        return match;
    });

    // Then, replace {{field}} patterns
    result = result.replace(/\{\{([\w.]+)\}\}/g, (match, field) => {
        // Handle nested fields like contact.firstName
        const value = getNestedValue(entity, field);
        return value !== undefined ? String(value) : match;
    });

    return result;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        return current ? current[key] : undefined;
    }, obj);
}

// ============================================
// ENTITY HELPERS
// ============================================

export type EntityType = "contact" | "deal" | "company";

/**
 * Get the Mongoose model for a given entity type
 */
export function getEntityModel(entityType: EntityType): any {
    switch (entityType) {
        case "contact":
            return Contact;
        case "deal":
            return Opportunity;
        case "company":
            return Company;
        default:
            return Contact;
    }
}

/**
 * Fetch an entity by type and ID
 */
export async function getEntity(
    entityType: EntityType,
    entityId: Types.ObjectId | string
): Promise<any> {
    const Model = getEntityModel(entityType);
    return Model.findById(entityId);
}

/**
 * Determine entity type from event type string
 */
export function getEntityTypeFromEvent(eventType: string): EntityType {
    if (eventType.startsWith("deal:")) return "deal";
    if (eventType.startsWith("company:")) return "company";
    return "contact";
}

// ============================================
// TRIGGER TYPE MAPPING
// ============================================

export const TRIGGER_TYPE_MAP: Record<string, string> = {
    "contact:created": "contact_created",
    "contact:updated": "contact_updated",
    "deal:created": "deal_created",
    "deal:stage_changed": "deal_stage_changed",
    "company:created": "company_created",
    "company:updated": "company_updated",
};

/**
 * Map an event type to a workflow trigger type
 */
export function mapEventToTrigger(eventType: string): string | undefined {
    return TRIGGER_TYPE_MAP[eventType];
}
