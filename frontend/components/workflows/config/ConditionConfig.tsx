/**
 * Condition Configuration Component
 * 
 * Configuration form for workflow condition/branching steps.
 */

"use client";

import { WorkflowStep } from "@/lib/workflow/types";
import { DEFAULT_FIELDS, DEFAULT_OPERATORS } from "./FilterBuilder";
import { GitBranch } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface ConditionConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function ConditionConfig({ step, onChange }: ConditionConfigProps) {
    const condition: { field: string; operator: string; value?: string } = step.config.conditions?.[0] || {
        field: "status",
        operator: "equals",
        value: "",
    };

    const updateCondition = (updates: Partial<{ field: string; operator: string; value?: string }>) => {
        onChange({
            ...step.config,
            conditions: [{ ...condition, ...updates }],
        });
    };

    return (
        <div className="space-y-5">
            {/* Info Box */}
            <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-lg p-4 border border-teal-500/20">
                <div className="flex items-start gap-3">
                    <GitBranch className="w-8 h-8 text-teal-600" />
                    <div>
                        <p className="text-sm text-foreground font-medium">
                            Branching Logic
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            The workflow will split into two paths based on this condition
                        </p>
                    </div>
                </div>
            </div>

            {/* Field Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Field to Check
                </label>
                <select
                    value={condition.field}
                    onChange={(e) => updateCondition({ field: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {DEFAULT_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                            {field.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Operator Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Condition
                </label>
                <select
                    value={condition.operator}
                    onChange={(e) => updateCondition({ operator: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {DEFAULT_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                            {op.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Value Input */}
            {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Value
                    </label>
                    <input
                        type="text"
                        placeholder="Enter value..."
                        value={condition.value || ""}
                        onChange={(e) => updateCondition({ value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            )}

            {/* Preview */}
            <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Preview:</span> If{" "}
                    {condition.field} {condition.operator}{" "}
                    {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                        <span className="font-medium text-foreground">
                            &quot;{condition.value || "..."}&quot;
                        </span>
                    )}
                </p>
                <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">YES → Right path</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-muted-foreground">NO → Bottom path</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
