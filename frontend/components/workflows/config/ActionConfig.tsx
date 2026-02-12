/**
 * Action Configuration Component
 * 
 * Configuration form for workflow action steps.
 * Renders different fields based on action type.
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { WorkflowStep, ActionType, ACTION_TYPE_LABELS } from "@/lib/workflow/types";
import SmsActionConfig from "./SmsActionConfig";
import { DragInput } from "../DragInput";
import { DragTextarea } from "../DragTextarea";
import { DataSourceFloatingCard } from "../DataSourceFloatingCard";
import { useDataSources } from "@/hooks/useDataSources";
import {
    ClipboardDocumentIcon,
    PencilIcon,
    EnvelopeIcon,
    LightBulbIcon,
    UserIcon,
    ArrowPathIcon,
    BuildingOfficeIcon,
    LinkIcon
} from "@heroicons/react/24/outline";

// ============================================
// TYPES
// ============================================

interface ActionConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
    workspaceId?: string;
    workflowId?: string;
}

interface EmailTemplate {
    _id: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    thumbnailColor?: string;
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

function EmailActionFields({ step, onChange, dataSources }: ActionConfigProps & { dataSources: any[] }) {
    const params = useParams();
    const workspaceId = (params?.workspaceId || params?.id) as string; // Support both param names
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [useTemplate, setUseTemplate] = useState(!!step.config.emailTemplateId);
    const useCustomEmail = step.config.useCustomEmail || false;

    // Fetch templates on mount
    useEffect(() => {
        if (workspaceId) {
            fetchTemplates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await res.json();
            if (data.success) {
                let templateList = data.data || [];

                // If no templates found, fetch/create defaults
                if (templateList.length === 0) {
                    const defaultsRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/defaults`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    const defaultsData = await defaultsRes.json();
                    if (defaultsData.success) {
                        templateList = defaultsData.data || [];
                    }
                }

                setTemplates(templateList);
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find((t) => t._id === templateId);
        if (template) {
            onChange({
                ...step.config,
                emailTemplateId: templateId,
                emailSubject: template.subject,
                emailBody: template.body,
            });
        } else {
            onChange({
                ...step.config,
                emailTemplateId: "",
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Template vs Custom Toggle */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Content
                </label>
                <div className="flex gap-2 mb-2">
                    <button
                        type="button"
                        onClick={() => {
                            setUseTemplate(true);
                            fetchTemplates();
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${useTemplate
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}
                    >
                        <ClipboardDocumentIcon className="w-4 h-4" /> Use Template
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setUseTemplate(false);
                            onChange({ ...step.config, emailTemplateId: "" });
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${!useTemplate
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}
                    >
                        <PencilIcon className="w-4 h-4" /> Write Custom
                    </button>
                </div>
            </div>

            {/* Template Selector */}
            {useTemplate && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Select Template
                    </label>
                    <select
                        value={step.config.emailTemplateId || ""}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        disabled={loadingTemplates}
                    >
                        <option value="">
                            {loadingTemplates ? "Loading templates..." : "Select a template..."}
                        </option>
                        {templates.map((t) => (
                            <option key={t._id} value={t._id}>
                                {t.name} ({t.category})
                            </option>
                        ))}
                    </select>
                    {templates.length === 0 && !loadingTemplates && (
                        <p className="text-xs text-muted-foreground mt-1">
                            No templates found. Create templates in Email Templates section.
                        </p>
                    )}
                </div>
            )}

            {/* Recipient Selection */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Send Email To *
                </label>
                <div className="flex gap-2 mb-2">
                    <button
                        type="button"
                        onClick={() => onChange({ ...step.config, useCustomEmail: false, recipientEmail: "" })}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${!useCustomEmail
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}
                    >
                        <EnvelopeIcon className="w-4 h-4" /> Enrolled Contact
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ ...step.config, useCustomEmail: true })}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${useCustomEmail
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}
                    >
                        <EnvelopeIcon className="w-4 h-4" /> Custom Email
                    </button>
                </div>

                {useCustomEmail ? (
                    <div>
                        <DragInput
                            value={step.config.recipientEmail || ""}
                            onChange={(value) =>
                                onChange({ ...step.config, recipientEmail: value })
                            }
                            placeholder="e.g., sales@yourcompany.com"
                            className="w-full"
                        />
                    </div>
                ) : (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                            <EnvelopeIcon className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {"{{email}}"} — Contact&apos;s email address
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Email will be sent to the enrolled contact/lead
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Subject Field */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Subject *
                </label>
                <DragInput
                    value={step.config.emailSubject || ""}
                    onChange={(value) =>
                        onChange({ ...step.config, emailSubject: value })
                    }
                    placeholder="e.g., Welcome to our service, {{firstName}}!"
                    className="w-full"
                />
            </div>

            {/* Body Field */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Body *
                </label>
                <DragTextarea
                    value={step.config.emailBody || ""}
                    onChange={(value) =>
                        onChange({ ...step.config, emailBody: value })
                    }
                    placeholder="Hi {{firstName}},&#10;&#10;Thanks for connecting with us!&#10;&#10;Best regards"
                    rows={5}
                    className="w-full"
                />
                <div className="mt-2 p-2 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <LightBulbIcon className="w-3 h-3" /> Click to insert variables:
                    </p>
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


function UpdateFieldActionFields({ step, onChange, dataSources }: ActionConfigProps & { dataSources: any[] }) {
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
                <DragInput
                    value={step.config.fieldValue || ""}
                    onChange={(value) =>
                        onChange({ ...step.config, fieldValue: value })
                    }
                    placeholder="Enter new value..."
                    className="w-full"
                />
            </div>
        </div>
    );
}

function CreateTaskActionFields({ step, onChange, dataSources }: ActionConfigProps & { dataSources: any[] }) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Task Title *
                </label>
                <DragInput
                    value={step.config.taskTitle || ""}
                    onChange={(value) =>
                        onChange({ ...step.config, taskTitle: value })
                    }
                    placeholder="e.g., Follow up with {{firstName}}"
                    className="w-full"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Description
                </label>
                <DragTextarea
                    value={step.config.taskDescription || ""}
                    onChange={(value) =>
                        onChange({ ...step.config, taskDescription: value })
                    }
                    placeholder="Task details..."
                    rows={3}
                    className="w-full"
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

interface TeamMember {
    _id: string;
    name: string;
    email: string;
}

interface WorkflowListItem {
    _id: string;
    name: string;
    status: string;
}

function AssignOwnerActionFields({ step, onChange }: ActionConfigProps) {
    const params = useParams();
    const workspaceId = params?.id as string;
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // For now, we'll use a simple input
        // In a full implementation, you'd fetch team members
        // fetchTeamMembers();
    }, [workspaceId]);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Assign To (User ID) *
                </label>
                <input
                    type="text"
                    placeholder="Enter user ID to assign ownership"
                    value={step.config.taskAssignee || ""}
                    onChange={(e) =>
                        onChange({ ...step.config, taskAssignee: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    The contact/deal will be assigned to this user
                </p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Owner Assignment
                        </p>
                        <p className="text-xs text-muted-foreground">
                            The new owner will be notified and can see this record in their dashboard
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EnrollWorkflowActionFields({ step, onChange }: ActionConfigProps) {
    const params = useParams();
    const workspaceId = params?.id as string;
    const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWorkflows = async () => {
            if (!workspaceId) return;
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/workflows`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const data = await res.json();
                if (data.success) {
                    // Filter out current workflow and only show active ones
                    const availableWorkflows = (data.data?.workflows || []).filter(
                        (w: WorkflowListItem) => w.status === "active"
                    );
                    setWorkflows(availableWorkflows);
                }
            } catch (error) {
                console.error("Failed to fetch workflows:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkflows();
    }, [workspaceId]);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Target Workflow *
                </label>
                <select
                    value={step.config.targetWorkflowId || ""}
                    onChange={(e) =>
                        onChange({ ...step.config, targetWorkflowId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={loading}
                >
                    <option value="">
                        {loading ? "Loading workflows..." : "Select a workflow..."}
                    </option>
                    {workflows.map((w) => (
                        <option key={w._id} value={w._id}>
                            {w.name}
                        </option>
                    ))}
                </select>
                {workflows.length === 0 && !loading && (
                    <p className="text-xs text-muted-foreground mt-1">
                        No active workflows found. Activate other workflows first.
                    </p>
                )}
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                    <ArrowPathIcon className="w-5 h-5 text-purple-500" />
                    <div>
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            Workflow Chaining
                        </p>
                        <p className="text-xs text-muted-foreground">
                            The contact/deal will be enrolled in the selected workflow after this step
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ActionConfig({ step, onChange, workspaceId, workflowId }: ActionConfigProps) {
    const actionType = (step.config.actionType || "update_field") as ActionType;

    // Fetch available data sources for autocomplete
    const { dataSources } = useDataSources(workspaceId, workflowId, step.id);

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
                <EmailActionFields step={step} onChange={onChange} dataSources={dataSources} />
            )}
            {actionType === "update_field" && (
                <UpdateFieldActionFields step={step} onChange={onChange} dataSources={dataSources} />
            )}
            {actionType === "create_task" && (
                <CreateTaskActionFields step={step} onChange={onChange} dataSources={dataSources} />
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
            {actionType === "assign_owner" && (
                <AssignOwnerActionFields step={step} onChange={onChange} />
            )}
            {actionType === "enroll_workflow" && (
                <EnrollWorkflowActionFields step={step} onChange={onChange} />
            )}
            {actionType === "update_lead_score" && (
                <UpdateLeadScoreActionFields step={step} onChange={onChange} />
            )}
            {actionType === "send_webhook" && (
                <WebhookActionFields step={step} onChange={onChange} />
            )}
            {actionType === "apollo_enrich" && (
                <ApolloEnrichActionFields step={step} onChange={onChange} />
            )}
            {actionType === "wait_event" && (
                <WaitEventActionFields step={step} onChange={onChange} />
            )}
            {actionType === "send_sms" && (
                <SmsActionFields step={step} onChange={onChange} />
            )}

            {/* Floating Data Source Card */}
            <DataSourceFloatingCard
                dataSources={dataSources}
                workspaceId={workspaceId}
                workflowId={workflowId}
            />
        </div>
    );
}

// Apollo Enrich Fields
function ApolloEnrichActionFields({ step, onChange }: ActionConfigProps) {
    const enrichType = step.config.enrichType || "person";

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Enrichment Type *
                </label>
                <select
                    value={enrichType}
                    onChange={(e) => onChange({ ...step.config, enrichType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="person">Enrich Person (Contact)</option>
                    <option value="company">Enrich Company</option>
                    <option value="linkedin_to_email">LinkedIn to Email</option>
                </select>
            </div>

            {enrichType === "person" && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-purple-500" />
                        <div>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                Person Enrichment
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Find email, phone, LinkedIn, job title, and location from name and company
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {enrichType === "company" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Company Enrichment
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Find industry, size, revenue, LinkedIn, and website from company name
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {enrichType === "linkedin_to_email" && (
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-sky-500" />
                        <div>
                            <p className="text-sm font-medium text-sky-600 dark:text-sky-400">
                                LinkedIn to Email
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Find email address from contact&apos;s LinkedIn profile URL
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Apollo.io Credits
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Each enrichment uses 1 Apollo credit. Make sure your API key is configured.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Placeholder components for new action types
function UpdateLeadScoreActionFields({ step, onChange }: ActionConfigProps) {
    const scoreMethod = step.config.scoreMethod || "points";

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Score Method
                </label>
                <select
                    value={scoreMethod}
                    onChange={(e) => onChange({ ...step.config, scoreMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="points">Add/Subtract Points</option>
                    <option value="event">Trigger Event Type</option>
                </select>
            </div>

            {scoreMethod === "points" ? (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Points to Add/Subtract
                    </label>
                    <input
                        type="number"
                        placeholder="e.g., 10 or -5"
                        value={step.config.scorePoints || ""}
                        onChange={(e) => onChange({ ...step.config, scorePoints: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Use positive numbers to add, negative to subtract
                    </p>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Event Type
                    </label>
                    <select
                        value={step.config.scoreEventType || ""}
                        onChange={(e) => onChange({ ...step.config, scoreEventType: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Select event...</option>
                        <option value="email_opened">Email Opened (+5)</option>
                        <option value="email_clicked">Email Clicked (+10)</option>
                        <option value="form_submitted">Form Submitted (+20)</option>
                        <option value="demo_requested">Demo Requested (+50)</option>
                        <option value="deal_won">Deal Won (+100)</option>
                        <option value="website_visit">Website Visit (+5)</option>
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Reason (Optional)
                </label>
                <input
                    type="text"
                    placeholder="e.g., Downloaded whitepaper"
                    value={step.config.scoreReason || ""}
                    onChange={(e) => onChange({ ...step.config, scoreReason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-green-500">📊</span>
                    <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Lead Scoring
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Updates the contact&apos;s lead score and grade (A-F)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WebhookActionFields({ step, onChange }: ActionConfigProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Webhook URL *
                </label>
                <input
                    type="url"
                    placeholder="https://api.example.com/webhook"
                    value={step.config.webhookUrl || ""}
                    onChange={(e) => onChange({ ...step.config, webhookUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Supports placeholders: {"{{firstName}}"}, {"{{email}}"}, etc.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    HTTP Method
                </label>
                <select
                    value={step.config.webhookMethod || "POST"}
                    onChange={(e) => onChange({ ...step.config, webhookMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>

            {step.config.webhookMethod !== "GET" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Request Body (JSON)
                    </label>
                    <textarea
                        placeholder={`{
  "event": "workflow_action",
  "contact": {
    "name": "{{firstName}} {{lastName}}",
    "email": "{{email}}"
  }
}`}
                        value={step.config.webhookBody || ""}
                        onChange={(e) => onChange({ ...step.config, webhookBody: e.target.value })}
                        rows={5}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to send default entity data
                    </p>
                </div>
            )}

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-blue-500">🌐</span>
                    <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            External Webhook
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Sends HTTP request to external service (10 second timeout)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wait Event Action Fields
function WaitEventActionFields({ step, onChange }: ActionConfigProps) {
    const eventType = step.config.waitEventType || "email_reply";
    const timeoutDays = step.config.waitTimeoutDays || 3;
    const hasTimeout = step.config.waitHasTimeout !== false;
    const timeoutAction = step.config.waitTimeoutAction || "continue";

    const EVENT_TYPES = [
        { value: "email_reply", label: "Email Reply", description: "Wait until contact replies to an email" },
        { value: "email_opened", label: "Email Opened", description: "Wait until contact opens an email" },
        { value: "email_clicked", label: "Link Clicked", description: "Wait until contact clicks a link in email" },
        { value: "form_submit", label: "Form Submitted", description: "Wait until contact submits a form" },
        { value: "deal_stage_changed", label: "Deal Stage Changed", description: "Wait until deal stage is updated" },
        { value: "field_updated", label: "Field Updated", description: "Wait until a specific field is updated" },
    ];

    const selectedEvent = EVENT_TYPES.find(e => e.value === eventType);

    return (
        <div className="space-y-5">
            {/* Event Type Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Wait For Event
                </label>
                <select
                    value={eventType}
                    onChange={(e) => onChange({ ...step.config, waitEventType: e.target.value })}
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
                        Continue workflow if event doesn&apos;t occur within time limit
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onChange({ ...step.config, waitHasTimeout: !hasTimeout })}
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
                            onChange={(e) => onChange({ ...step.config, waitTimeoutDays: parseInt(e.target.value) || 1 })}
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
                        onChange={(e) => onChange({ ...step.config, waitTimeoutAction: e.target.value })}
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
                    <span className="text-purple-500 text-lg">⏳</span>
                    <div>
                        <p className="text-sm text-foreground font-medium">
                            {hasTimeout
                                ? `Wait for "${selectedEvent?.label}" (timeout: ${timeoutDays} days)`
                                : `Wait for "${selectedEvent?.label}" indefinitely`}
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

// SMS Action Fields
function SmsActionFields({ step, onChange }: ActionConfigProps) {
    return <SmsActionConfig step={step} onChange={onChange} />;
}
