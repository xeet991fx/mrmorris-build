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

    const fetchMessages = useCallback(async () => {
        try {
            setError(null);
            const response = await getInboxMessages(workspaceId, {
                campaign: filters.campaign || undefined,
                sentiment: filters.sentiment as any || undefined,
                search: filters.search || undefined,
            });
            if (response.success) {
                setMessages((response.data?.messages || []) as unknown as LocalInboxMessage[]);
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
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            positive: { bg: "bg-green-500/20", text: "text-green-400", label: "Positive" },
            negative: { bg: "bg-red-500/20", text: "text-red-400", label: "Negative" },
            neutral: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Neutral" },
            out_of_office: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Out of Office" },
            unsubscribe: { bg: "bg-red-500/20", text: "text-red-400", label: "Unsubscribe" },
        };
        const badge = badges[sentiment || "neutral"] || badges.neutral;
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`}>
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
        <div className="h-[calc(100vh-2rem)] flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
                    <p className="text-muted-foreground mt-1">
                        Unified inbox for all campaign replies
                    </p>
                </div>
                <button
                    onClick={() => fetchMessages()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                    <ArrowPathIcon className="w-5 h-5" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <form onSubmit={handleSearch} className="flex-1 max-w-md">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Search replies..."
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </form>

                <select
                    value={filters.campaign}
                    onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="">All Campaigns</option>
                    {campaigns.map((campaign) => (
                        <option key={campaign._id} value={campaign._id}>
                            {campaign.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.sentiment}
                    onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                    className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="">All Sentiments</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                    <option value="out_of_office">Out of Office</option>
                    <option value="unsubscribe">Unsubscribe</option>
                </select>
            </div>

            {/* Messages List & Detail View */}
            <div className="flex-1 flex gap-6 min-h-0">
                {/* Messages List */}
                <div className="w-1/2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                                <EnvelopeOpenIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No replies yet</h3>
                                <p className="text-muted-foreground text-sm">
                                    Replies to your campaign emails will appear here
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto divide-y divide-border">
                            {messages.map((message) => (
                                <motion.button
                                    key={message._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => {
                                        setSelectedMessage(message);
                                        handleMarkAsRead(message._id);
                                    }}
                                    className={`w-full p-4 text-left hover:bg-muted/30 transition-colors ${selectedMessage?._id === message._id ? "bg-muted/50" : ""
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                <UserIcon className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground text-sm">
                                                    {getContactName(message)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {getContactCompany(message)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getSentimentIcon(message.replySentiment)}
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(message.repliedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground font-medium mb-1 truncate">
                                        {message.replySubject || message.subject}
                                    </p>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {message.replyBody}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {getSentimentBadge(message.replySentiment)}
                                        <span className="text-xs text-muted-foreground">
                                            {getCampaignName(message)}
                                        </span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Message Detail */}
                <div className="w-1/2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    {selectedMessage ? (
                        <>
                            {/* Detail Header */}
                            <div className="p-4 border-b border-border flex-shrink-0">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <UserIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {getContactName(selectedMessage)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {getContactEmail(selectedMessage)}
                                            </p>
                                        </div>
                                    </div>
                                    {getSentimentBadge(selectedMessage.replySentiment)}
                                </div>
                                <h3 className="text-lg font-medium text-foreground">
                                    {selectedMessage.replySubject || selectedMessage.subject}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    From campaign: {getCampaignName(selectedMessage)} • {formatDate(selectedMessage.repliedAt)}
                                </p>
                            </div>

                            {/* Detail Body */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <pre className="whitespace-pre-wrap font-sans text-foreground bg-transparent p-0 m-0 border-none">
                                        {selectedMessage.replyBody}
                                    </pre>
                                </div>
                            </div>

                            {/* Reply Actions with AI Draft */}
                            <div className="p-4 border-t border-border flex-shrink-0 space-y-3">
                                {/* AI Draft Preview */}
                                {aiDraft && (
                                    <div className="bg-muted/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-primary flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                AI Draft Ready
                                            </span>
                                            <button
                                                onClick={() => setAiDraft("")}
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <textarea
                                            value={aiDraft}
                                            onChange={(e) => setAiDraft(e.target.value)}
                                            rows={4}
                                            className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                            placeholder="Edit your response..."
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2">
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
                                        className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingDraft ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                ✨ Generate AI Draft
                                            </>
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
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSendingReply ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            "Send →"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                                <EnvelopeOpenIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">Select a message</h3>
                                <p className="text-muted-foreground text-sm">
                                    Choose a message from the list to view details
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
