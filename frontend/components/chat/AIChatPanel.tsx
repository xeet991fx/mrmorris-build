"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    UserIcon,
} from "@heroicons/react/24/outline";
import { sendAgentMessage } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Import Zustand stores for auto-refresh after AI actions
import { useContactStore } from "@/store/useContactStore";
import { useCompanyStore } from "@/store/useCompanyStore";
import { usePipelineStore } from "@/store/usePipelineStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isLoading?: boolean;
}

const QUICK_ACTIONS = [
    // Original agents
    { label: "Create a contact", prompt: "Create a contact named John Doe with email john@example.com" },
    { label: "Show my deals", prompt: "Show me all my deals" },
    { label: "Create a task", prompt: "Create a task to follow up tomorrow" },
    // New AI agents
    { label: "🧹 Pipeline health", prompt: "Check my pipeline health" },
    { label: "📋 Meeting prep", prompt: "Prepare for my next meeting" },
    { label: "📊 Revenue forecast", prompt: "Show this month's forecast" },
    { label: "🎯 Battlecard", prompt: "Show battlecard for competitors" },
    { label: "📥 Find duplicates", prompt: "Find duplicate contacts" },
    { label: "📅 Schedule meeting", prompt: "Find available times for a meeting" },
];

export function AIChatPanel() {
    const params = useParams();
    const workspaceId = params?.id as string;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || !workspaceId || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await sendAgentMessage(workspaceId, text);

            setMessages(prev => {
                const updated = prev.filter(m => !m.isLoading);
                const assistantMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: response.data?.response || response.error || "No response received",
                    timestamp: new Date(),
                };
                return [...updated, assistantMessage];
            });

            // Auto-refresh stores based on toolResults
            if (response.data?.toolResults) {
                const toolNames = Object.keys(response.data.toolResults);

                for (const toolName of toolNames) {
                    // Contact actions
                    if (toolName.includes('contact') || toolName.includes('Contact')) {
                        useContactStore.getState().fetchContacts(workspaceId);
                    }
                    // Company actions
                    if (toolName.includes('company') || toolName.includes('Company')) {
                        useCompanyStore.getState().fetchCompanies(workspaceId);
                    }
                    // Deal/Pipeline actions
                    if (toolName.includes('deal') || toolName.includes('Deal') ||
                        toolName.includes('opportunity') || toolName.includes('pipeline')) {
                        usePipelineStore.getState().fetchOpportunities(workspaceId);
                    }
                    // Task actions
                    if (toolName.includes('task') || toolName.includes('Task')) {
                        useTaskStore.getState().fetchTasks(workspaceId);
                    }
                    // Workflow actions
                    if (toolName.includes('workflow') || toolName.includes('Workflow')) {
                        useWorkflowStore.getState().fetchWorkflows(workspaceId);
                    }
                }
            }
        } catch (error: any) {
            setMessages(prev => {
                const updated = prev.filter(m => !m.isLoading);
                const errorMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `Error: ${error.message || "Failed to get response"}`,
                    timestamp: new Date(),
                };
                return [...updated, errorMessage];
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!workspaceId) return null;

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl",
                    "flex items-center justify-center",
                    "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
                    "hover:from-violet-500 hover:via-purple-500 hover:to-indigo-600",
                    "transition-all duration-300 hover:scale-105",
                    "border border-white/20"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="AI Assistant"
            >
                <SparklesIcon className="w-6 h-6 text-white" />
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "fixed bottom-24 right-6 z-50",
                            "w-[420px] h-[600px] max-h-[80vh]",
                            "bg-neutral-900/95 backdrop-blur-xl",
                            "border border-neutral-700/50 rounded-2xl",
                            "shadow-2xl shadow-black/40",
                            "flex flex-col overflow-hidden"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700/50 bg-neutral-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                                    <SparklesIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                                    <p className="text-xs text-neutral-400">Test all 20 CRM agents</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-neutral-700/50 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-700/20 flex items-center justify-center mb-4 border border-violet-500/20">
                                        <SparklesIcon className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-white mb-2">CRM AI Assistant</h4>
                                    <p className="text-sm text-neutral-400 mb-6">
                                        Ask me to create contacts, manage deals, set up workflows, and more.
                                    </p>

                                    {/* Quick Actions */}
                                    <div className="w-full space-y-2">
                                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Try these</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {QUICK_ACTIONS.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSend(action.prompt)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-xs text-left",
                                                        "bg-neutral-800/50 hover:bg-neutral-700/50",
                                                        "border border-neutral-700/50 hover:border-neutral-600/50",
                                                        "text-neutral-300 hover:text-white",
                                                        "transition-all duration-150"
                                                    )}
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "flex gap-3",
                                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                                        )}
                                    >
                                        {/* Avatar */}
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                            message.role === "user"
                                                ? "bg-[#9ACD32]"
                                                : "bg-gradient-to-br from-violet-600 to-indigo-700"
                                        )}>
                                            {message.role === "user" ? (
                                                <UserIcon className="w-4 h-4 text-neutral-900" />
                                            ) : (
                                                <SparklesIcon className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className={cn(
                                            "max-w-[80%] px-3.5 py-2.5 rounded-xl",
                                            message.role === "user"
                                                ? "bg-[#9ACD32]/90 text-neutral-900"
                                                : "bg-neutral-800 text-neutral-100 border border-neutral-700/50"
                                        )}>
                                            {message.isLoading ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            ) : message.role === "user" ? (
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                            ) : (
                                                <div className="text-sm prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-headings:mb-2 prose-headings:mt-3 prose-ul:my-2 prose-li:my-0 prose-strong:text-white prose-hr:my-3 prose-hr:border-neutral-600">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-neutral-700/50 bg-neutral-800/30">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask the AI assistant..."
                                    disabled={isLoading}
                                    className={cn(
                                        "flex-1 px-4 py-2.5 rounded-xl",
                                        "bg-neutral-800 border border-neutral-700/50",
                                        "text-sm text-white placeholder-neutral-500",
                                        "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        "transition-all duration-150"
                                    )}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={cn(
                                        "p-2.5 rounded-xl",
                                        "bg-gradient-to-br from-violet-600 to-indigo-700",
                                        "hover:from-violet-500 hover:to-indigo-600",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        "transition-all duration-150"
                                    )}
                                >
                                    <PaperAirplaneIcon className="w-5 h-5 text-white" />
                                </button>
                            </div>
                            <p className="text-[10px] text-neutral-500 text-center mt-2">
                                Original: Contact • Deal • Task • Workflow • Email • Campaign • Pipeline • Reports
                                <br />
                                <span className="text-violet-400">New AI: Briefing • Transcription • Scheduling • Hygiene • Forecast • Proposal • Competitor • Data Entry</span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
