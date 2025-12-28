"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTicket,
    faPlus,
    faMagnifyingGlass,
    faFilter,
    faClock,
    faUser,
    faComments,
    faTriangleExclamation,
    faCircleCheck,
    faArrowsRotate,
    faSparkles,
    faXmark,
    faPlay,
    faPause,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
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

// ============================================
// STATUS BADGE
// ============================================

const STATUS_COLORS: Record<TicketStatus, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    waiting_on_customer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
    low: "text-gray-500",
    medium: "text-blue-500",
    high: "text-orange-500",
    urgent: "text-red-500",
};

function StatusBadge({ status }: { status: TicketStatus }) {
    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[status])}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

// ============================================
// CREATE MODAL
// ============================================

function CreateTicketModal({
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
        category: "support" as const,
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
                <h2 className="text-xl font-bold text-foreground mb-4">Create Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Subject *</label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground resize-none"
                            rows={4}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Requester Email *</label>
                            <input
                                type="email"
                                value={formData.requesterEmail}
                                onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Requester Name</label>
                            <input
                                type="text"
                                value={formData.requesterName}
                                onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground"
                            >
                                <option value="support">Support</option>
                                <option value="billing">Billing</option>
                                <option value="technical">Technical</option>
                                <option value="feature_request">Feature Request</option>
                                <option value="bug">Bug</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
                        >
                            {isSubmitting ? "Creating..." : "Create Ticket"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ============================================
// TICKET CARD (Matching Workflow Card Style)
// ============================================

function TicketCard({
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
    const priorityIcon: Record<TicketPriority, string> = {
        low: "🟢",
        medium: "🔵",
        high: "🟠",
        urgent: "🔴",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={onView}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        <FontAwesomeIcon icon={faTicket} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 font-heading">
                            {ticket.subject}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {ticket.ticketNumber} • {ticket.category}
                        </p>
                    </div>
                </div>
                <StatusBadge status={ticket.status} />
            </div>

            {/* Description */}
            {ticket.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {ticket.description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                    <span className="truncate max-w-[100px]">{ticket.requesterName || ticket.requesterEmail}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                    <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                </div>
                {ticket.comments.length > 0 && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
                        <span>{ticket.comments.length}</span>
                    </div>
                )}
            </div>

            {/* Priority info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5 mb-4">
                <span>{priorityIcon[ticket.priority]}</span>
                <span>Priority: {ticket.priority}</span>
            </div>

            {/* Actions */}
            <div
                className="flex items-center gap-2 pt-3 border-t border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {ticket.status === "resolved" || ticket.status === "closed" ? (
                    <button
                        onClick={onReopen}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
                        Reopen
                    </button>
                ) : (
                    <button
                        onClick={onResolve}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                        <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" />
                        Resolve
                    </button>
                )}
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center mb-6">
                <FontAwesomeIcon icon={faTicket} className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 font-heading">No tickets yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                Create support tickets to track customer requests, issues, and feature suggestions.
            </p>
            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
            >
                <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
                Create Your First Ticket
            </button>
        </div>
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
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [stats, setStats] = useState<any>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (statusFilter !== "all") params.status = statusFilter;
            if (priorityFilter !== "all") params.priority = priorityFilter;
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
    }, [workspaceId, statusFilter, priorityFilter]);

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

    // Filter tickets
    const filteredTickets = tickets.filter((t) => {
        const matchesSearch =
            searchQuery === "" ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-card/95">
            <CreateTicketModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                workspaceId={workspaceId}
                onCreated={fetchTickets}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <h1 className="text-lg font-semibold text-foreground font-heading">Tickets</h1>
                    <p className="text-xs text-muted-foreground">
                        Manage customer support requests
                    </p>
                </motion.div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
                >
                    <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
                    New Ticket
                </button>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faFilter} className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="waiting_on_customer">Waiting</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        >
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="max-w-7xl mx-auto px-6 mb-6">
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-blue-500" />
                            <h2 className="text-base font-semibold text-foreground font-heading">Ticket Overview</h2>
                        </div>
                        <div className="grid grid-cols-4 gap-6">
                            <div>
                                <p className="text-3xl font-bold text-blue-500">{stats.byStatus?.open || 0}</p>
                                <p className="text-sm text-muted-foreground">Open</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-yellow-500">{stats.byStatus?.in_progress || 0}</p>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-green-500">{stats.byStatus?.resolved || 0}</p>
                                <p className="text-sm text-muted-foreground">Resolved</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">
                                    {stats.avgResponseTimeMinutes ? `${Math.round(stats.avgResponseTimeMinutes)}m` : "-"}
                                </p>
                                <p className="text-sm text-muted-foreground">Avg Response</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket Intelligence */}
            {tickets.length > 0 && (
                <div className="max-w-7xl mx-auto px-6 mb-6">
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faSparkles} className="w-5 h-5 text-violet-500" />
                                <h2 className="text-base font-semibold text-foreground font-heading">Ticket Intelligence</h2>
                            </div>
                            <button
                                onClick={fetchTickets}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                        <TicketIntelligencePanel
                            workspaceId={workspaceId}
                            tickets={tickets}
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-56 rounded-xl bg-card border border-border animate-pulse"
                            />
                        ))}
                    </div>
                ) : filteredTickets.length === 0 ? (
                    tickets.length === 0 ? (
                        <EmptyState onCreateNew={() => setShowCreateModal(true)} />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No tickets match your search.</p>
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTickets.map((ticket) => (
                            <TicketCard
                                key={ticket._id}
                                ticket={ticket}
                                onView={() => router.push(`/projects/${workspaceId}/tickets/${ticket._id}`)}
                                onResolve={() => handleResolve(ticket._id)}
                                onReopen={() => handleReopen(ticket._id)}
                                onDelete={() => openDeleteConfirm(ticket._id)}
                            />
                        ))}
                    </div>
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
