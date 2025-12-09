/**
 * Wait Event Configuration Component
 * 
 * Configuration form for workflow wait_event steps.
 * Allows pausing workflow until a specific event occurs or timeout.
 */

"use client";

import { ClockIcon, BoltIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";

// ============================================
// TYPES
// ============================================

interface WaitEventConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

type EventType = "email_reply" | "email_opened" | "email_clicked" | "form_submit" | "deal_stage_changed" | "field_updated";

const EVENT_TYPES: { value: EventType; label: string; description: string }[] = [
    { value: "email_reply", label: "Email Reply", description: "Wait until contact replies to an email" },
    { value: "email_opened", label: "Email Opened", description: "Wait until contact opens an email" },
    { value: "email_clicked", label: "Link Clicked", description: "Wait until contact clicks a link in email" },
    { value: "form_submit", label: "Form Submitted", description: "Wait until contact submits a form" },
    { value: "deal_stage_changed", label: "Deal Stage Changed", description: "Wait until deal stage is updated" },
    { value: "field_updated", label: "Field Updated", description: "Wait until a specific field is updated" },
];

// ============================================
// COMPONENT
// ============================================

export default function WaitEventConfig({ step, onChange }: WaitEventConfigProps) {
    const eventType = (step.config.waitEventType || "email_reply") as EventType;
    const timeoutDays = step.config.waitTimeoutDays || 3;
    const hasTimeout = step.config.waitHasTimeout !== false; // Default true
    const timeoutAction = step.config.waitTimeoutAction || "continue"; // "continue" or "exit"

    const handleEventTypeChange = (type: EventType) => {
        onChange({ ...step.config, waitEventType: type });
    };

    const handleTimeoutDaysChange = (days: number) => {
        onChange({ ...step.config, waitTimeoutDays: Math.max(1, days) });
    };

    const handleHasTimeoutChange = (enabled: boolean) => {
        onChange({ ...step.config, waitHasTimeout: enabled });
    };

    const handleTimeoutActionChange = (action: string) => {
        onChange({ ...step.config, waitTimeoutAction: action });
    };

    const selectedEvent = EVENT_TYPES.find(e => e.value === eventType);

    const getPreviewText = () => {
        const eventLabel = selectedEvent?.label || "event";
        if (hasTimeout) {
            return `Wait for "${eventLabel}" (timeout: ${timeoutDays} days)`;
        }
        return `Wait for "${eventLabel}" indefinitely`;
    };

    return (
        <div className="space-y-5">
            {/* Event Type Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Wait For Event
                </label>
                <select
                    value={eventType}
                    onChange={(e) => handleEventTypeChange(e.target.value as EventType)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {EVENT_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                    {selectedEvent?.description}
                </p>
            </div>

            {/* Timeout Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                <div>
                    <p className="text-sm font-medium text-foreground">Enable Timeout</p>
                    <p className="text-xs text-muted-foreground">
                        Continue workflow if event does not occur within time limit
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => handleHasTimeoutChange(!hasTimeout)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasTimeout ? "bg-primary" : "bg-muted"
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasTimeout ? "translate-x-6" : "translate-x-1"
                            }`}
                    />
                </button>
            </div>

            {/* Timeout Duration */}
            {hasTimeout && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Timeout After
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={90}
                            value={timeoutDays}
                            onChange={(e) => handleTimeoutDaysChange(parseInt(e.target.value) || 1)}
                            className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                    </div>
                </div>
            )}

            {/* Timeout Action */}
            {hasTimeout && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        On Timeout
                    </label>
                    <select
                        value={timeoutAction}
                        onChange={(e) => handleTimeoutActionChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="continue">Continue to next step</option>
                        <option value="exit">Exit workflow</option>
                    </select>
                </div>
            )}

            {/* Preview Card */}
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-start gap-3">
                    <BoltIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-foreground font-medium">
                            {getPreviewText()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {hasTimeout
                                ? `The workflow will pause and wait up to ${timeoutDays} days for this event`
                                : "The workflow will wait indefinitely until this event occurs"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
