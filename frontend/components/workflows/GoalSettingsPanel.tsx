"use client";

import { useState } from "react";
import { TrashIcon, PlusIcon, LightBulbIcon } from "@heroicons/react/24/outline";

interface GoalCriteria {
    type: "field_value" | "completion_time" | "step_reached" | "custom_event";
    field?: string;
    operator?: "equals" | "greater_than" | "less_than" | "contains";
    value?: string;
    stepId?: string;
    eventName?: string;
    timeValue?: number;
    timeUnit?: "hours" | "days" | "weeks";
}

interface GoalSettingsPanelProps {
    goals: GoalCriteria[];
    onChange: (goals: GoalCriteria[]) => void;
    workflowSteps: Array<{ id: string; name: string }>;
}

export default function GoalSettingsPanel({
    goals,
    onChange,
    workflowSteps,
}: GoalSettingsPanelProps) {
    const [localGoals, setLocalGoals] = useState<GoalCriteria[]>(goals || []);

    const handleAddGoal = () => {
        const newGoal: GoalCriteria = {
            type: "field_value",
            field: "status",
            operator: "equals",
            value: "",
        };
        const updated = [...localGoals, newGoal];
        setLocalGoals(updated);
        onChange(updated);
    };

    const handleRemoveGoal = (index: number) => {
        const updated = localGoals.filter((_, i) => i !== index);
        setLocalGoals(updated);
        onChange(updated);
    };

    const handleUpdateGoal = (index: number, updates: Partial<GoalCriteria>) => {
        const updated = localGoals.map((goal, i) =>
            i === index ? { ...goal, ...updates } : goal
        );
        setLocalGoals(updated);
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-foreground">Workflow Goals</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Define success criteria for this workflow
                    </p>
                </div>
                <button
                    onClick={handleAddGoal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add Goal
                </button>
            </div>

            {/* Goals List */}
            {localGoals.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-sm text-muted-foreground mb-2">No goals defined yet</p>
                    <p className="text-xs text-muted-foreground">
                        Add goals to track workflow success metrics
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {localGoals.map((goal, index) => (
                        <div
                            key={index}
                            className="bg-card border border-border rounded-lg p-4 space-y-3"
                        >
                            {/* Goal Type */}
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Goal Type
                                    </label>
                                    <select
                                        value={goal.type}
                                        onChange={(e) =>
                                            handleUpdateGoal(index, {
                                                type: e.target.value as GoalCriteria["type"],
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="field_value">Field Value Match</option>
                                        <option value="step_reached">Reach Specific Step</option>
                                        <option value="completion_time">Complete Within Time</option>
                                        <option value="custom_event">Custom Event</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => handleRemoveGoal(index)}
                                    className="mt-6 p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                                    title="Remove goal"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Field Value Match */}
                            {goal.type === "field_value" && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                            Field
                                        </label>
                                        <input
                                            type="text"
                                            value={goal.field || ""}
                                            onChange={(e) =>
                                                handleUpdateGoal(index, { field: e.target.value })
                                            }
                                            placeholder="e.g., status"
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                            Operator
                                        </label>
                                        <select
                                            value={goal.operator || "equals"}
                                            onChange={(e) =>
                                                handleUpdateGoal(index, {
                                                    operator: e.target.value as GoalCriteria["operator"],
                                                })
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="equals">Equals</option>
                                            <option value="contains">Contains</option>
                                            <option value="greater_than">Greater Than</option>
                                            <option value="less_than">Less Than</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                            Value
                                        </label>
                                        <input
                                            type="text"
                                            value={goal.value || ""}
                                            onChange={(e) =>
                                                handleUpdateGoal(index, { value: e.target.value })
                                            }
                                            placeholder="e.g., customer"
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step Reached */}
                            {goal.type === "step_reached" && (
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Target Step
                                    </label>
                                    <select
                                        value={goal.stepId || ""}
                                        onChange={(e) =>
                                            handleUpdateGoal(index, { stepId: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="">Select a step...</option>
                                        {workflowSteps.map((step) => (
                                            <option key={step.id} value={step.id}>
                                                {step.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Completion Time */}
                            {goal.type === "completion_time" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                            Complete Within
                                        </label>
                                        <input
                                            type="number"
                                            value={goal.timeValue || 1}
                                            onChange={(e) =>
                                                handleUpdateGoal(index, {
                                                    timeValue: parseInt(e.target.value) || 1,
                                                })
                                            }
                                            min="1"
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                            Time Unit
                                        </label>
                                        <select
                                            value={goal.timeUnit || "days"}
                                            onChange={(e) =>
                                                handleUpdateGoal(index, {
                                                    timeUnit: e.target.value as GoalCriteria["timeUnit"],
                                                })
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="hours">Hours</option>
                                            <option value="days">Days</option>
                                            <option value="weeks">Weeks</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Custom Event */}
                            {goal.type === "custom_event" && (
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Event Name
                                    </label>
                                    <input
                                        type="text"
                                        value={goal.eventName || ""}
                                        onChange={(e) =>
                                            handleUpdateGoal(index, { eventName: e.target.value })
                                        }
                                        placeholder="e.g., purchase_completed"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                            )}

                            {/* Goal Description */}
                            <div className="pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                    {goal.type === "field_value" &&
                                        `Goal met when ${goal.field || "field"} ${goal.operator || "equals"
                                        } "${goal.value || "value"}"`}
                                    {goal.type === "step_reached" &&
                                        `Goal met when contact reaches ${workflowSteps.find((s) => s.id === goal.stepId)?.name ||
                                        "selected step"
                                        }`}
                                    {goal.type === "completion_time" &&
                                        `Goal met when workflow completes within ${goal.timeValue || 1} ${goal.timeUnit || "days"
                                        }`}
                                    {goal.type === "custom_event" &&
                                        `Goal met when "${goal.eventName || "event"}" is triggered`}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <LightBulbIcon className="w-3.5 h-3.5" /> <strong>Tip:</strong> Goals help track success metrics and conversion rates. They're
                    used in analytics to measure workflow effectiveness.
                </p>
            </div>
        </div>
    );
}
