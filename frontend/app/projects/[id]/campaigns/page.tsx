"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    ArrowPathIcon,
    UserGroupIcon,
    EnvelopeIcon,
    ExclamationCircleIcon,
    PaperAirplaneIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    XMarkIcon,
    CheckIcon,
    SparklesIcon,
    NewspaperIcon,
    TicketIcon,
    HandRaisedIcon,
} from "@heroicons/react/24/outline";
import { Snowflake } from "lucide-react";
import toast from "react-hot-toast";
import { getEmailIntegrations } from "@/lib/api/emailIntegration";
import {
    getCampaigns,
    createCampaign,
    startCampaign,
    pauseCampaign,
    deleteCampaign,
    enrollInCampaign,
    Campaign,
    CampaignStep,
    CreateCampaignData,
} from "@/lib/api/campaign";
import { getEmailAccounts } from "@/lib/api/emailAccount";
import { axiosInstance } from "@/lib/axios";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { campaignTemplates, CampaignTemplate, TemplateIconType } from "@/lib/campaign/templates";

// Template icon mapping
const TemplateIcon = ({ icon, className }: { icon: TemplateIconType; className?: string }) => {
    switch (icon) {
        case 'snowflake':
            return <Snowflake className={className} />;
        case 'handshake':
            return <HandRaisedIcon className={className} />;
        case 'newspaper':
            return <NewspaperIcon className={className} />;
        case 'ticket':
            return <TicketIcon className={className} />;
        case 'sparkles':
            return <SparklesIcon className={className} />;
        default:
            return <EnvelopeIcon className={className} />;
    }
};

// Status indicator colors - matching workflow style
const STATUS_COLORS: Record<string, string> = {
    draft: "bg-zinc-400",
    active: "bg-emerald-500",
    paused: "bg-amber-500",
    completed: "bg-blue-500",
};

// Campaign row component - matching workflow row style
function CampaignRow({
    campaign,
    onEdit,
    onStart,
    onPause,
    onEnroll,
    onTestEmail,
    onDelete,
}: {
    campaign: Campaign;
    onEdit: () => void;
    onStart: () => void;
    onPause: () => void;
    onEnroll: () => void;
    onTestEmail: () => void;
    onDelete: () => void;
}) {
    const calculateRate = (num: number, denom: number) => {
        if (denom === 0) return "0%";
        return `${((num / denom) * 100).toFixed(0)}%`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer"
            onClick={onEdit}
        >
            {/* Status indicator */}
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[campaign.status] || STATUS_COLORS.draft)} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {campaign.name}
                    </p>
                    <span className="text-xs text-zinc-400 capitalize">{campaign.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                    {campaign.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-md">
                            {campaign.description}
                        </p>
                    )}
                    <p className="text-xs text-zinc-400">
                        {campaign.steps.length} step{campaign.steps.length !== 1 ? 's' : ''} · {campaign.fromAccounts.length} account{campaign.fromAccounts.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-6 text-xs text-zinc-500">
                <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{campaign.totalEnrolled}</p>
                    <p>enrolled</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{campaign.stats.sent}</p>
                    <p>sent</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-emerald-500">{calculateRate(campaign.stats.opened, campaign.stats.sent)}</p>
                    <p>opened</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-blue-500">{calculateRate(campaign.stats.replied, campaign.stats.sent)}</p>
                    <p>replied</p>
                </div>
            </div>

            {/* Actions - hover revealed */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {campaign.status === "active" ? (
                    <button
                        onClick={onPause}
                        className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="Pause"
                    >
                        <PauseIcon className="w-4 h-4" />
                    </button>
                ) : campaign.status === "draft" || campaign.status === "paused" ? (
                    <button
                        onClick={onStart}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Start"
                    >
                        <PlayIcon className="w-4 h-4" />
                    </button>
                ) : null}
                <button
                    onClick={onEnroll}
                    className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Add Contacts"
                >
                    <UserGroupIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={onTestEmail}
                    className="p-1.5 text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                    title="Send Test Email"
                >
                    <PaperAirplaneIcon className="w-4 h-4" />
                </button>
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

export default function CampaignsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    // Track actions for AI insights
    const { track } = useInsightTracking({
        workspaceId,
        page: 'campaigns',
        enabled: !!workspaceId,
    });

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [emailAccounts, setEmailAccounts] = useState<Array<{ _id: string; email: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Contact enrollment state
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollingCampaignId, setEnrollingCampaignId] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Array<{ _id: string; firstName: string; lastName: string; email: string }>>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [contactsLoading, setContactsLoading] = useState(false);

    // Test email state
    const [showTestEmailModal, setShowTestEmailModal] = useState(false);
    const [testEmailCampaign, setTestEmailCampaign] = useState<Campaign | null>(null);
    const [testEmailAddress, setTestEmailAddress] = useState("");
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

    // Create form state
    const [createForm, setCreateForm] = useState<{
        name: string;
        description: string;
        fromAccounts: string[];
        dailyLimit: number;
        steps: CampaignStep[];
    }>({
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

    const fetchCampaignsData = useCallback(async () => {
        try {
            setError(null);
            const response = await getCampaigns(workspaceId);
            if (response.success) {
                setCampaigns(response.campaigns || response.data?.campaigns || []);
            } else {
                setError(response.error || "Failed to load campaigns");
            }
        } catch (err: any) {
            console.error("Failed to fetch campaigns:", err);
            setError(err.message || "Failed to load campaigns");
            toast.error("Failed to load campaigns");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const fetchEmailAccountsData = useCallback(async () => {
        try {
            const coldAccountsPromise = getEmailAccounts(workspaceId).catch(() => ({
                success: false,
                data: { accounts: [] }
            }));

            const integrationsPromise = getEmailIntegrations(workspaceId).catch(() => ({
                success: false,
                data: { integrations: [] }
            }));

            const [coldData, integrationsData] = await Promise.all([
                coldAccountsPromise,
                integrationsPromise,
            ]);

            const accounts: Array<{ _id: string; email: string }> = [];

            const coldAccounts = coldData.data?.accounts || (coldData as any).accounts || [];
            if (coldData.success && coldAccounts.length > 0) {
                for (const acc of coldAccounts) {
                    accounts.push({ _id: acc._id, email: acc.email });
                }
            }

            const integrations = integrationsData.data?.integrations || [];
            if (integrationsData.success && integrations.length > 0) {
                for (const integration of integrations) {
                    if (!accounts.some(acc => acc.email === integration.email)) {
                        accounts.push({ _id: integration._id, email: integration.email });
                    }
                }
            }

            setEmailAccounts(accounts);
        } catch (err) {
            console.error("Failed to fetch email accounts:", err);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchCampaignsData();
        fetchEmailAccountsData();
    }, [fetchCampaignsData, fetchEmailAccountsData]);

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

        setIsSubmitting(true);
        try {
            const data: CreateCampaignData = {
                name: createForm.name,
                description: createForm.description,
                fromAccounts: createForm.fromAccounts,
                dailyLimit: createForm.dailyLimit,
                steps: createForm.steps,
            };
            const response = await createCampaign(workspaceId, data);
            if (response.success) {
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
                fetchCampaignsData();
            } else {
                toast.error(response.error || "Failed to create campaign");
            }
        } catch (err: any) {
            console.error("Failed to create campaign:", err);
            toast.error(err.message || "Failed to create campaign");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartCampaign = async (campaignId: string) => {
        try {
            const response = await startCampaign(campaignId);
            if (response.success) {
                toast.success("Campaign started");
                fetchCampaignsData();
            } else {
                toast.error(response.error || "Failed to start campaign");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to start campaign");
        }
    };

    const handlePauseCampaign = async (campaignId: string) => {
        try {
            const response = await pauseCampaign(campaignId);
            if (response.success) {
                toast.success("Campaign paused");
                fetchCampaignsData();
            } else {
                toast.error(response.error || "Failed to pause campaign");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to pause campaign");
        }
    };

    const handleDeleteCampaign = async () => {
        if (!campaignToDelete) return;
        try {
            const response = await deleteCampaign(campaignToDelete);
            if (response.success) {
                toast.success("Campaign deleted");
                fetchCampaignsData();
            } else {
                toast.error("Failed to delete campaign");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete campaign");
        } finally {
            setCampaignToDelete(null);
        }
    };

    const openDeleteConfirm = (campaignId: string) => {
        setCampaignToDelete(campaignId);
        setDeleteConfirmOpen(true);
    };

    const fetchContactsForEnrollment = async () => {
        setContactsLoading(true);
        try {
            const response = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, {
                params: { limit: 100 }
            });
            const contactsList = response.data.data?.contacts || response.data.contacts || [];
            const contactsWithEmail = contactsList.filter((c: any) => c.email);
            setContacts(contactsWithEmail);
        } catch (err) {
            console.error("Failed to fetch contacts:", err);
            toast.error("Failed to load contacts");
        } finally {
            setContactsLoading(false);
        }
    };

    const handleOpenEnrollModal = async (campaignId: string) => {
        setEnrollingCampaignId(campaignId);
        setSelectedContacts([]);
        setShowEnrollModal(true);
        await fetchContactsForEnrollment();
    };

    const handleEnrollContacts = async () => {
        if (!enrollingCampaignId || selectedContacts.length === 0) {
            toast.error("Please select at least one contact");
            return;
        }

        setIsEnrolling(true);
        try {
            const response = await enrollInCampaign(enrollingCampaignId, selectedContacts);
            if (response.success) {
                toast.success(`Enrolled ${response.enrolled} contacts successfully`);
                setShowEnrollModal(false);
                setSelectedContacts([]);
                fetchCampaignsData();
            } else {
                toast.error("Failed to enroll contacts");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to enroll contacts");
        } finally {
            setIsEnrolling(false);
        }
    };

    const toggleContactSelection = (contactId: string) => {
        setSelectedContacts(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const selectAllContacts = () => {
        if (selectedContacts.length === contacts.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts(contacts.map(c => c._id));
        }
    };

    const handleOpenTestEmail = (campaign: Campaign) => {
        setTestEmailCampaign(campaign);
        setTestEmailAddress("");
        setShowTestEmailModal(true);
    };

    const handleSendTestEmail = async () => {
        if (!testEmailCampaign || !testEmailAddress) {
            toast.error("Please enter an email address");
            return;
        }

        setIsSendingTest(true);
        try {
            const token = localStorage.getItem("token");
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

            const response = await fetch(`${apiUrl}/campaigns/${testEmailCampaign._id}/test`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    testEmail: testEmailAddress,
                    workspaceId
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`Test email sent to ${testEmailAddress}`);
                setShowTestEmailModal(false);
            } else {
                toast.error(data.message || "Failed to send test email");
            }
        } catch (err: any) {
            console.error("Failed to send test email:", err);
            toast.error(err.message || "Failed to send test email");
        } finally {
            setIsSendingTest(false);
        }
    };

    // Filter campaigns
    const filteredCampaigns = campaigns.filter((c) => {
        const matchesSearch =
            searchQuery === "" ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const activeCount = campaigns.filter(c => c.status === "active").length;
    const draftCount = campaigns.filter(c => c.status === "draft").length;
    const pausedCount = campaigns.filter(c => c.status === "paused").length;

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">Failed to load campaigns</h3>
                        <p className="text-zinc-500">{error}</p>
                    </div>
                    <button
                        onClick={() => {
                            setIsLoading(true);
                            setError(null);
                            fetchCampaignsData();
                        }}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Campaigns
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Create and manage cold email campaigns
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Creating...</span>
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">New Campaign</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 flex items-center gap-6"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{campaigns.length}</span>
                        <span className="text-sm text-zinc-500">total</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-500">{activeCount}</span>
                        <span className="text-sm text-zinc-500">active</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span className="text-2xl font-bold text-zinc-500">{draftCount}</span>
                        <span className="text-sm text-zinc-500">draft</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-2xl font-bold text-amber-500">{pausedCount}</span>
                        <span className="text-sm text-zinc-500">paused</span>
                    </div>
                </motion.div>
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
                            placeholder="Search campaigns..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {(["all", "active", "draft", "paused", "completed"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                    statusFilter === status
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                )}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Campaign List */}
            <div className="px-8 pb-8">
                {filteredCampaigns.length === 0 ? (
                    campaigns.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <EnvelopeIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No campaigns yet</h3>
                            <p className="text-sm text-zinc-500 mb-6">Create your first campaign to start reaching prospects</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Campaign
                            </button>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            No campaigns match your search.
                        </div>
                    )
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredCampaigns.map((campaign) => (
                            <CampaignRow
                                key={campaign._id}
                                campaign={campaign}
                                onEdit={() => router.push(`/projects/${workspaceId}/campaigns/${campaign._id}`)}
                                onStart={() => handleStartCampaign(campaign._id)}
                                onPause={() => handlePauseCampaign(campaign._id)}
                                onEnroll={() => handleOpenEnrollModal(campaign._id)}
                                onTestEmail={() => handleOpenTestEmail(campaign)}
                                onDelete={() => openDeleteConfirm(campaign._id)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Create Campaign Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setShowCreateModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto"
                        >
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">New Campaign</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">Set up your email sequence</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateCampaign}>
                                    <div className="px-6 py-5 space-y-5">
                                        {/* Template Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                Start with a template
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {/* Blank Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCreateForm({
                                                            name: "",
                                                            description: "",
                                                            fromAccounts: createForm.fromAccounts,
                                                            dailyLimit: 50,
                                                            steps: [{
                                                                id: "step-1",
                                                                type: "email",
                                                                subject: "",
                                                                body: "",
                                                                delayDays: 0,
                                                                delayHours: 0,
                                                            }],
                                                        });
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all",
                                                        createForm.name === "" && createForm.steps[0]?.subject === ""
                                                            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                                                            : "border-dashed border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
                                                    )}
                                                >
                                                    <PlusIcon className="w-5 h-5 text-zinc-400" />
                                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Blank</span>
                                                </button>
                                                {campaignTemplates.slice(0, 5).map((template) => (
                                                    <button
                                                        key={template.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateForm({
                                                                ...createForm,
                                                                name: template.name,
                                                                dailyLimit: template.dailyLimit,
                                                                steps: template.steps.map((step, idx) => ({
                                                                    ...step,
                                                                    id: `step-${idx + 1}`,
                                                                })),
                                                            });
                                                        }}
                                                        className={cn(
                                                            "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all",
                                                            createForm.name === template.name
                                                                ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                                                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                                        )}
                                                    >
                                                        <TemplateIcon icon={template.icon} className="w-5 h-5 text-zinc-500" />
                                                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate w-full">{template.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Campaign Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                                Campaign Name
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.name}
                                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                                required
                                                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent text-zinc-900 dark:text-zinc-100 text-sm"
                                                placeholder="e.g. Q1 Outreach"
                                            />
                                        </div>

                                        {/* Sending Account */}
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                                Send From
                                            </label>
                                            {emailAccounts.length === 0 ? (
                                                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                    <ExclamationCircleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                                        No email accounts.{" "}
                                                        <Link href={`/projects/${workspaceId}/email-accounts`} className="font-medium underline">
                                                            Connect one
                                                        </Link>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {emailAccounts.map((account) => (
                                                        <label
                                                            key={account._id}
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                                createForm.fromAccounts.includes(account._id)
                                                                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                                                                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                                                createForm.fromAccounts.includes(account._id)
                                                                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100"
                                                                    : "border-zinc-300 dark:border-zinc-600"
                                                            )}>
                                                                {createForm.fromAccounts.includes(account._id) && (
                                                                    <CheckIcon className="w-3 h-3 text-white dark:text-zinc-900" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{account.email}</p>
                                                            </div>
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
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Email Steps */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                    Email Sequence ({createForm.steps.length} step{createForm.steps.length !== 1 ? 's' : ''})
                                                </span>
                                            </div>

                                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                                {createForm.steps.map((step, idx) => (
                                                    <div key={idx} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                                {idx === 0 ? 'Send immediately' : `Wait ${step.delayDays || 0} day${(step.delayDays || 0) !== 1 ? 's' : ''}`}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={step.subject}
                                                            onChange={(e) => {
                                                                const newSteps = [...createForm.steps];
                                                                newSteps[idx] = { ...newSteps[idx], subject: e.target.value };
                                                                setCreateForm({ ...createForm, steps: newSteps });
                                                            }}
                                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent text-zinc-900 dark:text-zinc-100 text-sm mb-2"
                                                            placeholder="Subject line..."
                                                        />
                                                        <textarea
                                                            value={step.body}
                                                            onChange={(e) => {
                                                                const newSteps = [...createForm.steps];
                                                                newSteps[idx] = { ...newSteps[idx], body: e.target.value };
                                                                setCreateForm({ ...createForm, steps: newSteps });
                                                            }}
                                                            rows={3}
                                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent resize-none text-zinc-900 dark:text-zinc-100 text-sm"
                                                            placeholder="Write your email..."
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-zinc-400">
                                                Variables: {"{{firstName}}"} {"{{lastName}}"} {"{{company}}"}
                                            </p>
                                        </div>

                                        {/* Daily Limit - Compact */}
                                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Daily limit</p>
                                                <p className="text-xs text-zinc-400">Max emails per day</p>
                                            </div>
                                            <input
                                                type="number"
                                                value={createForm.dailyLimit}
                                                onChange={(e) => setCreateForm({ ...createForm, dailyLimit: parseInt(e.target.value) || 50 })}
                                                min={1}
                                                max={500}
                                                className="w-20 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-zinc-900 dark:text-zinc-100 text-sm text-center"
                                            />
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-b-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || createForm.fromAccounts.length === 0}
                                            className="flex-1 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Campaign"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Enroll Contacts Modal */}
            <AnimatePresence>
                {showEnrollModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => {
                                setShowEnrollModal(false);
                                setSelectedContacts([]);
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
                        >
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add Contacts</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">Select contacts to enroll in campaign</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowEnrollModal(false);
                                            setSelectedContacts([]);
                                        }}
                                        className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-5">
                                    {contactsLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <ArrowPathIcon className="w-6 h-6 animate-spin text-zinc-400" />
                                        </div>
                                    ) : contacts.length === 0 ? (
                                        <div className="text-center py-8">
                                            <UserGroupIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                            <p className="text-sm text-zinc-500 mb-3">No contacts with emails found</p>
                                            <button
                                                onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
                                                className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                                            >
                                                Add contacts
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Select All */}
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs text-zinc-500">
                                                    {selectedContacts.length} selected
                                                </span>
                                                <button
                                                    onClick={selectAllContacts}
                                                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                                >
                                                    {selectedContacts.length === contacts.length ? "Clear all" : "Select all"}
                                                </button>
                                            </div>

                                            {/* Contact List */}
                                            <div className="max-h-64 overflow-y-auto -mx-5 px-5">
                                                <div className="space-y-1">
                                                    {contacts.map(contact => (
                                                        <label
                                                            key={contact._id}
                                                            className={cn(
                                                                "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                                                selectedContacts.includes(contact._id)
                                                                    ? "bg-zinc-100 dark:bg-zinc-800"
                                                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                                                selectedContacts.includes(contact._id)
                                                                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100"
                                                                    : "border-zinc-300 dark:border-zinc-600"
                                                            )}>
                                                                {selectedContacts.includes(contact._id) && (
                                                                    <CheckIcon className="w-3 h-3 text-white dark:text-zinc-900" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                                    {contact.firstName} {contact.lastName}
                                                                </p>
                                                                <p className="text-xs text-zinc-500 truncate">{contact.email}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedContacts.includes(contact._id)}
                                                                onChange={() => toggleContactSelection(contact._id)}
                                                                className="sr-only"
                                                            />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Footer */}
                                {contacts.length > 0 && (
                                    <div className="flex gap-3 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-b-2xl">
                                        <button
                                            onClick={() => {
                                                setShowEnrollModal(false);
                                                setSelectedContacts([]);
                                            }}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEnrollContacts}
                                            disabled={isEnrolling || selectedContacts.length === 0}
                                            className="flex-1 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isEnrolling ? (
                                                <>
                                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    Adding...
                                                </>
                                            ) : (
                                                `Add ${selectedContacts.length || ''} Contact${selectedContacts.length !== 1 ? 's' : ''}`
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Test Email Modal */}
            <AnimatePresence>
                {showTestEmailModal && testEmailCampaign && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setShowTestEmailModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
                        >
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Send Test</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px]">{testEmailCampaign.name}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowTestEmailModal(false)}
                                        className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-5">
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        Send to
                                    </label>
                                    <input
                                        type="email"
                                        value={testEmailAddress}
                                        onChange={(e) => setTestEmailAddress(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent text-zinc-900 dark:text-zinc-100 text-sm"
                                        autoFocus
                                    />
                                </div>

                                {/* Footer */}
                                <div className="flex gap-3 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-b-2xl">
                                    <button
                                        onClick={() => setShowTestEmailModal(false)}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendTestEmail}
                                        disabled={isSendingTest || !testEmailAddress}
                                        className="flex-1 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSendingTest ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <PaperAirplaneIcon className="w-4 h-4" />
                                                Send
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setCampaignToDelete(null);
                }}
                onConfirm={handleDeleteCampaign}
                title="Delete Campaign"
                message="Are you sure you want to delete this campaign? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
