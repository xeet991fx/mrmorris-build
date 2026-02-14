"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    ArrowPathIcon,
    ArrowLeftIcon,
    UserGroupIcon,
    UserPlusIcon,
    EnvelopeIcon,
    ExclamationCircleIcon,
    PaperAirplaneIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    XMarkIcon,
    CheckIcon,
    ClockIcon,
    BoltIcon,
    Cog6ToothIcon,
    DocumentDuplicateIcon,
    CheckCircleIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import {
    getCampaign,
    updateCampaign,
    startCampaign,
    pauseCampaign,
    enrollInCampaign,
    getCampaignEnrollments,
    Campaign,
    CampaignStep,
    CampaignEnrollment,
} from "@/lib/api/campaign";
import { getEmailAccounts } from "@/lib/api/emailAccount";
import { getEmailIntegrations } from "@/lib/api/emailIntegration";
import { getEmailTemplates, EmailTemplate } from "@/lib/api/emailTemplate";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import CampaignInsightsPanel from "@/components/campaigns/CampaignInsightsPanel";

// ============================================
// PERSONALIZATION TOOLBAR
// ============================================

const PERSONALIZATION_VARS = [
    { label: "First Name", value: "{{firstName}}" },
    { label: "Last Name", value: "{{lastName}}" },
    { label: "Company", value: "{{company}}" },
    { label: "Job Title", value: "{{jobTitle}}" },
    { label: "Sender Name", value: "{{senderName}}" },
];

function PersonalizationToolbar({ onInsert }: { onInsert: (variable: string) => void }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    open
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                )}
            >
                <BoltIcon className="w-3.5 h-3.5" />
                Personalize
                <ChevronDownIcon className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 py-1"
                    >
                        {PERSONALIZATION_VARS.map((v) => (
                            <button
                                key={v.value}
                                onClick={() => { onInsert(v.value); setOpen(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs"
                            >
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{v.label}</span>
                                <span className="ml-2 text-zinc-400">{v.value}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// TEMPLATE PICKER
// ============================================

function TemplatePicker({ workspaceId, onSelect }: { workspaceId: string; onSelect: (template: EmailTemplate) => void }) {
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await getEmailTemplates(workspaceId);
            setTemplates(res.data?.templates || []);
        } catch {
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        setOpen(!open);
        if (!open) loadTemplates();
    };

    const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={menuRef}>
            <button type="button" onClick={handleOpen} className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                open ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            )}>
                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                Template
                <ChevronDownIcon className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 overflow-hidden">
                        <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                            <input type="text" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-orange-500/30" />
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1">
                            {loading ? (
                                <div className="py-6 text-center text-xs text-zinc-400"><ArrowPathIcon className="w-4 h-4 animate-spin mx-auto mb-1" />Loading...</div>
                            ) : filtered.length === 0 ? (
                                <div className="py-6 text-center text-xs text-zinc-400">{templates.length === 0 ? "No templates found" : "No matching templates"}</div>
                            ) : filtered.map((t) => (
                                <button key={t._id} onClick={() => { onSelect(t); setOpen(false); }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.name}</p>
                                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{t.subject}</p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
        draft: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400", label: "Draft" },
        active: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Active" },
        paused: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "Paused" },
        completed: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", label: "Completed" },
    };
    const c = config[status] || config.draft;
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", c.bg, c.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
            {c.label}
        </span>
    );
}

// ============================================
// ENROLL CONTACTS MODAL
// ============================================

function EnrollModal({ isOpen, campaignId, workspaceId, onClose, onSuccess }: {
    isOpen: boolean; campaignId: string | null; workspaceId: string; onClose: () => void; onSuccess: () => void;
}) {
    const [contacts, setContacts] = useState<Array<{ _id: string; firstName?: string; lastName?: string; email: string; company?: string }>>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);

    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, { params: { limit: 100 } });
            if (res.data.success) setContacts((res.data.data?.contacts || []).filter((c: any) => c.email));
        } catch { toast.error("Failed to load contacts"); }
        finally { setIsLoading(false); }
    }, [workspaceId]);

    useEffect(() => {
        if (isOpen) { fetchContacts(); setSelectedIds(new Set()); setSearchQuery(""); }
    }, [isOpen, fetchContacts]);

    const handleEnroll = async () => {
        if (!campaignId || selectedIds.size === 0) return;
        setIsEnrolling(true);
        try {
            const res = await enrollInCampaign(campaignId, Array.from(selectedIds));
            if (res.success) { toast.success(`${res.enrolled} contact${res.enrolled !== 1 ? "s" : ""} enrolled`); onSuccess(); onClose(); }
        } catch { toast.error("Failed to enroll contacts"); }
        finally { setIsEnrolling(false); }
    };

    const filteredContacts = contacts.filter((c) => {
        const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (!isOpen || !campaignId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl mx-4">
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Enroll Recipients</h2>
                        <p className="text-sm text-zinc-500">Add contacts to this campaign</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    {isLoading ? <div className="p-8 text-center text-zinc-400">Loading contacts...</div>
                        : filteredContacts.length === 0 ? <div className="p-8 text-center text-zinc-400">No contacts found</div>
                            : (
                                <div>
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                        onClick={() => selectedIds.size === filteredContacts.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredContacts.map(c => c._id)))}>
                                        <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                            selectedIds.size === filteredContacts.length ? "bg-orange-500 border-orange-500" : "border-zinc-300 dark:border-zinc-600")}>
                                            {selectedIds.size === filteredContacts.length && <CheckCircleSolid className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Select all ({filteredContacts.length})</span>
                                    </div>
                                    {filteredContacts.map((contact) => (
                                        <div key={contact._id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                            onClick={() => { const s = new Set(selectedIds); s.has(contact._id) ? s.delete(contact._id) : s.add(contact._id); setSelectedIds(s); }}>
                                            <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                                selectedIds.has(contact._id) ? "bg-orange-500 border-orange-500" : "border-zinc-300 dark:border-zinc-600")}>
                                                {selectedIds.has(contact._id) && <CheckCircleSolid className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                    {contact.firstName || contact.lastName ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() : contact.email}
                                                </p>
                                                <p className="text-xs text-zinc-400 truncate">{contact.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                </div>
                <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                    <span className="text-sm text-zinc-500">{selectedIds.size} selected</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Cancel</button>
                        <button onClick={handleEnroll} disabled={selectedIds.size === 0 || isEnrolling}
                            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50">
                            {isEnrolling ? "Enrolling..." : `Enroll ${selectedIds.size}`}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// CAMPAIGN EDITOR (Full page - matches Sequence Editor)
// ============================================

export default function CampaignEditor({ campaign, workspaceId, onBack, onRefresh }: {
    campaign: Campaign; workspaceId: string; onBack: () => void; onRefresh: () => void;
}) {
    const [activeTab, setActiveTab] = useState<"editor" | "recipients" | "settings">("editor");
    const [name, setName] = useState(campaign.name);
    const [description, setDescription] = useState(campaign.description || "");
    const [steps, setSteps] = useState<CampaignStep[]>(campaign.steps || []);
    const [dailyLimit, setDailyLimit] = useState(campaign.dailyLimit || 50);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnabled, setIsEnabled] = useState(campaign.status === "active");
    const [hasChanges, setHasChanges] = useState(false);
    const [enrollModalOpen, setEnrollModalOpen] = useState(false);

    // Email accounts
    const [emailAccounts, setEmailAccounts] = useState<Array<{ _id: string; email: string }>>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
        campaign.fromAccounts?.map((a) => a._id) || []
    );

    // Enrollments (Recipients tab)
    const [enrollments, setEnrollments] = useState<CampaignEnrollment[]>([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
    const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");

    // Stats verification
    const [statsVerification, setStatsVerification] = useState<{ hasDrift: boolean; loading: boolean } | null>(null);

    // Settings
    const [threadEmails, setThreadEmails] = useState(true);
    const [senderSignature, setSenderSignature] = useState(true);
    const [sendWindowStart, setSendWindowStart] = useState("09:00");
    const [sendWindowEnd, setSendWindowEnd] = useState("17:00");
    const [timezone, setTimezone] = useState("UTC");
    const [businessDaysOnly, setBusinessDaysOnly] = useState(true);
    const [unenrollOnReply, setUnenrollOnReply] = useState(true);
    const [exitCriteria, setExitCriteria] = useState<string[]>(["reply_received"]);
    const [exitCriteriaOpen, setExitCriteriaOpen] = useState(false);

    useEffect(() => { setHasChanges(true); }, [name, description, steps, dailyLimit, selectedAccounts, threadEmails, senderSignature, sendWindowStart, sendWindowEnd, timezone, businessDaysOnly, unenrollOnReply]);

    // Fetch email accounts
    const fetchEmailAccounts = useCallback(async () => {
        try {
            const [coldData, intData] = await Promise.all([
                getEmailAccounts(workspaceId).catch(() => ({ success: false, data: { accounts: [] } })),
                getEmailIntegrations(workspaceId).catch(() => ({ success: false, data: { integrations: [] } })),
            ]);
            const accounts: Array<{ _id: string; email: string }> = [];
            const coldAccounts = coldData.data?.accounts || (coldData as any).accounts || [];
            if (coldData.success) coldAccounts.forEach((a: any) => accounts.push({ _id: a._id, email: a.email }));
            const integrations = intData.data?.integrations || [];
            if (intData.success) integrations.forEach((i: any) => { if (!accounts.some(a => a.email === i.email)) accounts.push({ _id: i._id, email: i.email }); });
            setEmailAccounts(accounts);
        } catch (err) { console.error("Failed to fetch email accounts:", err); }
    }, [workspaceId]);

    useEffect(() => { fetchEmailAccounts(); }, [fetchEmailAccounts]);

    // Fetch enrollments
    const fetchEnrollments = useCallback(async () => {
        setEnrollmentsLoading(true);
        try {
            const res = await getCampaignEnrollments(campaign._id, { status: enrollmentFilter === "all" ? undefined : enrollmentFilter });
            setEnrollments(res.data?.enrollments || []);
        } catch { toast.error("Failed to load enrollments"); }
        finally { setEnrollmentsLoading(false); }
    }, [campaign._id, enrollmentFilter]);

    // Verify campaign stats accuracy
    const verifyStats = useCallback(async () => {
        if (!campaign._id) return;
        setStatsVerification({ hasDrift: false, loading: true });
        try {
            const res = await axiosInstance.get(`/api/campaigns/${campaign._id}/verify-stats`);
            setStatsVerification({ hasDrift: res.data.hasDrift, loading: false });
        } catch (error) {
            console.error("Failed to verify stats:", error);
            setStatsVerification({ hasDrift: false, loading: false });
        }
    }, [campaign._id]);

    useEffect(() => { if (activeTab === "recipients") fetchEnrollments(); }, [activeTab, fetchEnrollments]);
    useEffect(() => { if (activeTab === "recipients") verifyStats(); }, [activeTab, verifyStats]);

    const addStep = () => {
        setSteps([...steps, { id: `step-${Date.now()}`, type: "email", subject: "", body: "", delayDays: steps.length > 0 ? 1 : 0, delayHours: 0 }]);
    };

    const updateStep = (index: number, updates: Partial<CampaignStep>) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setSteps(newSteps);
    };

    const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));

    const handleSave = async () => {
        if (!name.trim()) { toast.error("Campaign name is required"); return; }
        if (selectedAccounts.length === 0) { toast.error("Select at least one email account"); return; }
        setIsSaving(true);
        try {
            await updateCampaign(campaign._id, { name, description, steps, fromAccounts: selectedAccounts, dailyLimit });
            toast.success("Campaign saved");
            setHasChanges(false);
            onRefresh();
        } catch { toast.error("Failed to save campaign"); }
        finally { setIsSaving(false); }
    };

    const handleToggleEnabled = async () => {
        try {
            if (isEnabled) {
                await pauseCampaign(campaign._id);
                setIsEnabled(false);
                toast.success("Campaign paused");
            } else {
                if (steps.length === 0) { toast.error("Add at least one step before activating"); return; }
                if (selectedAccounts.length === 0) { toast.error("Select at least one email account"); return; }
                await startCampaign(campaign._id);
                setIsEnabled(true);
                toast.success("Campaign activated");
            }
            onRefresh();
        } catch { toast.error("Failed to update campaign status"); }
    };

    const tabs = [
        { id: "editor" as const, label: "Editor", count: steps.length },
        { id: "recipients" as const, label: "Recipients", count: campaign.totalEnrolled || 0 },
        { id: "settings" as const, label: "Settings" },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            <EnrollModal isOpen={enrollModalOpen} campaignId={campaign._id} workspaceId={workspaceId}
                onClose={() => setEnrollModalOpen(false)} onSuccess={() => { onRefresh(); }} />

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                            <ArrowLeftIcon className="w-4 h-4" />
                        </button>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-sm text-zinc-500">Campaigns</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <input value={name} onChange={(e) => setName(e.target.value)}
                            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 min-w-[120px]"
                            placeholder="Campaign name..." />
                        <StatusBadge status={isEnabled ? "active" : campaign.status} />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-zinc-500 font-medium">Enable campaign</span>
                            <button onClick={handleToggleEnabled}
                                className={cn("relative w-10 h-5 rounded-full transition-colors", isEnabled ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600")}>
                                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", isEnabled ? "left-5.5 translate-x-0.5" : "left-0.5")} />
                            </button>
                        </label>
                        <button onClick={() => setEnrollModalOpen(true)} disabled={!isEnabled}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                            <UserPlusIcon className="w-4 h-4" />
                            Enroll recipients
                        </button>
                    </div>
                </div>
                {/* Tabs */}
                <div className="flex items-center gap-0 px-6">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                activeTab === tab.id ? "border-orange-500 text-orange-600 dark:text-orange-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                                    activeTab === tab.id ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400")}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex">
                <div className="flex-1 max-w-3xl mx-auto py-8 px-6">
                    {/* EDITOR TAB */}
                    {activeTab === "editor" && (
                        <div>
                            <div className="flex items-center gap-2 mb-8 text-sm text-zinc-500">
                                <BoltIcon className="w-4 h-4" />
                                <span>Start <strong className="text-zinc-900 dark:text-zinc-100">immediately</strong> after enrollment</span>
                            </div>
                            <div className="space-y-0">
                                {steps.map((step, index) => (
                                    <div key={step.id}>
                                        {index > 0 && (
                                            <div className="flex items-center gap-3 py-4 pl-6">
                                                <div className="w-0.5 h-4 bg-zinc-200 dark:bg-zinc-700 ml-3.5" />
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    Wait
                                                    <input type="number" min="0" value={step.delayDays || 0}
                                                        onChange={(e) => updateStep(index, { delayDays: parseInt(e.target.value) || 0 })}
                                                        className="w-10 text-center bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-xs" />
                                                    <span>day{(step.delayDays || 0) !== 1 ? "s" : ""}</span>
                                                    <input type="number" min="0" max="23" value={step.delayHours || 0}
                                                        onChange={(e) => updateStep(index, { delayHours: parseInt(e.target.value) || 0 })}
                                                        className="w-10 text-center bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-xs" />
                                                    <span>hr{(step.delayHours || 0) !== 1 ? "s" : ""}</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* Step Card */}
                                        <div className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                        <EnvelopeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Step {index + 1}</span>
                                                        <span className="ml-2 text-xs text-zinc-400">Automated email</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeStep(index)}
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="mb-3">
                                                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Subject</label>
                                                <input type="text" value={step.subject || ""} onChange={(e) => updateStep(index, { subject: e.target.value })}
                                                    placeholder="Subject" className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Content</label>
                                                <textarea value={step.body || ""} onChange={(e) => updateStep(index, { body: e.target.value })}
                                                    placeholder="Write your email content here. Use {{firstName}} for personalization." rows={4}
                                                    className="w-full px-3 py-2 rounded-t-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm resize-none" />
                                                <div className="flex items-center gap-1 px-2 py-1.5 border border-t-0 border-zinc-200 dark:border-zinc-700 rounded-b-lg bg-zinc-50 dark:bg-zinc-800/30">
                                                    <PersonalizationToolbar onInsert={(variable) => updateStep(index, { body: (step.body || "") + variable })} />
                                                    <TemplatePicker workspaceId={workspaceId} onSelect={(template) => {
                                                        updateStep(index, { subject: template.subject, body: template.body });
                                                        toast.success(`Applied template "${template.name}"`);
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex flex-col items-center pt-4">
                                    {steps.length > 0 && <div className="w-0.5 h-6 bg-zinc-200 dark:bg-zinc-700 mb-2" />}
                                    <button onClick={addStep}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 hover:text-orange-600 hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all">
                                        <PlusIcon className="w-4 h-4" />
                                        Add step to campaign
                                    </button>
                                </div>
                                {steps.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                            <EnvelopeIcon className="w-8 h-8 text-zinc-400" />
                                        </div>
                                        <p className="text-zinc-500 mb-4">No steps yet. Start building your email campaign.</p>
                                        <button onClick={addStep}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all">
                                            <PlusIcon className="w-4 h-4" />
                                            Add first step
                                        </button>
                                    </div>
                                )}
                            </div>
                            {hasChanges && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
                                    <button onClick={handleSave} disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl disabled:opacity-50">
                                        {isSaving ? <><ArrowPathIcon className="w-4 h-4 animate-spin" />Saving...</> : <>Save changes</>}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* RECIPIENTS TAB */}
                    {activeTab === "recipients" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recipients</h2>
                                    <p className="text-sm text-zinc-500 mt-0.5">Contacts enrolled in this campaign</p>
                                </div>
                                <button onClick={() => setEnrollModalOpen(true)} disabled={!isEnabled}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50">
                                    <UserPlusIcon className="w-4 h-4" />Enroll recipients
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: "Total Enrolled", value: campaign.totalEnrolled || 0, color: "text-blue-600" },
                                    { label: "Currently Active", value: campaign.activeEnrollments || 0, color: "text-amber-600" },
                                    { label: "Sent", value: campaign.stats?.sent || 0, color: "text-emerald-600" },
                                    { label: "Replied", value: campaign.stats?.replied || 0, color: "text-purple-600" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                                        <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                            {statsVerification && !statsVerification.loading && (
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                                    statsVerification.hasDrift
                                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                )}>
                                    {statsVerification.hasDrift ? (
                                        <>
                                            <ExclamationCircleIcon className="w-4 h-4" />
                                            <span>Stats may be stale</span>
                                            <button onClick={verifyStats} className="ml-auto underline hover:no-underline">Refresh</button>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleSolid className="w-4 h-4" />
                                            <span>Stats verified</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-fit">
                                {["all", "active", "completed", "replied", "bounced", "paused"].map((f) => (
                                    <button key={f} onClick={() => setEnrollmentFilter(f)}
                                        className={cn("px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors",
                                            enrollmentFilter === f ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            {enrollmentsLoading ? (
                                <div className="flex items-center justify-center py-12"><ArrowPathIcon className="w-5 h-5 animate-spin text-zinc-400" /><span className="ml-2 text-sm text-zinc-400">Loading enrollments...</span></div>
                            ) : enrollments.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                    <UsersIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-500 text-sm">{isEnabled ? 'Click "Enroll recipients" to add contacts.' : "Enable the campaign to start enrolling recipients."}</p>
                                </div>
                            ) : (
                                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                                <th className="text-center px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Step</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {enrollments.map((e) => {
                                                const c = e.contact;
                                                const cName = c ? (c.firstName || c.lastName ? `${c.firstName || ""} ${c.lastName || ""}`.trim() : c.email) : "Unknown";
                                                return (
                                                    <tr key={e._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">{cName}</p>
                                                            <p className="text-xs text-zinc-400 truncate max-w-[200px]">{c?.email || ""}</p>
                                                        </td>
                                                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{e.status}</span></td>
                                                        <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">{e.currentStep + 1}/{steps.length || "–"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === "settings" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
                                <p className="text-sm text-zinc-500 mt-0.5">Configure delivery and behavior</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of this campaign..." rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm resize-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Settings Panel */}
                <div className="hidden lg:block w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 min-h-[calc(100vh-108px)] sticky top-[108px]">
                    <div className="p-5 space-y-6">
                        {/* Campaign Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <BoltIcon className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name || "Untitled Campaign"}</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">{description || "Configure your campaign steps, sending accounts, and delivery settings."}</p>
                        </div>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Sending Accounts */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Sending Accounts</h4>
                            {emailAccounts.length === 0 ? (
                                <p className="text-xs text-zinc-400">No email accounts connected.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {emailAccounts.map((acc) => (
                                        <label key={acc._id} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs",
                                            selectedAccounts.includes(acc._id) ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300")}
                                            onClick={() => setSelectedAccounts(prev => prev.includes(acc._id) ? prev.filter(id => id !== acc._id) : [...prev, acc._id])}>
                                            <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                                selectedAccounts.includes(acc._id) ? "bg-orange-500 border-orange-500" : "border-zinc-300 dark:border-zinc-600")}>
                                                {selectedAccounts.includes(acc._id) && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="text-zinc-700 dark:text-zinc-300 truncate">{acc.email}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Delivery */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Delivery</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Sending window</label>
                                    <div className="flex items-center gap-2">
                                        <input type="time" value={sendWindowStart} onChange={(e) => setSendWindowStart(e.target.value)}
                                            className="flex-1 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs" />
                                        <span className="text-xs text-zinc-400">–</span>
                                        <input type="time" value={sendWindowEnd} onChange={(e) => setSendWindowEnd(e.target.value)}
                                            className="flex-1 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs" />
                                        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                                            className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs">
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">ET</option>
                                            <option value="America/Chicago">CT</option>
                                            <option value="America/Los_Angeles">PT</option>
                                            <option value="Europe/London">GMT</option>
                                            <option value="Asia/Kolkata">IST</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Business days only</span>
                                    <button onClick={() => setBusinessDaysOnly(!businessDaysOnly)}
                                        className={cn("relative w-9 h-5 rounded-full transition-colors", businessDaysOnly ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600")}>
                                        <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", businessDaysOnly ? "left-[18px]" : "left-0.5")} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Daily limit</span>
                                    </div>
                                    <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(parseInt(e.target.value) || 50)}
                                        min={1} max={500} className="w-16 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs text-center" />
                                </div>
                            </div>
                        </div>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Email */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Email</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Thread emails</span>
                                    <button onClick={() => setThreadEmails(!threadEmails)}
                                        className={cn("relative w-9 h-5 rounded-full transition-colors", threadEmails ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600")}>
                                        <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", threadEmails ? "left-[18px]" : "left-0.5")} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Include sender signature</span>
                                    <button onClick={() => setSenderSignature(!senderSignature)}
                                        className={cn("relative w-9 h-5 rounded-full transition-colors", senderSignature ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600")}>
                                        <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", senderSignature ? "left-[18px]" : "left-0.5")} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Exit Criteria */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Exit criteria</h4>
                                <div className="relative">
                                    <button onClick={() => setExitCriteriaOpen(!exitCriteriaOpen)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                    {exitCriteriaOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[5]" onClick={() => setExitCriteriaOpen(false)} />
                                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 py-1">
                                                {[{ key: "meeting_booked", label: "Meeting booked" }, { key: "link_clicked", label: "Link clicked" }, { key: "email_opened", label: "Email opened" }]
                                                    .filter(c => !exitCriteria.includes(c.key)).map((criterion) => (
                                                        <button key={criterion.key} onClick={() => { setExitCriteria([...exitCriteria, criterion.key]); setExitCriteriaOpen(false); }}
                                                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                                            {criterion.label}
                                                        </button>
                                                    ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                    unenrollOnReply ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30" : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700")}
                                    onClick={() => setUnenrollOnReply(!unenrollOnReply)}>
                                    <ArrowPathIcon className={cn("w-4 h-4", unenrollOnReply ? "text-orange-500" : "text-zinc-400")} />
                                    <span className={cn("text-xs font-medium", unenrollOnReply ? "text-orange-700 dark:text-orange-400" : "text-zinc-500")}>Reply received</span>
                                </div>
                                {exitCriteria.filter(c => c !== "reply_received").map((criterion) => {
                                    const labels: Record<string, string> = { meeting_booked: "Meeting booked", link_clicked: "Link clicked", email_opened: "Email opened" };
                                    return (
                                        <div key={criterion} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-orange-500" />
                                                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">{labels[criterion] || criterion}</span>
                                            </div>
                                            <button onClick={() => setExitCriteria(exitCriteria.filter(c => c !== criterion))} className="text-orange-400 hover:text-red-500 transition-colors">
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
