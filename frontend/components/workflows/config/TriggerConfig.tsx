/**
 * Trigger Configuration Component
 * 
 * Configuration form for workflow trigger steps.
 */

"use client";

import { WorkflowStep, TriggerType, TRIGGER_TYPE_LABELS } from "@/lib/workflow/types";
import FilterBuilder, { FilterCondition } from "./FilterBuilder";

// ============================================
// TYPES
// ============================================

interface TriggerConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

// ============================================
// TRIGGER DESCRIPTIONS
// ============================================

const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
    contact_created: "Fires when a new contact is added to the CRM",
    contact_updated: "Fires when any contact field is modified",
    deal_created: "Fires when a new deal/opportunity is created",
    deal_stage_changed: "Fires when a deal moves to a different stage",
    form_submitted: "Fires when a form submission is received",
    email_opened: "Fires when a recipient opens an email",
    email_clicked: "Fires when a link in an email is clicked",
    manual: "Only triggered manually or via API",
};

// ============================================
// COMPONENT
// ============================================

export default function TriggerConfig({ step, onChange }: TriggerConfigProps) {
    const triggerType = (step.config.triggerType || "contact_created") as TriggerType;
    const filters: FilterCondition[] = step.config.filters || [];

    const handleTriggerTypeChange = (newType: TriggerType) => {
        onChange({ ...step.config, triggerType: newType });
    };

    const handleFiltersChange = (newFilters: FilterCondition[]) => {
        onChange({ ...step.config, filters: newFilters });
    };

    return (
        <div className="space-y-5">
            {/* Trigger Type Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Trigger Type
                </label>
                <select
                    value={triggerType}
                    onChange={(e) => handleTriggerTypeChange(e.target.value as TriggerType)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                    {TRIGGER_DESCRIPTIONS[triggerType]}
                </p>
            </div>

            {/* Deal Stage Change - Target Stage */}
            {triggerType === "deal_stage_changed" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Target Stage (optional)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., Closed Won"
                        value={step.config.fieldValue || ""}
                        onChange={(e) =>
                            onChange({ ...step.config, fieldValue: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to trigger on any stage change
                    </p>
                </div>
            )}

            {/* Filter Conditions */}
            <FilterBuilder filters={filters} onChange={handleFiltersChange} />
        </div>
    );
}
