/**
 * Webhook Action Configuration Component
 * 
 * Configuration form for sending HTTP webhooks to external services.
 */

"use client";

import { useState } from "react";
import { GlobeAltIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";

// ============================================
// TYPES
// ============================================

interface WebhookActionConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function WebhookActionConfig({ step, onChange }: WebhookActionConfigProps) {
    const webhookUrl = step.config.webhookUrl || "";
    const webhookMethod = step.config.webhookMethod || "POST";
    const webhookHeaders = step.config.webhookHeaders || {};
    const webhookBody = step.config.webhookBody || "";

    const [newHeaderKey, setNewHeaderKey] = useState("");
    const [newHeaderValue, setNewHeaderValue] = useState("");

    const handleUrlChange = (url: string) => {
        onChange({ ...step.config, webhookUrl: url });
    };

    const handleMethodChange = (method: string) => {
        onChange({ ...step.config, webhookMethod: method });
    };

    const handleBodyChange = (body: string) => {
        onChange({ ...step.config, webhookBody: body });
    };

    const handleAddHeader = () => {
        if (!newHeaderKey.trim()) return;
        const newHeaders = { ...webhookHeaders, [newHeaderKey]: newHeaderValue };
        onChange({ ...step.config, webhookHeaders: newHeaders });
        setNewHeaderKey("");
        setNewHeaderValue("");
    };

    const handleRemoveHeader = (key: string) => {
        const newHeaders = { ...webhookHeaders };
        delete newHeaders[key];
        onChange({ ...step.config, webhookHeaders: newHeaders });
    };

    const placeholderHelp = [
        "{{firstName}} - Contact first name",
        "{{lastName}} - Contact last name",
        "{{email}} - Contact email",
        "{{company}} - Contact company",
        "{{phone}} - Contact phone",
    ];

    return (
        <div className="space-y-5">
            {/* URL Input */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Webhook URL <span className="text-red-500">*</span>
                </label>
                <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://api.example.com/webhook"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Supports placeholders: {"{{firstName}}"}, {"{{email}}"}, etc.
                </p>
            </div>

            {/* Method Selector */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    HTTP Method
                </label>
                <select
                    value={webhookMethod}
                    onChange={(e) => handleMethodChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>

            {/* Custom Headers */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Custom Headers (Optional)
                </label>

                {/* Existing Headers */}
                {Object.entries(webhookHeaders).length > 0 && (
                    <div className="space-y-2 mb-2">
                        {Object.entries(webhookHeaders).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                                <span className="text-sm font-mono text-foreground">{key}:</span>
                                <span className="text-sm text-muted-foreground flex-1 truncate">{value}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveHeader(key)}
                                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Header Form */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newHeaderKey}
                        onChange={(e) => setNewHeaderKey(e.target.value)}
                        placeholder="Header Name"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground text-sm"
                    />
                    <input
                        type="text"
                        value={newHeaderValue}
                        onChange={(e) => setNewHeaderValue(e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleAddHeader}
                        disabled={!newHeaderKey.trim()}
                        className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Request Body */}
            {webhookMethod !== "GET" && (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Request Body (JSON)
                    </label>
                    <textarea
                        value={webhookBody}
                        onChange={(e) => handleBodyChange(e.target.value)}
                        placeholder={`{
  "event": "workflow_action",
  "contact": {
    "name": "{{firstName}} {{lastName}}",
    "email": "{{email}}"
  }
}`}
                        rows={6}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to send default entity data. Supports placeholders.
                    </p>
                </div>
            )}

            {/* Placeholder Help */}
            <details className="text-sm">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                    Available placeholders
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border">
                    <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                        {placeholderHelp.map((placeholder) => (
                            <li key={placeholder}>{placeholder}</li>
                        ))}
                    </ul>
                </div>
            </details>

            {/* Preview Card */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-start gap-3">
                    <GlobeAltIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-foreground font-medium">
                            {webhookMethod} {webhookUrl || "https://..."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Sends HTTP request when this step executes. 10 second timeout.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
