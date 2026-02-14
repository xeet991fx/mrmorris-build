"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    ChevronDownIcon,
    TrashIcon,
    ArrowPathIcon,
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

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
}

const QUICK_ACTIONS = [
    // Original agents
    { label: "Create a contact", emoji: "👤", prompt: "Create a contact named John Doe with email john@example.com" },
    { label: "Show my deals", emoji: "💰", prompt: "Show me all my deals" },
    { label: "Create a task", emoji: "✅", prompt: "Create a task to follow up tomorrow" },
    { label: "Pipeline health", emoji: "🧹", prompt: "Check my pipeline health" },
    // New AI agents
    { label: "Meeting prep", emoji: "📋", prompt: "Prepare for my next meeting" },
    { label: "Revenue forecast", emoji: "📊", prompt: "Show this month's forecast" },
    { label: "Battlecard", emoji: "🎯", prompt: "Show battlecard for competitors" },
    { label: "Find duplicates", emoji: "📥", prompt: "Find duplicate contacts" },
    { label: "Schedule meeting", emoji: "📅", prompt: "Find available times for a meeting" },
];

export function AIChatPanel() {
    const params = useParams();
    const workspaceId = params?.id as string;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPreviousChats, setShowPreviousChats] = useState(false);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

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

    // Load chat sessions from localStorage
    useEffect(() => {
        if (workspaceId) {
            const saved = localStorage.getItem(`ai-chats-${workspaceId}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setChatSessions(parsed);
                } catch { /* ignore */ }
            }
        }
    }, [workspaceId]);

    // Save current conversation when it changes
    useEffect(() => {
        if (messages.length > 0 && workspaceId) {
            const nonLoadingMsgs = messages.filter(m => !m.isLoading);
            if (nonLoadingMsgs.length >= 2) {
                const firstUserMsg = nonLoadingMsgs.find(m => m.role === "user");
                const title = firstUserMsg?.content.slice(0, 50) || "New conversation";

                setChatSessions(prev => {
                    const currentId = `session-${nonLoadingMsgs[0]?.id}`;
                    const existing = prev.findIndex(s => s.id === currentId);
                    const session: ChatSession = {
                        id: currentId,
                        title,
                        messages: nonLoadingMsgs,
                        createdAt: new Date(),
                    };

                    let updated;
                    if (existing >= 0) {
                        updated = [...prev];
                        updated[existing] = session;
                    } else {
                        updated = [session, ...prev].slice(0, 20); // Keep last 20 sessions
                    }

                    localStorage.setItem(`ai-chats-${workspaceId}`, JSON.stringify(updated));
                    return updated;
                });
            }
        }
    }, [messages, workspaceId]);

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
                    if (toolName.includes('contact') || toolName.includes('Contact')) {
                        useContactStore.getState().fetchContacts(workspaceId);
                    }
                    if (toolName.includes('company') || toolName.includes('Company')) {
                        useCompanyStore.getState().fetchCompanies(workspaceId);
                    }
                    if (toolName.includes('deal') || toolName.includes('Deal') ||
                        toolName.includes('opportunity') || toolName.includes('pipeline')) {
                        usePipelineStore.getState().fetchOpportunities(workspaceId);
                    }
                    if (toolName.includes('task') || toolName.includes('Task')) {
                        useTaskStore.getState().fetchTasks(workspaceId);
                    }
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

    const handleNewChat = () => {
        setMessages([]);
        setShowPreviousChats(false);
    };

    const handleLoadSession = (session: ChatSession) => {
        setMessages(session.messages);
        setShowPreviousChats(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setChatSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            localStorage.setItem(`ai-chats-${workspaceId}`, JSON.stringify(updated));
            return updated;
        });
    };

    const handleClearAll = () => {
        setMessages([]);
        setChatSessions([]);
        localStorage.removeItem(`ai-chats-${workspaceId}`);
        setShowPreviousChats(false);
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
                    "transition-all duration-300",
                    "border border-white/20",
                    isOpen && "scale-0 opacity-0 pointer-events-none"
                )}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                title="AI Assistant"
            >
                <SparklesIcon className="w-6 h-6 text-white" />
                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping opacity-20" />
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn(
                            "fixed bottom-24 right-6 z-50",
                            "w-[420px] h-[620px] max-h-[80vh]",
                            "bg-white dark:bg-neutral-900",
                            "border border-neutral-200 dark:border-neutral-700/60 rounded-2xl",
                            "shadow-2xl shadow-black/20 dark:shadow-black/50",
                            "flex flex-col overflow-hidden"
                        )}
                    >
                        {/* ========== HEADER ========== */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700/40">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                                    <p className="text-[11px] text-neutral-400">Test all 20 CRM agents</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Previous Chats Toggle */}
                                <button
                                    onClick={() => setShowPreviousChats(!showPreviousChats)}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        showPreviousChats
                                            ? "bg-violet-500/20 text-violet-300"
                                            : "text-neutral-400 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Previous chats"
                                >
                                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                </button>
                                {/* New Chat */}
                                {messages.length > 0 && (
                                    <button
                                        onClick={handleNewChat}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                        title="New chat"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                    </button>
                                )}
                                {/* Close */}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* ========== PREVIOUS CHATS DRAWER ========== */}
                        <AnimatePresence>
                            {showPreviousChats && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden border-b border-neutral-200 dark:border-neutral-700/40 bg-neutral-50 dark:bg-neutral-800/50"
                                >
                                    <div className="p-3 max-h-[200px] overflow-y-auto">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                                Previous Chats
                                            </p>
                                            {chatSessions.length > 0 && (
                                                <button
                                                    onClick={handleClearAll}
                                                    className="text-[11px] text-red-500 hover:text-red-400 font-medium"
                                                >
                                                    Clear all
                                                </button>
                                            )}
                                        </div>
                                        {chatSessions.length === 0 ? (
                                            <p className="text-xs text-neutral-400 py-2 text-center">No previous chats</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {chatSessions.map((session) => (
                                                    <button
                                                        key={session.id}
                                                        onClick={() => handleLoadSession(session)}
                                                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-neutral-200 dark:border-neutral-700/50 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="truncate font-medium">{session.title}</p>
                                                            <p className="text-[10px] text-neutral-400 mt-0.5">
                                                                {session.messages.length} messages
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteSession(e, session.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-400 hover:text-red-500 transition-all"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ========== MESSAGES AREA ========== */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                    {/* Big centered icon */}
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 dark:from-violet-500/15 dark:to-indigo-600/15 flex items-center justify-center mb-4 border border-violet-300/30 dark:border-violet-500/20">
                                        <SparklesIcon className="w-8 h-8 text-violet-500 dark:text-violet-400" />
                                    </div>
                                    <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1.5">
                                        CRM AI Assistant
                                    </h4>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-[280px] leading-relaxed">
                                        Ask me to create contacts, manage deals, set up workflows, and more.
                                    </p>

                                    {/* TRY THESE */}
                                    <div className="w-full">
                                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em] font-semibold mb-3">
                                            Try These
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {QUICK_ACTIONS.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSend(action.prompt)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left",
                                                        "bg-neutral-50 dark:bg-neutral-800/60",
                                                        "hover:bg-violet-50 dark:hover:bg-violet-900/20",
                                                        "border border-neutral-200/80 dark:border-neutral-700/50",
                                                        "hover:border-violet-300 dark:hover:border-violet-700",
                                                        "text-neutral-700 dark:text-neutral-300",
                                                        "hover:text-violet-700 dark:hover:text-violet-300",
                                                        "transition-all duration-150 group"
                                                    )}
                                                >
                                                    <span className="text-sm flex-shrink-0">{action.emoji}</span>
                                                    <span className="truncate">{action.label}</span>
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
                                        transition={{ duration: 0.2 }}
                                        className={cn(
                                            "flex gap-3",
                                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                                        )}
                                    >
                                        {/* Avatar */}
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                                            message.role === "user"
                                                ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                                : "bg-gradient-to-br from-violet-500 to-indigo-600"
                                        )}>
                                            {message.role === "user" ? (
                                                <UserIcon className="w-4 h-4 text-white" />
                                            ) : (
                                                <SparklesIcon className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className={cn(
                                            "max-w-[80%] px-3.5 py-2.5 rounded-2xl",
                                            message.role === "user"
                                                ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-tr-md"
                                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200/60 dark:border-neutral-700/50 rounded-tl-md"
                                        )}>
                                            {message.isLoading ? (
                                                <div className="flex items-center gap-1.5 py-1">
                                                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            ) : message.role === "user" ? (
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                            ) : (
                                                <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-headings:mb-2 prose-headings:mt-3 prose-ul:my-2 prose-li:my-0 prose-strong:text-neutral-900 dark:prose-strong:text-white prose-hr:my-3 prose-hr:border-neutral-200 dark:prose-hr:border-neutral-700">
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

                        {/* ========== INPUT AREA ========== */}
                        <div className="p-4 border-t border-neutral-200/80 dark:border-neutral-700/40 bg-neutral-50/80 dark:bg-neutral-800/30">
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
                                        "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50",
                                        "text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500",
                                        "focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500/50",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        "transition-all duration-150"
                                    )}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all duration-150",
                                        input.trim() && !isLoading
                                            ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/25 text-white"
                                            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                                    )}
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center mt-2">
                                Original: Contact • Deal • Task • Workflow • Email • Campaign • Pipeline • Reports
                                <br />
                                <span className="text-violet-500 dark:text-violet-400">New AI: Briefing • Transcription • Scheduling • Hygiene • Forecast • Proposal • Competitor • Data Entry</span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
