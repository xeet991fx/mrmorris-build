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
} from "@/lib/api/inbox";
import { getCampaigns } from "@/lib/api/campaign";
import { getWorkflows } from "@/lib/api/workflow";
import { EmailInsightsPanel } from "@/components/inbox/EmailInsightsPanel";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { cn } from "@/lib/utils";

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

    useEffect(() => {
        fetchMessages();
        fetchCampaignsData();
        fetchWorkflowsData();
        fetchStats();
    }, [fetchMessages, fetchCampaignsData, fetchWorkflowsData, fetchStats]);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchMessages(); };
    const handleMarkAsRead = async (messageId: string) => { try { await markMessageAsRead(messageId); fetchMessages(); } catch (err) { console.error("Failed to mark as read:", err); } };

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
                        <div className="bg-white dark:bg-zinc-900 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                            <div className="flex items-center gap-3 flex-1">
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

                            {/* Search */}
                            <form onSubmit={handleSearch} className="flex-1 max-w-md">
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

                            {/* Actions */}
                            <div className="flex items-center gap-2">
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
                                            if (result.success) { toast.success(result.message); fetchMessages(); }
                                        } catch (err: any) { toast.error(err.message || "Failed to sync"); }
                                        finally { setIsSyncing(false); }
                                    }}
                                    disabled={isSyncing}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
                                >
                                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                    Sync
                                </button>
                            </div>
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
                        <div className="flex-1 overflow-y-auto">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-8">
                                    <MailOpen className="w-16 h-16 text-zinc-200 dark:text-zinc-700 mb-4" />
                                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No messages yet</h3>
                                    <p className="text-sm text-zinc-500 text-center">When contacts reply to your campaigns or workflows, they'll appear here</p>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </motion.div>
                ) : (
                    /* DETAIL VIEW */
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="h-screen flex flex-col bg-white dark:bg-zinc-900"
                    >
                        {/* Detail Header */}
                        <div className="px-6 py-4 flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800">
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

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-3xl mx-auto p-6 space-y-6">
                                {/* Subject */}
                                <div>
                                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{selectedMessage.replySubject || selectedMessage.subject}</h1>
                                    <p className="text-xs text-zinc-500">{new Date(selectedMessage.repliedAt || selectedMessage.createdAt).toLocaleString()}</p>
                                </div>

                                {/* Email Body */}
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedMessage.replyBody}
                                    </div>
                                </div>

                                {/* AI Insights */}
                                <EmailInsightsPanel workspaceId={workspaceId} emailId={selectedMessage._id} />

                                {/* AI Draft Section */}
                                <div className="space-y-4">
                                    {aiDraft && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                                            <div className="absolute -top-3 left-4 flex items-center gap-1.5 px-2 py-0.5 bg-violet-500 text-white text-xs font-medium rounded-full">
                                                <Sparkles className="w-3 h-3" />
                                                AI Draft
                                            </div>
                                            <textarea
                                                value={aiDraft}
                                                onChange={(e) => setAiDraft(e.target.value)}
                                                rows={6}
                                                className="w-full p-4 pt-6 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                                                placeholder="Edit your response..."
                                            />
                                            <button onClick={() => setAiDraft("")} className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={async () => {
                                                if (!selectedMessage) return;
                                                setIsGeneratingDraft(true);
                                                try {
                                                    const response = await generateAIDraft(selectedMessage._id);
                                                    if (response.success && response.draft) { setAiDraft(response.draft); toast.success("AI draft ready!"); }
                                                    else { toast.error(response.message || "Failed to generate"); }
                                                } catch (err: any) { toast.error(err.message || "Failed to generate"); }
                                                finally { setIsGeneratingDraft(false); }
                                            }}
                                            disabled={isGeneratingDraft}
                                            className="flex-1 px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                                        >
                                            {isGeneratingDraft ? (<><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>) : (<><Sparkles className="w-4 h-4 text-violet-500" />Generate AI Reply</>)}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!selectedMessage || !aiDraft.trim()) { toast.error("Write or generate a reply first"); return; }
                                                setIsSendingReply(true);
                                                try {
                                                    const response = await sendReply(selectedMessage._id, aiDraft, `Re: ${selectedMessage.replySubject || selectedMessage.subject}`);
                                                    if (response.success) { toast.success("Reply sent!"); setAiDraft(""); } else { toast.error(response.message || "Failed to send"); }
                                                } catch (err: any) { toast.error(err.message || "Failed to send"); }
                                                finally { setIsSendingReply(false); }
                                            }}
                                            disabled={!aiDraft.trim() || isSendingReply}
                                            className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2 font-medium"
                                        >
                                            {isSendingReply ? (<><RefreshCw className="w-4 h-4 animate-spin" />Sending...</>) : (<><Send className="w-4 h-4" />Send</>)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
