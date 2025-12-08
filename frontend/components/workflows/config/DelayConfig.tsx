/**
 * Delay Configuration Component
 * 
 * Configuration form for workflow delay steps.
 */

"use client";

import { ClockIcon } from "@heroicons/react/24/outline";
import { WorkflowStep, DelayUnit, DELAY_UNIT_LABELS } from "@/lib/workflow/types";

// ============================================
// TYPES
// ============================================

interface DelayConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function DelayConfig({ step, onChange }: DelayConfigProps) {
    const delayValue = step.config.delayValue || 1;
    const delayUnit = (step.config.delayUnit || "days") as DelayUnit;

    const handleValueChange = (value: number) => {
        onChange({ ...step.config, delayValue: Math.max(1, value) });
    };

    const handleUnitChange = (unit: DelayUnit) => {
        onChange({ ...step.config, delayUnit: unit });
    };

    return (
        <div className="space-y-5">
            {/* Duration Inputs */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Wait Duration
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min={1}
                        value={delayValue}
                        onChange={(e) => handleValueChange(parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <select
                        value={delayUnit}
                        onChange={(e) => handleUnitChange(e.target.value as DelayUnit)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {Object.entries(DELAY_UNIT_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Preview Card */}
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg p-4 border border-orange-500/20">
                <div className="flex items-start gap-3">
                    <ClockIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-foreground font-medium">
                            Wait {delayValue} {delayUnit}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            The workflow will pause at this step and resume automatically after the specified time
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
