"use client";

import { useState, useEffect } from "react";
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

interface InboxMessage {
    _id: string;
    campaignId: { _id: string; name: string };
    contactId: { _id: string; name: string; email: string; company?: string };
    subject: string;
    replySubject?: string;
    replyBody?: string;
    replySentiment?: "positive" | "negative" | "neutral" | "out_of_office" | "unsubscribe";
    repliedAt: string;
    fromEmail: string;
    toEmail: string;
    metadata?: {
        isRead?: boolean;
        assignedTo?: string;
        labels?: string[];
    };
}

export default function InboxPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
    const [filters, setFilters] = useState({
        campaign: "",
        sentiment: "",
        search: "",
    });
    const [campaigns, setCampaigns] = useState<Array<{ _id: string; name: string }>>([]);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();
            if (filters.campaign) queryParams.set("campaign", filters.campaign);
            if (filters.sentiment) queryParams.set("sentiment", filters.sentiment);
            if (filters.search) queryParams.set("search", filters.search);

            const response = await fetch(`${apiUrl}/inbox?${queryParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error("Failed to fetch inbox messages:", error);
            toast.error("Failed to load inbox");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/campaigns`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                setCampaigns(data.campaigns);
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchCampaigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.campaign, filters.sentiment]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMessages();
    };

    const handleMarkAsRead = async (messageId: string) => {
        try {
            const token = localStorage.getItem("token");
            await fetch(`${apiUrl}/inbox/${messageId}/read`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            fetchMessages();
        } catch (error) {
            console.error("Failed to mark as read:", error);
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

    const formatDate = (dateString: string) => {
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
                                                    {message.contactId?.name || message.toEmail}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {message.contactId?.company || message.toEmail}
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
                                            {message.campaignId?.name}
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
                                                {selectedMessage.contactId?.name || selectedMessage.toEmail}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedMessage.contactId?.email || selectedMessage.toEmail}
                                            </p>
                                        </div>
                                    </div>
                                    {getSentimentBadge(selectedMessage.replySentiment)}
                                </div>
                                <h3 className="text-lg font-medium text-foreground">
                                    {selectedMessage.replySubject || selectedMessage.subject}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    From campaign: {selectedMessage.campaignId?.name} • {formatDate(selectedMessage.repliedAt)}
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

                            {/* Reply Actions */}
                            <div className="p-4 border-t border-border flex-shrink-0">
                                <button
                                    disabled
                                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg opacity-50 cursor-not-allowed"
                                >
                                    Reply (Coming Soon)
                                </button>
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
