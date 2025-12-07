"use client";

import { useState, useEffect, Fragment } from "react";
import { Transition } from "@headlessui/react";
import {
    XMarkIcon,
    TrashIcon,
    BoltIcon,
    EnvelopeIcon,
    ClockIcon,
    PlusIcon,
    FunnelIcon,
} from "@heroicons/react/24/outline";
import {
    WorkflowStep,
    TriggerType,
    ActionType,
    DelayUnit,
    TRIGGER_TYPE_LABELS,
    ACTION_TYPE_LABELS,
    DELAY_UNIT_LABELS,
} from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface WorkflowConfigPanelProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    onDelete: () => void;
    onClose: () => void;
}

// Filter field options
const FILTER_FIELDS = [
    { value: "status", label: "Status" },
    { value: "source", label: "Source" },
    { value: "tags", label: "Tags" },
    { value: "company", label: "Company" },
    { value: "assignedTo", label: "Assigned To" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
];

const FILTER_OPERATORS = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "not contains" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
];

// ============================================
// FILTER BUILDER COMPONENT
// ============================================

function FilterBuilder({
    filters,
    onChange,
}: {
    filters: FilterCondition[];
    onChange: (filters: FilterCondition[]) => void;
}) {
    const addFilter = () => {
        const newFilter: FilterCondition = {
            id: `filter-${Date.now()}`,
            field: "status",
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

            {filters.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                    No filters added. Trigger will fire for all matching events.
                </p>
            ) : (
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
                                <select
                                    value={filter.field}
                                    onChange={(e) =>
                                        updateFilter(filter.id, { field: e.target.value })
                                    }
                                    className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {FILTER_FIELDS.map((f) => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={filter.operator}
                                    onChange={(e) =>
                                        updateFilter(filter.id, { operator: e.target.value })
                                    }
                                    className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {FILTER_OPERATORS.map((op) => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
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

// ============================================
// TRIGGER CONFIG
// ============================================

function TriggerConfig({
    step,
    onChange,
}: {
    step: WorkflowStep;
    onChange: (config: any) => void;
}) {
    const triggerType = step.config.triggerType || "contact_created";
    const filters: FilterCondition[] = step.config.filters || [];

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Trigger Type
                </label>
                <select
                    value={triggerType}
                    onChange={(e) =>
                        onChange({ ...step.config, triggerType: e.target.value as TriggerType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                    {getTriggerDescription(triggerType as TriggerType)}
                </p>
            </div>

            {/* Trigger-specific options */}
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
            <FilterBuilder
                filters={filters}
                onChange={(newFilters) =>
                    onChange({ ...step.config, filters: newFilters })
                }
            />
        </div>
    );
}

function getTriggerDescription(type: TriggerType): string {
    const descriptions: Record<TriggerType, string> = {
        contact_created: "Fires when a new contact is added to the CRM",
        contact_updated: "Fires when any contact field is modified",
        deal_created: "Fires when a new deal/opportunity is created",
        deal_stage_changed: "Fires when a deal moves to a different stage",
        form_submitted: "Fires when a form submission is received",
        email_opened: "Fires when a recipient opens an email",
        email_clicked: "Fires when a link in an email is clicked",
        manual: "Only triggered manually or via API",
    };
    return descriptions[type] || "";
}

// ============================================
// ACTION CONFIG
// ============================================

function ActionConfig({
    step,
    onChange,
}: {
    step: WorkflowStep;
    onChange: (config: any) => void;
}) {
    const actionType = step.config.actionType || "update_field";

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Action Type
                </label>
                <select
                    value={actionType}
                    onChange={(e) =>
                        onChange({ ...step.config, actionType: e.target.value as ActionType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Action-specific fields */}
            {actionType === "send_email" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Email Subject *
                        </label>
                        <input
                            type="text"
                            placeholder="Enter email subject..."
                            value={step.config.emailSubject || ""}
                            onChange={(e) =>
                                onChange({ ...step.config, emailSubject: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Email Body *
                        </label>
                        <textarea
                            placeholder="Enter email content..."
                            value={step.config.emailBody || ""}
                            onChange={(e) =>
                                onChange({ ...step.config, emailBody: e.target.value })
                            }
                            rows={5}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                        <div className="mt-2 p-2 bg-muted/30 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Available variables:</p>
                            <div className="flex flex-wrap gap-1">
                                {["{{firstName}}", "{{lastName}}", "{{email}}", "{{company}}"].map((v) => (
                                    <code key={v} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        {v}
                                    </code>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {actionType === "update_field" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Field to Update *
                        </label>
                        <select
                            value={step.config.fieldName || ""}
                            onChange={(e) =>
                                onChange({ ...step.config, fieldName: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Select a field...</option>
                            <option value="status">Status</option>
                            <option value="source">Source</option>
                            <option value="assignedTo">Assigned To</option>
                            <option value="tags">Tags</option>
                            <option value="notes">Notes</option>
                            <option value="priority">Priority</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            New Value *
                        </label>
                        <input
                            type="text"
                            placeholder="Enter new value..."
                            value={step.config.fieldValue || ""}
                            onChange={(e) =>
                                onChange({ ...step.config, fieldValue: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>
            )}

            {actionType === "create_task" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Task Title *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Follow up with {{firstName}}"
                            value={step.config.taskTitle || ""}
                            onChange={(e) =>
                                onChange({ ...step.config, taskTitle: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Description
                        </label>
                        <textarea
                            placeholder="Task details..."
                            value={step.config.taskDescription || ""}
                            onChange={(e) =>
                                onChange({ ...step.config, taskDescription: e.target.value })
                            }
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Due In (Days)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={step.config.taskDueInDays || 0}
                            onChange={(e) =>
                                onChange({ ...step.config, taskDueInDays: parseInt(e.target.value) })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Days from when the action runs
                        </p>
                    </div>
                </div>
            )}

            {actionType === "add_tag" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Tag Name *
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., hot-lead"
                        value={step.config.tagName || ""}
                        onChange={(e) =>
                            onChange({ ...step.config, tagName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Tag will be added to the contact/deal
                    </p>
                </div>
            )}

            {actionType === "remove_tag" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Tag to Remove *
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., needs-nurturing"
                        value={step.config.tagName || ""}
                        onChange={(e) =>
                            onChange({ ...step.config, tagName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            )}

            {actionType === "send_notification" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Notification Message *
                    </label>
                    <textarea
                        placeholder="e.g., New lead {{firstName}} needs attention!"
                        value={step.config.notificationMessage || ""}
                        onChange={(e) =>
                            onChange({ ...step.config, notificationMessage: e.target.value })
                        }
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Notification will be sent to the assigned user
                    </p>
                </div>
            )}
        </div>
    );
}

// ============================================
// DELAY CONFIG
// ============================================

function DelayConfig({
    step,
    onChange,
}: {
    step: WorkflowStep;
    onChange: (config: any) => void;
}) {
    const delayValue = step.config.delayValue || 1;
    const delayUnit = step.config.delayUnit || "days";

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Wait Duration
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min={1}
                        value={delayValue}
                        onChange={(e) =>
                            onChange({ ...step.config, delayValue: parseInt(e.target.value) || 1 })
                        }
                        className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <select
                        value={delayUnit}
                        onChange={(e) =>
                            onChange({ ...step.config, delayUnit: e.target.value as DelayUnit })
                        }
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

// ============================================
// CONDITION CONFIG
// ============================================

function ConditionConfig({
    step,
    onChange,
}: {
    step: WorkflowStep;
    onChange: (config: any) => void;
}) {
    const condition = step.config.conditions?.[0] || {
        field: "status",
        operator: "equals" as any,
        value: "",
    };

    return (
        <div className="space-y-5">
            <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-lg p-4 border border-teal-500/20">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🔀</span>
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

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Field to Check
                    </label>
                    <select
                        value={condition.field}
                        onChange={(e) =>
                            onChange({
                                ...step.config,
                                conditions: [{ ...condition, field: e.target.value }],
                            })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {FILTER_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                                {field.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Condition
                    </label>
                    <select
                        value={condition.operator}
                        onChange={(e) =>
                            onChange({
                                ...step.config,
                                conditions: [{ ...condition, operator: e.target.value }],
                            })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {FILTER_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                </div>

                {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Value
                        </label>
                        <input
                            type="text"
                            placeholder="Enter value..."
                            value={condition.value || ""}
                            onChange={(e) =>
                                onChange({
                                    ...step.config,
                                    conditions: [{ ...condition, value: e.target.value }],
                                })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                )}
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Preview:</span> If {condition.field}{" "}
                    {condition.operator}{" "}
                    {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                        <span className="font-medium text-foreground">"{condition.value || "..."}"</span>
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkflowConfigPanel({
    step,
    onUpdate,
    onDelete,
    onClose,
}: WorkflowConfigPanelProps) {
    const [name, setName] = useState(step.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Update name when step changes
    useEffect(() => {
        setName(step.name);
        setShowDeleteConfirm(false);
    }, [step.id, step.name]);

    const handleConfigChange = (newConfig: any) => {
        onUpdate({ config: newConfig });
    };

    const handleNameBlur = () => {
        if (name !== step.name) {
            onUpdate({ name });
        }
    };

    const handleDelete = () => {
        if (showDeleteConfirm) {
            onDelete();
        } else {
            setShowDeleteConfirm(true);
        }
    };

    // Get panel header info based on step type
    const getPanelInfo = () => {
        switch (step.type) {
            case "trigger":
                return {
                    icon: <BoltIcon className="w-5 h-5" />,
                    color: "from-violet-500 to-purple-600",
                    bgColor: "bg-violet-500/10",
                    label: "Configure Trigger",
                };
            case "action":
                return {
                    icon: <EnvelopeIcon className="w-5 h-5" />,
                    color: "from-blue-500 to-cyan-600",
                    bgColor: "bg-blue-500/10",
                    label: "Configure Action",
                };
            case "delay":
                return {
                    icon: <ClockIcon className="w-5 h-5" />,
                    color: "from-orange-500 to-amber-600",
                    bgColor: "bg-orange-500/10",
                    label: "Configure Delay",
                };
            case "condition":
                return {
                    icon: <span className="text-xl">🔀</span>,
                    color: "from-teal-500 to-cyan-600",
                    bgColor: "bg-teal-500/10",
                    label: "Configure Condition",
                };
            default:
                return {
                    icon: <BoltIcon className="w-5 h-5" />,
                    color: "from-gray-500 to-gray-600",
                    bgColor: "bg-gray-500/10",
                    label: "Configure Step",
                };
        }
    };

    const panelInfo = getPanelInfo();

    return (
        <div className="w-80 border-l border-border bg-card flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br shadow-sm",
                            panelInfo.color
                        )}
                    >
                        {panelInfo.icon}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {panelInfo.label}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                            {step.type} step
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    title="Close panel"
                >
                    <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-5">
                    {/* Step Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Step Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleNameBlur}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Enter step name..."
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Type-specific config */}
                    {step.type === "trigger" && (
                        <TriggerConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "action" && (
                        <ActionConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "delay" && (
                        <DelayConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "condition" && (
                        <ConditionConfig step={step} onChange={handleConfigChange} />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/20">
                {showDeleteConfirm ? (
                    <div className="space-y-2">
                        <p className="text-xs text-center text-muted-foreground">
                            Are you sure? This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Delete Step
                    </button>
                )}
            </div>
        </div>
    );
}
