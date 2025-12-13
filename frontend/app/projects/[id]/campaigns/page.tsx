"use client";

import { useState, useEffect, useCallback } from "react";
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
    ExclamationCircleIcon,
    PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
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
import { TemplateGallery } from "@/components/shared/TemplateGallery";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function CampaignsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [emailAccounts, setEmailAccounts] = useState<Array<{ _id: string; email: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            // Fetch cold email accounts
            const coldAccountsPromise = getEmailAccounts(workspaceId).catch(() => ({
                success: false,
                data: { accounts: [] }
            }));

            // Fetch Gmail integrations
            const integrationsPromise = getEmailIntegrations(workspaceId).catch(() => ({
                success: false,
                data: { integrations: [] }
            }));

            const [coldData, integrationsData] = await Promise.all([
                coldAccountsPromise,
                integrationsPromise,
            ]);

            const accounts: Array<{ _id: string; email: string }> = [];

            // Add cold email accounts (handle both response formats)
            const coldAccounts = coldData.data?.accounts || (coldData as any).accounts || [];
            if (coldData.success && coldAccounts.length > 0) {
                for (const acc of coldAccounts) {
                    accounts.push({ _id: acc._id, email: acc.email });
                }
            }

            // Add Gmail integrations (these can also send emails)
            const integrations = integrationsData.data?.integrations || [];
            if (integrationsData.success && integrations.length > 0) {
                for (const integration of integrations) {
                    // Avoid duplicates
                    if (!accounts.some(acc => acc.email === integration.email)) {
                        accounts.push({ _id: integration._id, email: integration.email });
                    }
                }
            }

            if (accounts.length === 0) {
                console.warn("No email accounts found. Connect accounts in Email Accounts or Settings > Integrations.");
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

    // Fetch contacts for enrollment
    const fetchContactsForEnrollment = async () => {
        setContactsLoading(true);
        try {
            const response = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, {
                params: { limit: 100 }
            });
            const contactsList = response.data.data?.contacts || response.data.contacts || [];
            // Filter contacts that have email addresses
            const contactsWithEmail = contactsList.filter((c: any) => c.email);
            setContacts(contactsWithEmail);
        } catch (err) {
            console.error("Failed to fetch contacts:", err);
            toast.error("Failed to load contacts");
        } finally {
            setContactsLoading(false);
        }
    };

    // Open enrollment modal
    const handleOpenEnrollModal = async (campaignId: string) => {
        setEnrollingCampaignId(campaignId);
        setSelectedContacts([]);
        setShowEnrollModal(true);
        await fetchContactsForEnrollment();
    };

    // Enroll selected contacts
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

    // Toggle contact selection
    const toggleContactSelection = (contactId: string) => {
        setSelectedContacts(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    // Select all contacts
    const selectAllContacts = () => {
        if (selectedContacts.length === contacts.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts(contacts.map(c => c._id));
        }
    };

    // Open test email modal
    const handleOpenTestEmail = (campaign: Campaign) => {
        setTestEmailCampaign(campaign);
        setTestEmailAddress("");
        setShowTestEmailModal(true);
    };

    // Send test email
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

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading campaigns...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-foreground mb-1">Failed to load campaigns</h3>
                        <p className="text-muted-foreground">{error}</p>
                    </div>
                    <button
                        onClick={() => {
                            setIsLoading(true);
                            setError(null);
                            fetchCampaignsData();
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
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
                <TemplateGallery
                    title="Launch Your Outreach"
                    description="Select a campaign strategy or start from scratch."
                    onCreateBlank={() => setShowCreateModal(true)}
                    actionLabel="New Campaign"
                    onSelect={(id) => {
                        setShowCreateModal(true);
                        // Pre-fill logic could go here based on ID
                    }}
                    templates={[
                        { id: "cold-outreach", title: "Cold Outreach", description: "Standard 3-step sequence for cold prospects.", icon: "❄️" },
                        { id: "newsletter", title: "Newsletter Blast", description: "One-off announcement to your list.", icon: "📰" },
                        { id: "event-invite", title: "Event Invitation", description: "Invite and follow up sequence.", icon: "🎟️" }
                    ]}
                />
            ) : (
                <div className="space-y-4">
                    {campaigns.map((campaign) => (
                        <motion.div
                            key={campaign._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="premium-card p-5 hover:-translate-y-1 transition-all duration-300"
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
                                        onClick={() => handleOpenEnrollModal(campaign._id)}
                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title="Add Contacts"
                                    >
                                        <UserGroupIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleOpenTestEmail(campaign)}
                                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Send Test Email"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => openDeleteConfirm(campaign._id)}
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
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                    </motion.div>
                </div>
            )}

            {/* Enroll Contacts Modal */}
            {showEnrollModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-4">Add Contacts to Campaign</h2>

                        {contactsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <ArrowPathIcon className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : contacts.length === 0 ? (
                            <div className="text-center py-8">
                                <UserGroupIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground mb-4">No contacts with email addresses found.</p>
                                <button
                                    onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
                                    className="text-primary hover:underline"
                                >
                                    Add contacts first
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedContacts.length} of {contacts.length} selected
                                    </span>
                                    <button
                                        onClick={selectAllContacts}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        {selectedContacts.length === contacts.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>

                                <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                                    {contacts.map(contact => (
                                        <label
                                            key={contact._id}
                                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedContacts.includes(contact._id)}
                                                onChange={() => toggleContactSelection(contact._id)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {contact.firstName} {contact.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {contact.email}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowEnrollModal(false);
                                    setSelectedContacts([]);
                                }}
                                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnrollContacts}
                                disabled={isEnrolling || selectedContacts.length === 0}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isEnrolling ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Enrolling...
                                    </>
                                ) : (
                                    `Enroll ${selectedContacts.length} Contact${selectedContacts.length !== 1 ? 's' : ''}`
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Test Email Modal */}
            {showTestEmailModal && testEmailCampaign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Send Test Email
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Send a test email from campaign &quot;{testEmailCampaign.name}&quot; to verify it works correctly.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={testEmailAddress}
                                    onChange={(e) => setTestEmailAddress(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowTestEmailModal(false)}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendTestEmail}
                                    disabled={isSendingTest || !testEmailAddress}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSendingTest ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                            Send Test
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

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
