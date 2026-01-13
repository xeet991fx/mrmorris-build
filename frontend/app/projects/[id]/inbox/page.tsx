"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Inbox,
    RefreshCw,
    Search,
    Mail,
    MailOpen,
    Sparkles,
    Send,
    Smile,
    Frown,
    Meh,
    Calendar,
    Ban,
    Workflow,
    Target,
    ChevronRight,
    ChevronDown,
    ArrowLeft,
    Filter,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    getInboxMessages,
    getInboxStats,
    markMessageAsRead,
    generateAIDraft,
    sendReply,
    syncInbox,
    getGroupedInbox,
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
    contactId?: { _id: string; name: string; email: string; company?: string } | string;
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

export default function InboxPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { track } = useInsightTracking({ workspaceId, page: 'inbox', enabled: !!workspaceId });

    const [messages, setMessages] = useState<LocalInboxMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<LocalInboxMessage | null>(null);
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
            const response = await sendReply(selectedMessage._id, aiDraft, `Re: ${selectedMessage.replySubject || selectedMessage.subject}`);
            if (response.success) { toast.success("Reply sent!"); setAiDraft(""); }
            else { toast.error(response.message || "Failed to send"); }
        } catch (err: any) { toast.error(err.message || "Failed to send"); }
        finally { setIsSendingReply(false); }
    };

    const getSentimentIcon = (sentiment?: string) => {
        const icons: Record<string, { icon: React.ReactNode; color: string }> = {
            positive: { icon: <Smile className="w-4 h-4" />, color: "text-emerald-500" },
            negative: { icon: <Frown className="w-4 h-4" />, color: "text-rose-500" },
            neutral: { icon: <Meh className="w-4 h-4" />, color: "text-zinc-400" },
            out_of_office: { icon: <Calendar className="w-4 h-4" />, color: "text-amber-500" },
            unsubscribe: { icon: <Ban className="w-4 h-4" />, color: "text-rose-500" },
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
        if (message.campaignId) return <Target className="w-3 h-3 text-blue-500" />;
        if (message.workflowId) return <Workflow className="w-3 h-3 text-violet-500" />;
        return <Mail className="w-3 h-3 text-zinc-400" />;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-500">Loading inbox...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <AnimatePresence mode="wait">
                {!selectedMessage ? (
                    /* LIST VIEW */
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-screen flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-white dark:bg-zinc-900 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                        <Inbox className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Inbox</h1>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span>{stats.all} total</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                            <span className="text-emerald-500 font-medium">{stats.unread} unread</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Cascading Dropdowns */}
                                    <div className="flex items-center gap-2">
                                        {/* Source Type Dropdown */}
                                        <div className="relative">
                                            <select
                                                value={filters.source}
                                                onChange={(e) => {
                                                    setFilters({ ...filters, source: e.target.value as any, campaign: '', workflow: '' });
                                                }}
                                                className="px-4 py-2 pr-8 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium appearance-none cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            >
                                                <option value="all">All Sources</option>
                                                <option value="campaign">Campaigns</option>
                                                <option value="workflow">Workflows</option>
                                                <option value="direct">Direct</option>
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                        </div>

                                        {/* Specific Campaign Dropdown */}
                                        {filters.source === 'campaign' && campaigns.length > 0 && (
                                            <div className="relative">
                                                <select
                                                    value={filters.campaign}
                                                    onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                                                    className="px-4 py-2 pr-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium appearance-none cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                >
                                                    <option value="">All Campaigns</option>
                                                    {campaigns.map((c) => (
                                                        <option key={c._id} value={c._id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
                                            </div>
                                        )}

                                        {/* Specific Workflow Dropdown */}
                                        {filters.source === 'workflow' && workflows.length > 0 && (
                                            <div className="relative">
                                                <select
                                                    value={filters.workflow}
                                                    onChange={(e) => setFilters({ ...filters, workflow: e.target.value })}
                                                    className="px-4 py-2 pr-8 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium appearance-none cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                                >
                                                    <option value="">All Workflows</option>
                                                    {workflows.map((w) => (
                                                        <option key={w._id} value={w._id}>{w.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-600 dark:text-violet-400 pointer-events-none" />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={cn(
                                            "p-2.5 rounded-full transition-colors",
                                            showFilters ? "bg-emerald-500 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                        )}
                                    >
                                        <Filter className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setIsSyncing(true);
                                            try {
                                                const result = await syncInbox(workspaceId);
                                                if (result.success) { toast.success(result.message); viewMode === 'grouped' ? fetchGroupedData() : fetchMessages(); }
                                            } catch (err: any) { toast.error(err.message || "Failed to sync"); }
                                            finally { setIsSyncing(false); }
                                        }}
                                        disabled={isSyncing}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                        Sync
                                    </button>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className="w-full">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        placeholder="Search conversations..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Filters Bar */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 overflow-hidden"
                                >
                                    <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
                                        {['all', 'campaign', 'workflow', 'direct'].map((source) => (
                                            <button
                                                key={source}
                                                onClick={() => setFilters({ ...filters, source: source as any, campaign: '', workflow: '' })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                                    filters.source === source
                                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                )}
                                            >
                                                {source === 'all' ? '📬 All' : source === 'campaign' ? '📧 Campaigns' : source === 'workflow' ? '⚡ Workflows' : '✉️ Direct'}
                                            </button>
                                        ))}
                                        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
                                        {['positive', 'negative', 'neutral'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setFilters({ ...filters, sentiment: filters.sentiment === s ? '' : s })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                                                    filters.sentiment === s
                                                        ? s === 'positive' ? 'bg-emerald-500 text-white' : s === 'negative' ? 'bg-rose-500 text-white' : 'bg-zinc-500 text-white'
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                                )}
                                            >
                                                {s === 'positive' ? <Smile className="w-3 h-3" /> : s === 'negative' ? <Frown className="w-3 h-3" /> : <Meh className="w-3 h-3" />}
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4">
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
                                    onEmailClick={(email) => { setSelectedMessage(email); handleMarkAsRead(email._id); setAiDraft(""); track('view', 'email', email._id); }}
                                />
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-8">
                                    <MailOpen className="w-16 h-16 text-zinc-200 dark:text-zinc-700 mb-4" />
                                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No messages yet</h3>
                                    <p className="text-sm text-zinc-500 text-center">When contacts reply to your campaigns or workflows, they'll appear here</p>
                                </div>
                            ) : viewMode === 'flat' ? (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                                                onClick={() => { setSelectedMessage(message); handleMarkAsRead(message._id); setAiDraft(""); track('view', 'email', message._id); }}
                                                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white dark:hover:bg-zinc-800/50 transition-colors text-left group"
                                            >
                                                <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm", colorClass)}>
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
                                                                    <MailOpen className="w-2.5 h-2.5" />
                                                                    Opened
                                                                </div>
                                                            )}
                                                            {(message as any).clicked && (
                                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 rounded text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                                                    <span>🔗</span>
                                                                    Clicked
                                                                </div>
                                                            )}
                                                            {(message as any).replied && (
                                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    💬 Replied
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

                                                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 flex-shrink-0 transition-colors" />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                ) : (
                    /* DETAIL VIEW - TWO COLUMN LAYOUT */
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900"
                    >
                        {/* Detail Header */}
                        <div className="px-6 py-4 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </button>

                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
                                    {getContactName(selectedMessage).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{getContactName(selectedMessage)}</p>
                                    <p className="text-xs text-zinc-500 truncate">{getContactEmail(selectedMessage)}</p>
                                </div>
                            </div>

                            <div className={cn("", getSentimentIcon(selectedMessage.replySentiment).color)}>
                                {getSentimentIcon(selectedMessage.replySentiment).icon}
                            </div>
                        </div>

                        {/* Two Column Layout */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* LEFT COLUMN - Email Conversation Thread */}
                            <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                                <div className="p-6 space-y-4">
                                    {/* Subject */}
                                    <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{selectedMessage.replySubject || selectedMessage.subject}</h1>
                                        <p className="text-xs text-zinc-500">Conversation with {getContactName(selectedMessage)}</p>
                                    </div>

                                    {/* Original Email (Your Sent Email) */}
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                You
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">You</span>
                                                    <span className="text-xs text-zinc-400">to {getContactName(selectedMessage)}</span>
                                                    <span className="ml-auto text-xs text-zinc-400">{formatDate(selectedMessage.sentAt)}</span>
                                                </div>
                                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{selectedMessage.subject}</p>
                                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                                        {selectedMessage.bodyText || selectedMessage.bodyHtml?.replace(/<[^>]*>/g, '') || 'No content'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reply Email (Their Response) */}
                                    {selectedMessage.replyBody && (
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                    {getContactName(selectedMessage).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{getContactName(selectedMessage)}</span>
                                                        <span className="text-xs text-zinc-400">to You</span>
                                                        <span className="ml-auto text-xs text-zinc-400">{formatDate(selectedMessage.repliedAt)}</span>
                                                    </div>
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{selectedMessage.replySubject}</p>
                                                        <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                            {selectedMessage.replyBody}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Insights */}
                                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                        <EmailInsightsPanel workspaceId={workspaceId} emailId={selectedMessage._id} />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN - Reply Composer */}
                            <div className="w-[500px] flex flex-col bg-white dark:bg-zinc-900">
                                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-emerald-500" />
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
                                            <Sparkles className={cn("w-4 h-4", isGeneratingDraft && "animate-spin")} />
                                            {isGeneratingDraft ? "Generating..." : "Generate AI Reply"}
                                        </button>

                                        {aiDraft && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
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
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
                                    >
                                        <Send className={cn("w-4 h-4", isSendingReply && "animate-pulse")} />
                                        {isSendingReply ? "Sending..." : "Send Reply"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
