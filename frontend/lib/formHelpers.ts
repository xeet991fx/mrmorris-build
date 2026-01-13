/**
 * Form Helpers for Frontend
 *
 * Utilities for progressive profiling, conditional logic, and field visibility
 */

import { FormField } from "@/lib/api/form";

export interface Contact {
    [key: string]: any;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
    fieldValue: any,
    operator: string,
    compareValue: string
): boolean {
    const fieldStr = String(fieldValue || '').toLowerCase();
    const compareStr = compareValue.toLowerCase();

    switch (operator) {
        case 'equals':
            return fieldStr === compareStr;

        case 'notEquals':
            return fieldStr !== compareStr;

        case 'contains':
            return fieldStr.includes(compareStr);

        case 'notContains':
            return !fieldStr.includes(compareStr);

        case 'isEmpty':
            return !fieldValue || fieldStr === '';

        case 'isNotEmpty':
            return !!fieldValue && fieldStr !== '';

        case 'greaterThan':
            return parseFloat(fieldValue) > parseFloat(compareValue);

        case 'lessThan':
            return parseFloat(fieldValue) < parseFloat(compareValue);

        default:
            return false;
    }
}

/**
 * Check if a field should be visible based on conditional logic
 */
export function shouldShowField(
    field: FormField,
    formData: Record<string, any>
): boolean {
    // If conditional logic is not enabled, always show
    if (!field.conditionalLogic?.enabled || !field.conditionalLogic.rules?.length) {
        return true;
    }

    const { rules, logicType } = field.conditionalLogic;

    // Evaluate all rules
    const results = rules.map(rule => {
        const fieldValue = formData[rule.fieldId];
        return evaluateCondition(fieldValue, rule.operator, rule.value);
    });

    // Combine results based on logic type
    if (logicType === 'AND') {
        return results.every(result => result);
    } else {
        return results.some(result => result);
    }
}

/**
 * Filter fields for progressive profiling
 *
 * @param fields - All form fields
 * @param contact - Existing contact data (optional)
 * @param maxFields - Maximum number of fields to show at once
 * @returns Filtered list of fields to display
 */
export function applyProgressiveProfiling(
    fields: FormField[],
    contact: Contact | null,
    maxFields?: number
): FormField[] {
    // If no progressive profiling is enabled, return all fields
    const progressiveFields = fields.filter(f => f.progressive?.enabled);
    if (progressiveFields.length === 0) {
        return fields;
    }

    // Filter out fields that should be hidden if known
    const visibleFields = fields.filter(field => {
        if (!field.progressive?.enabled || !field.progressive.hideIfKnown) {
            return true;
        }

        // Check if we have contact data for this field
        if (!contact) {
            return true;
        }

        // Map field to contact property (simplified - you may need more mapping)
        const contactValue = contact[field.id] || contact[field.label?.toLowerCase()];

        // Hide if we already have data
        return !contactValue;
    });

    // If maxFields is set, limit by priority
    if (maxFields && maxFields < visibleFields.length) {
        // Sort by priority (lower number = higher priority)
        const sorted = [...visibleFields].sort((a, b) => {
            const aPriority = a.progressive?.priority || 999;
            const bPriority = b.progressive?.priority || 999;
            return aPriority - bPriority;
        });

        return sorted.slice(0, maxFields);
    }

    return visibleFields;
}

/**
 * Get visible fields based on both conditional logic and progressive profiling
 */
export function getVisibleFields(
    fields: FormField[],
    formData: Record<string, any>,
    contact: Contact | null,
    maxProgressiveFields?: number
): FormField[] {
    // First apply progressive profiling
    let visibleFields = applyProgressiveProfiling(fields, contact, maxProgressiveFields);

    // Then apply conditional logic
    visibleFields = visibleFields.filter(field =>
        shouldShowField(field, formData)
    );

    return visibleFields;
}

/**
 * Validate required fields (only visible ones)
 */
export function validateVisibleFields(
    fields: FormField[],
    formData: Record<string, any>,
    contact: Contact | null,
    maxProgressiveFields?: number
): { isValid: boolean; errors: Record<string, string> } {
    const visibleFields = getVisibleFields(fields, formData, contact, maxProgressiveFields);
    const errors: Record<string, string> = {};

    visibleFields.forEach(field => {
        if (field.required) {
            const value = formData[field.id];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                errors[field.id] = `${field.label} is required`;
            }
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Check if a step should be visible (for multi-step forms)
 */
export function shouldShowStep(
    step: {
        conditionalLogic?: {
            enabled: boolean;
            showIf: {
                fieldId: string;
                operator: string;
                value: string;
            };
        };
    },
    formData: Record<string, any>
): boolean {
    if (!step.conditionalLogic?.enabled || !step.conditionalLogic.showIf) {
        return true;
    }

    const { fieldId, operator, value } = step.conditionalLogic.showIf;
    const fieldValue = formData[fieldId];

    return evaluateCondition(fieldValue, operator, value);
}
