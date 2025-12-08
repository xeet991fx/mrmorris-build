/**
 * Action Configuration Component
 * 
 * Configuration form for workflow action steps.
 * Renders different fields based on action type.
 */

"use client";

import { WorkflowStep, ActionType, ACTION_TYPE_LABELS } from "@/lib/workflow/types";

// ============================================
// TYPES
// ============================================

interface ActionConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

// ============================================
// FIELD OPTIONS
// ============================================

const UPDATEABLE_FIELDS = [
    { value: "", label: "Select a field..." },
    { value: "status", label: "Status" },
    { value: "source", label: "Source" },
    { value: "assignedTo", label: "Assigned To" },
    { value: "tags", label: "Tags" },
    { value: "notes", label: "Notes" },
    { value: "priority", label: "Priority" },
];

const PLACEHOLDER_VARIABLES = [
    "{{firstName}}",
    "{{lastName}}",
    "{{email}}",
    "{{company}}",
    "{{phone}}",
    "{{status}}",
];

// ============================================
// SUB-COMPONENTS
// ============================================

function EmailActionFields({ step, onChange }: ActionConfigProps) {
    return (
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
                        {PLACEHOLDER_VARIABLES.map((v) => (
                            <code
                                key={v}
                                className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20"
                                onClick={() => {
                                    const body = step.config.emailBody || "";
                                    onChange({ ...step.config, emailBody: body + v });
                                }}
                            >
                                {v}
                            </code>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UpdateFieldActionFields({ step, onChange }: ActionConfigProps) {
    return (
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
                    {UPDATEABLE_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                            {f.label}
                        </option>
                    ))}
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
    );
}

function CreateTaskActionFields({ step, onChange }: ActionConfigProps) {
    return (
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
                        onChange({ ...step.config, taskDueInDays: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Days from when the action runs
                </p>
            </div>
        </div>
    );
}

function TagActionFields({ step, onChange, isRemove = false }: ActionConfigProps & { isRemove?: boolean }) {
    return (
        <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
                {isRemove ? "Tag to Remove *" : "Tag Name *"}
            </label>
            <input
                type="text"
                placeholder={isRemove ? "e.g., needs-nurturing" : "e.g., hot-lead"}
                value={step.config.tagName || ""}
                onChange={(e) =>
                    onChange({ ...step.config, tagName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
                Tag will be {isRemove ? "removed from" : "added to"} the contact/deal
            </p>
        </div>
    );
}

function NotificationActionFields({ step, onChange }: ActionConfigProps) {
    return (
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
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ActionConfig({ step, onChange }: ActionConfigProps) {
    const actionType = (step.config.actionType || "update_field") as ActionType;

    const handleActionTypeChange = (newType: ActionType) => {
        onChange({ ...step.config, actionType: newType });
    };

    return (
        <div className="space-y-5">
            {/* Action Type Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Action Type
                </label>
                <select
                    value={actionType}
                    onChange={(e) => handleActionTypeChange(e.target.value as ActionType)}
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
                <EmailActionFields step={step} onChange={onChange} />
            )}
            {actionType === "update_field" && (
                <UpdateFieldActionFields step={step} onChange={onChange} />
            )}
            {actionType === "create_task" && (
                <CreateTaskActionFields step={step} onChange={onChange} />
            )}
            {actionType === "add_tag" && (
                <TagActionFields step={step} onChange={onChange} />
            )}
            {actionType === "remove_tag" && (
                <TagActionFields step={step} onChange={onChange} isRemove />
            )}
            {actionType === "send_notification" && (
                <NotificationActionFields step={step} onChange={onChange} />
            )}
        </div>
    );
}
