"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    ArrowPathIcon,
    PaperAirplaneIcon,
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
}

interface GeneratedContent {
    subject: string;
    body: string;
    html: string;
    design: any;
}

// Quick prompt suggestions
const QUICK_PROMPTS = [
    "Welcome email for new users",
    "Follow-up after demo call",
    "Product launch announcement",
    "Event invitation email",
    "Thank you for purchase",
    "Re-engagement campaign",
];

// ============================================
// COMPONENT
// ============================================

export default function AIPromptPanel({
    workspaceId,
    isOpen,
    onClose,
    onGenerate,
}: AIPromptPanelProps) {
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
            const response = await axiosInstance.post(
                `/workspaces/${workspaceId}/email-templates/generate-unlayer`,
                { prompt: prompt.trim() }
            );

            if (response.data.success) {
                setGenerated(response.data.data);
            } else {
                setError(response.data.error || "Failed to generate template");
            }
        } catch (err: any) {
            console.error("AI generation error:", err);
            setError(err.response?.data?.error || err.message || "Failed to generate template");
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
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Template Generator</h3>
                                <p className="text-xs text-zinc-500">Describe what you want and AI will create it</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Prompts */}
                    {!generated && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {QUICK_PROMPTS.map((qp) => (
                                <button
                                    key={qp}
                                    onClick={() => handleQuickPrompt(qp)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                                        prompt === qp
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
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
                                    placeholder="Describe your email template... e.g., 'Create a professional welcome email for new SaaS customers with a clean modern design'"
                                    rows={2}
                                    disabled={isGenerating}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:opacity-50"
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isGenerating}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-4 h-4" />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Preview */
                        <div className="space-y-3">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-zinc-500">Subject:</span>
                                    <button
                                        onClick={() => setGenerated(null)}
                                        className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1"
                                    >
                                        <ArrowPathIcon className="w-3 h-3" />
                                        Regenerate
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
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                    Use This Template
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
