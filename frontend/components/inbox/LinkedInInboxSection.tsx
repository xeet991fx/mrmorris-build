"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDownIcon,
    ChevronRightIcon,
    PlusIcon,
    ArrowTopRightOnSquareIcon,
    ChatBubbleLeftRightIcon,
    UserPlusIcon,
    EyeIcon,
    DocumentTextIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    getGroupedLinkedInActivities,
    logLinkedInActivity,
    markLinkedInActivityRead,
    LinkedInConversation,
    LinkedInActivityType,
} from "@/lib/api/linkedinIntegration";
import toast from "react-hot-toast";

// LinkedIn Logo SVG
const LinkedInLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
);

interface LinkedInInboxSectionProps {
    workspaceId: string;
    onConversationClick?: (conversation: LinkedInConversation) => void;
}

const ACTIVITY_TYPES: { value: LinkedInActivityType; label: string; icon: any }[] = [
    { value: "message_sent", label: "Message Sent", icon: ChatBubbleLeftRightIcon },
    { value: "message_received", label: "Message Received", icon: ChatBubbleLeftRightIcon },
    { value: "connection_request_sent", label: "Connection Request Sent", icon: UserPlusIcon },
    { value: "connection_request_received", label: "Connection Request Received", icon: UserPlusIcon },
    { value: "connection_accepted", label: "Connection Accepted", icon: UserPlusIcon },
    { value: "profile_viewed", label: "Profile Viewed", icon: EyeIcon },
    { value: "note", label: "Note", icon: DocumentTextIcon },
    { value: "inmail_sent", label: "InMail Sent", icon: ChatBubbleLeftRightIcon },
    { value: "inmail_received", label: "InMail Received", icon: ChatBubbleLeftRightIcon },
];

export function LinkedInInboxSection({ workspaceId, onConversationClick }: LinkedInInboxSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
    const [conversations, setConversations] = useState<LinkedInConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getGroupedLinkedInActivities(workspaceId);
            if (result.success && result.data) {
                setConversations(result.data.conversations);
            }
        } catch (error) {
            console.error("Failed to load LinkedIn conversations:", error);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const toggleContact = (contactId: string) => {
        const newExpanded = new Set(expandedContacts);
        if (newExpanded.has(contactId)) {
            newExpanded.delete(contactId);
        } else {
            newExpanded.add(contactId);
        }
        setExpandedContacts(newExpanded);
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
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const openLinkedIn = (url?: string) => {
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const getActivityTypeLabel = (type: string) => {
        const found = ACTIVITY_TYPES.find((t) => t.value === type);
        return found?.label || type;
    };

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
        <>
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                {/* Header */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                    <motion.div
                        animate={{ rotate: expanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                    </motion.div>
                    <div className="w-8 h-8 rounded-lg bg-[#0077B5] flex items-center justify-center">
                        <LinkedInLogo className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">LinkedIn</span>
                    {totalUnread > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium text-white bg-[#0077B5] rounded-full">
                            {totalUnread} unread
                        </span>
                    )}
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                        {conversations.length} conversations
                    </span>
                </button>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-zinc-100 dark:border-zinc-700/50"
                        >
                            {/* Log Activity Button */}
                            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                                <button
                                    onClick={() => setShowLogModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0077B5] hover:bg-[#0077B5]/10 rounded-lg transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Log LinkedIn Activity
                                </button>
                            </div>

                            {loading ? (
                                <div className="px-4 py-8 text-center text-zinc-500">
                                    Loading...
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <LinkedInLogo className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                    <p className="text-sm text-zinc-500">No LinkedIn activities yet</p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Log your LinkedIn interactions manually
                                    </p>
                                </div>
                            ) : (
                                <div className="max-h-96 overflow-y-auto">
                                    {conversations.map((conv, idx) => {
                                        const initials = conv.contactName
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2);

                                        return (
                                            <div
                                                key={conv.contactId}
                                                className="border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"
                                            >
                                                {/* Contact Header */}
                                                <div className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                    <button
                                                        onClick={() => toggleContact(conv.contactId)}
                                                        className="flex items-center gap-3 flex-1"
                                                    >
                                                        <motion.div
                                                            animate={{
                                                                rotate: expandedContacts.has(conv.contactId) ? 90 : 0,
                                                            }}
                                                        >
                                                            <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
                                                        </motion.div>

                                                        {/* Avatar */}
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077B5] to-[#00A0DC] flex items-center justify-center text-white font-semibold text-sm">
                                                                {initials || "?"}
                                                            </div>
                                                            {conv.unreadCount > 0 && (
                                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#0077B5] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                                    {conv.unreadCount}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 text-left min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                                                    {conv.contactName}
                                                                </span>
                                                                {conv.contactCompany && (
                                                                    <span className="text-xs text-zinc-400 truncate">
                                                                        @ {conv.contactCompany}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-zinc-500 truncate">
                                                                {getActivityTypeLabel(conv.latestActivity?.type || "")} -{" "}
                                                                {formatDate(conv.latestActivity?.activityDate)}
                                                            </p>
                                                        </div>

                                                        <span className="text-xs text-zinc-400">
                                                            {conv.activityCount} activities
                                                        </span>
                                                    </button>

                                                    {/* Open LinkedIn Button */}
                                                    {conv.contactLinkedIn && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openLinkedIn(conv.contactLinkedIn);
                                                            }}
                                                            className="p-2 hover:bg-[#0077B5]/10 rounded-lg transition-colors"
                                                            title="Open LinkedIn Profile"
                                                        >
                                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-[#0077B5]" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Activities */}
                                                <AnimatePresence>
                                                    {expandedContacts.has(conv.contactId) && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-2"
                                                        >
                                                            {conv.activities.map((activity: any, actIdx: number) => {
                                                                const ActivityIcon =
                                                                    ACTIVITY_TYPES.find((t) => t.value === activity.type)
                                                                        ?.icon || DocumentTextIcon;

                                                                return (
                                                                    <div
                                                                        key={activity._id}
                                                                        className={cn(
                                                                            "py-2 px-3 rounded-lg mb-1 last:mb-0",
                                                                            activity.direction === "inbound"
                                                                                ? "bg-[#0077B5]/5 border-l-2 border-[#0077B5]"
                                                                                : "bg-zinc-100 dark:bg-zinc-800"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <ActivityIcon className="w-3.5 h-3.5 text-[#0077B5]" />
                                                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                                                {getActivityTypeLabel(activity.type)}
                                                                            </span>
                                                                            <span className="text-xs text-zinc-400 ml-auto">
                                                                                {formatDate(activity.activityDate)}
                                                                            </span>
                                                                        </div>
                                                                        {activity.subject && (
                                                                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-0.5">
                                                                                {activity.subject}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                                                            {activity.content}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Log Activity Modal */}
            <LogLinkedInActivityModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                workspaceId={workspaceId}
                onSuccess={() => {
                    loadConversations();
                    setShowLogModal(false);
                }}
            />
        </>
    );
}

// Log Activity Modal Component
interface LogLinkedInActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    onSuccess: () => void;
    prefilledContactId?: string;
}

function LogLinkedInActivityModal({
    isOpen,
    onClose,
    workspaceId,
    onSuccess,
    prefilledContactId,
}: LogLinkedInActivityModalProps) {
    const [contactId, setContactId] = useState(prefilledContactId || "");
    const [type, setType] = useState<LinkedInActivityType>("message_sent");
    const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contactId || !content) {
            toast.error("Contact and content are required");
            return;
        }

        try {
            setSubmitting(true);
            await logLinkedInActivity({
                workspaceId,
                contactId,
                type,
                content,
                subject: subject || undefined,
                linkedinUrl: linkedinUrl || undefined,
                direction,
            });
            toast.success("LinkedIn activity logged");
            onSuccess();
            // Reset form
            setContactId("");
            setSubject("");
            setContent("");
            setLinkedinUrl("");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to log activity");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md w-full"
            >
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                        <LinkedInLogo className="w-5 h-5 text-[#0077B5]" />
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Log LinkedIn Activity
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                    >
                        <XMarkIcon className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Contact ID */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Contact ID *
                        </label>
                        <input
                            type="text"
                            value={contactId}
                            onChange={(e) => setContactId(e.target.value)}
                            placeholder="Paste contact ID from URL"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm"
                            required
                        />
                    </div>

                    {/* Activity Type */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Activity Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as LinkedInActivityType)}
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm"
                        >
                            {ACTIVITY_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Direction */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Direction
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setDirection("outbound")}
                                className={cn(
                                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    direction === "outbound"
                                        ? "bg-[#0077B5] text-white"
                                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                )}
                            >
                                Outbound (You sent)
                            </button>
                            <button
                                type="button"
                                onClick={() => setDirection("inbound")}
                                className={cn(
                                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    direction === "inbound"
                                        ? "bg-[#0077B5] text-white"
                                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                )}
                            >
                                Inbound (You received)
                            </button>
                        </div>
                    </div>

                    {/* Subject (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Subject (Optional)
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Message subject or title"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Content / Notes *
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What happened? Paste message content or write notes..."
                            rows={4}
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm resize-none"
                            required
                        />
                    </div>

                    {/* LinkedIn URL (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            LinkedIn Profile URL (Optional)
                        </label>
                        <input
                            type="url"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="https://linkedin.com/in/username"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#0077B5] rounded-lg hover:bg-[#005885] transition-colors disabled:opacity-50"
                        >
                            {submitting ? "Saving..." : "Log Activity"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

export default LinkedInInboxSection;
