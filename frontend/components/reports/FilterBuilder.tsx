"use client";

/**
 * FilterBuilder Component
 *
 * Type-aware filter builder with support for:
 * - Field type-specific operators (string, number, date, select)
 * - Field type-specific input widgets (text, number, date, select)
 * - Relational filters (e.g., filter deals by company.industry)
 */

import React from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

// ─── Types ─────────────────────────────────────────────────────

export interface FilterCondition {
    field: string;
    operator: string;
    value?: any;
    relatedEntity?: string;
}

export interface SourceAttribute {
    field: string;
    label: string;
    type: "string" | "number" | "date" | "select" | "user" | "boolean";
    aggregations?: string[];
    groupable?: boolean;
    options?: string[];
}

export interface Relationship {
    entity: string;
    label: string;
    attributes: SourceAttribute[];
}

interface FilterBuilderProps {
    filters: FilterCondition[];
    onChange: (filters: FilterCondition[]) => void;
    attributes: SourceAttribute[];
    relationships?: Relationship[];
}

// ─── Operator Definitions ──────────────────────────────────────

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
    string: [
        { value: "eq", label: "Equals" },
        { value: "ne", label: "Not Equals" },
        { value: "contains", label: "Contains" },
        { value: "exists", label: "Exists" },
    ],
    number: [
        { value: "eq", label: "Equals" },
        { value: "ne", label: "Not Equals" },
        { value: "gt", label: "Greater Than" },
        { value: "lt", label: "Less Than" },
        { value: "gte", label: "Greater or Equal" },
        { value: "lte", label: "Less or Equal" },
        { value: "exists", label: "Exists" },
    ],
    date: [
        { value: "gt", label: "After" },
        { value: "lt", label: "Before" },
        { value: "gte", label: "On or After" },
        { value: "lte", label: "On or Before" },
        { value: "exists", label: "Exists" },
    ],
    select: [
        { value: "eq", label: "Equals" },
        { value: "ne", label: "Not Equals" },
        { value: "in", label: "In" },
        { value: "nin", label: "Not In" },
        { value: "exists", label: "Exists" },
    ],
    user: [
        { value: "eq", label: "Equals" },
        { value: "ne", label: "Not Equals" },
        { value: "exists", label: "Exists" },
    ],
    boolean: [
        { value: "eq", label: "Equals" },
        { value: "exists", label: "Exists" },
    ],
};

// ─── Filter Builder Component ──────────────────────────────────

export default function FilterBuilder({
    filters,
    onChange,
    attributes,
    relationships = [],
}: FilterBuilderProps) {
    const addFilter = () => {
        onChange([
            ...filters,
            { field: "", operator: "eq", value: "" },
        ]);
    };

    const removeFilter = (index: number) => {
        onChange(filters.filter((_, i) => i !== index));
    };

    const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
        const newFilters = [...filters];
        const oldFilter = newFilters[index];

        // If field changed, reset operator and value
        if (updates.field !== undefined && updates.field !== oldFilter.field) {
            const fieldType = getFieldType(updates.field, updates.relatedEntity);
            const validOperators = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;
            newFilters[index] = {
                ...oldFilter,
                ...updates,
                operator: validOperators[0].value,
                value: "",
            };
        } else {
            newFilters[index] = { ...oldFilter, ...updates };
        }

        onChange(newFilters);
    };

    const getFieldType = (fieldName: string, relatedEntity?: string): string => {
        if (!fieldName) return "string";

        const allAttributes = relatedEntity
            ? relationships.find((r) => r.entity === relatedEntity)?.attributes || []
            : attributes || [];

        const attr = allAttributes.find((a) => a.field === fieldName);
        return attr?.type || "string";
    };

    const getFieldOptions = (fieldName: string, relatedEntity?: string): string[] => {
        if (!fieldName) return [];

        const allAttributes = relatedEntity
            ? relationships.find((r) => r.entity === relatedEntity)?.attributes || []
            : attributes || [];

        const attr = allAttributes.find((a) => a.field === fieldName);
        return attr?.options || [];
    };

    return (
        <div className="space-y-3">
            {filters.map((filter, index) => {
                const fieldType = getFieldType(filter.field, filter.relatedEntity);
                const operators = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;
                const options = getFieldOptions(filter.field, filter.relatedEntity);

                return (
                    <div key={index} className="flex items-start gap-2">
                        {/* Field Selector */}
                        <select
                            value={filter.relatedEntity ? `${filter.relatedEntity}.${filter.field}` : filter.field}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value.includes(".")) {
                                    const [entity, field] = value.split(".");
                                    updateFilter(index, { field, relatedEntity: entity });
                                } else {
                                    updateFilter(index, { field: value, relatedEntity: undefined });
                                }
                            }}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        >
                            <option value="">Select field...</option>

                            {/* Direct fields */}
                            <optgroup label="Direct Fields">
                                {attributes.map((attr) => (
                                    <option key={attr.field} value={attr.field}>
                                        {attr.label}
                                    </option>
                                ))}
                            </optgroup>

                            {/* Relational fields */}
                            {relationships
                                .filter((rel) => rel.attributes && rel.attributes.length > 0)
                                .map((rel) => (
                                    <optgroup key={rel.entity} label={rel.label}>
                                        {rel.attributes.map((attr) => (
                                            <option key={`${rel.entity}.${attr.field}`} value={`${rel.entity}.${attr.field}`}>
                                                {attr.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                        </select>

                        {/* Operator Selector */}
                        {filter.field && (
                            <select
                                value={filter.operator}
                                onChange={(e) => updateFilter(index, { operator: e.target.value })}
                                className="w-36 px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            >
                                {operators.map((op) => (
                                    <option key={op.value} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Value Input */}
                        {filter.field && filter.operator !== "exists" && (
                            <div className="flex-1">
                                {renderValueInput(
                                    filter,
                                    fieldType,
                                    options,
                                    (value) => updateFilter(index, { value })
                                )}
                            </div>
                        )}

                        {/* Remove Button */}
                        <button
                            onClick={() => removeFilter(index)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}

            {/* Add Filter Button */}
            <button
                onClick={addFilter}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
            >
                <PlusIcon className="w-4 h-4" />
                Add Filter
            </button>
        </div>
    );
}

// ─── Value Input Renderer ──────────────────────────────────────

function renderValueInput(
    filter: FilterCondition,
    fieldType: string,
    options: string[],
    onChange: (value: any) => void
) {
    // Exists operator uses Yes/No dropdown
    if (filter.operator === "exists") {
        return (
            <select
                value={filter.value === true ? "true" : "false"}
                onChange={(e) => onChange(e.target.value === "true")}
                className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
        );
    }

    // Number input
    if (fieldType === "number") {
        return (
            <input
                type="number"
                value={filter.value || ""}
                onChange={(e) => onChange(Number(e.target.value))}
                placeholder="Enter value..."
                className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
        );
    }

    // Date input
    if (fieldType === "date") {
        return (
            <input
                type="date"
                value={filter.value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
        );
    }

    // Select input (single or multi)
    if (fieldType === "select" && options.length > 0) {
        const isMulti = filter.operator === "in" || filter.operator === "nin";

        if (isMulti) {
            return (
                <select
                    multiple
                    value={Array.isArray(filter.value) ? filter.value : []}
                    onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        onChange(selected);
                    }}
                    className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    size={Math.min(options.length, 4)}
                >
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            );
        }

        return (
            <select
                value={filter.value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
                <option value="">Select value...</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    // Boolean input
    if (fieldType === "boolean") {
        return (
            <select
                value={filter.value === true ? "true" : "false"}
                onChange={(e) => onChange(e.target.value === "true")}
                className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        );
    }

    // Default: Text input
    return (
        <input
            type="text"
            value={filter.value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter value..."
            className="w-full px-2.5 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        />
    );
}
