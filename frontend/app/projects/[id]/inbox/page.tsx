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
    markMessageAsRead,
    generateAIDraft,
    sendReply,
    syncInbox,
} from "@/lib/api/inbox";
import { getCampaigns } from "@/lib/api/campaign";

// Local type for inbox messages with extended properties
interface LocalInboxMessage {
    _id: string;
    workspaceId: string;
    campaignId?: { _id: string; name: string } | string;
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
    // Extended fields for campaign replies
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

    const [messages, setMessages] = useState<LocalInboxMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<LocalInboxMessage | null>(null);
    const [filters, setFilters] = useState({
        campaign: "",
        sentiment: "",
        search: "",
    });
    const [campaigns, setCampaigns] = useState<Array<{ _id: string; name: string }>>([]);
    const [aiDraft, setAiDraft] = useState<string>("");
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchMessages = useCallback(async () => {
        try {
            setError(null);
            const response = await getInboxMessages(workspaceId, {
                campaign: filters.campaign || undefined,
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
    }, [workspaceId, filters.campaign, filters.sentiment, filters.search]);

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

    useEffect(() => {
        fetchMessages();
        fetchCampaignsData();
    }, [fetchMessages, fetchCampaignsData]);

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
            positive: { bg: "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30", text: "text-green-400", label: "Positive", icon: "😊" },
            negative: { bg: "bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30", text: "text-red-400", label: "Negative", icon: "😞" },
            neutral: { bg: "bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-gray-500/30", text: "text-gray-400", label: "Neutral", icon: "😐" },
            out_of_office: { bg: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30", text: "text-yellow-400", label: "Away", icon: "🏖️" },
            unsubscribe: { bg: "bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30", text: "text-red-400", label: "Unsubscribe", icon: "🚫" },
        };
        const badge = badges[sentiment || "neutral"] || badges.neutral;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${badge.bg} ${badge.text}`}>
                <span>{badge.icon}</span>
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

    const getCampaignName = (message: LocalInboxMessage): string => {
        if (!message.campaignId) return "Unknown Campaign";
        if (typeof message.campaignId === "string") return "Campaign";
        return message.campaignId.name || "Unknown Campaign";
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
        <div className="h-[calc(100vh-2rem)] flex flex-col p-6 bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header with gradient accent */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                            <EnvelopeOpenIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
                            <p className="text-sm text-muted-foreground">
                                {messages.length} {messages.length === 1 ? 'reply' : 'replies'} from campaigns
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            setIsSyncing(true);
                            try {
                                const result = await syncInbox();
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 font-medium"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Gmail'}
                    </button>
                    <button
                        onClick={() => fetchMessages()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters - Glassmorphism style */}
            <div className="flex items-center gap-4 mb-6 flex-shrink-0 p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl">
                <form onSubmit={handleSearch} className="flex-1 max-w-md">
                    <div className="relative group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Search replies..."
                            className="w-full pl-12 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>
                </form>

                <select
                    value={filters.campaign}
                    onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                    className="px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                    <option value="">All Campaigns</option>
                    {campaigns.map((campaign) => (
                        <option key={campaign._id} value={campaign._id}>{campaign.name}</option>
                    ))}
                </select>

                <select
                    value={filters.sentiment}
                    onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                    className="px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                    <option value="">All Sentiments</option>
                    <option value="positive">😊 Positive</option>
                    <option value="negative">😞 Negative</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="out_of_office">🏖️ Out of Office</option>
                    <option value="unsubscribe">🚫 Unsubscribe</option>
                </select>
            </div>

            {/* Messages List & Detail View */}
            <div className="flex-1 flex gap-6 min-h-0">
                {/* Messages List */}
                <div className="w-2/5 premium-card overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Conversations
                        </h2>
                    </div>
                    {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                    <EnvelopeOpenIcon className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">No replies yet</h3>
                                <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
                                    When contacts reply to your campaigns, they will appear here
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
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={() => {
                                            setSelectedMessage(message);
                                            handleMarkAsRead(message._id);
                                            setAiDraft("");
                                        }}
                                        className={`w-full p-4 text-left transition-all duration-200 border-b border-border/30 ${isSelected
                                            ? "bg-primary/10 border-l-4 border-l-primary"
                                            : "hover:bg-muted/40"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-semibold text-sm shadow-lg flex-shrink-0`}>
                                                {initials || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-semibold text-foreground text-sm truncate pr-2">
                                                        {getContactName(message)}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatDate(message.repliedAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/80 font-medium mb-1 truncate">
                                                    {message.replySubject || message.subject}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                                    {message.replyBody?.substring(0, 80)}...
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {getSentimentBadge(message.replySentiment)}
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {getCampaignName(message)}
                                                    </span>
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
                <div className="w-3/5 premium-card overflow-hidden flex flex-col">
                    {selectedMessage ? (
                        <>
                            {/* Detail Header */}
                            <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                                            {getContactName(selectedMessage).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-foreground">
                                                {getContactName(selectedMessage)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {getContactEmail(selectedMessage)}
                                            </p>
                                        </div>
                                    </div>
                                    {getSentimentBadge(selectedMessage.replySentiment)}
                                </div>
                                <div className="bg-background/50 rounded-xl p-4 border border-border/30">
                                    <h3 className="text-lg font-semibold text-foreground mb-1">
                                        {selectedMessage.replySubject || selectedMessage.subject}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md font-medium">
                                            📧 {getCampaignName(selectedMessage)}
                                        </span>
                                        <span>•</span>
                                        <span>{formatDate(selectedMessage.repliedAt)}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="flex-1 overflow-y-auto p-6">
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
                                            className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
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
                                        className="px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center gap-2 font-semibold"
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
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <EnvelopeOpenIcon className="w-12 h-12 text-primary/60" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
                                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                                    Choose a message from the list to view details and reply
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
