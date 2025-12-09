"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    ArrowPathIcon,
    UserGroupIcon,
    EnvelopeIcon,
    EyeIcon,
    CursorArrowRaysIcon,
    ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getEmailIntegrations } from "@/lib/api/emailIntegration";

interface CampaignStep {
    id: string;
    type: "email";
    subject: string;
    body: string;
    delayDays: number;
    delayHours: number;
}

interface Campaign {
    _id: string;
    name: string;
    description?: string;
    status: "draft" | "active" | "paused" | "completed";
    fromAccounts: Array<{ _id: string; email: string; provider: string; status: string }>;
    steps: CampaignStep[];
    totalEnrolled: number;
    activeEnrollments: number;
    dailyLimit: number;
    stats: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        bounced: number;
    };
    createdAt: string;
}

export default function CampaignsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [emailAccounts, setEmailAccounts] = useState<Array<{ _id: string; email: string }>>([]);

    // Create form state
    const [createForm, setCreateForm] = useState({
        name: "",
        description: "",
        fromAccounts: [] as string[],
        dailyLimit: 50,
        steps: [
            {
                id: "step-1",
                type: "email" as const,
                subject: "",
                body: "",
                delayDays: 0,
                delayHours: 0,
            },
        ],
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
            toast.error("Failed to load campaigns");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmailAccounts = async () => {
        try {
            const token = localStorage.getItem("token");

            // Fetch cold email accounts
            const coldAccountsPromise = fetch(`${apiUrl}/email-accounts`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }).then(res => res.json()).catch(() => ({ success: false, accounts: [] }));

            // Fetch Gmail integrations
            const integrationsPromise = getEmailIntegrations(workspaceId);

            const [coldData, integrationsData] = await Promise.all([
                coldAccountsPromise,
                integrationsPromise,
            ]);

            const accounts: Array<{ _id: string; email: string }> = [];

            // Add cold email accounts
            if (coldData.success && coldData.accounts) {
                for (const acc of coldData.accounts) {
                    accounts.push({ _id: acc._id, email: acc.email });
                }
            }

            // Add Gmail integrations (avoid duplicates)
            if (integrationsData.success && integrationsData.data?.integrations) {
                for (const integration of integrationsData.data.integrations) {
                    if (!accounts.some(acc => acc.email === integration.email)) {
                        accounts.push({ _id: integration._id, email: integration.email });
                    }
                }
            }

            setEmailAccounts(accounts);
        } catch (error) {
            console.error("Failed to fetch email accounts:", error);
        }
    };

    useEffect(() => {
        fetchCampaigns();
        fetchEmailAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (createForm.fromAccounts.length === 0) {
            toast.error("Please select at least one email account");
            return;
        }
        if (!createForm.steps[0].subject || !createForm.steps[0].body) {
            toast.error("Please fill in the email content");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/campaigns`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(createForm),
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Campaign created successfully");
                setShowCreateModal(false);
                setCreateForm({
                    name: "",
                    description: "",
                    fromAccounts: [],
                    dailyLimit: 50,
                    steps: [
                        {
                            id: "step-1",
                            type: "email",
                            subject: "",
                            body: "",
                            delayDays: 0,
                            delayHours: 0,
                        },
                    ],
                });
                fetchCampaigns();
            } else {
                toast.error(data.message || "Failed to create campaign");
            }
        } catch (error) {
            console.error("Failed to create campaign:", error);
            toast.error("Failed to create campaign");
        }
    };

    const handleStartCampaign = async (campaignId: string) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/campaigns/${campaignId}/start`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Campaign started");
                fetchCampaigns();
            }
        } catch (error) {
            toast.error("Failed to start campaign");
        }
    };

    const handlePauseCampaign = async (campaignId: string) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/campaigns/${campaignId}/pause`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Campaign paused");
                fetchCampaigns();
            }
        } catch (error) {
            toast.error("Failed to pause campaign");
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) {
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/campaigns/${campaignId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Campaign deleted");
                fetchCampaigns();
            }
        } catch (error) {
            toast.error("Failed to delete campaign");
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Draft" },
            active: { bg: "bg-green-500/20", text: "text-green-400", label: "Active" },
            paused: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Paused" },
            completed: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Completed" },
        };
        const badge = badges[status] || badges.draft;
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const calculateRate = (num: number, denom: number) => {
        if (denom === 0) return "0%";
        return `${((num / denom) * 100).toFixed(1)}%`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage cold email campaigns
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Campaign
                </button>
            </div>

            {/* Campaigns List */}
            {campaigns.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No campaigns yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Create your first cold email campaign to start reaching prospects
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Create Campaign
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {campaigns.map((campaign) => (
                        <motion.div
                            key={campaign._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
                        >
                            {/* Campaign Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-medium text-foreground">{campaign.name}</h3>
                                        {getStatusBadge(campaign.status)}
                                    </div>
                                    {campaign.description && (
                                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {campaign.status === "draft" || campaign.status === "paused" ? (
                                        <button
                                            onClick={() => handleStartCampaign(campaign._id)}
                                            className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                            title="Start Campaign"
                                        >
                                            <PlayIcon className="w-5 h-5" />
                                        </button>
                                    ) : campaign.status === "active" ? (
                                        <button
                                            onClick={() => handlePauseCampaign(campaign._id)}
                                            className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                            title="Pause Campaign"
                                        >
                                            <PauseIcon className="w-5 h-5" />
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => handleDeleteCampaign(campaign._id)}
                                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete Campaign"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-6 gap-3 mb-4">
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                        <UserGroupIcon className="w-4 h-4" />
                                        <span className="text-xs">Enrolled</span>
                                    </div>
                                    <p className="text-xl font-semibold text-foreground">{campaign.totalEnrolled}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                        <EnvelopeIcon className="w-4 h-4" />
                                        <span className="text-xs">Sent</span>
                                    </div>
                                    <p className="text-xl font-semibold text-foreground">{campaign.stats.sent}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                        <EyeIcon className="w-4 h-4" />
                                        <span className="text-xs">Open Rate</span>
                                    </div>
                                    <p className="text-xl font-semibold text-foreground">
                                        {calculateRate(campaign.stats.opened, campaign.stats.sent)}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                        <CursorArrowRaysIcon className="w-4 h-4" />
                                        <span className="text-xs">Click Rate</span>
                                    </div>
                                    <p className="text-xl font-semibold text-foreground">
                                        {calculateRate(campaign.stats.clicked, campaign.stats.sent)}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                        <ChatBubbleLeftIcon className="w-4 h-4" />
                                        <span className="text-xs">Reply Rate</span>
                                    </div>
                                    <p className="text-xl font-semibold text-foreground">
                                        {calculateRate(campaign.stats.replied, campaign.stats.sent)}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                        <span className="text-xs">Bounce Rate</span>
                                    </div>
                                    <p className="text-xl font-semibold text-foreground">
                                        {calculateRate(campaign.stats.bounced, campaign.stats.sent)}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Info */}
                            <div className="flex items-center justify-between pt-3 border-t border-border text-sm text-muted-foreground">
                                <div className="flex items-center gap-4">
                                    <span>{campaign.steps.length} step(s)</span>
                                    <span>{campaign.fromAccounts.length} sending account(s)</span>
                                    <span>{campaign.dailyLimit} emails/day limit</span>
                                </div>
                                <span>
                                    Created {new Date(campaign.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl mx-4"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-6">Create Campaign</h2>

                        <form onSubmit={handleCreateCampaign} className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Campaign Name
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Q1 Outreach Campaign"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Description (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Target: Marketing Managers at SaaS companies"
                                    />
                                </div>
                            </div>

                            {/* Email Accounts */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Sending Accounts
                                </label>
                                {emailAccounts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                                        No email accounts connected.{" "}
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/projects/${workspaceId}/email-accounts`)}
                                            className="text-primary hover:underline"
                                        >
                                            Add one now
                                        </button>
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {emailAccounts.map((account) => (
                                            <label
                                                key={account._id}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${createForm.fromAccounts.includes(account._id)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={createForm.fromAccounts.includes(account._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setCreateForm({
                                                                ...createForm,
                                                                fromAccounts: [...createForm.fromAccounts, account._id],
                                                            });
                                                        } else {
                                                            setCreateForm({
                                                                ...createForm,
                                                                fromAccounts: createForm.fromAccounts.filter((id) => id !== account._id),
                                                            });
                                                        }
                                                    }}
                                                    className="sr-only"
                                                />
                                                {account.email}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Daily Limit */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Daily Send Limit
                                </label>
                                <input
                                    type="number"
                                    value={createForm.dailyLimit}
                                    onChange={(e) => setCreateForm({ ...createForm, dailyLimit: parseInt(e.target.value) || 50 })}
                                    min={1}
                                    max={500}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Email Step */}
                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-foreground mb-4">Step 1: Initial Email</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Subject Line
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.steps[0].subject}
                                            onChange={(e) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    steps: [{ ...createForm.steps[0], subject: e.target.value }],
                                                })
                                            }
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Hi {{firstName}}, quick question about {{company}}"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{company}}"} for personalization
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Email Body
                                        </label>
                                        <textarea
                                            value={createForm.steps[0].body}
                                            onChange={(e) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    steps: [{ ...createForm.steps[0], body: e.target.value }],
                                                })
                                            }
                                            rows={6}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                            placeholder="Hi {{firstName}},&#10;&#10;I noticed..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Create Campaign
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
