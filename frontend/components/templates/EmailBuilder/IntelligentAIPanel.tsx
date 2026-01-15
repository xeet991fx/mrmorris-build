"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    ArrowPathIcon,
    PaperAirplaneIcon,
    LightBulbIcon,
    ArrowUturnLeftIcon,
    ChatBubbleLeftRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";

// ============================================
// TYPES
// ============================================

interface ConversationMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface AIResponse {
    subject: string;
    body: string;
    html: string;
    design: any;
    aiMessage: string;
    suggestions: string[];
    changes: string[];
    sessionId: string;
}

interface IntelligentAIPanelProps {
    workspaceId: string;
    isOpen: boolean;
    onClose: () => void;
    onApplyDesign: (html: string, design: any) => void;
    editorRef?: React.RefObject<{
        exportHtml: (callback: (data: { design: any; html: string }) => void) => void;
        loadDesign: (design: any) => void;
        isReady: () => boolean;
    } | null>;
}

// ============================================
// COMPONENT
// ============================================

export default function IntelligentAIPanel({
    workspaceId,
    isOpen,
    onClose,
    onApplyDesign,
    editorRef,
}: IntelligentAIPanelProps) {
    const { currentTemplate } = useEmailTemplateStore();

    // Session state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

    // UI state
    const [prompt, setPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [pendingResponse, setPendingResponse] = useState<AIResponse | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Scroll to bottom of history when new messages arrive
    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [conversationHistory]);

    // Get initial suggestions when panel opens
    useEffect(() => {
        if (isOpen && suggestions.length === 0 && !isAnalyzing) {
            analyzeCurrent();
        }
    }, [isOpen]);

    // Get current design from editor
    const getCurrentDesign = useCallback(async (): Promise<any> => {
        if (!editorRef?.current?.isReady?.()) {
            throw new Error("Editor is not ready");
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout getting template design"));
            }, 5000);

            editorRef.current!.exportHtml((data: any) => {
                clearTimeout(timeout);
                resolve(data.design);
            });
        });
    }, [editorRef]);

    // Analyze current template for suggestions
    const analyzeCurrent = async () => {
        if (!editorRef?.current?.isReady?.()) return;

        setIsAnalyzing(true);
        try {
            const currentDesign = await getCurrentDesign();

            const response = await axiosInstance.post(
                `/workspaces/${workspaceId}/email-templates/ai/analyze`,
                {
                    currentDesign,
                    templateContext: {
                        templateId: currentTemplate?._id,
                        templateName: currentTemplate?.name,
                        templateSubject: currentTemplate?.subject,
                        templateCategory: currentTemplate?.category,
                    },
                }
            );

            if (response.data.success) {
                setSuggestions(response.data.data.suggestions || []);
            }
        } catch (err) {
            console.error("Failed to analyze template:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Send message to AI with streaming
    const handleSend = async () => {
        if (!prompt.trim() || isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setPendingResponse(null);
        setStatusMessage("Starting...");

        const userMessage = prompt.trim();
        setPrompt("");

        // Add user message to history
        setConversationHistory(prev => [...prev, {
            role: "user",
            content: userMessage,
            timestamp: new Date(),
        }]);

        try {
            const currentDesign = await getCurrentDesign();

            // Get auth token
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

            // Use fetch for SSE streaming
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/ai/modify-stream`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        instruction: userMessage,
                        currentDesign,
                        currentSubject: currentTemplate?.subject || "Untitled",
                        sessionId,
                        templateContext: {
                            templateId: currentTemplate?._id,
                            templateName: currentTemplate?.name,
                            templateSubject: currentTemplate?.subject,
                            templateCategory: currentTemplate?.category,
                            templateDescription: currentTemplate?.description,
                        },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to connect to AI service");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("No response stream available");
            }

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") continue;

                        try {
                            const event = JSON.parse(data);

                            switch (event.type) {
                                case "status":
                                    setStatusMessage(event.data.message);
                                    break;
                                case "session":
                                    setSessionId(event.data.sessionId);
                                    break;
                                case "progress":
                                    setStatusMessage(`Generating... (${event.data.chunks} chunks)`);
                                    break;
                                case "complete":
                                    setStatusMessage(null);
                                    const result: AIResponse = event.data;
                                    setSessionId(result.sessionId);

                                    // Add assistant message to history
                                    setConversationHistory(prev => [...prev, {
                                        role: "assistant",
                                        content: result.aiMessage,
                                        timestamp: new Date(),
                                    }]);

                                    // Update suggestions
                                    if (result.suggestions?.length) {
                                        setSuggestions(result.suggestions);
                                    }

                                    // Set pending response for preview
                                    setPendingResponse(result);
                                    break;
                                case "error":
                                    throw new Error(event.data.message);
                            }
                        } catch (parseError) {
                            console.error("Failed to parse SSE event:", parseError);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("AI request error:", err);
            setError(err.message || "Failed to process your request");
            setStatusMessage(null);

            // Remove the user message on error
            setConversationHistory(prev => prev.slice(0, -1));
        } finally {
            setIsProcessing(false);
            setStatusMessage(null);
        }
    };

    // Apply pending changes
    const handleApply = () => {
        if (pendingResponse) {
            onApplyDesign(pendingResponse.html, pendingResponse.design);
            setPendingResponse(null);
        }
    };

    // Undo last change
    const handleUndo = async () => {
        if (!sessionId) return;

        try {
            const response = await axiosInstance.post(
                `/workspaces/${workspaceId}/email-templates/ai/session/${sessionId}/undo`
            );

            if (response.data.success) {
                const design = response.data.data.design;
                onApplyDesign("", design);

                // Remove last two messages (user + assistant)
                setConversationHistory(prev => prev.slice(0, -2));
                setPendingResponse(null);
            }
        } catch (err) {
            console.error("Undo error:", err);
        }
    };

    // Reset to original
    const handleReset = async () => {
        if (!sessionId) return;

        try {
            const response = await axiosInstance.post(
                `/workspaces/${workspaceId}/email-templates/ai/session/${sessionId}/reset`
            );

            if (response.data.success) {
                const design = response.data.data.design;
                onApplyDesign("", design);
                setConversationHistory([]);
                setPendingResponse(null);
                setSessionId(null);
            }
        } catch (err) {
            console.error("Reset error:", err);
        }
    };

    // Use a suggestion
    const handleUseSuggestion = (suggestion: string) => {
        setPrompt(suggestion);
        inputRef.current?.focus();
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === "Escape") {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-0 right-0 bottom-0 w-[400px] z-50 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
                            <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Design Assistant</h3>
                            <p className="text-xs text-zinc-500">Intelligent template editing</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                    <div className="border-b border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                            <span className="flex items-center gap-2">
                                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                Conversation ({conversationHistory.length} messages)
                            </span>
                            {showHistory ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div
                                        ref={historyRef}
                                        className="max-h-48 overflow-y-auto px-4 py-2 space-y-2"
                                    >
                                        {conversationHistory.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "text-xs p-2 rounded-lg",
                                                    msg.role === "user"
                                                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 ml-4"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mr-4"
                                                )}
                                            >
                                                <span className="font-medium">{msg.role === "user" ? "You" : "AI"}:</span>{" "}
                                                {msg.content}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Processing Status */}
                    {isProcessing && statusMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800"
                        >
                            <div className="relative">
                                <ArrowPathIcon className="w-5 h-5 text-violet-500 animate-spin" />
                                <div className="absolute inset-0 animate-ping">
                                    <SparklesIcon className="w-5 h-5 text-violet-500 opacity-30" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                    {statusMessage}
                                </p>
                                <p className="text-xs text-violet-500 dark:text-violet-400">
                                    AI is working on your request...
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Pending Response Preview */}
                    {pendingResponse && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <SparklesIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-2">
                                        {pendingResponse.aiMessage}
                                    </p>

                                    {pendingResponse.changes?.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Changes made:</p>
                                            <ul className="text-xs text-emerald-600 dark:text-emerald-400 space-y-0.5">
                                                {pendingResponse.changes.map((change, idx) => (
                                                    <li key={idx} className="flex items-start gap-1">
                                                        <span className="text-emerald-500">•</span>
                                                        {change}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleApply}
                                            className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Apply Changes
                                        </button>
                                        <button
                                            onClick={() => setPendingResponse(null)}
                                            className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </motion.div>
                    )}

                    {/* Smart Suggestions */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <LightBulbIcon className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                {isAnalyzing ? "Analyzing your template..." : "Smart Suggestions"}
                            </span>
                            {!isAnalyzing && (
                                <button
                                    onClick={analyzeCurrent}
                                    className="text-xs text-violet-500 hover:text-violet-600"
                                >
                                    Refresh
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {isAnalyzing ? (
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    Analyzing...
                                </div>
                            ) : suggestions.length > 0 ? (
                                suggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleUseSuggestion(suggestion)}
                                        className="w-full text-left p-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-700 transition-all"
                                    >
                                        {suggestion}
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-zinc-400">
                                    Type a request to get started, or wait for analysis
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {sessionId && conversationHistory.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleUndo}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                <ArrowUturnLeftIcon className="w-3 h-3" />
                                Undo Last
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                                <ArrowPathIcon className="w-3 h-3" />
                                Reset All
                            </button>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Tell me what you'd like to change... (e.g., 'Make the header blue and add a discount badge')"
                            rows={3}
                            disabled={isProcessing}
                            className="w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!prompt.trim() || isProcessing}
                            className={cn(
                                "absolute right-2 bottom-2 p-2 rounded-lg transition-all",
                                prompt.trim() && !isProcessing
                                    ? "bg-violet-500 hover:bg-violet-600 text-white"
                                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
                            )}
                        >
                            {isProcessing ? (
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <PaperAirplaneIcon className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400 text-center">
                        Press Enter to send • Shift+Enter for new line
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
