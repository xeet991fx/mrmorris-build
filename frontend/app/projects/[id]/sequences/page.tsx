"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    EnvelopeIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    UserPlusIcon,
    ClockIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    UsersIcon,
    PencilSquareIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
    ChevronRightIcon,
    Cog6ToothIcon,
    BoltIcon,
    ArrowLeftIcon,
    DocumentDuplicateIcon,
    CodeBracketIcon,
    ChevronDownIcon,
    EnvelopeOpenIcon,
    CursorArrowRaysIcon,
    HandRaisedIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Sequence,
    SequenceStep,
    SequenceSettings,
    getSequences,
    getSequence,
    createSequence,
    updateSequence,
    deleteSequence,
    activateSequence,
    pauseSequence,
    bulkEnrollInSequence,
    getSequenceEnrollments,
} from "@/lib/api/sequence";
import { getEmailTemplates, EmailTemplate } from "@/lib/api/emailTemplate";
import { axiosInstance } from "@/lib/axios";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ============================================
// TYPES
// ============================================

interface Contact {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    company?: string;
}

interface Enrollment {
    _id: string;
    contactId: {
        _id: string;
        firstName?: string;
        lastName?: string;
        email: string;
        company?: string;
    };
    currentStepIndex: number;
    status: 'active' | 'completed' | 'unenrolled' | 'replied' | 'bounced';
    enrolledAt: string;
    nextEmailAt?: string;
    lastEmailAt?: string;
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
}

// ============================================
// PERSONALIZATION TOOLBAR
// ============================================

const PERSONALIZATION_VARS = [
    { label: "First Name", value: "{{firstName}}" },
    { label: "Last Name", value: "{{lastName}}" },
    { label: "Email", value: "{{email}}" },
    { label: "Company", value: "{{company}}" },
    { label: "Job Title", value: "{{jobTitle}}" },
    { label: "Phone", value: "{{phone}}" },
    { label: "City", value: "{{city}}" },
    { label: "Sender Name", value: "{{senderName}}" },
];

function PersonalizationToolbar({
    onInsert,
    textareaRef,
}: {
    onInsert: (variable: string) => void;
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleInsert = (variable: string) => {
        onInsert(variable);
        setOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    open
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                )}
            >
                <CodeBracketIcon className="w-3.5 h-3.5" />
                Personalize
                <ChevronDownIcon className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Contact variables
                        </div>
                        {PERSONALIZATION_VARS.map((v) => (
                            <button
                                key={v.value}
                                onClick={() => handleInsert(v.value)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <span className="text-zinc-700 dark:text-zinc-300">{v.label}</span>
                                <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-mono">{v.value}</code>
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

function TemplatePicker({
    workspaceId,
    onSelect,
}: {
    workspaceId: string;
    onSelect: (template: EmailTemplate) => void;
}) {
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const loadTemplates = async () => {
        if (templates.length > 0) return;
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

    const filtered = templates.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.subject.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={handleOpen}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    open
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                )}
            >
                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                Template
                <ChevronDownIcon className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 overflow-hidden"
                    >
                        <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1">
                            {loading ? (
                                <div className="py-6 text-center text-xs text-zinc-400">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto mb-1" />
                                    Loading...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="py-6 text-center text-xs text-zinc-400">
                                    {templates.length === 0 ? "No templates found" : "No matching templates"}
                                </div>
                            ) : (
                                filtered.map((t) => (
                                    <button
                                        key={t._id}
                                        onClick={() => { onSelect(t); setOpen(false); }}
                                        className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.name}</p>
                                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{t.subject}</p>
                                    </button>
                                ))
                            )}
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
        archived: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", label: "Archived" },
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

function EnrollModal({
    isOpen,
    sequence,
    workspaceId,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    sequence: Sequence | null;
    workspaceId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);

    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, { params: { limit: 100 } });
            if (res.data.success) {
                setContacts(res.data.data?.contacts || []);
            }
        } catch {
            toast.error("Failed to load contacts");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
            setSelectedIds(new Set());
            setSearchQuery("");
        }
    }, [isOpen, fetchContacts]);

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredContacts.map((c) => c._id)));
    };

    const handleEnroll = async () => {
        if (!sequence || selectedIds.size === 0) return;
        setIsEnrolling(true);
        try {
            const res = await bulkEnrollInSequence(workspaceId, sequence._id, Array.from(selectedIds));
            if (res.success) {
                toast.success(`${res.data.enrolled} contact${res.data.enrolled !== 1 ? "s" : ""} enrolled`);
                onSuccess();
                onClose();
            }
        } catch {
            toast.error("Failed to enroll contacts");
        } finally {
            setIsEnrolling(false);
        }
    };

    const filteredContacts = contacts.filter((c) => {
        const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const email = c.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    if (!isOpen || !sequence) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl mx-4"
            >
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Enroll Recipients</h2>
                        <p className="text-sm text-zinc-500">Add contacts to &quot;{sequence.name}&quot;</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-zinc-400">Loading contacts...</div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400">No contacts found</div>
                    ) : (
                        <div>
                            <div
                                className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                onClick={handleSelectAll}
                            >
                                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                    selectedIds.size === filteredContacts.length ? "bg-orange-500 border-orange-500" : "border-zinc-300 dark:border-zinc-600"
                                )}>
                                    {selectedIds.size === filteredContacts.length && <CheckCircleSolid className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    Select all ({filteredContacts.length})
                                </span>
                            </div>

                            {filteredContacts.map((contact) => (
                                <div
                                    key={contact._id}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                    onClick={() => handleToggle(contact._id)}
                                >
                                    <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                                        selectedIds.has(contact._id) ? "bg-orange-500 border-orange-500" : "border-zinc-300 dark:border-zinc-600"
                                    )}>
                                        {selectedIds.has(contact._id) && <CheckCircleSolid className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {contact.firstName || contact.lastName
                                                ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                                : contact.email}
                                        </p>
                                        <p className="text-xs text-zinc-400 truncate">{contact.email}</p>
                                    </div>
                                    {contact.company && (
                                        <span className="text-xs text-zinc-400">{contact.company}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                    <span className="text-sm text-zinc-500">{selectedIds.size} selected</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleEnroll}
                            disabled={selectedIds.size === 0 || isEnrolling}
                            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50"
                        >
                            {isEnrolling ? "Enrolling..." : `Enroll ${selectedIds.size} recipient${selectedIds.size !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// SEQUENCE EDITOR (Attio-style full page)
// ============================================

function SequenceEditor({
    sequence,
    workspaceId,
    onBack,
    onRefresh,
}: {
    sequence: Sequence;
    workspaceId: string;
    onBack: () => void;
    onRefresh: () => void;
}) {
    const [activeTab, setActiveTab] = useState<"editor" | "recipients" | "settings">("editor");
    const [name, setName] = useState(sequence.name);
    const [description, setDescription] = useState(sequence.description || "");
    const [steps, setSteps] = useState<SequenceStep[]>(sequence.steps || []);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnabled, setIsEnabled] = useState(sequence.status === "active");
    const [enrollModalOpen, setEnrollModalOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
    const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");

    // Settings (backend stores these at root level, not nested under settings)
    const [unenrollOnReply, setUnenrollOnReply] = useState((sequence as any).unenrollOnReply ?? sequence.settings?.unenrollOnReply ?? true);
    const [sendOnWeekends, setSendOnWeekends] = useState((sequence as any).sendOnWeekends ?? sequence.settings?.sendOnWeekends ?? false);
    const [sendWindowStart, setSendWindowStart] = useState((sequence as any).sendWindowStart || sequence.settings?.sendWindowStart || "09:00");
    const [sendWindowEnd, setSendWindowEnd] = useState((sequence as any).sendWindowEnd || sequence.settings?.sendWindowEnd || "17:00");
    const [timezone, setTimezone] = useState((sequence as any).timezone || sequence.settings?.timezone || "UTC");
    const [threadEmails, setThreadEmails] = useState(true);
    const [senderSignature, setSenderSignature] = useState(true);
    const [exitCriteria, setExitCriteria] = useState<string[]>(
        unenrollOnReply ? ["reply_received"] : []
    );
    const [exitCriteriaOpen, setExitCriteriaOpen] = useState(false);

    useEffect(() => {
        setHasChanges(true);
    }, [name, description, steps, unenrollOnReply, sendOnWeekends, sendWindowStart, sendWindowEnd, timezone]);

    // Fetch enrollments when Recipients tab is active
    const fetchEnrollments = useCallback(async () => {
        setEnrollmentsLoading(true);
        try {
            const res = await getSequenceEnrollments(
                workspaceId,
                sequence._id,
                enrollmentFilter === "all" ? undefined : enrollmentFilter
            );
            setEnrollments(res.data?.enrollments || []);
        } catch {
            toast.error("Failed to load enrollments");
        } finally {
            setEnrollmentsLoading(false);
        }
    }, [workspaceId, sequence._id, enrollmentFilter]);

    useEffect(() => {
        if (activeTab === "recipients") fetchEnrollments();
    }, [activeTab, fetchEnrollments]);

    const addStep = () => {
        setSteps([
            ...steps,
            {
                id: `step-${Date.now()}`,
                type: "email",
                subject: "",
                body: "",
                delayDays: 1,
                delayHours: 0,
            } as any,
        ]);
    };

    const updateStep = (index: number, updates: Partial<SequenceStep>) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setSteps(newSteps);
    };

    const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));

    // Convert frontend step format (delayDays/delayHours) to backend format (delay: {value, unit})
    const convertStepsForBackend = (frontendSteps: SequenceStep[]) => {
        return frontendSteps.map((step: any) => {
            const delayDays = step.delayDays || 0;
            const delayHours = step.delayHours || 0;
            // If step already has delay object, use it; otherwise convert from delayDays/delayHours
            const delay = step.delay && step.delay.value !== undefined
                ? step.delay
                : delayDays > 0
                    ? { value: delayDays, unit: 'days' as const }
                    : { value: delayHours || 1, unit: 'hours' as const };
            return {
                id: step.id,
                type: step.type || 'email',
                subject: step.subject || '',
                body: step.body || '',
                delay,
            };
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Sequence name is required");
            return;
        }
        setIsSaving(true);
        try {
            // Send settings at root level (backend model stores them at root, not nested)
            const payload: any = {
                name,
                description,
                steps: convertStepsForBackend(steps),
                unenrollOnReply,
                sendOnWeekends,
                sendWindowStart,
                sendWindowEnd,
                timezone,
            };
            await updateSequence(workspaceId, sequence._id, payload);
            toast.success("Sequence saved");
            setHasChanges(false);
            onRefresh();
        } catch {
            toast.error("Failed to save sequence");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleEnabled = async () => {
        try {
            if (isEnabled) {
                await pauseSequence(workspaceId, sequence._id);
                setIsEnabled(false);
                toast.success("Sequence paused");
            } else {
                if (steps.length === 0) {
                    toast.error("Add at least one step before activating");
                    return;
                }
                await activateSequence(workspaceId, sequence._id);
                setIsEnabled(true);
                toast.success("Sequence activated");
            }
            onRefresh();
        } catch {
            toast.error("Failed to update sequence status");
        }
    };

    const tabs = [
        { id: "editor" as const, label: "Editor", count: steps.length },
        { id: "recipients" as const, label: "Recipients", count: sequence.stats?.totalEnrolled || sequence.enrollmentCount || 0 },
        { id: "settings" as const, label: "Settings" },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Enroll Modal */}
            <EnrollModal
                isOpen={enrollModalOpen}
                sequence={sequence}
                workspaceId={workspaceId}
                onClose={() => setEnrollModalOpen(false)}
                onSuccess={() => { onRefresh(); }}
            />

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                        </button>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-sm text-zinc-500">Sequences</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 min-w-[120px]"
                            placeholder="Sequence name..."
                        />
                        <StatusBadge status={isEnabled ? "active" : sequence.status} />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Enable Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-zinc-500 font-medium">Enable sequence</span>
                            <button
                                onClick={handleToggleEnabled}
                                className={cn(
                                    "relative w-10 h-5 rounded-full transition-colors",
                                    isEnabled ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"
                                )}
                            >
                                <span className={cn(
                                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                    isEnabled ? "left-5.5 translate-x-0.5" : "left-0.5"
                                )} />
                            </button>
                        </label>

                        {/* Enroll Recipients */}
                        <button
                            onClick={() => setEnrollModalOpen(true)}
                            disabled={!isEnabled}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <UserPlusIcon className="w-4 h-4" />
                            Enroll recipients
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-0 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                activeTab === tab.id
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                                    activeTab === tab.id
                                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex">
                {/* Editor Content */}
                <div className="flex-1 max-w-3xl mx-auto py-8 px-6">
                    {activeTab === "editor" && (
                        <div>
                            {/* Trigger Info */}
                            <div className="flex items-center gap-2 mb-8 text-sm text-zinc-500">
                                <BoltIcon className="w-4 h-4" />
                                <span>Start <strong className="text-zinc-900 dark:text-zinc-100">immediately</strong> after enrollment</span>
                            </div>

                            {/* Steps */}
                            <div className="space-y-0">
                                {steps.map((step, index) => (
                                    <div key={step.id}>
                                        {/* Delay indicator between steps */}
                                        {index > 0 && (
                                            <div className="flex items-center gap-3 py-4 pl-6">
                                                <div className="w-0.5 h-4 bg-zinc-200 dark:bg-zinc-700 ml-3.5" />
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    Wait
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={step.delayDays || 0}
                                                        onChange={(e) => updateStep(index, { delayDays: parseInt(e.target.value) || 0 })}
                                                        className="w-10 text-center bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-xs"
                                                    />
                                                    <span>day{(step.delayDays || 0) !== 1 ? "s" : ""}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="23"
                                                        value={step.delayHours || 0}
                                                        onChange={(e) => updateStep(index, { delayHours: parseInt(e.target.value) || 0 })}
                                                        className="w-10 text-center bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-xs"
                                                    />
                                                    <span>hr{(step.delayHours || 0) !== 1 ? "s" : ""}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step Card */}
                                        <div className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm relative">
                                            {/* Step Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                        <EnvelopeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                            Step {index + 1}
                                                        </span>
                                                        <span className="ml-2 text-xs text-zinc-400">Automated email</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeStep(index)}
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Subject */}
                                            <div className="mb-3">
                                                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Subject</label>
                                                <input
                                                    type="text"
                                                    value={step.subject || ""}
                                                    onChange={(e) => updateStep(index, { subject: e.target.value })}
                                                    placeholder="Subject"
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                                                />
                                            </div>

                                            {/* Body */}
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Content</label>
                                                <textarea
                                                    value={step.body || ""}
                                                    onChange={(e) => updateStep(index, { body: e.target.value })}
                                                    placeholder="Write your email content here. Use personalization variables like {{firstName}} for dynamic content."
                                                    rows={4}
                                                    className="w-full px-3 py-2 rounded-t-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm resize-none"
                                                />
                                                {/* Toolbar */}
                                                <div className="flex items-center gap-1 px-2 py-1.5 border border-t-0 border-zinc-200 dark:border-zinc-700 rounded-b-lg bg-zinc-50 dark:bg-zinc-800/30">
                                                    <PersonalizationToolbar
                                                        onInsert={(variable) => {
                                                            updateStep(index, { body: (step.body || "") + variable });
                                                        }}
                                                    />
                                                    <TemplatePicker
                                                        workspaceId={workspaceId}
                                                        onSelect={(template) => {
                                                            updateStep(index, {
                                                                subject: template.subject,
                                                                body: template.body,
                                                            });
                                                            toast.success(`Applied template "${template.name}"`);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Connector line + Add Step button */}
                                <div className="flex flex-col items-center pt-4">
                                    {steps.length > 0 && (
                                        <div className="w-0.5 h-6 bg-zinc-200 dark:bg-zinc-700 mb-2" />
                                    )}
                                    <button
                                        onClick={addStep}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 hover:text-orange-600 hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add step to sequence
                                    </button>
                                </div>

                                {steps.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                            <EnvelopeIcon className="w-8 h-8 text-zinc-400" />
                                        </div>
                                        <p className="text-zinc-500 mb-4">No steps yet. Start building your email sequence.</p>
                                        <button
                                            onClick={addStep}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Add first step
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            {hasChanges && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
                                >
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>Save changes</>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {activeTab === "recipients" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recipients</h2>
                                    <p className="text-sm text-zinc-500 mt-0.5">
                                        Contacts enrolled in this sequence
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEnrollModalOpen(true)}
                                    disabled={!isEnabled}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50"
                                >
                                    <UserPlusIcon className="w-4 h-4" />
                                    Enroll recipients
                                </button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: "Total Enrolled", value: sequence.stats?.totalEnrolled || sequence.enrollmentCount || 0, color: "text-blue-600" },
                                    { label: "Currently Active", value: sequence.stats?.currentlyActive || 0, color: "text-amber-600" },
                                    { label: "Completed", value: sequence.stats?.completed || sequence.completedCount || 0, color: "text-emerald-600" },
                                    { label: "Replied", value: sequence.stats?.replied || 0, color: "text-purple-600" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
                                        <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Enrollment Filter Tabs */}
                            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-fit">
                                {["all", "active", "completed", "replied", "bounced", "unenrolled"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setEnrollmentFilter(f)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors",
                                            enrollmentFilter === f
                                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            {/* Enrollment List */}
                            {enrollmentsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <ArrowPathIcon className="w-5 h-5 animate-spin text-zinc-400" />
                                    <span className="ml-2 text-sm text-zinc-400">Loading enrollments...</span>
                                </div>
                            ) : enrollments.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                    <UsersIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-500 text-sm">
                                        {isEnabled
                                            ? 'Click "Enroll recipients" to add contacts to this sequence.'
                                            : "Enable the sequence to start enrolling recipients."}
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                                <th className="text-center px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Step</th>
                                                <th className="text-center px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sent</th>
                                                <th className="text-center px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Opened</th>
                                                <th className="text-center px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Clicked</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {enrollments.map((enrollment) => {
                                                const contact = enrollment.contactId;
                                                const contactName = contact.firstName || contact.lastName
                                                    ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                                    : contact.email;
                                                const statusColors: Record<string, string> = {
                                                    active: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                                    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                    replied: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                                                    bounced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                    unenrolled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                                                };
                                                return (
                                                    <tr key={enrollment._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">{contactName}</p>
                                                                <p className="text-xs text-zinc-400 truncate max-w-[200px]">{contact.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize", statusColors[enrollment.status] || statusColors.active)}>
                                                                {enrollment.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                                                            {enrollment.currentStepIndex + 1}/{steps.length || "–"}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">{enrollment.emailsSent}</td>
                                                        <td className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">{enrollment.emailsOpened}</td>
                                                        <td className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">{enrollment.emailsClicked}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
                                <p className="text-sm text-zinc-500 mt-0.5">Configure delivery and behavior</p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of this sequence..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Settings Panel (always visible on desktop) */}
                <div className="hidden lg:block w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 min-h-[calc(100vh-108px)] sticky top-[108px]">
                    <div className="p-5 space-y-6">
                        {/* Sequence Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <BoltIcon className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name || "Untitled Sequence"}</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                {description || "Send an initial email, avoiding weekends and holidays, with automatic replies enabled for better deliverability."}
                            </p>
                        </div>

                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Delivery */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Delivery</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Sending window</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={sendWindowStart}
                                            onChange={(e) => setSendWindowStart(e.target.value)}
                                            className="flex-1 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                                        />
                                        <span className="text-xs text-zinc-400">–</span>
                                        <input
                                            type="time"
                                            value={sendWindowEnd}
                                            onChange={(e) => setSendWindowEnd(e.target.value)}
                                            className="flex-1 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                                        />
                                        <select
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                            className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
                                        >
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">ET</option>
                                            <option value="America/Chicago">CT</option>
                                            <option value="America/Denver">MT</option>
                                            <option value="America/Los_Angeles">PT</option>
                                            <option value="Europe/London">GMT</option>
                                            <option value="Europe/Paris">CET</option>
                                            <option value="Asia/Tokyo">JST</option>
                                            <option value="Asia/Kolkata">IST</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Business days only</span>
                                    <button
                                        onClick={() => setSendOnWeekends(!sendOnWeekends)}
                                        className={cn(
                                            "relative w-9 h-5 rounded-full transition-colors",
                                            !sendOnWeekends ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                            !sendOnWeekends ? "left-[18px]" : "left-0.5"
                                        )} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Email Settings */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Email</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Thread emails</span>
                                    <button
                                        onClick={() => setThreadEmails(!threadEmails)}
                                        className={cn(
                                            "relative w-9 h-5 rounded-full transition-colors",
                                            threadEmails ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                            threadEmails ? "left-[18px]" : "left-0.5"
                                        )} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Include sender signature</span>
                                    <button
                                        onClick={() => setSenderSignature(!senderSignature)}
                                        className={cn(
                                            "relative w-9 h-5 rounded-full transition-colors",
                                            senderSignature ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                            senderSignature ? "left-[18px]" : "left-0.5"
                                        )} />
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
                                    <button
                                        onClick={() => setExitCriteriaOpen(!exitCriteriaOpen)}
                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                    {exitCriteriaOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[5]" onClick={() => setExitCriteriaOpen(false)} />
                                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 py-1">
                                                {[
                                                    { key: "meeting_booked", label: "Meeting booked" },
                                                    { key: "link_clicked", label: "Link clicked" },
                                                    { key: "email_opened", label: "Email opened" },
                                                ].filter(c => !exitCriteria.includes(c.key)).map((criterion) => (
                                                    <button
                                                        key={criterion.key}
                                                        onClick={() => {
                                                            setExitCriteria([...exitCriteria, criterion.key]);
                                                            setExitCriteriaOpen(false);
                                                        }}
                                                        className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                                    >
                                                        {criterion.label}
                                                    </button>
                                                ))}
                                                {["meeting_booked", "link_clicked", "email_opened"].every(k => exitCriteria.includes(k)) && (
                                                    <p className="px-3 py-1.5 text-xs text-zinc-400">All criteria added</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                        unenrollOnReply
                                            ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30"
                                            : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                                    )}
                                    onClick={() => setUnenrollOnReply(!unenrollOnReply)}
                                >
                                    <ArrowPathIcon className={cn("w-4 h-4", unenrollOnReply ? "text-orange-500" : "text-zinc-400")} />
                                    <span className={cn("text-xs font-medium", unenrollOnReply ? "text-orange-700 dark:text-orange-400" : "text-zinc-500")}>
                                        Reply received
                                    </span>
                                </div>
                                {exitCriteria.filter(c => c !== "reply_received").map((criterion) => {
                                    const labels: Record<string, string> = {
                                        meeting_booked: "Meeting booked",
                                        link_clicked: "Link clicked",
                                        email_opened: "Email opened",
                                    };
                                    return (
                                        <div
                                            key={criterion}
                                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-orange-500" />
                                                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                                    {labels[criterion] || criterion}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setExitCriteria(exitCriteria.filter(c => c !== criterion))}
                                                className="text-orange-400 hover:text-red-500 transition-colors"
                                            >
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

// ============================================
// STATUS INDICATOR COLORS
// ============================================

const SEQ_STATUS_COLORS: Record<string, string> = {
    draft: "bg-zinc-400",
    active: "bg-emerald-500",
    paused: "bg-amber-500",
};

// ============================================
// SEQUENCE LIST ROW
// ============================================

function SequenceRow({
    sequence,
    onEdit,
    onActivate,
    onPause,
    onDelete,
    onClone,
}: {
    sequence: Sequence;
    onEdit: () => void;
    onActivate: () => void;
    onPause: () => void;
    onDelete: () => void;
    onClone: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer"
            onClick={onEdit}
        >
            {/* Status indicator */}
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", SEQ_STATUS_COLORS[sequence.status] || "bg-zinc-400")} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {sequence.name}
                    </p>
                    <span className="text-xs text-zinc-400 capitalize">{sequence.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {sequence.steps.length} step{sequence.steps.length !== 1 ? "s" : ""}
                        {sequence.description && ` · ${sequence.description}`}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-xs text-zinc-500">
                <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{sequence.stats?.totalEnrolled || sequence.enrollmentCount || 0}</p>
                    <p>enrolled</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-emerald-500">{sequence.stats?.completed || sequence.completedCount || 0}</p>
                    <p>completed</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-purple-500">{sequence.stats?.replied || 0}</p>
                    <p>replied</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {sequence.status === "active" ? (
                    <button
                        onClick={onPause}
                        className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="Pause"
                    >
                        <PauseIcon className="w-4 h-4" />
                    </button>
                ) : sequence.status === "draft" || sequence.status === "paused" ? (
                    <button
                        onClick={onActivate}
                        disabled={sequence.steps.length === 0}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Activate"
                    >
                        <PlayIcon className="w-4 h-4" />
                    </button>
                ) : null}
                <button
                    onClick={onClone}
                    className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Clone"
                >
                    <DocumentDuplicateIcon className="w-4 h-4" />
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

// ============================================
// MAIN PAGE
// ============================================

export default function SequencesPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Sequence | null>(null);

    const fetchSequences = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSequences(workspaceId);
            if (res.success) {
                setSequences(res.data?.sequences || []);
            }
        } catch {
            toast.error("Failed to load sequences");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (workspaceId) fetchSequences();
    }, [workspaceId, fetchSequences]);

    const handleCreate = async () => {
        try {
            const res = await createSequence(workspaceId, {
                name: "New Sequence",
                steps: [],
            });
            if (res.success && res.data?.sequence) {
                toast.success("Sequence created");
                setEditingSequence(res.data.sequence);
                fetchSequences();
            }
        } catch {
            toast.error("Failed to create sequence");
        }
    };

    const handleActivate = async (sequence: Sequence) => {
        try {
            await activateSequence(workspaceId, sequence._id);
            toast.success("Sequence activated");
            fetchSequences();
        } catch {
            toast.error("Failed to activate sequence");
        }
    };

    const handlePause = async (sequence: Sequence) => {
        try {
            await pauseSequence(workspaceId, sequence._id);
            toast.success("Sequence paused");
            fetchSequences();
        } catch {
            toast.error("Failed to pause sequence");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteSequence(workspaceId, deleteTarget._id);
            toast.success("Sequence deleted");
            if (editingSequence?._id === deleteTarget._id) {
                setEditingSequence(null);
            }
            setDeleteTarget(null);
            fetchSequences();
        } catch {
            toast.error("Failed to delete sequence");
        }
    };

    const handleEdit = async (sequence: Sequence) => {
        try {
            const res = await getSequence(workspaceId, sequence._id);
            if (res.success && res.data?.sequence) {
                setEditingSequence(res.data.sequence);
            }
        } catch {
            toast.error("Failed to load sequence");
        }
    };

    const handleClone = async (sequence: Sequence) => {
        try {
            const res = await createSequence(workspaceId, {
                name: `${sequence.name} (copy)`,
                description: sequence.description,
                steps: sequence.steps,
                settings: sequence.settings,
            });
            if (res.success) {
                toast.success(`Duplicated "${sequence.name}"`);
                fetchSequences();
            }
        } catch {
            toast.error("Failed to duplicate sequence");
        }
    };

    const filteredSequences = sequences.filter((s) => {
        const matchesSearch =
            searchQuery === "" ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // If editing a sequence, show the full-page editor (Attio style)
    if (editingSequence) {
        return (
            <SequenceEditor
                sequence={editingSequence}
                workspaceId={workspaceId}
                onBack={() => {
                    setEditingSequence(null);
                    fetchSequences();
                }}
                onRefresh={fetchSequences}
            />
        );
    }

    // Stats
    const activeCount = sequences.filter(s => s.status === "active").length;
    const draftCount = sequences.filter(s => s.status === "draft").length;
    const pausedCount = sequences.filter(s => s.status === "paused").length;

    // Sequence List Page
    return (
        <div className="h-full overflow-y-auto">
            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Sequence"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This will unenroll all contacts and cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
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
                            Sequences
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Automate multi-step email outreach
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">New Sequence</span>
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{sequences.length}</span>
                        <span className="text-sm text-zinc-500">total</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-500">{activeCount}</span>
                        <span className="text-sm text-zinc-500">active</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span className="text-2xl font-bold text-zinc-500">{draftCount}</span>
                        <span className="text-sm text-zinc-500">draft</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
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
                            placeholder="Search sequences..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {(["all", "active", "draft", "paused"] as const).map((status) => (
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

            {/* Sequence List */}
            <div className="px-8 pb-8">
                {isLoading ? (
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredSequences.length === 0 ? (
                    sequences.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <BoltIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No sequences yet</h3>
                            <p className="text-sm text-zinc-500 mb-6">Create your first sequence to automate email outreach</p>
                            <button
                                onClick={handleCreate}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Sequence
                            </button>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            No sequences match your search.
                        </div>
                    )
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredSequences.map((sequence) => (
                            <SequenceRow
                                key={sequence._id}
                                sequence={sequence}
                                onEdit={() => handleEdit(sequence)}
                                onActivate={() => handleActivate(sequence)}
                                onPause={() => handlePause(sequence)}
                                onDelete={() => setDeleteTarget(sequence)}
                                onClone={() => handleClone(sequence)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
