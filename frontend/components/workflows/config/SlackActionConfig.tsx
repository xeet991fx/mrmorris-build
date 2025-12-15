"use client";

import { WorkflowStep } from "@/lib/workflow/types";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface SlackActionConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

export default function SlackActionConfig({ step, onChange }: SlackActionConfigProps) {
    const config = step.config || {};

    const handleAddField = () => {
        const attachments = config.attachments || [];
        const newAttachment = {
            color: "#36a64f",
            title: "",
            text: "",
            fields: [],
        };
        onChange({ ...config, attachments: [...attachments, newAttachment] });
    };

    const handleRemoveAttachment = (index: number) => {
        const attachments = config.attachments || [];
        onChange({ ...config, attachments: attachments.filter((_: any, i: number) => i !== index) });
    };

    return (
        <div className="space-y-4">
            {/* Webhook URL */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Slack Webhook URL *
                </label>
                <input
                    type="url"
                    value={config.webhookUrl || ""}
                    onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Create an incoming webhook in your Slack workspace settings
                </p>
            </div>

            {/* Message */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Message *
                </label>
                <textarea
                    value={config.message || ""}
                    onChange={(e) => onChange({ ...config, message: e.target.value })}
                    placeholder="Hello {{firstName}}, your order is ready!"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Use placeholders: {'{{firstName}}, {{lastName}}, {{email}}, {{company}}'}
                </p>
            </div>

            {/* Optional Settings */}
            <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Optional Settings</h4>

                <div className="space-y-3">
                    {/* Channel */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Channel</label>
                        <input
                            type="text"
                            value={config.channel || ""}
                            onChange={(e) => onChange({ ...config, channel: e.target.value })}
                            placeholder="#general"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Bot Username</label>
                        <input
                            type="text"
                            value={config.username || ""}
                            onChange={(e) => onChange({ ...config, username: e.target.value })}
                            placeholder="Workflow Bot"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Icon Emoji */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Icon Emoji</label>
                        <input
                            type="text"
                            value={config.iconEmoji || ""}
                            onChange={(e) => onChange({ ...config, iconEmoji: e.target.value })}
                            placeholder=":robot_face:"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Message Format */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Message Format</label>
                        <select
                            value={config.messageFormat || "plain"}
                            onChange={(e) => onChange({ ...config, messageFormat: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="plain">Plain Text</option>
                            <option value="markdown">Markdown</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Rich Attachments */}
            <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground">Rich Attachments (Optional)</h4>
                    <button
                        onClick={handleAddField}
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add Attachment
                    </button>
                </div>

                {config.attachments && config.attachments.length > 0 && (
                    <div className="space-y-3">
                        {config.attachments.map((attachment: any, index: number) => (
                            <div key={index} className="bg-muted/30 rounded-lg p-3 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Attachment {index + 1}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveAttachment(index)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={attachment.title || ""}
                                        onChange={(e) => {
                                            const updated = [...(config.attachments || [])];
                                            updated[index] = { ...attachment, title: e.target.value };
                                            onChange({ ...config, attachments: updated });
                                        }}
                                        placeholder="Attachment Title"
                                        className="w-full px-2 py-1.5 rounded border border-border bg-card text-foreground text-sm"
                                    />
                                    <textarea
                                        value={attachment.text || ""}
                                        onChange={(e) => {
                                            const updated = [...(config.attachments || [])];
                                            updated[index] = { ...attachment, text: e.target.value };
                                            onChange({ ...config, attachments: updated });
                                        }}
                                        placeholder="Attachment text..."
                                        rows={2}
                                        className="w-full px-2 py-1.5 rounded border border-border bg-card text-foreground text-sm resize-none"
                                    />
                                    <input
                                        type="color"
                                        value={attachment.color || "#36a64f"}
                                        onChange={(e) => {
                                            const updated = [...(config.attachments || [])];
                                            updated[index] = { ...attachment, color: e.target.value };
                                            onChange({ ...config, attachments: updated });
                                        }}
                                        className="w-16 h-8 rounded border border-border"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>💡 Tip:</strong> Get your webhook URL from Slack → Apps → Incoming Webhooks →
                    Add New Webhook to Workspace
                </p>
            </div>
        </div>
    );
}
