"use client";

import { useState } from "react";
import { CheckIcon, ClipboardIcon, GlobeAltIcon, KeyIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface WebhookPanelProps {
    workspaceId: string;
    workflowId: string;
    workflowName: string;
}

export default function WebhookPanel({ workspaceId, workflowId, workflowName }: WebhookPanelProps) {
    const [copied, setCopied] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const webhookUrl = `${API_URL}/workspaces/${workspaceId}/workflows/${workflowId}/webhook`;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const handleCopySecret = async () => {
        try {
            const secretExample = "your-webhook-secret-here";
            await navigator.clipboard.writeText(secretExample);
            setCopiedSecret(true);
            setTimeout(() => setCopiedSecret(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: your-secret-here" \\
  -d '{
    "entityType": "contact",
    "entityId": "contact_id_here",
    "data": {
      "customField": "value"
    }
  }'`;

    return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <GlobeAltIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Webhook Endpoint</h3>
                    <p className="text-xs text-muted-foreground">
                        Trigger this workflow via HTTP POST requests
                    </p>
                </div>
            </div>

            {/* Webhook URL */}
            <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Webhook URL</label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-foreground overflow-x-auto whitespace-nowrap">
                        {webhookUrl}
                    </div>
                    <button
                        onClick={handleCopyUrl}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                        title="Copy URL"
                    >
                        <AnimatePresence mode="wait">
                            {copied ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="flex items-center gap-1.5"
                                >
                                    <CheckIcon className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600">Copied!</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="clipboard"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="flex items-center gap-1.5"
                                >
                                    <ClipboardIcon className="w-4 h-4" />
                                    <span className="text-sm">Copy</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            {/* Authentication */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <KeyIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                            Authentication (Optional)
                        </h4>
                        <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                            Add <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 py-0.5 rounded">x-webhook-secret</code> header to secure your webhook
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                            Configure this in your workflow settings if needed
                        </p>
                    </div>
                </div>
            </div>

            {/* Request Format */}
            <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Request Format</h4>
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <div className="space-y-3 text-xs">
                        <div>
                            <span className="text-muted-foreground">Method:</span>{" "}
                            <span className="font-mono text-foreground">POST</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Content-Type:</span>{" "}
                            <span className="font-mono text-foreground">application/json</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Required Fields:</span>
                            <ul className="mt-1 ml-4 space-y-1 list-disc text-muted-foreground">
                                <li>
                                    <code className="font-mono text-foreground">entityId</code> - ID of the contact/deal/company
                                </li>
                                <li>
                                    <code className="font-mono text-foreground">entityType</code> - Type: "contact", "deal", or "company"
                                </li>
                                <li>
                                    <code className="font-mono text-foreground">data</code> - (optional) Additional data
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Example cURL */}
            <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Example cURL Request</h4>
                <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs font-mono">
                        {curlExample}
                    </pre>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(curlExample);
                        }}
                        className="absolute top-2 right-2 p-2 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                        title="Copy cURL command"
                    >
                        <ClipboardIcon className="w-4 h-4 text-slate-300" />
                    </button>
                </div>
            </div>

            {/* Testing Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-1.5">
                    <LightBulbIcon className="w-4 h-4" /> Testing Your Webhook
                </h4>
                <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                    <li>Copy the webhook URL above</li>
                    <li>Use tools like Postman, Insomnia, or cURL to send a POST request</li>
                    <li>Include a valid entityId from your workspace</li>
                    <li>Check the workflow enrollments to verify it worked</li>
                </ol>
            </div>

            {/* Response Format */}
            <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Success Response</h4>
                <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-xs font-mono text-foreground">
                    {`{
  "success": true,
  "message": "Entity enrolled in workflow via webhook",
  "data": {
    "enrollmentId": "enrollment_123",
    "workflowId": "${workflowId}",
    "workflowName": "${workflowName}",
    "entityType": "contact",
    "entityId": "contact_id_here"
  }
}`}
                </pre>
            </div>
        </div>
    );
}
