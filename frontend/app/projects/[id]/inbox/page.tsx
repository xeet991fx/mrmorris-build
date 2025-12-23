"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowPathIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    FaceSmileIcon,
    FaceFrownIcon,
    MinusCircleIcon,
    UserIcon,
    EnvelopeOpenIcon,
} from "@heroicons/react/24/outline";
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

// Local type for inbox messages with extended properties
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
    // Extended fields for replies
    replySubject?: string;
    replyBody?: string;
    replySentiment?: "positive" | "negative" | "neutral" | "out_of_office" | "unsubscribe";
    repliedAt?: string;
    metadata?: {
        isRead?: boolean;
        assignedTo?: string;
        labels?: string[];
    };
    contact?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export default function InboxPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    // Track actions for AI insights
    const { track } = useInsightTracking({
        workspaceId,
        page: 'inbox',
        enabled: !!workspaceId,
    });

    const [messages, setMessages] = useState<LocalInboxMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<LocalInboxMessage | null>(null);
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
                // Messages can be at top level or in data object depending on API version
                const msgs = (response as any).messages || response.data?.messages || [];
                setMessages(msgs as LocalInboxMessage[]);
                console.log("Inbox messages loaded:", msgs.length);
            } else {
                setError(response.error || "Failed to load messages");
            }
        } catch (err: any) {
            console.error("Failed to fetch inbox messages:", err);
            setError(err.message || "Failed to load inbox");
            toast.error("Failed to load inbox");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, filters.source, filters.campaign, filters.workflow, filters.sentiment, filters.search]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await getInboxStats(workspaceId);
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, [workspaceId]);

    const fetchCampaignsData = useCallback(async () => {
        try {
            const response = await getCampaigns(workspaceId);
            if (response.success) {
                const campaignList = response.campaigns || response.data?.campaigns || [];
                setCampaigns(campaignList.map(c => ({ _id: c._id, name: c.name })));
            }
        } catch (err) {
            console.error("Failed to fetch campaigns:", err);
        }
    }, [workspaceId]);

    const fetchWorkflowsData = useCallback(async () => {
        try {
            const response = await getWorkflows(workspaceId);
            if (response.success) {
                const workflowList = response.data?.workflows || [];
                setWorkflows(workflowList.map((w: any) => ({ _id: w._id, name: w.name })));
            }
        } catch (err) {
            console.error("Failed to fetch workflows:", err);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchMessages();
        fetchCampaignsData();
        fetchWorkflowsData();
        fetchStats();
    }, [fetchMessages, fetchCampaignsData, fetchWorkflowsData, fetchStats]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMessages();
    };

    const handleMarkAsRead = async (messageId: string) => {
        try {
            await markMessageAsRead(messageId);
            fetchMessages();
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case "positive":
                return <FaceSmileIcon className="w-5 h-5 text-green-400" />;
            case "negative":
                return <FaceFrownIcon className="w-5 h-5 text-red-400" />;
            case "neutral":
                return <MinusCircleIcon className="w-5 h-5 text-gray-400" />;
            case "out_of_office":
                return <ExclamationCircleIcon className="w-5 h-5 text-yellow-400" />;
            case "unsubscribe":
                return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
            default:
                return <MinusCircleIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getSentimentBadge = (sentiment?: string) => {
        const badges: Record<string, { bg: string; text: string; label: string; icon: string }> = {
            positive: { bg: "bg-green-500/15 border border-green-500/30", text: "text-green-400", label: "Positive", icon: "😊" },
            negative: { bg: "bg-red-500/15 border border-red-500/30", text: "text-red-400", label: "Negative", icon: "😞" },
            neutral: { bg: "bg-gray-500/15 border border-gray-500/30", text: "text-gray-400", label: "Neutral", icon: "😐" },
            out_of_office: { bg: "bg-yellow-500/15 border border-yellow-500/30", text: "text-yellow-400", label: "Away", icon: "🏖️" },
            unsubscribe: { bg: "bg-red-500/15 border border-red-500/30", text: "text-red-400", label: "Unsub", icon: "🚫" },
        };
        const badge = badges[sentiment || "neutral"] || badges.neutral;
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                <span className="text-[10px]">{badge.icon}</span>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 24) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Type-safe accessors for contactId which can be string or object
    const getContactName = (message: LocalInboxMessage): string => {
        if (!message.contactId) return message.toEmail || message.fromEmail || "Unknown";
        if (typeof message.contactId === "string") return message.toEmail || message.fromEmail || "Unknown";
        return message.contactId.name || message.toEmail || message.fromEmail || "Unknown";
    };

    const getContactCompany = (message: LocalInboxMessage): string => {
        if (!message.contactId) return message.toEmail || "";
        if (typeof message.contactId === "string") return message.toEmail || "";
        return message.contactId.company || message.toEmail || "";
    };

    const getSourceInfo = (message: LocalInboxMessage): { type: string; name: string; icon: string; color: string } => {
        // Check for campaign
        if (message.campaignId) {
            const name = typeof message.campaignId === 'string' ? 'Campaign' : (message.campaignId.name || 'Campaign');
            return { type: 'Campaign', name, icon: '📧', color: 'text-blue-400 bg-blue-500/10' };
        }
        // Check for workflow
        if (message.workflowId) {
            const name = typeof message.workflowId === 'string' ? 'Workflow' : (message.workflowId.name || 'Workflow');
            return { type: 'Workflow', name, icon: '⚡', color: 'text-purple-400 bg-purple-500/10' };
        }
        // Check for sequence
        if (message.sequenceId) {
            const name = typeof message.sequenceId === 'string' ? 'Sequence' : (message.sequenceId.name || 'Sequence');
            return { type: 'Sequence', name, icon: '📋', color: 'text-orange-400 bg-orange-500/10' };
        }
        // Check source field
        if (message.source === 'workflow') {
            return { type: 'Workflow', name: 'Workflow', icon: '⚡', color: 'text-purple-400 bg-purple-500/10' };
        }
        if (message.source === 'sequence') {
            return { type: 'Sequence', name: 'Sequence', icon: '📋', color: 'text-orange-400 bg-orange-500/10' };
        }
        if (message.source === 'campaign') {
            return { type: 'Campaign', name: 'Campaign', icon: '📧', color: 'text-blue-400 bg-blue-500/10' };
        }
        // Default to direct email
        return { type: 'Direct', name: 'Direct Email', icon: '✉️', color: 'text-gray-400 bg-gray-500/10' };
    };

    const getContactEmail = (message: LocalInboxMessage): string => {
        if (!message.contactId) return message.toEmail || message.fromEmail || "";
        if (typeof message.contactId === "string") return message.toEmail || message.fromEmail || "";
        return message.contactId.email || message.toEmail || message.fromEmail || "";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card/95 flex flex-col">
            {/* Header - matches contacts/workflows style */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between flex-shrink-0">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
                    <p className="text-xs text-muted-foreground">
                        {messages.length} messages • {stats.unread} unread
                    </p>
                </motion.div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            setIsSyncing(true);
                            try {
                                const result = await syncInbox(workspaceId);
                                if (result.success) {
                                    toast.success(result.message);
                                    fetchMessages();
                                }
                            } catch (err: any) {
                                toast.error(err.message || "Failed to sync");
                            } finally {
                                setIsSyncing(false);
                            }
                        }}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-background rounded-lg hover:bg-[#8AB82E] transition-all disabled:opacity-50 font-medium text-sm"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Gmail'}
                    </button>
                    <button
                        onClick={() => fetchMessages()}
                        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted/50 transition-all text-sm"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-border flex items-center gap-4 flex-shrink-0">
                <form onSubmit={handleSearch} className="flex-1 max-w-sm">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Search messages..."
                            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 focus:border-[#9ACD32] transition-all"
                        />
                    </div>
                </form>

                <select
                    value={filters.sentiment}
                    onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                    className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 cursor-pointer"
                >
                    <option value="">All Sentiments</option>
                    <option value="positive">😊 Positive</option>
                    <option value="negative">😞 Negative</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="out_of_office">🏖️ Out of Office</option>
                    <option value="unsubscribe">🚫 Unsubscribe</option>
                </select>

                <div className="flex items-center gap-3">
                    <select
                        value={filters.source}
                        onChange={(e) => setFilters({ ...filters, source: e.target.value as any, campaign: '', workflow: '' })}
                        className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 cursor-pointer"
                    >
                        <option value="all">📬 All Sources ({stats.all})</option>
                        <option value="campaign">📧 Campaigns ({stats.campaigns})</option>
                        <option value="workflow">⚡ Workflows ({stats.workflows})</option>
                        <option value="direct">✉️ Direct ({stats.direct})</option>
                    </select>

                    {filters.source === 'campaign' && (
                        <select
                            value={filters.campaign}
                            onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 cursor-pointer"
                        >
                            <option value="">All Campaigns</option>
                            {campaigns.map((campaign) => (
                                <option key={campaign._id} value={campaign._id}>{campaign.name}</option>
                            ))}
                        </select>
                    )}

                    {filters.source === 'workflow' && (
                        <select
                            value={filters.workflow}
                            onChange={(e) => setFilters({ ...filters, workflow: e.target.value })}
                            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 cursor-pointer"
                        >
                            <option value="">All Workflows</option>
                            {workflows.map((workflow) => (
                                <option key={workflow._id} value={workflow._id}>{workflow.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Messages List & Detail View */}
            <div className="flex-1 flex gap-4 p-6 min-h-0">
                {/* Messages List */}
                <div className="w-2/5 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Conversations
                        </h2>
                    </div>
                    {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-6">
                            <div className="text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center">
                                    <EnvelopeOpenIcon className="w-7 h-7 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">No messages yet</h3>
                                <p className="text-xs text-muted-foreground max-w-[180px] mx-auto">
                                    When contacts reply to your emails, they will appear here
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            {messages.map((message, index) => {
                                const initials = getContactName(message).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                const isSelected = selectedMessage?._id === message._id;
                                const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-orange-500 to-red-500', 'from-green-500 to-emerald-500', 'from-indigo-500 to-violet-500'];
                                const colorClass = colors[index % colors.length];

                                return (
                                    <motion.button
                                        key={message._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        onClick={() => {
                                            setSelectedMessage(message);
                                            handleMarkAsRead(message._id);
                                            setAiDraft("");
                                            track('view', 'email', message._id);
                                        }}
                                        className={`w-full px-3 py-2.5 text-left transition-all border-b border-border/30 ${isSelected
                                            ? "bg-[#9ACD32]/10 border-l-2 border-l-[#9ACD32]"
                                            : "hover:bg-muted/40"
                                            }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-medium text-xs flex-shrink-0`}>
                                                {initials || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="font-medium text-foreground text-xs truncate pr-2">
                                                        {getContactName(message)}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {formatDate(message.repliedAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground/80 font-medium mb-0.5 truncate">
                                                    {message.replySubject || message.subject}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1.5">
                                                    {message.replyBody?.substring(0, 60)}...
                                                </p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {getSentimentBadge(message.replySentiment)}
                                                    {(() => {
                                                        const sourceInfo = getSourceInfo(message);
                                                        return (
                                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceInfo.color}`}>
                                                                <span>{sourceInfo.icon}</span>
                                                                <span className="truncate max-w-[80px]">{sourceInfo.name}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Message Detail */}
                <div className="w-3/5 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    {selectedMessage ? (
                        <>
                            {/* Detail Header */}
                            <div className="p-4 border-b border-border bg-muted/20">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9ACD32] to-[#9ACD32]/60 flex items-center justify-center text-white font-semibold text-sm">
                                            {getContactName(selectedMessage).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">
                                                {getContactName(selectedMessage)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {getContactEmail(selectedMessage)}
                                            </p>
                                        </div>
                                    </div>
                                    {getSentimentBadge(selectedMessage.replySentiment)}
                                </div>
                                <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                                    <h3 className="text-sm font-semibold text-foreground mb-1">
                                        {selectedMessage.replySubject || selectedMessage.subject}
                                    </h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        {(() => {
                                            const sourceInfo = getSourceInfo(selectedMessage);
                                            return (
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceInfo.color}`}>
                                                    {sourceInfo.icon} {sourceInfo.name}
                                                </span>
                                            );
                                        })()}
                                        <span>•</span>
                                        <span>{formatDate(selectedMessage.repliedAt)}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* AI Email Insights */}
                                <EmailInsightsPanel
                                    workspaceId={workspaceId}
                                    emailId={selectedMessage._id}
                                />

                                {/* Reply Content */}
                                <div className="bg-muted/20 rounded-xl p-5 border border-border/30">
                                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Reply from {getContactName(selectedMessage)}</p>
                                    <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                                        {selectedMessage.replyBody}
                                    </div>
                                </div>
                            </div>

                            {/* Reply Actions with AI Draft */}
                            <div className="p-6 border-t border-border/50 bg-muted/20 space-y-4">
                                {/* AI Draft Preview */}
                                {aiDraft && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium text-green-500 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                ✨ AI Draft Ready
                                            </span>
                                            <button
                                                onClick={() => setAiDraft("")}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <textarea
                                            value={aiDraft}
                                            onChange={(e) => setAiDraft(e.target.value)}
                                            rows={5}
                                            className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 resize-none"
                                            placeholder="Edit your response..."
                                        />
                                    </motion.div>
                                )}

                                <div className="flex gap-3">
                                    {/* Generate AI Draft Button */}
                                    <button
                                        onClick={async () => {
                                            if (!selectedMessage) return;
                                            setIsGeneratingDraft(true);
                                            try {
                                                const response = await generateAIDraft(selectedMessage._id);
                                                if (response.success && response.draft) {
                                                    setAiDraft(response.draft);
                                                    toast.success("AI draft generated!");
                                                } else {
                                                    toast.error(response.message || "Failed to generate draft");
                                                }
                                            } catch (err: any) {
                                                toast.error(err.message || "Failed to generate draft");
                                            } finally {
                                                setIsGeneratingDraft(false);
                                            }
                                        }}
                                        disabled={isGeneratingDraft}
                                        className="flex-1 px-5 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-foreground rounded-xl hover:from-violet-500/20 hover:to-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                                    >
                                        {isGeneratingDraft ? (
                                            <>
                                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>✨ Generate AI Draft</>
                                        )}
                                    </button>

                                    {/* Send Button */}
                                    <button
                                        onClick={async () => {
                                            if (!selectedMessage || !aiDraft.trim()) {
                                                toast.error("Please generate or write a reply first");
                                                return;
                                            }
                                            setIsSendingReply(true);
                                            try {
                                                const response = await sendReply(
                                                    selectedMessage._id,
                                                    aiDraft,
                                                    `Re: ${selectedMessage.replySubject || selectedMessage.subject}`
                                                );
                                                if (response.success) {
                                                    toast.success("Reply sent!");
                                                    setAiDraft("");
                                                } else {
                                                    toast.error(response.message || "Failed to send reply");
                                                }
                                            } catch (err: any) {
                                                toast.error(err.message || "Failed to send reply");
                                            } finally {
                                                setIsSendingReply(false);
                                            }
                                        }}
                                        disabled={!aiDraft.trim() || isSendingReply}
                                        className="px-8 py-3 bg-[#9ACD32] text-background rounded-xl hover:bg-[#8AB82E] hover:shadow-lg hover:shadow-[#9ACD32]/30 transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center gap-2 font-semibold"
                                    >
                                        {isSendingReply ? (
                                            <>
                                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>Send Reply <span className="text-lg">→</span></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <div className="text-center max-w-md">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <EnvelopeOpenIcon className="w-10 h-10 text-primary/60" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Select a conversation</h3>
                                <p className="text-muted-foreground text-sm mb-8">
                                    Choose a message from the list to view details and reply
                                </p>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                        <p className="text-2xl font-bold text-foreground">{stats.all}</p>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                        <p className="text-2xl font-bold text-primary">{stats.unread}</p>
                                        <p className="text-xs text-muted-foreground">Unread</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                        <p className="text-2xl font-bold text-foreground">{stats.campaigns}</p>
                                        <p className="text-xs text-muted-foreground">Campaigns</p>
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="text-left space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Tips</p>
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                        <span>Click any message to view full details and AI insights</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                        <span>Use "Generate AI Draft" for smart reply suggestions</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                        <span>Filter by sentiment to prioritize urgent replies</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
