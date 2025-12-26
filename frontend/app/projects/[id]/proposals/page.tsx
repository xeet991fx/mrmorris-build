"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    DocumentTextIcon,
    PlusIcon,
    EyeIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { getProposals, deleteProposal, type Proposal } from "@/lib/api/proposal";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function ProposalsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        fetchProposals();
    }, [workspaceId, statusFilter]);

    const fetchProposals = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (statusFilter !== "all") {
                params.status = statusFilter;
            }
            if (search) {
                params.search = search;
            }

            const response = await getProposals(workspaceId, params);
            if (response.success) {
                setProposals(response.data.proposals);
            }
        } catch (error) {
            console.error("Failed to fetch proposals:", error);
            toast.error("Failed to load proposals");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (proposalId: string) => {
        if (!confirm("Are you sure you want to delete this proposal?")) return;

        try {
            await deleteProposal(workspaceId, proposalId);
            toast.success("Proposal deleted");
            fetchProposals();
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete proposal");
        }
    };

    const getStatusBadge = (status: string) => {
        const configs = {
            draft: { color: "bg-gray-500/20 text-gray-400", icon: ClockIcon, label: "Draft" },
            sent: { color: "bg-blue-500/20 text-blue-400", icon: EyeIcon, label: "Sent" },
            viewed: { color: "bg-purple-500/20 text-purple-400", icon: EyeIcon, label: "Viewed" },
            accepted: { color: "bg-green-500/20 text-green-400", icon: CheckCircleIcon, label: "Accepted" },
            declined: { color: "bg-red-500/20 text-red-400", icon: XCircleIcon, label: "Declined" },
            expired: { color: "bg-orange-500/20 text-orange-400", icon: ClockIcon, label: "Expired" },
        };

        const config = configs[status as keyof typeof configs] || configs.draft;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number, currency: string = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Proposals & Quotes</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create and manage sales proposals
                        </p>
                    </div>
                    <button
                        onClick={() => router.push(`/projects/${workspaceId}/proposals/new`)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-black rounded-lg font-medium hover:bg-[#8BC428] transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        New Proposal
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchProposals()}
                            placeholder="Search proposals..."
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#9ACD32]/50"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#9ACD32]/50"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="viewed">Viewed</option>
                        <option value="accepted">Accepted</option>
                        <option value="declined">Declined</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                {/* Proposals List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[#9ACD32] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="text-center py-12">
                        <DocumentTextIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No proposals yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Create your first proposal to get started
                        </p>
                        <button
                            onClick={() => router.push(`/projects/${workspaceId}/proposals/new`)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-black rounded-lg font-medium hover:bg-[#8BC428]"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Create Proposal
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {proposals.map((proposal) => (
                            <motion.div
                                key={proposal._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card border border-border rounded-lg p-6 hover:border-[#9ACD32]/50 transition-colors cursor-pointer"
                                onClick={() => router.push(`/projects/${workspaceId}/proposals/${proposal._id}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-foreground">
                                                {proposal.title}
                                            </h3>
                                            {getStatusBadge(proposal.status)}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                            <span>
                                                Deal: {typeof proposal.opportunityId === "object" ? proposal.opportunityId.name : "N/A"}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Created {new Date(proposal.createdAt).toLocaleDateString()}
                                            </span>
                                            {proposal.sentAt && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        Sent {new Date(proposal.sentAt).toLocaleDateString()}
                                                    </span>
                                                </>
                                            )}
                                            {proposal.viewCount && proposal.viewCount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{proposal.viewCount} views</span>
                                                </>
                                            )}
                                        </div>

                                        {proposal.executiveSummary && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {proposal.executiveSummary}
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-[#9ACD32]">
                                            {formatCurrency(proposal.pricing.total, proposal.pricing.currency)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {proposal.pricing.items.length} item{proposal.pricing.items.length !== 1 ? "s" : ""}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/projects/${workspaceId}/proposals/${proposal._id}/edit`);
                                        }}
                                        className="px-3 py-1 text-sm text-foreground hover:text-[#9ACD32] transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(proposal._id);
                                        }}
                                        className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
