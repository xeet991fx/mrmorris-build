"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    TicketIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ClockIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
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

// ============================================
// CONSTANTS
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
                            className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] disabled:opacity-50"
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
// TICKET ROW
// ============================================

function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 cursor-pointer transition-all"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[ticket.status])}>
                        {ticket.status.replace("_", " ")}
                    </span>
                </div>
                <h3 className="font-medium text-foreground truncate">{ticket.subject}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {ticket.requesterName || ticket.requesterEmail}
                    </span>
                    <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </span>
                    {ticket.comments.length > 0 && (
                        <span className="flex items-center gap-1">
                            <ChatBubbleLeftRightIcon className="w-3 h-3" />
                            {ticket.comments.length}
                        </span>
                    )}
                </div>
            </div>
            <div className={cn("w-2 h-2 rounded-full", PRIORITY_COLORS[ticket.priority].replace("text-", "bg-"))} title={ticket.priority} />
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

    return (
        <div className="min-h-screen bg-card/95">
            <CreateTicketModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                workspaceId={workspaceId}
                onCreated={fetchTickets}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10 bg-card">
                <div className="flex items-center gap-3">
                    <TicketIcon className="w-5 h-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold text-foreground">Tickets</h1>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E]"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Ticket
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-blue-500">{stats.byStatus?.open || 0}</p>
                            <p className="text-sm text-muted-foreground">Open</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-yellow-500">{stats.byStatus?.in_progress || 0}</p>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-green-500">{stats.byStatus?.resolved || 0}</p>
                            <p className="text-sm text-muted-foreground">Resolved</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-foreground">
                                {stats.avgResponseTimeMinutes ? `${Math.round(stats.avgResponseTimeMinutes)}m` : "-"}
                            </p>
                            <p className="text-sm text-muted-foreground">Avg Response</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-2">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground"
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
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground"
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

            {/* Ticket List */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                        ))}
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-16">
                        <TicketIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No tickets yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first support ticket</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Create Ticket
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tickets.map((ticket) => (
                            <TicketRow
                                key={ticket._id}
                                ticket={ticket}
                                onClick={() => router.push(`/projects/${workspaceId}/tickets/${ticket._id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
