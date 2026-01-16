"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    ArrowPathIcon,
    PaperAirplaneIcon,
    PencilSquareIcon,
    PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface AIPromptPanelProps {
    workspaceId: string;
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (html: string, design: any) => void;
    editorRef?: React.RefObject<{
        exportHtml: (callback: (data: { design: any; html: string }) => void) => void;
        loadDesign: (design: any) => void;
        isReady: () => boolean;
    } | null>;
    currentSubject?: string; // Current template subject
}

interface GeneratedContent {
    subject: string;
    body: string;
    html: string;
    design: any;
}

type AIMode = "create" | "modify";

// Quick prompt suggestions for creation
const CREATE_PROMPTS = [
    "Welcome email for new users",
    "Follow-up after demo call",
    "Product launch announcement",
    "Event invitation email",
    "Thank you for purchase",
    "Re-engagement campaign",
];

// Quick prompt suggestions for modification
const MODIFY_PROMPTS = [
    "Change the color scheme to blue",
    "Make the CTA button more prominent",
    "Add a discount section",
    "Simplify the content",
    "Make it more professional",
    "Add a footer with contact info",
    "Change the header image",
    "Make it mobile-friendly",
];

// ============================================
// COMPONENT
// ============================================

export default function AIPromptPanel({
    workspaceId,
    isOpen,
    onClose,
    onGenerate,
    editorRef,
    currentSubject,
}: AIPromptPanelProps) {
    const [mode, setMode] = useState<AIMode>("modify");
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generated, setGenerated] = useState<GeneratedContent | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setError(null);
        setGenerated(null);

        try {
            if (mode === "create") {
                // Generate new template
                const response = await axiosInstance.post(
                    `/workspaces/${workspaceId}/email-templates/generate-unlayer`,
                    { prompt: prompt.trim() }
                );

                if (response.data.success) {
                    setGenerated(response.data.data);
                } else {
                    setError(response.data.error || "Failed to generate template");
                }
            } else {
                // Modify existing template
                let currentDesign = null;

                // Check if editor is ready
                if (!editorRef?.current?.isReady?.()) {
                    setError("Editor is not ready yet. Please wait a moment and try again.");
                    setIsGenerating(false);
                    return;
                }

                // Try to get current design from editor
                if (editorRef && editorRef.current && typeof editorRef.current.exportHtml === 'function') {
                    try {
                        await new Promise<void>((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error("Timeout getting template design"));
                            }, 5000);

                            editorRef.current!.exportHtml((data: any) => {
                                clearTimeout(timeout);
                                currentDesign = data.design;
                                resolve();
                            });
                        });
                    } catch (err) {
                        console.error("Failed to get current design:", err);
                    }
                }

                if (!currentDesign) {
                    setError("Could not get current template design. Please make sure the editor has loaded, or try creating a new template instead.");
                    setIsGenerating(false);
                    return;
                }

                const response = await axiosInstance.post(
                    `/workspaces/${workspaceId}/email-templates/modify-unlayer`,
                    {
                        instruction: prompt.trim(),
                        currentDesign,
                        currentSubject: currentSubject || "Untitled Email",
                    }
                );

                if (response.data.success) {
                    setGenerated(response.data.data);
                } else {
                    setError(response.data.error || "Failed to modify template");
                }
            }
        } catch (err: any) {
            console.error("AI operation error:", err);
            setError(err.response?.data?.error || err.message || `Failed to ${mode} template`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseTemplate = () => {
        if (generated) {
            onGenerate(generated.html, generated.design);
            handleClose();
        }
    };

    const handleClose = () => {
        setPrompt("");
        setError(null);
        setGenerated(null);
        onClose();
    };

    const handleQuickPrompt = (quickPrompt: string) => {
        setPrompt(quickPrompt);
        setGenerated(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
        if (e.key === "Escape") {
            handleClose();
        }
    };

    const quickPrompts = mode === "create" ? CREATE_PROMPTS : MODIFY_PROMPTS;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-lg"
            >
                <div className="max-w-4xl mx-auto p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <SparklesIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Template Assistant</h3>
                                <p className="text-xs text-zinc-500">
                                    {mode === "create" ? "Create a new template from scratch" : "Modify your current template"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => { setMode("modify"); setGenerated(null); setPrompt(""); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                mode === "modify"
                                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                                    : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            )}
                        >
                            <PencilSquareIcon className="w-4 h-4" />
                            Modify Current
                        </button>
                        <button
                            onClick={() => { setMode("create"); setGenerated(null); setPrompt(""); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                mode === "create"
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                    : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            )}
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            Create New
                        </button>
                    </div>

                    {/* Quick Prompts */}
                    {!generated && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {quickPrompts.map((qp) => (
                                <button
                                    key={qp}
                                    onClick={() => handleQuickPrompt(qp)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                                        prompt === qp
                                            ? mode === "modify"
                                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                                                : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                                    )}
                                >
                                    {qp}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    {!generated ? (
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={
                                        mode === "create"
                                            ? "Describe your email template... e.g., 'Create a professional welcome email for new SaaS customers with a clean modern design'"
                                            : "Describe what you want to change... e.g., 'Change the header color to blue and add a new testimonial section'"
                                    }
                                    rows={2}
                                    disabled={isGenerating}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:opacity-50"
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isGenerating}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-3 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                    mode === "modify"
                                        ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                )}
                            >
                                {isGenerating ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        {mode === "modify" ? "Modifying..." : "Generating..."}
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-4 h-4" />
                                        {mode === "modify" ? "Modify" : "Generate"}
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Preview */
                        <div className="space-y-3">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2 py-0.5 text-xs font-medium rounded-full",
                                            mode === "modify"
                                                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                        )}>
                                            {mode === "modify" ? "Modified" : "Generated"}
                                        </span>
                                        <span className="text-xs font-medium text-zinc-500">Subject:</span>
                                    </div>
                                    <button
                                        onClick={() => setGenerated(null)}
                                        className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                                    >
                                        <ArrowPathIcon className="w-3 h-3" />
                                        Try Again
                                    </button>
                                </div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{generated.subject}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUseTemplate}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors",
                                        mode === "modify"
                                            ? "bg-violet-500 hover:bg-violet-600"
                                            : "bg-emerald-500 hover:bg-emerald-600"
                                    )}
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                    {mode === "modify" ? "Apply Changes" : "Use Template"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
