/**
 * Filter Builder Component
 * 
 * Reusable component for building filter conditions
 * used in triggers and conditions.
 */

"use client";

import { PlusIcon, FunnelIcon } from "@heroicons/react/24/outline";

// ============================================
// TYPES
// ============================================

export interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface FilterBuilderProps {
    filters: FilterCondition[];
    onChange: (filters: FilterCondition[]) => void;
    fields?: { value: string; label: string }[];
    operators?: { value: string; label: string }[];
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_FIELDS = [
    { value: "status", label: "Status" },
    { value: "source", label: "Source" },
    { value: "tags", label: "Tags" },
    { value: "company", label: "Company" },
    { value: "assignedTo", label: "Assigned To" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
];

const DEFAULT_OPERATORS = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "not contains" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
];

// ============================================
// COMPONENT
// ============================================

export default function FilterBuilder({
    filters,
    onChange,
    fields = DEFAULT_FIELDS,
    operators = DEFAULT_OPERATORS,
}: FilterBuilderProps) {
    const addFilter = () => {
        const newFilter: FilterCondition = {
            id: `filter-${Date.now()}`,
            field: fields[0]?.value || "status",
            operator: "equals",
            value: "",
        };
        onChange([...filters, newFilter]);
    };

    const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
        onChange(
            filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };

    const removeFilter = (id: string) => {
        onChange(filters.filter((f) => f.id !== id));
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                    Filters
                    {filters.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {filters.length}
                        </span>
                    )}
                </label>
            </div>

            {/* Empty state */}
            {filters.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                    No filters added. Trigger will fire for all matching events.
                </p>
            ) : (
                /* Filter list */
                <div className="space-y-2">
                    {filters.map((filter, index) => (
                        <div
                            key={filter.id}
                            className="bg-muted/30 rounded-lg p-3 space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {index === 0 ? "Where" : "And"}
                                </span>
                                <button
                                    onClick={() => removeFilter(filter.id)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {/* Field selector */}
                                <select
                                    value={filter.field}
                                    onChange={(e) =>
                                        updateFilter(filter.id, { field: e.target.value })
                                    }
                                    className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {fields.map((f) => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>

                                {/* Operator selector */}
                                <select
                                    value={filter.operator}
                                    onChange={(e) =>
                                        updateFilter(filter.id, { operator: e.target.value })
                                    }
                                    className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {operators.map((op) => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>

                                {/* Value input (hidden for is_empty/is_not_empty) */}
                                {!["is_empty", "is_not_empty"].includes(filter.operator) && (
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        value={filter.value}
                                        onChange={(e) =>
                                            updateFilter(filter.id, { value: e.target.value })
                                        }
                                        className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add button */}
            <button
                onClick={addFilter}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Filter
            </button>
        </div>
    );
}

// Export field and operator options for reuse
export { DEFAULT_FIELDS, DEFAULT_OPERATORS };
