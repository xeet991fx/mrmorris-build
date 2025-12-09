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
    const delayType = step.config.delayType || "duration";
    const delayValue = step.config.delayValue || 1;
    const delayUnit = (step.config.delayUnit || "days") as DelayUnit;
    const delayDate = step.config.delayDate || "";
    const delayTime = step.config.delayTime || "09:00";
    const delayWeekday = step.config.delayWeekday || "1"; // Monday

    const handleTypeChange = (type: string) => {
        onChange({ ...step.config, delayType: type });
    };

    const handleValueChange = (value: number) => {
        onChange({ ...step.config, delayValue: Math.max(1, value) });
    };

    const handleUnitChange = (unit: DelayUnit) => {
        onChange({ ...step.config, delayUnit: unit });
    };

    const handleDateChange = (date: string) => {
        onChange({ ...step.config, delayDate: date });
    };

    const handleTimeChange = (time: string) => {
        onChange({ ...step.config, delayTime: time });
    };

    const handleWeekdayChange = (weekday: string) => {
        onChange({ ...step.config, delayWeekday: weekday });
    };

    const weekdays = [
        { value: "0", label: "Sunday" },
        { value: "1", label: "Monday" },
        { value: "2", label: "Tuesday" },
        { value: "3", label: "Wednesday" },
        { value: "4", label: "Thursday" },
        { value: "5", label: "Friday" },
        { value: "6", label: "Saturday" },
    ];

    const getPreviewText = () => {
        switch (delayType) {
            case "duration":
                return `Wait ${delayValue} ${delayUnit}`;
            case "until_date":
                return delayDate ? `Wait until ${new Date(delayDate).toLocaleDateString()}` : "Wait until specific date";
            case "until_time":
                return `Wait until ${delayTime}`;
            case "until_weekday":
                const day = weekdays.find(d => d.value === delayWeekday)?.label || "Monday";
                return `Wait until next ${day}`;
            default:
                return `Wait ${delayValue} ${delayUnit}`;
        }
    };

    return (
        <div className="space-y-5">
            {/* Delay Type Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Delay Type
                </label>
                <select
                    value={delayType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="duration">Wait for a duration</option>
                    <option value="until_date">Wait until a specific date</option>
                    <option value="until_time">Wait until a specific time</option>
                    <option value="until_weekday">Wait until a day of week</option>
                </select>
            </div>

            {/* Duration Inputs */}
            {delayType === "duration" && (
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
            )}

            {/* Date Input */}
            {delayType === "until_date" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Target Date
                    </label>
                    <input
                        type="date"
                        value={delayDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            )}

            {/* Time Input */}
            {delayType === "until_time" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Target Time
                    </label>
                    <input
                        type="time"
                        value={delayTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Will execute at this time today, or tomorrow if the time has already passed
                    </p>
                </div>
            )}

            {/* Weekday Input */}
            {delayType === "until_weekday" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Day of Week
                    </label>
                    <select
                        value={delayWeekday}
                        onChange={(e) => handleWeekdayChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {weekdays.map(({ value, label }) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                        Will execute at 9:00 AM on the next occurrence of this day
                    </p>
                </div>
            )}

            {/* Preview Card */}
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg p-4 border border-orange-500/20">
                <div className="flex items-start gap-3">
                    <ClockIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-foreground font-medium">
                            {getPreviewText()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            The workflow will pause at this step and resume automatically at the specified time
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
