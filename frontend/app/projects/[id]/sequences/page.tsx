"use client";

import { useEffect, useState } from "react";
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
    ChartBarIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    UsersIcon,
    PencilSquareIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

// ============================================
// TYPES
// ============================================

interface SequenceStep {
    id: string;
    order: number;
    subject: string;
    body: string;
    delay: {
        value: number;
        unit: "hours" | "days" | "weeks";
    };
}

interface SequenceSettings {
    unenrollOnReply: boolean;
    sendOnWeekends: boolean;
    sendWindowStart: string;
    sendWindowEnd: string;
    timezone: string;
    fromAccountId?: string;
}

interface Sequence {
    _id: string;
    name: string;
    description?: string;
    status: "draft" | "active" | "paused" | "archived";
    steps: SequenceStep[];
    settings?: SequenceSettings;
    stats: {
        totalEnrolled: number;
        currentlyActive: number;
        completed: number;
        replied: number;
    };
    createdAt: string;
}

interface Contact {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    company?: string;
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: Sequence["status"] }) {
    const config: Record<Sequence["status"], { bg: string; text: string; dot: string }> = {
        draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-400" },
        active: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
        paused: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
        archived: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
    };

    const { bg, text, dot } = config[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

// ============================================
// STATS CARDS
// ============================================

function StatsCards({ sequences }: { sequences: Sequence[] }) {
    const totalEnrolled = sequences.reduce((sum, s) => sum + s.stats.totalEnrolled, 0);
    const totalActive = sequences.reduce((sum, s) => sum + s.stats.currentlyActive, 0);
    const totalCompleted = sequences.reduce((sum, s) => sum + s.stats.completed, 0);
    const totalReplied = sequences.reduce((sum, s) => sum + s.stats.replied, 0);
    const activeSequences = sequences.filter((s) => s.status === "active").length;

    const stats = [
        { label: "Active Sequences", value: activeSequences, icon: PlayIcon, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
        { label: "Total Enrolled", value: totalEnrolled, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { label: "Currently Active", value: totalActive, icon: ArrowPathIcon, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
        { label: "Completed", value: totalCompleted, icon: CheckCircleIcon, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        { label: "Replied", value: totalReplied, icon: ChatBubbleLeftRightIcon, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// SEQUENCE TABLE ROW
// ============================================

function SequenceRow({
    sequence,
    isSelected,
    onSelect,
    onEdit,
    onActivate,
    onPause,
    onDelete,
    onEnroll,
}: {
    sequence: Sequence;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onActivate: () => void;
    onPause: () => void;
    onDelete: () => void;
    onEnroll: () => void;
}) {
    const totalDelay = sequence.steps.reduce((sum, step) => {
        const multiplier = step.delay.unit === "hours" ? 1 / 24 : step.delay.unit === "weeks" ? 7 : 1;
        return sum + step.delay.value * multiplier;
    }, 0);

    return (
        <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`group border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
            onClick={onSelect}
        >
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <EnvelopeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{sequence.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                            {sequence.steps.length} step{sequence.steps.length !== 1 ? "s" : ""} · ~{Math.round(totalDelay)} days
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <StatusBadge status={sequence.status} />
            </td>
            <td className="px-4 py-4 text-center">
                <span className="font-medium text-foreground">{sequence.stats.totalEnrolled}</span>
            </td>
            <td className="px-4 py-4 text-center">
                <span className="font-medium text-foreground">{sequence.stats.currentlyActive}</span>
            </td>
            <td className="px-4 py-4 text-center">
                <span className="font-medium text-green-600">{sequence.stats.completed}</span>
            </td>
            <td className="px-4 py-4 text-center">
                <span className="font-medium text-purple-600">{sequence.stats.replied}</span>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {sequence.status === "active" && (
                        <button
                            onClick={onEnroll}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Enroll contacts"
                        >
                            <UserPlusIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Edit"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    {sequence.status === "active" ? (
                        <button
                            onClick={onPause}
                            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Pause"
                        >
                            <PauseIcon className="w-4 h-4" />
                        </button>
                    ) : sequence.status !== "archived" ? (
                        <button
                            onClick={onActivate}
                            disabled={sequence.steps.length === 0}
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                            title="Activate"
                        >
                            <PlayIcon className="w-4 h-4" />
                        </button>
                    ) : null}
                    <button
                        onClick={onDelete}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
}

// ============================================
// SEQUENCE DETAIL PANEL
// ============================================

function SequenceDetailPanel({
    sequence,
    onClose,
    onEdit,
    onEnroll,
}: {
    sequence: Sequence;
    onClose: () => void;
    onEdit: () => void;
    onEnroll: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <EnvelopeIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground">{sequence.name}</h2>
                            <StatusBadge status={sequence.status} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
                {sequence.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{sequence.description}</p>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-4 border-b border-border">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{sequence.stats.totalEnrolled}</p>
                    <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{sequence.stats.currentlyActive}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{sequence.stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{sequence.stats.replied}</p>
                    <p className="text-xs text-muted-foreground">Replied</p>
                </div>
            </div>

            {/* Steps Timeline */}
            <div className="p-4 border-b border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">Sequence Steps</h3>
                <div className="space-y-3">
                    {sequence.steps.map((step, i) => (
                        <div key={step.id} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                    {i + 1}
                                </div>
                                {i < sequence.steps.length - 1 && (
                                    <div className="w-0.5 h-8 bg-border mt-1" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <p className="text-sm font-medium text-foreground truncate">{step.subject || "No subject"}</p>
                                {i > 0 && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <ClockIcon className="w-3 h-3" />
                                        Wait {step.delay.value} {step.delay.unit}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {sequence.steps.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No steps added yet</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex gap-2">
                <button
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                    <PencilSquareIcon className="w-4 h-4" />
                    Edit
                </button>
                {sequence.status === "active" && (
                    <button
                        onClick={onEnroll}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-colors"
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        Enroll
                    </button>
                )}
            </div>
        </motion.div>
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

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
            setSelectedIds(new Set());
            setSearchQuery("");
        }
    }, [isOpen]);

    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/contacts?limit=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setContacts(data.data?.contacts || []);
            }
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredContacts.map((c) => c._id)));
        }
    };

    const handleEnroll = async () => {
        if (!sequence || selectedIds.size === 0) return;

        setIsEnrolling(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences/${sequence._id}/enroll-bulk`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
                }
            );
            const data = await res.json();
            if (data.success) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error("Failed to enroll contacts:", error);
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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Enroll Contacts</h2>
                        <p className="text-sm text-muted-foreground">Add contacts to {sequence.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Contact List */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading contacts...</div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No contacts found</div>
                    ) : (
                        <div>
                            {/* Select All */}
                            <div
                                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 cursor-pointer"
                                onClick={handleSelectAll}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    selectedIds.size === filteredContacts.length ? "bg-primary border-primary" : "border-border"
                                }`}>
                                    {selectedIds.size === filteredContacts.length && (
                                        <CheckCircleSolid className="w-4 h-4 text-white" />
                                    )}
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    Select all ({filteredContacts.length})
                                </span>
                            </div>

                            {/* Contacts */}
                            {filteredContacts.map((contact) => (
                                <div
                                    key={contact._id}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
                                    onClick={() => handleToggle(contact._id)}
                                >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        selectedIds.has(contact._id) ? "bg-primary border-primary" : "border-border"
                                    }`}>
                                        {selectedIds.has(contact._id) && (
                                            <CheckCircleSolid className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {contact.firstName || contact.lastName
                                                ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                                : contact.email}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                                    </div>
                                    {contact.company && (
                                        <span className="text-xs text-muted-foreground">{contact.company}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleEnroll}
                            disabled={selectedIds.size === 0 || isEnrolling}
                            className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50"
                        >
                            {isEnrolling ? "Enrolling..." : `Enroll ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// CREATE/EDIT MODAL
// ============================================

function SequenceModal({
    isOpen,
    sequence,
    onClose,
    onSave,
}: {
    isOpen: boolean;
    sequence: Sequence | null;
    onClose: () => void;
    onSave: (data: any) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [steps, setSteps] = useState<SequenceStep[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"steps" | "settings">("steps");

    // Settings state
    const [unenrollOnReply, setUnenrollOnReply] = useState(true);
    const [sendOnWeekends, setSendOnWeekends] = useState(false);
    const [sendWindowStart, setSendWindowStart] = useState("09:00");
    const [sendWindowEnd, setSendWindowEnd] = useState("17:00");
    const [timezone, setTimezone] = useState("America/New_York");

    useEffect(() => {
        if (sequence) {
            setName(sequence.name);
            setDescription(sequence.description || "");
            setSteps(sequence.steps || []);
            if (sequence.settings) {
                setUnenrollOnReply(sequence.settings.unenrollOnReply ?? true);
                setSendOnWeekends(sequence.settings.sendOnWeekends ?? false);
                setSendWindowStart(sequence.settings.sendWindowStart || "09:00");
                setSendWindowEnd(sequence.settings.sendWindowEnd || "17:00");
                setTimezone(sequence.settings.timezone || "America/New_York");
            }
        } else {
            setName("");
            setDescription("");
            setSteps([]);
            setUnenrollOnReply(true);
            setSendOnWeekends(false);
            setSendWindowStart("09:00");
            setSendWindowEnd("17:00");
            setTimezone("America/New_York");
        }
        setActiveTab("steps");
    }, [sequence, isOpen]);

    const addStep = () => {
        setSteps([
            ...steps,
            {
                id: `step-${Date.now()}`,
                order: steps.length,
                subject: "",
                body: "",
                delay: { value: 1, unit: "days" },
            },
        ]);
    };

    const updateStep = (index: number, field: string, value: any) => {
        const newSteps = [...steps];
        if (field === "delay.value" || field === "delay.unit") {
            const [, key] = field.split(".");
            newSteps[index] = { ...newSteps[index], delay: { ...newSteps[index].delay, [key]: value } };
        } else {
            newSteps[index] = { ...newSteps[index], [field]: value };
        }
        setSteps(newSteps);
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({
            name,
            description,
            steps,
            settings: {
                unenrollOnReply,
                sendOnWeekends,
                sendWindowStart,
                sendWindowEnd,
                timezone,
            },
        });
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">
                        {sequence ? "Edit Sequence" : "Create Sequence"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-5">
                    <button
                        onClick={() => setActiveTab("steps")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "steps"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Steps
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "settings"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Settings
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
                    <div className="p-5 space-y-5">
                        {/* Name & Description - always visible */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Sequence Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Cold Outreach"
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                        </div>

                        {activeTab === "steps" && (
                            <>
                                {/* Steps Header */}
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">
                                        Email Steps ({steps.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addStep}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Step
                                    </button>
                                </div>

                                {/* Steps List */}
                                <div className="space-y-4">
                                    {steps.map((step, index) => (
                                        <div key={step.id} className="p-4 bg-muted/30 rounded-xl border border-border">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-medium text-foreground">Email {index + 1}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeStep(index)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {index > 0 && (
                                                <div className="flex items-center gap-2 mb-3 p-2.5 bg-muted/50 rounded-lg">
                                                    <ClockIcon className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">Wait</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={step.delay.value}
                                                        onChange={(e) => updateStep(index, "delay.value", parseInt(e.target.value) || 1)}
                                                        className="w-16 px-2 py-1 rounded-lg border border-border bg-card text-foreground text-sm"
                                                    />
                                                    <select
                                                        value={step.delay.unit}
                                                        onChange={(e) => updateStep(index, "delay.unit", e.target.value)}
                                                        className="px-2 py-1 rounded-lg border border-border bg-card text-foreground text-sm"
                                                    >
                                                        <option value="hours">hours</option>
                                                        <option value="days">days</option>
                                                        <option value="weeks">weeks</option>
                                                    </select>
                                                    <span className="text-sm text-muted-foreground">then send</span>
                                                </div>
                                            )}

                                            <input
                                                type="text"
                                                value={step.subject}
                                                onChange={(e) => updateStep(index, "subject", e.target.value)}
                                                placeholder="Email subject..."
                                                className="w-full px-3 py-2 mb-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <textarea
                                                value={step.body}
                                                onChange={(e) => updateStep(index, "body", e.target.value)}
                                                placeholder="Email body... Use {{firstName}}, {{lastName}}, {{company}} for personalization"
                                                rows={3}
                                                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                            />
                                        </div>
                                    ))}

                                    {steps.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                            <EnvelopeIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                                            <p>No steps yet. Click &quot;Add Step&quot; to create your first email.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-5">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={unenrollOnReply}
                                            onChange={(e) => setUnenrollOnReply(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-foreground">Stop on reply</span>
                                            <p className="text-xs text-muted-foreground">Automatically unenroll contacts when they reply</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={sendOnWeekends}
                                            onChange={(e) => setSendOnWeekends(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-foreground">Send on weekends</span>
                                            <p className="text-xs text-muted-foreground">Allow emails to be sent on Saturday and Sunday</p>
                                        </div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Send Window</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={sendWindowStart}
                                                onChange={(e) => setSendWindowStart(e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                                            />
                                            <span className="text-muted-foreground">to</span>
                                            <input
                                                type="time"
                                                value={sendWindowEnd}
                                                onChange={(e) => setSendWindowEnd(e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Timezone</label>
                                        <select
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                                        >
                                            <option value="America/New_York">Eastern Time (ET)</option>
                                            <option value="America/Chicago">Central Time (CT)</option>
                                            <option value="America/Denver">Mountain Time (MT)</option>
                                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                            <option value="Europe/London">London (GMT)</option>
                                            <option value="Europe/Paris">Paris (CET)</option>
                                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                                            <option value="Asia/Kolkata">India (IST)</option>
                                            <option value="Australia/Sydney">Sydney (AEST)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/30">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !name}
                            className="px-5 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : sequence ? "Update Sequence" : "Create Sequence"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                <EnvelopeIcon className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No sequences yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                Create automated email sequences to nurture leads over time. Set up a series of emails with delays between them.
            </p>
            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
            >
                <PlusIcon className="w-5 h-5" />
                Create Your First Sequence
            </button>
        </div>
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
    const [statusFilter, setStatusFilter] = useState<Sequence["status"] | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
    const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
    const [enrollSequence, setEnrollSequence] = useState<Sequence | null>(null);

    useEffect(() => {
        if (workspaceId) {
            fetchSequences();
        }
    }, [workspaceId]);

    const fetchSequences = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setSequences(data.data?.sequences || []);
            }
        } catch (error) {
            console.error("Failed to fetch sequences:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingSequence(null);
        setIsModalOpen(true);
    };

    const handleEdit = (sequence: Sequence) => {
        setEditingSequence(sequence);
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            const token = localStorage.getItem("token");
            const url = editingSequence
                ? `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences/${editingSequence._id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences`;

            await fetch(url, {
                method: editingSequence ? "PUT" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            setIsModalOpen(false);
            fetchSequences();
        } catch (error) {
            console.error("Failed to save sequence:", error);
        }
    };

    const handleActivate = async (sequence: Sequence) => {
        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences/${sequence._id}/activate`,
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            fetchSequences();
        } catch (error) {
            console.error("Failed to activate sequence:", error);
        }
    };

    const handlePause = async (sequence: Sequence) => {
        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences/${sequence._id}/pause`,
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            fetchSequences();
        } catch (error) {
            console.error("Failed to pause sequence:", error);
        }
    };

    const handleDelete = async (sequence: Sequence) => {
        if (!confirm("Are you sure you want to delete this sequence?")) return;

        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences/${sequence._id}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
            );
            if (selectedSequence?._id === sequence._id) {
                setSelectedSequence(null);
            }
            fetchSequences();
        } catch (error) {
            console.error("Failed to delete sequence:", error);
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

    return (
        <div className="min-h-screen bg-background">
            {/* Modals */}
            <SequenceModal
                isOpen={isModalOpen}
                sequence={editingSequence}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
            <EnrollModal
                isOpen={!!enrollSequence}
                sequence={enrollSequence}
                workspaceId={workspaceId}
                onClose={() => setEnrollSequence(null)}
                onSuccess={fetchSequences}
            />

            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Email Sequences</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Automate multi-step email campaigns
                            </p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all shadow-sm"
                        >
                            <PlusIcon className="w-5 h-5" />
                            New Sequence
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {isLoading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
                            ))}
                        </div>
                        <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
                    </div>
                ) : sequences.length === 0 ? (
                    <EmptyState onCreateNew={handleCreate} />
                ) : (
                    <>
                        {/* Stats */}
                        <StatsCards sequences={sequences} />

                        {/* Filters */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search sequences..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as Sequence["status"] | "all")}
                                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="all">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                            </select>
                        </div>

                        {/* Main Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Table */}
                            <div className="lg:col-span-2">
                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                <th className="px-4 py-3">Sequence</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3 text-center">Enrolled</th>
                                                <th className="px-4 py-3 text-center">Active</th>
                                                <th className="px-4 py-3 text-center">Completed</th>
                                                <th className="px-4 py-3 text-center">Replied</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSequences.map((sequence) => (
                                                <SequenceRow
                                                    key={sequence._id}
                                                    sequence={sequence}
                                                    isSelected={selectedSequence?._id === sequence._id}
                                                    onSelect={() => setSelectedSequence(sequence)}
                                                    onEdit={() => handleEdit(sequence)}
                                                    onActivate={() => handleActivate(sequence)}
                                                    onPause={() => handlePause(sequence)}
                                                    onDelete={() => handleDelete(sequence)}
                                                    onEnroll={() => setEnrollSequence(sequence)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredSequences.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No sequences match your search.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detail Panel */}
                            <div className="lg:col-span-1">
                                <AnimatePresence mode="wait">
                                    {selectedSequence ? (
                                        <SequenceDetailPanel
                                            key={selectedSequence._id}
                                            sequence={selectedSequence}
                                            onClose={() => setSelectedSequence(null)}
                                            onEdit={() => handleEdit(selectedSequence)}
                                            onEnroll={() => setEnrollSequence(selectedSequence)}
                                        />
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-card border border-border rounded-xl p-8 text-center"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                                <EyeIcon className="w-8 h-8 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-muted-foreground">
                                                Select a sequence to view details
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
