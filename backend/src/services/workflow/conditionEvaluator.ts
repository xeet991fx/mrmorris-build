/**
 * Condition Evaluator
 * 
 * Evaluates workflow conditions against entity data.
 * Used for enrollment criteria and branching logic.
 */

import { IWorkflowCondition } from "../../models/Workflow";

export type ConditionOperator =
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty"
    | "is_true"
    | "is_false";

// ============================================
// SINGLE CONDITION EVALUATION
// ============================================

/**
 * Evaluate a single condition against an entity
 */
export function evaluateCondition(
    entity: any,
    condition: IWorkflowCondition
): boolean {
    const value = getFieldValue(entity, condition.field);
    const operator = condition.operator as ConditionOperator;
    const targetValue = condition.value;

    switch (operator) {
        case "equals":
            return value === targetValue;

        case "not_equals":
            return value !== targetValue;

        case "contains":
            return String(value || "")
                .toLowerCase()
                .includes(String(targetValue || "").toLowerCase());

        case "not_contains":
            return !String(value || "")
                .toLowerCase()
                .includes(String(targetValue || "").toLowerCase());

        case "greater_than":
            return Number(value) > Number(targetValue);

        case "less_than":
            return Number(value) < Number(targetValue);

        case "is_empty":
            return value === undefined || value === null || value === "";

        case "is_not_empty":
            return value !== undefined && value !== null && value !== "";

        case "is_true":
            return value === true || value === "true";

        case "is_false":
            return value === false || value === "false";

        default:
            console.warn(`Unknown condition operator: ${operator}`);
            return false;
    }
}

// ============================================
// MULTIPLE CONDITIONS EVALUATION
// ============================================

/**
 * Evaluate multiple conditions against an entity
 * @param entity The entity to evaluate against
 * @param conditions Array of conditions to evaluate
 * @param matchAll If true, ALL conditions must match (AND). If false, ANY condition can match (OR).
 */
export function evaluateConditions(
    entity: any,
    conditions: IWorkflowCondition[],
    matchAll: boolean = true
): boolean {
    if (!conditions || conditions.length === 0) {
        return true; // No conditions = always match
    }

    const results = conditions.map((condition) =>
        evaluateCondition(entity, condition)
    );

    return matchAll
        ? results.every((result) => result)
        : results.some((result) => result);
}

// ============================================
// HELPERS
// ============================================

/**
 * Get field value from entity, supporting nested paths
 */
function getFieldValue(entity: any, field: string): any {
    if (!entity || !field) return undefined;

    // Support dot notation for nested fields (e.g., "address.city")
    const parts = field.split(".");
    let value = entity;

    for (const part of parts) {
        if (value === undefined || value === null) return undefined;
        value = value[part];
    }

    return value;
}

/**
 * Create a human-readable description of a condition
 */
export function describeCondition(condition: IWorkflowCondition): string {
    const { field, operator, value } = condition;

    const operatorDescriptions: Record<string, string> = {
        equals: "equals",
        not_equals: "does not equal",
        contains: "contains",
        not_contains: "does not contain",
        greater_than: "is greater than",
        less_than: "is less than",
        is_empty: "is empty",
        is_not_empty: "is not empty",
        is_true: "is true",
        is_false: "is false",
    };

    const opDesc = operatorDescriptions[operator] || operator;

    if (["is_empty", "is_not_empty", "is_true", "is_false"].includes(operator)) {
        return `${field} ${opDesc}`;
    }

    return `${field} ${opDesc} "${value}"`;
}
