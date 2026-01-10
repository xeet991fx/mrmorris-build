"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    UserIcon,
    ChatBubbleLeftIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    TrashIcon,
    XMarkIcon,
    ChevronRightIcon,
    FlagIcon,
    TicketIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, PlayIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import {
    Ticket,
    TicketStatus,
    TicketPriority,
    getTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketStats,
} from "@/lib/api/ticket";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { TicketIntelligencePanel } from "@/components/tickets/TicketIntelligencePanel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Status colors for dots
const STATUS_DOT_COLORS: Record<TicketStatus, string> = {
    open: "bg-blue-500",
    in_progress: "bg-amber-500",
    waiting_on_customer: "bg-violet-500",
    resolved: "bg-emerald-500",
    closed: "bg-zinc-400",
};

// Priority colors
const PRIORITY_COLORS: Record<TicketPriority, string> = {
    low: "text-zinc-400",
    medium: "text-blue-500",
    high: "text-orange-500",
    urgent: "text-red-500",
};

// ============================================
// SLIDE-OVER CREATE MODAL
// ============================================

function CreateTicketSlideOver({
    isOpen,
    onClose,
    workspaceId,
    onCreated,
}: {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    onCreated: () => void;
}) {
    const [formData, setFormData] = useState({
        subject: "",
        description: "",
        requesterEmail: "",
        requesterName: "",
        priority: "medium" as TicketPriority,
        category: "support" as "support" | "billing" | "technical" | "feature_request" | "bug" | "other",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await createTicket(workspaceId, formData);
            if (response.success) {
                toast.success("Ticket created!");
                onCreated();
                onClose();
                setFormData({
                    subject: "",
                    description: "",
                    requesterEmail: "",
                    requesterName: "",
                    priority: "medium",
                    category: "support",
                });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create ticket");
        }
        setIsSubmitting(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-40"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 z-50 shadow-2xl"
                    >
                        <form onSubmit={handleSubmit} className="h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    New Ticket
                                </h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                                {/* Subject */}
                                <div>
                                    <input
                                        type="text"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full text-xl font-medium bg-transparent border-0 border-b-2 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 dark:focus:border-emerald-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0 pb-2 transition-colors"
                                        placeholder="Ticket subject..."
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-0 resize-none transition-colors"
                                        placeholder="Describe the issue..."
                                        rows={4}
                                        required
                                    />
                                </div>

                                {/* Requester Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.requesterEmail}
                                            onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.requesterName}
                                            onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Priority & Category */}
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 block">
                                        Priority
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(["low", "medium", "high", "urgent"] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: p })}
                                                className={cn(
                                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                                    formData.priority === p
                                                        ? p === "urgent" ? "bg-red-500 text-white"
                                                            : p === "high" ? "bg-orange-500 text-white"
                                                                : p === "medium" ? "bg-blue-500 text-white"
                                                                    : "bg-zinc-500 text-white"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                )}
                                            >
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 block">
                                        Category
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(["support", "billing", "technical", "feature_request", "bug"] as const).map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: c })}
                                                className={cn(
                                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all capitalize",
                                                    formData.category === c
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                )}
                                            >
                                                {c.replace("_", " ")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? "Creating..." : "Create Ticket"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// TICKET ROW COMPONENT
// ============================================

function TicketRow({
    ticket,
    onView,
    onResolve,
    onReopen,
    onDelete,
}: {
    ticket: Ticket;
    onView: () => void;
    onResolve: () => void;
    onReopen: () => void;
    onDelete: () => void;
}) {
    const isResolved = ticket.status === "resolved" || ticket.status === "closed";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer",
                isResolved && "opacity-50"
            )}
            onClick={onView}
        >
            {/* Status indicator */}
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT_COLORS[ticket.status])} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {ticket.subject}
                    </p>
                    <span className="text-xs text-zinc-400">{ticket.ticketNumber}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {ticket.requesterName || ticket.requesterEmail}
                    </span>
                    <span className="capitalize">{ticket.category}</span>
                </div>
            </div>

            {/* Priority */}
            <FlagIcon className={cn("w-4 h-4 flex-shrink-0", PRIORITY_COLORS[ticket.priority])} />

            {/* Comments count */}
            {ticket.comments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                    {ticket.comments.length}
                </span>
            )}

            {/* Time */}
            <span className="text-xs text-zinc-400 flex-shrink-0">
                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {isResolved ? (
                    <button
                        onClick={onReopen}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Reopen"
                    >
                        <PlayIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={onResolve}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Resolve"
                    >
                        <CheckIcon className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={onDelete}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>

            <ChevronRightIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </motion.div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

export default function TicketsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [stats, setStats] = useState<any>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
    const [showAIPanel, setShowAIPanel] = useState(false);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (statusFilter !== "all") params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;

            const [ticketsRes, statsRes] = await Promise.all([
                getTickets(workspaceId, params),
                getTicketStats(workspaceId),
            ]);

            if (ticketsRes.success) setTickets(ticketsRes.data.tickets);
            if (statsRes.success) setStats(statsRes.data);
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (workspaceId) fetchTickets();
    }, [workspaceId, statusFilter]);

    const handleResolve = async (ticketId: string) => {
        try {
            await updateTicket(workspaceId, ticketId, { status: "resolved" });
            toast.success("Ticket resolved!");
            fetchTickets();
        } catch (error) {
            toast.error("Failed to resolve ticket");
        }
    };

    const handleReopen = async (ticketId: string) => {
        try {
            await updateTicket(workspaceId, ticketId, { status: "open" });
            toast.success("Ticket reopened!");
            fetchTickets();
        } catch (error) {
            toast.error("Failed to reopen ticket");
        }
    };

    const handleDelete = async () => {
        if (!ticketToDelete) return;
        try {
            await deleteTicket(workspaceId, ticketToDelete);
            toast.success("Ticket deleted!");
            fetchTickets();
            setTicketToDelete(null);
        } catch (error) {
            toast.error("Failed to delete ticket");
        }
    };

    const openDeleteConfirm = (ticketId: string) => {
        setTicketToDelete(ticketId);
        setDeleteConfirmOpen(true);
    };

    const filteredTickets = tickets.filter((t) => {
        const matchesSearch =
            searchQuery === "" ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="h-full overflow-y-auto">
            <CreateTicketSlideOver
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                workspaceId={workspaceId}
                onCreated={fetchTickets}
            />

            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Tickets
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Manage customer support requests
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setShowAIPanel(!showAIPanel)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-colors",
                                showAIPanel
                                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">AI Insights</span>
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">New Ticket</span>
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-2xl font-bold text-blue-500">{stats.byStatus?.open || 0}</span>
                            <span className="text-sm text-zinc-500">open</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-2xl font-bold text-amber-500">{stats.byStatus?.in_progress || 0}</span>
                            <span className="text-sm text-zinc-500">in progress</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-2xl font-bold text-emerald-500">{stats.byStatus?.resolved || 0}</span>
                            <span className="text-sm text-zinc-500">resolved</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {stats.avgResponseTimeMinutes ? `${Math.round(stats.avgResponseTimeMinutes)}m` : "—"}
                            </span>
                            <span className="text-sm text-zinc-500">avg response</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Search & Filter */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
                >
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {(["all", "open", "in_progress", "resolved", "closed"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap",
                                    statusFilter === status
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 sm:bg-transparent dark:sm:bg-transparent"
                                )}
                            >
                                {status === "all" ? "All" : status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* AI Intelligence Panel (Collapsible) */}
            <AnimatePresence>
                {showAIPanel && tickets.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-8 pb-4 overflow-hidden"
                    >
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <TicketIntelligencePanel
                                workspaceId={workspaceId}
                                tickets={tickets}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ticket List */}
            <div className="px-8 pb-8">
                {isLoading ? (
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredTickets.length === 0 ? (
                    tickets.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <TicketIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No tickets yet</h3>
                            <p className="text-sm text-zinc-500 mb-6">Create your first ticket to start tracking support requests</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Ticket
                            </button>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            No tickets match your search.
                        </div>
                    )
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredTickets.map((ticket) => (
                            <TicketRow
                                key={ticket._id}
                                ticket={ticket}
                                onView={() => router.push(`/projects/${workspaceId}/tickets/${ticket._id}`)}
                                onResolve={() => handleResolve(ticket._id)}
                                onReopen={() => handleReopen(ticket._id)}
                                onDelete={() => openDeleteConfirm(ticket._id)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setTicketToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Delete Ticket"
                message="Are you sure you want to delete this ticket? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
