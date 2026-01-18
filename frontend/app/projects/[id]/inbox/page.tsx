"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    InboxIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    EnvelopeIcon,
    EnvelopeOpenIcon,
    SparklesIcon,
    PaperAirplaneIcon,
    FaceSmileIcon,
    FaceFrownIcon,
    MinusCircleIcon,
    CalendarIcon,
    NoSymbolIcon,
    BoltIcon,
    RocketLaunchIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    FunnelIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    getInboxMessages,
    getInboxStats,
    markMessageAsRead,
    generateAIDraft,
    sendReply,
    syncInbox,
    getGroupedInbox,
    getThreadMessages,
} from "@/lib/api/inbox";
import { getCampaigns } from "@/lib/api/campaign";
import { getWorkflows } from "@/lib/api/workflow";
import { EmailInsightsPanel } from "@/components/inbox/EmailInsightsPanel";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { cn } from "@/lib/utils";
import { GroupedInboxView } from "@/components/inbox/GroupedInboxView";

interface LocalInboxMessage {
    _id: string;
    workspaceId: string;
    campaignId?: { _id: string; name: string } | string;
    workflowId?: { _id: string; name: string } | string;
    sequenceId?: { _id: string; name: string } | string;
    source?: 'campaign' | 'workflow' | 'sequence' | 'direct';
    contactId?: { _id: string; name: string; email: string; company?: string; firstName?: string; lastName?: string } | string;
    fromEmail: string;
    toEmail?: string;
    subject: string;
    body: string;
    snippet?: string;
    isRead: boolean;
    sentiment?: "positive" | "neutral" | "negative";
    labels?: string[];
    assignedTo?: string;
    threadId?: string;
    messageId?: string;
    receivedAt: string;
    createdAt: string;
    updatedAt: string;
    replySubject?: string;
    replyBody?: string;
    replySentiment?: "positive" | "negative" | "neutral" | "out_of_office" | "unsubscribe";
    repliedAt?: string;
    sentAt?: string;
    bodyText?: string;
    bodyHtml?: string;
    metadata?: { isRead?: boolean; assignedTo?: string; labels?: string[] };
    contact?: { firstName: string; lastName: string; email: string };
}

interface Conversation {
    contactId: string;
    contactName: string;
    contactEmail: string;
    messageCount: number;
    unreadCount: number;
    latestMessage: any;
    messages: LocalInboxMessage[];
}

export default function InboxPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { track } = useInsightTracking({ workspaceId, page: 'inbox', enabled: !!workspaceId });

    const [messages, setMessages] = useState<LocalInboxMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<LocalInboxMessage | null>(null);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        source: "all" as 'all' | 'campaign' | 'workflow' | 'direct',
        campaign: "",
        workflow: "",
        sentiment: "",
        search: "",
    });
    const [stats, setStats] = useState({ all: 0, campaigns: 0, workflows: 0, direct: 0, unread: 0 });
    const [campaigns, setCampaigns] = useState<Array<{ _id: string; name: string }>>([]);
    const [workflows, setWorkflows] = useState<Array<{ _id: string; name: string }>>([]);
    const [aiDraft, setAiDraft] = useState<string>("");
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');
    const [groupedData, setGroupedData] = useState<any>(null);
    const [threadMessages, setThreadMessages] = useState<any[]>([]);

    const fetchMessages = useCallback(async () => {
        try {
            setError(null);
            const response = await getInboxMessages(workspaceId, {
                source: filters.source !== 'all' ? filters.source : undefined,
                campaign: filters.source === 'campaign' && filters.campaign ? filters.campaign : undefined,
                workflow: filters.source === 'workflow' && filters.workflow ? filters.workflow : undefined,
                sentiment: filters.sentiment as any || undefined,
                search: filters.search || undefined,
            });
            if (response.success) {
                const msgs = (response as any).messages || response.data?.messages || [];
                setMessages(msgs as LocalInboxMessage[]);
            } else {
                setError(response.error || "Failed to load messages");
            }
        } catch (err: any) {
            console.error("Failed to fetch inbox messages:", err);
            setError(err.message || "Failed to load inbox");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, filters.source, filters.campaign, filters.workflow, filters.sentiment, filters.search]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await getInboxStats(workspaceId);
            if (response.success) setStats(response.data);
        } catch (err) { console.error('Failed to fetch stats:', err); }
    }, [workspaceId]);

    const fetchCampaignsData = useCallback(async () => {
        try {
            const response = await getCampaigns(workspaceId);
            if (response.success) {
                const campaignList = response.campaigns || response.data?.campaigns || [];
                setCampaigns(campaignList.map(c => ({ _id: c._id, name: c.name })));
            }
        } catch (err) { console.error("Failed to fetch campaigns:", err); }
    }, [workspaceId]);

    const fetchWorkflowsData = useCallback(async () => {
        try {
            const response = await getWorkflows(workspaceId);
            if (response.success) {
                const workflowList = response.data?.workflows || [];
                setWorkflows(workflowList.map((w: any) => ({ _id: w._id, name: w.name })));
            }
        } catch (err) { console.error("Failed to fetch workflows:", err); }
    }, [workspaceId]);

    const fetchGroupedData = useCallback(async () => {
        try {
            setError(null);
            const response = await getGroupedInbox(workspaceId);
            if (response.success) {
                setGroupedData(response.data);
            }
        } catch (err) {
            console.error("Failed to fetch grouped inbox:", err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (viewMode === 'grouped') {
            fetchGroupedData();
        } else {
            fetchMessages();
        }
        fetchCampaignsData();
        fetchWorkflowsData();
        fetchStats();
    }, [viewMode, fetchMessages, fetchGroupedData, fetchCampaignsData, fetchWorkflowsData, fetchStats]);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchMessages(); };
    const handleMarkAsRead = async (messageId: string) => { try { await markMessageAsRead(messageId); fetchMessages(); } catch (err) { console.error("Failed to mark as read:", err); } };

    const loadThreadMessages = async (messageId: string) => {
        try {
            const response = await getThreadMessages(messageId);
            if (response.success) {
                setThreadMessages(response.messages);
            } else {
                // If thread loading fails, just use empty array - conversation still works
                setThreadMessages([]);
            }
        } catch (err) {
            console.error("Failed to load thread messages:", err);
            // Non-fatal error - conversation display still works without thread
            setThreadMessages([]);
        }
    };

    const handleSelectMessage = (message: LocalInboxMessage) => {
        setSelectedMessage(message);
        handleMarkAsRead(message._id);
        setAiDraft("");
        setThreadMessages([]);
        track('view', 'email', message._id);
        // Load thread messages in background (non-blocking)
        loadThreadMessages(message._id);
    };

    const handleGenerateDraft = async () => {
        if (!selectedMessage) return;
        setIsGeneratingDraft(true);
        try {
            const response = await generateAIDraft(selectedMessage._id);
            if (response.success && response.draft) { setAiDraft(response.draft); toast.success("AI draft ready!"); }
            else { toast.error(response.message || "Failed to generate"); }
        } catch (err: any) { toast.error(err.message || "Failed to generate"); }
        finally { setIsGeneratingDraft(false); }
    };

    const handleSendReply = async () => {
        if (!selectedMessage || !aiDraft.trim()) { toast.error("Write or generate a reply first"); return; }
        setIsSendingReply(true);
        try {
            const replySubject = `Re: ${selectedMessage.replySubject || selectedMessage.subject}`;
            const response = await sendReply(selectedMessage._id, aiDraft, replySubject);
            if (response.success) {
                toast.success("Reply sent!");
                setAiDraft("");
                // Reload thread messages to show the sent reply
                await loadThreadMessages(selectedMessage._id);
                // Refresh the inbox data
                if (viewMode === 'grouped') {
                    fetchGroupedData();
                } else {
                    fetchMessages();
                }
            }
            else { toast.error(response.message || "Failed to send"); }
        } catch (err: any) { toast.error(err.message || "Failed to send"); }
        finally { setIsSendingReply(false); }
    };

    const getSentimentIcon = (sentiment?: string) => {
        const icons: Record<string, { icon: React.ReactNode; color: string }> = {
            positive: { icon: <FaceSmileIcon className="w-4 h-4" />, color: "text-emerald-500" },
            negative: { icon: <FaceFrownIcon className="w-4 h-4" />, color: "text-rose-500" },
            neutral: { icon: <MinusCircleIcon className="w-4 h-4" />, color: "text-zinc-400" },
            out_of_office: { icon: <CalendarIcon className="w-4 h-4" />, color: "text-amber-500" },
            unsubscribe: { icon: <NoSymbolIcon className="w-4 h-4" />, color: "text-rose-500" },
        };
        return icons[sentiment || "neutral"] || icons.neutral;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getContactName = (message: LocalInboxMessage): string => {
        if (!message.contactId) return message.toEmail || message.fromEmail || "Unknown";
        if (typeof message.contactId === "string") return message.toEmail || message.fromEmail || "Unknown";
        return message.contactId.name || message.toEmail || message.fromEmail || "Unknown";
    };

    const getContactEmail = (message: LocalInboxMessage): string => {
        if (!message.contactId) return message.toEmail || message.fromEmail || "";
        if (typeof message.contactId === "string") return message.toEmail || message.fromEmail || "";
        return message.contactId.email || message.toEmail || message.fromEmail || "";
    };

    const getSourceIcon = (message: LocalInboxMessage) => {
        if (message.campaignId) return <RocketLaunchIcon className="w-3.5 h-3.5 text-blue-500" />;
        if (message.workflowId) return <BoltIcon className="w-3.5 h-3.5 text-violet-500" />;
        return <EnvelopeIcon className="w-3.5 h-3.5 text-zinc-400" />;
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading inbox...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
                {!selectedMessage && !selectedConversation ? (
                    /* LIST VIEW */
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                            >
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                        Inbox
                                    </h1>
                                    <span className="px-2.5 py-1 text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                        {stats.all}
                                    </span>
                                    {stats.unread > 0 && (
                                        <span className="px-2.5 py-1 text-sm font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                            {stats.unread} unread
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    {/* Source Filter */}
                                    <div className="relative">
                                        <select
                                            value={filters.source}
                                            onChange={(e) => {
                                                setFilters({ ...filters, source: e.target.value as any, campaign: '', workflow: '' });
                                            }}
                                            className="appearance-none px-3 py-2 pr-8 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-transparent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        >
                                            <option value="all">All Sources</option>
                                            <option value="campaign">Campaigns</option>
                                            <option value="workflow">Workflows</option>
                                            <option value="direct">Direct</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                    </div>

                                    {/* Specific Campaign Dropdown */}
                                    {filters.source === 'campaign' && campaigns.length > 0 && (
                                        <div className="relative">
                                            <select
                                                value={filters.campaign}
                                                onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                                                className="appearance-none px-3 py-2 pr-8 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-full cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            >
                                                <option value="">All Campaigns</option>
                                                {campaigns.map((c) => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Specific Workflow Dropdown */}
                                    {filters.source === 'workflow' && workflows.length > 0 && (
                                        <div className="relative">
                                            <select
                                                value={filters.workflow}
                                                onChange={(e) => setFilters({ ...filters, workflow: e.target.value })}
                                                className="appearance-none px-3 py-2 pr-8 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-full cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                            >
                                                <option value="">All Workflows</option>
                                                {workflows.map((w) => (
                                                    <option key={w._id} value={w._id}>{w.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-600 dark:text-violet-400 pointer-events-none" />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-colors",
                                            showFilters
                                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        )}
                                    >
                                        <FunnelIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Filter</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setIsSyncing(true);
                                            try {
                                                const result = await syncInbox(workspaceId);
                                                if (result.success) {
                                                    toast.success(result.message);
                                                    viewMode === 'grouped' ? fetchGroupedData() : fetchMessages();
                                                }
                                            } catch (err: any) {
                                                toast.error(err.message || "Failed to sync");
                                            } finally {
                                                setIsSyncing(false);
                                            }
                                        }}
                                        disabled={isSyncing}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                        <span className="hidden sm:inline">Sync</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>

                        {/* Divider */}
                        <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

                        {/* Search Bar */}
                        <div className="px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
                            <form onSubmit={handleSearch} className="relative max-w-md">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    placeholder="Search conversations..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border-0"
                                />
                            </form>
                        </div>

                        {/* Filters Bar */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 sm:px-6 lg:px-8 overflow-hidden"
                                >
                                    <div className="pb-4 flex items-center gap-2 flex-wrap">
                                        {['positive', 'negative', 'neutral'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setFilters({ ...filters, sentiment: filters.sentiment === s ? '' : s })}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                                    filters.sentiment === s
                                                        ? s === 'positive' ? 'bg-emerald-500 text-white' : s === 'negative' ? 'bg-rose-500 text-white' : 'bg-zinc-500 text-white'
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                )}
                                            >
                                                {s === 'positive' ? <FaceSmileIcon className="w-3.5 h-3.5" /> : s === 'negative' ? <FaceFrownIcon className="w-3.5 h-3.5" /> : <MinusCircleIcon className="w-3.5 h-3.5" />}
                                                {s.charAt(0).toUpperCase() + s.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6">
                            {viewMode === 'grouped' && groupedData ? (
                                <GroupedInboxView
                                    groupedData={{
                                        campaigns: filters.source === 'all' || filters.source === 'campaign'
                                            ? filters.campaign
                                                ? groupedData.campaigns.filter((c: any) => c.id === filters.campaign)
                                                : groupedData.campaigns
                                            : [],
                                        workflows: filters.source === 'all' || filters.source === 'workflow'
                                            ? filters.workflow
                                                ? groupedData.workflows.filter((w: any) => w.id === filters.workflow)
                                                : groupedData.workflows
                                            : [],
                                        direct: filters.source === 'all' || filters.source === 'direct'
                                            ? groupedData.direct
                                            : []
                                    }}
                                    onConversationClick={(conversation) => {
                                        setSelectedConversation(conversation);
                                        // Also set the first message as selected for the reply composer
                                        if (conversation.messages && conversation.messages.length > 0) {
                                            const latestReply = conversation.messages.find(m => m.replied) || conversation.messages[conversation.messages.length - 1];
                                            setSelectedMessage(latestReply as LocalInboxMessage);
                                        }
                                    }}
                                />
                            ) : messages.length === 0 ? (
                                /* Empty State */
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center py-16 px-4"
                                >
                                    <div className="text-center max-w-md">
                                        <EnvelopeOpenIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                            No messages yet
                                        </h2>
                                        <p className="text-sm text-zinc-500 mb-6">
                                            When contacts reply to your campaigns or workflows, they'll appear here. Start a campaign to begin receiving replies.
                                        </p>
                                        <button
                                            onClick={async () => {
                                                setIsSyncing(true);
                                                try {
                                                    const result = await syncInbox(workspaceId);
                                                    if (result.success) {
                                                        toast.success(result.message);
                                                        viewMode === 'grouped' ? fetchGroupedData() : fetchMessages();
                                                    }
                                                } catch (err: any) {
                                                    toast.error(err.message || "Failed to sync");
                                                } finally {
                                                    setIsSyncing(false);
                                                }
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                                        >
                                            <ArrowPathIcon className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                            Sync Inbox
                                        </button>
                                    </div>
                                </motion.div>
                            ) : viewMode === 'flat' ? (
                                <div className="space-y-2">
                                    {messages.map((message, index) => {
                                        const sentiment = getSentimentIcon(message.replySentiment);
                                        const initials = getContactName(message).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        const colors = ['from-blue-500 to-cyan-500', 'from-violet-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500'];
                                        const colorClass = colors[index % colors.length];

                                        return (
                                            <motion.button
                                                key={message._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                onClick={() => handleSelectMessage(message)}
                                                className="w-full p-4 flex items-center gap-4 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left group rounded-xl border border-zinc-200 dark:border-zinc-700/50"
                                            >
                                                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm", colorClass)}>
                                                    {initials || '?'}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">{getContactName(message)}</span>
                                                        {getSourceIcon(message)}

                                                        {/* Tracking Indicators */}
                                                        <div className="flex items-center gap-1">
                                                            {(message as any).opened && (
                                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                                    <EnvelopeOpenIcon className="w-2.5 h-2.5" />
                                                                    Opened
                                                                </div>
                                                            )}
                                                            {(message as any).clicked && (
                                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 rounded text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                                                    Clicked
                                                                </div>
                                                            )}
                                                            {(message as any).replied && (
                                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    Replied
                                                                </div>
                                                            )}
                                                        </div>

                                                        <span className="ml-auto text-xs text-zinc-400">{formatDate(message.repliedAt)}</span>
                                                    </div>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate mb-0.5">{message.replySubject || message.subject}</p>
                                                    <p className="text-xs text-zinc-400 truncate">{message.replyBody?.substring(0, 80)}...</p>
                                                </div>

                                                <div className={cn("flex-shrink-0", sentiment.color)}>
                                                    {sentiment.icon}
                                                </div>

                                                <ChevronRightIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 flex-shrink-0 transition-colors" />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                ) : (
                    /* DETAIL VIEW - WHATSAPP STYLE CHAT */
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col"
                    >
                        {/* Detail Header */}
                        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-900">
                            <button
                                onClick={() => {
                                    setSelectedMessage(null);
                                    setSelectedConversation(null);
                                }}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </button>

                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
                                    {(selectedConversation?.contactName || getContactName(selectedMessage!))
                                        .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {selectedConversation?.contactName || getContactName(selectedMessage!)}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {selectedConversation?.contactEmail || getContactEmail(selectedMessage!)}
                                        {selectedConversation && selectedConversation.messageCount > 1 && (
                                            <span className="ml-2 text-zinc-400">• {selectedConversation.messageCount} messages</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {selectedMessage && (
                                <div className={cn("", getSentimentIcon(selectedMessage.replySentiment).color)}>
                                    {getSentimentIcon(selectedMessage.replySentiment).icon}
                                </div>
                            )}
                        </div>

                        {/* Two Column Layout */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* LEFT COLUMN - Chat Thread */}
                            <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
                                {/* Chat Messages Area */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="max-w-3xl mx-auto space-y-4">
                                        {/* Show all messages in conversation */}
                                        {(selectedConversation?.messages || (selectedMessage ? [selectedMessage] : [])).map((msg, idx) => {
                                            const isFromYou = !msg.replied && msg.fromEmail !== (selectedConversation?.contactEmail || getContactEmail(selectedMessage!));
                                            const isReply = msg.replied && msg.replyBody;

                                            return (
                                                <div key={msg._id || idx}>
                                                    {/* Your Sent Email */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="flex justify-end mb-4"
                                                    >
                                                        <div className="max-w-[75%]">
                                                            <div className="flex items-center justify-end gap-2 mb-1">
                                                                <span className="text-xs text-zinc-400">{formatDate(msg.sentAt)}</span>
                                                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">You</span>
                                                            </div>
                                                            <div className="bg-blue-500 text-white p-4 rounded-2xl rounded-tr-sm shadow-sm">
                                                                <p className="text-xs font-medium opacity-80 mb-1">{msg.subject}</p>
                                                                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                                                    {(msg.bodyText || msg.bodyHtml?.replace(/<[^>]*>/g, '') || '').substring(0, 500)}
                                                                    {(msg.bodyText || '').length > 500 && '...'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>

                                                    {/* Their Reply */}
                                                    {isReply && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 + 0.02 }}
                                                            className="flex justify-start"
                                                        >
                                                            <div className="max-w-[75%]">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-[10px]">
                                                                        {(selectedConversation?.contactName || getContactName(selectedMessage!))
                                                                            .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                                    </div>
                                                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                                        {selectedConversation?.contactName || getContactName(selectedMessage!)}
                                                                    </span>
                                                                    <span className="text-xs text-zinc-400">{formatDate(msg.repliedAt)}</span>
                                                                </div>
                                                                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-sm shadow-sm border border-zinc-200 dark:border-zinc-700">
                                                                    {msg.replySubject && (
                                                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{msg.replySubject}</p>
                                                                    )}
                                                                    <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                                        {msg.replyBody}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN - Reply Composer */}
                            <div className="w-[500px] flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
                                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <EnvelopeIcon className="w-5 h-5 text-emerald-500" />
                                        Compose Reply
                                    </h2>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {/* AI Draft Section */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleGenerateDraft}
                                            disabled={isGeneratingDraft}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
                                        >
                                            <SparklesIcon className={cn("w-4 h-4", isGeneratingDraft && "animate-spin")} />
                                            {isGeneratingDraft ? "Generating..." : "Generate AI Reply"}
                                        </button>

                                        {aiDraft && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <SparklesIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400">AI Generated Draft</span>
                                                </div>
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{aiDraft}</p>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Reply Textarea */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Reply</label>
                                        <textarea
                                            value={aiDraft}
                                            onChange={(e) => setAiDraft(e.target.value)}
                                            placeholder="Type your reply here..."
                                            rows={12}
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Send Button */}
                                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                                    <button
                                        onClick={handleSendReply}
                                        disabled={isSendingReply || !aiDraft.trim()}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <PaperAirplaneIcon className={cn("w-4 h-4", isSendingReply && "animate-pulse")} />
                                        {isSendingReply ? "Sending..." : "Send Reply"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
