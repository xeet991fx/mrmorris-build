"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeftIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ClockIcon,
    PaperClipIcon,
    TagIcon,
    TrashIcon,
    UserCircleIcon,
    UserIcon,
    EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import {
    Ticket,
    TicketPriority,
    TicketStatus,
    getTicket,
    updateTicket,
    deleteTicket,
    addTicketComment,
    TicketComment,
} from "@/lib/api/ticket";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const STATUS_OPTS: { value: TicketStatus; label: string; color: string }[] = [
    { value: "open", label: "Open", color: "bg-blue-500" },
    { value: "in_progress", label: "In Progress", color: "bg-amber-500" },
    { value: "waiting_on_customer", label: "Waiting", color: "bg-violet-500" },
    { value: "resolved", label: "Resolved", color: "bg-emerald-500" },
    { value: "closed", label: "Closed", color: "bg-zinc-500" },
];

const PRIORITY_OPTS: { value: TicketPriority; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800" },
    { value: "medium", label: "Medium", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    { value: "high", label: "High", color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" },
    { value: "urgent", label: "Urgent", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
];

export default function TicketDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const ticketId = params.ticketId as string;

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const fetchTicket = async () => {
        try {
            const res = await getTicket(workspaceId, ticketId);
            if (res.success) {
                setTicket(res.data.ticket);
            } else {
                toast.error("Failed to load ticket");
                router.push(`/projects/${workspaceId}/tickets`);
            }
        } catch (error) {
            console.error("Error fetching ticket:", error);
            toast.error("Failed to load ticket");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (workspaceId && ticketId) {
            fetchTicket();
        }
    }, [workspaceId, ticketId]);

    // Scroll to bottom of comments when they change
    useEffect(() => {
        if (commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [ticket?.comments]);

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!ticket) return;
        const oldStatus = ticket.status;
        setTicket({ ...ticket, status: newStatus }); // Optimistic update
        try {
            await updateTicket(workspaceId, ticketId, { status: newStatus });
            toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
        } catch (error) {
            setTicket({ ...ticket, status: oldStatus });
            toast.error("Failed to update status");
        }
    };

    const handlePriorityChange = async (newPriority: TicketPriority) => {
        if (!ticket) return;
        const oldPriority = ticket.priority;
        setTicket({ ...ticket, priority: newPriority }); // Optimistic update
        try {
            await updateTicket(workspaceId, ticketId, { priority: newPriority });
            toast.success("Priority updated");
        } catch (error) {
            setTicket({ ...ticket, priority: oldPriority });
            toast.error("Failed to update priority");
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setIsSubmittingComment(true);
        try {
            const res = await addTicketComment(workspaceId, ticketId, {
                message: commentText,
                isInternal: isInternalComment,
            });

            if (res.success) {
                // Update local state with new ticket data including the comment
                setTicket(res.data.ticket);
                setCommentText("");
                setIsInternalComment(false);
                toast.success("Comment added");
            }
        } catch (error) {
            console.error("Error adding comment:", error);
            toast.error("Failed to add comment");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteTicket(workspaceId, ticketId);
            toast.success("Ticket deleted");
            router.push(`/projects/${workspaceId}/tickets`);
        } catch (error) {
            console.error("Error deleting ticket:", error);
            toast.error("Failed to delete ticket");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black/20">
            {/* Header */}
            <header className="flex-none px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-xl z-10">
                <div className="max-w-5xl mx-auto w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 mb-4 transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Tickets
                    </button>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                    {ticket.ticketNumber}
                                </span>
                                <div className="flex gap-2">
                                    {STATUS_OPTS.map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => handleStatusChange(status.value)}
                                            className={cn(
                                                "w-3 h-3 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-white dark:ring-offset-black",
                                                status.color,
                                                ticket.status === status.value
                                                    ? "ring-2 ring-zinc-400 dark:ring-zinc-600 scale-110"
                                                    : "opacity-40 hover:opacity-100"
                                            )}
                                            title={status.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                {ticket.subject}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(true)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Ticket"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Description & Comments */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        <section>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                Description
                            </h3>
                            <div className="prose prose-zinc dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
                            </div>
                        </section>

                        {/* Comments System */}
                        <section className="relative">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 sticky top-0 bg-white dark:bg-black py-2 z-10">
                                Activity
                            </h3>

                            <div className="space-y-6 mb-8">
                                {ticket.comments.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                        <p className="text-zinc-400 text-sm">No activity yet</p>
                                    </div>
                                ) : (
                                    ticket.comments.map((comment) => (
                                        <div
                                            key={comment._id}
                                            className={cn(
                                                "flex gap-4 group",
                                                comment.isInternal && "bg-yellow-50/50 dark:bg-yellow-900/10 -m-4 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/20"
                                            )}
                                        >
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                                    {comment.userId.name.charAt(0)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                        {comment.userId.name}
                                                    </span>
                                                    <span className="text-xs text-zinc-400">
                                                        {formatDistanceToNow(new Date(comment.createdAt), {
                                                            addSuffix: true,
                                                        })}
                                                    </span>
                                                    {comment.isInternal && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">
                                                            Internal Note
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                    {comment.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            {/* Comment Input */}
                            <form onSubmit={handleAddComment} className="mt-6 flex gap-4 items-start bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <div className="flex-1">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Write a reply..."
                                        rows={3}
                                        className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment(e);
                                            }
                                        }}
                                    />
                                    <div className="mt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={isInternalComment}
                                                    onChange={(e) => setIsInternalComment(e.target.checked)}
                                                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                                                    Internal Note
                                                </span>
                                            </label>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!commentText.trim() || isSubmittingComment}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* Right Column: Sidebar */}
                    <aside className="space-y-6">
                        {/* Properties Panel */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-6">
                            {/* Requester */}
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                    Requester
                                </h4>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {ticket.requesterName || "Unknown"}
                                        </div>
                                        <div className="text-xs text-zinc-500 truncate" title={ticket.requesterEmail}>
                                            {ticket.requesterEmail}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                            {/* Priority */}
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                    Priority
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRIORITY_OPTS.map((p) => (
                                        <button
                                            key={p.value}
                                            onClick={() => handlePriorityChange(p.value)}
                                            className={cn(
                                                "px-2 py-1.5 text-xs font-medium rounded-md transition-all border border-transparent",
                                                ticket.priority === p.value
                                                    ? p.color + " border-current shadow-sm"
                                                    : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                            {/* Metadata */}
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-zinc-500 block mb-1">Created</span>
                                    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400" />
                                        {format(new Date(ticket.createdAt), "PPP p")}
                                    </div>
                                </div>

                                {ticket.category && (
                                    <div>
                                        <span className="text-xs text-zinc-500 block mb-1">Category</span>
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 capitalize">
                                            <TagIcon className="w-3 h-3" />
                                            {ticket.category.replace("_", " ")}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assignee Information (Static for now) */}
                        {/* We can add assignment functionality later */}
                    </aside>
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Ticket"
                message="Are you sure you want to delete this ticket? This action cannot be undone."
                confirmText="Delete Ticket"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
