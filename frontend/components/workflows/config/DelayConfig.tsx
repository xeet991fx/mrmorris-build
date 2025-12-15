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

            {/* Advanced Scheduling Options */}
            <div className="border-t border-border pt-5">
                <h4 className="text-sm font-medium text-foreground mb-3">Advanced Scheduling</h4>

                {/* Timezone Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Timezone
                    </label>
                    <select
                        value={step.config.timezone || "UTC"}
                        onChange={(e) => onChange({ ...step.config, timezone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    >
                        <option value="UTC">UTC (Universal)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Phoenix">Arizona Time (MST)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                        All times will be calculated in this timezone
                    </p>
                </div>

                {/* Business Hours Only */}
                <div className="mb-4">
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            checked={step.config.businessHoursOnly || false}
                            onChange={(e) =>
                                onChange({ ...step.config, businessHoursOnly: e.target.checked })
                            }
                            className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">Business Hours Only</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Only execute during business hours (9 AM - 5 PM)
                            </p>
                        </div>
                    </label>
                </div>

                {/* Custom Business Hours */}
                {step.config.businessHoursOnly && (
                    <div className="ml-7 mb-4 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    value={step.config.businessHoursStart || "09:00"}
                                    onChange={(e) =>
                                        onChange({ ...step.config, businessHoursStart: e.target.value })
                                    }
                                    className="w-full px-2 py-1.5 rounded border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    value={step.config.businessHoursEnd || "17:00"}
                                    onChange={(e) =>
                                        onChange({ ...step.config, businessHoursEnd: e.target.value })
                                    }
                                    className="w-full px-2 py-1.5 rounded border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Skip Weekends */}
                <div className="mb-4">
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            checked={step.config.skipWeekends || false}
                            onChange={(e) => onChange({ ...step.config, skipWeekends: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">Skip Weekends</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                If scheduled time falls on Saturday or Sunday, move to next Monday
                            </p>
                        </div>
                    </label>
                </div>

                {/* Respect Contact Timezone */}
                <div className="mb-4">
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            checked={step.config.respectContactTimezone || false}
                            onChange={(e) =>
                                onChange({ ...step.config, respectContactTimezone: e.target.checked })
                            }
                            className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">
                                Use Contact's Timezone
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Use contact's timezone if available (overrides workflow timezone)
                            </p>
                        </div>
                    </label>
                </div>
            </div>

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
                        {step.config.businessHoursOnly && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                ⏰ Business hours: {step.config.businessHoursStart || "09:00"} -{" "}
                                {step.config.businessHoursEnd || "17:00"} ({step.config.timezone || "UTC"})
                            </p>
                        )}
                        {step.config.skipWeekends && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                📅 Weekends will be skipped
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
