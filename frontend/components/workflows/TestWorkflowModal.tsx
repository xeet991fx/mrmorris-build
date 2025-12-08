"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    BeakerIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    PlayIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface TestWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    workflowId: string;
    workflowName: string;
}

interface Contact {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface TestStep {
    stepName: string;
    stepType: string;
    status: "success" | "error";
    message: string;
    duration: number;
    simulated?: boolean;
    delaySkipped?: number;
    conditionResult?: boolean;
    error?: string;
}

interface TestResults {
    workflowName: string;
    entityName: string;
    dryRun: boolean;
    fastForward: boolean;
    steps: TestStep[];
    totalDuration: number;
    productionDuration: number;
    success: boolean;
}

export default function TestWorkflowModal({
    isOpen,
    onClose,
    workspaceId,
    workflowId,
    workflowName,
}: TestWorkflowModalProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string>("");
    const [dryRun, setDryRun] = useState(true);
    const [fastForward, setFastForward] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResults, setTestResults] = useState<TestResults | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        } else {
            // Reset state when modal closes
            setTestResults(null);
            setSelectedContactId("");
        }
    }, [isOpen]);

    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/workspace/${workspaceId}/contacts`);
            if (!response.ok) throw new Error("Failed to fetch contacts");
            const data = await response.json();
            setContacts(data.contacts || []);
            if (data.contacts?.length > 0) {
                setSelectedContactId(data.contacts[0]._id);
            }
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
            toast.error("Failed to load contacts");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        if (!selectedContactId) {
            toast.error("Please select a contact");
            return;
        }

        setIsTesting(true);
        setTestResults(null);

        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/workflows/${workflowId}/test`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        entityId: selectedContactId,
                        entityType: "contact",
                        dryRun,
                        fastForward,
                    }),
                }
            );

            if (!response.ok) throw new Error("Test failed");

            const data = await response.json();
            setTestResults(data.data);
            toast.success("Test completed successfully");
        } catch (error) {
            console.error("Test workflow error:", error);
            toast.error("Failed to test workflow");
        } finally {
            setIsTesting(false);
        }
    };

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
        if (ms < 86400000) return `${Math.round(ms / 3600000)}hr`;
        return `${Math.round(ms / 86400000)}d`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gradient-to-r from-purple-500/10 to-violet-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                                <BeakerIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Test Workflow</h2>
                                <p className="text-sm text-muted-foreground">{workflowName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Configuration */}
                    {!testResults && (
                        <div className="p-6 space-y-6">
                            {/* Test Contact */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Select Test Contact
                                </label>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : contacts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No contacts available
                                    </p>
                                ) : (
                                    <select
                                        value={selectedContactId}
                                        onChange={(e) => setSelectedContactId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    >
                                        {contacts.map((contact) => (
                                            <option key={contact._id} value={contact._id}>
                                                {contact.firstName} {contact.lastName} ({contact.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Options */}
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={dryRun}
                                        onChange={(e) => setDryRun(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                            Dry Run (Recommended)
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Simulate execution without actually sending emails or
                                            modifying data
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={fastForward}
                                        onChange={(e) => setFastForward(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                            Fast Forward Delays
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Skip delay steps to see results immediately
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Test Results */}
                    {testResults && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Test Duration
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {formatDuration(testResults.totalDuration)}
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Production Time
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {formatDuration(testResults.productionDuration)}
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Steps Executed
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {testResults.steps.length}
                                    </div>
                                </div>
                            </div>

                            {/* Steps */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3">
                                    Execution Steps
                                </h3>
                                <div className="space-y-2">
                                    {testResults.steps.map((step, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border ${
                                                step.status === "success"
                                                    ? "border-green-500/20 bg-green-500/5"
                                                    : "border-red-500/20 bg-red-500/5"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {step.status === "success" ? (
                                                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-medium text-foreground">
                                                            Step {index + 1}: {step.stepName}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <ClockIcon className="w-3.5 h-3.5" />
                                                            {formatDuration(step.duration)}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {step.message}
                                                    </p>
                                                    {step.simulated && (
                                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                                                            <BeakerIcon className="w-3.5 h-3.5" />
                                                            Simulated
                                                        </div>
                                                    )}
                                                    {step.delaySkipped !== undefined && (
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                            ⏩ Skipped {formatDuration(step.delaySkipped)}{" "}
                                                            delay
                                                        </div>
                                                    )}
                                                    {step.conditionResult !== undefined && (
                                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
                                                            {step.conditionResult ? "✓ YES" : "✗ NO"}
                                                        </div>
                                                    )}
                                                    {step.error && (
                                                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                                                            Error: {step.error}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
                        {testResults ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {testResults.dryRun
                                        ? "No data was modified (dry run)"
                                        : "Test completed with real actions"}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setTestResults(null)}
                                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        Run Again
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Done
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {contacts.length} contact{contacts.length !== 1 ? "s" : ""}{" "}
                                    available
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTest}
                                        disabled={!selectedContactId || isTesting}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isTesting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <PlayIcon className="w-4 h-4" />
                                                Start Test
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
