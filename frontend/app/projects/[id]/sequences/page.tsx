"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
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
} from "@heroicons/react/24/outline";
import { SequenceIntelligencePanel } from "@/components/sequences/SequenceIntelligencePanel";

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

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: Sequence["status"] }) {
    const colors: Record<Sequence["status"], string> = {
        draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[status]}`}>
            {status}
        </span>
    );
}

// ============================================
// SEQUENCE CARD
// ============================================

function SequenceCard({
    sequence,
    onEdit,
    onActivate,
    onPause,
    onDelete,
}: {
    sequence: Sequence;
    onEdit: () => void;
    onActivate: () => void;
    onPause: () => void;
    onDelete: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-card border border-border rounded-xl p-5 hover:border-[#9ACD32]/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={onEdit}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <EnvelopeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {sequence.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {sequence.steps.length} email{sequence.steps.length !== 1 ? "s" : ""} in sequence
                        </p>
                    </div>
                </div>
                <StatusBadge status={sequence.status} />
            </div>

            {/* Description */}
            {sequence.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {sequence.description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <UserPlusIcon className="w-4 h-4" />
                    <span className="font-medium text-foreground">{sequence.stats.totalEnrolled}</span>
                    <span>enrolled</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{sequence.stats.currentlyActive}</span>
                    <span>active</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{sequence.stats.completed}</span>
                    <span>completed</span>
                </div>
            </div>

            {/* Timeline Preview */}
            {sequence.steps.length > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-hidden">
                    {sequence.steps.slice(0, 4).map((step, i) => (
                        <div key={step.id} className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                {i + 1}
                            </div>
                            {i < sequence.steps.length - 1 && i < 3 && (
                                <div className="flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-muted/50 rounded text-[10px] text-muted-foreground">
                                    <ClockIcon className="w-3 h-3" />
                                    {sequence.steps[i + 1]?.delay.value}
                                    {sequence.steps[i + 1]?.delay.unit[0]}
                                </div>
                            )}
                        </div>
                    ))}
                    {sequence.steps.length > 4 && (
                        <span className="text-xs text-muted-foreground">+{sequence.steps.length - 4} more</span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                {sequence.status === "active" ? (
                    <button
                        onClick={onPause}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                    >
                        <PauseIcon className="w-4 h-4" />
                        Pause
                    </button>
                ) : sequence.status !== "archived" ? (
                    <button
                        onClick={onActivate}
                        disabled={sequence.steps.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlayIcon className="w-4 h-4" />
                        Activate
                    </button>
                ) : null}
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
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
            // Load settings if available
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
                className="relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-card border border-border rounded-xl shadow-2xl mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="text-xl font-semibold text-foreground">
                        {sequence ? "Edit Sequence" : "Create Sequence"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Sequence Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Cold Outreach Sequence"
                            required
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this sequence"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Steps */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-foreground">
                                Email Steps
                            </label>
                            <button
                                type="button"
                                onClick={addStep}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-primary hover:bg-primary/10 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Step
                            </button>
                        </div>

                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div key={step.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-foreground">Email {index + 1}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeStep(index)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Delay (except first step) */}
                                    {index > 0 && (
                                        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-md">
                                            <ClockIcon className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">Wait</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={step.delay.value}
                                                onChange={(e) => updateStep(index, "delay.value", parseInt(e.target.value) || 1)}
                                                className="w-16 px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                                            />
                                            <select
                                                value={step.delay.unit}
                                                onChange={(e) => updateStep(index, "delay.unit", e.target.value)}
                                                className="px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                                            >
                                                <option value="hours">hours</option>
                                                <option value="days">days</option>
                                                <option value="weeks">weeks</option>
                                            </select>
                                            <span className="text-sm text-muted-foreground">then send</span>
                                        </div>
                                    )}

                                    {/* Subject */}
                                    <input
                                        type="text"
                                        value={step.subject}
                                        onChange={(e) => updateStep(index, "subject", e.target.value)}
                                        placeholder="Email subject..."
                                        className="w-full px-3 py-2 mb-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />

                                    {/* Body */}
                                    <textarea
                                        value={step.body}
                                        onChange={(e) => updateStep(index, "body", e.target.value)}
                                        placeholder="Email body..."
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    />
                                </div>
                            ))}

                            {steps.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No steps added yet. Click &quot;Add Step&quot; to create your first email.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Settings Section */}
                    <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-medium text-foreground mb-3">Sequence Settings</h4>

                        <div className="space-y-4">
                            {/* Unenroll on Reply */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={unenrollOnReply}
                                    onChange={(e) => setUnenrollOnReply(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm text-foreground">Stop sequence when contact replies</span>
                            </label>

                            {/* Send on Weekends */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendOnWeekends}
                                    onChange={(e) => setSendOnWeekends(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm text-foreground">Send emails on weekends</span>
                            </label>

                            {/* Send Window */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-foreground">Send window:</span>
                                <input
                                    type="time"
                                    value={sendWindowStart}
                                    onChange={(e) => setSendWindowStart(e.target.value)}
                                    className="px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                                />
                                <span className="text-sm text-muted-foreground">to</span>
                                <input
                                    type="time"
                                    value={sendWindowEnd}
                                    onChange={(e) => setSendWindowEnd(e.target.value)}
                                    className="px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                                />
                            </div>

                            {/* Timezone */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-foreground">Timezone:</span>
                                <select
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
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

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
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
                            className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50"
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
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center mb-6">
                <EnvelopeIcon className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No sequences yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                Create email sequences to automatically nurture leads over time. Set up a series of
                emails with delays between them.
            </p>
            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
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

    useEffect(() => {
        if (workspaceId) {
            fetchSequences();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const fetchSequences = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/sequences`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
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
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
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
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
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
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            fetchSequences();
        } catch (error) {
            console.error("Failed to delete sequence:", error);
        }
    };

    // Filter sequences
    const filteredSequences = sequences.filter((s) => {
        const matchesSearch =
            searchQuery === "" ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-card/95">
            {/* Modal */}
            <SequenceModal
                isOpen={isModalOpen}
                sequence={editingSequence}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <h1 className="text-lg font-semibold text-foreground">Email Sequences</h1>
                    <p className="text-xs text-muted-foreground">
                        Multi-step email campaigns
                    </p>
                </motion.div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Sequence
                </button>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search sequences..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-[#9ACD32] transition-all"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as Sequence["status"] | "all")}
                        className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-[#9ACD32] transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-64 rounded-xl bg-card border border-border animate-pulse"
                            />
                        ))}
                    </div>
                ) : filteredSequences.length === 0 ? (
                    sequences.length === 0 ? (
                        <EmptyState onCreateNew={handleCreate} />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No sequences match your search.</p>
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Sequences Grid */}
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredSequences.map((sequence) => (
                                <div
                                    key={sequence._id}
                                    onClick={() => setSelectedSequence(sequence)}
                                    className={`cursor-pointer rounded-lg transition-all ${selectedSequence?._id === sequence._id ? 'ring-2 ring-primary' : ''}`}
                                >
                                    <SequenceCard
                                        sequence={sequence}
                                        onEdit={() => handleEdit(sequence)}
                                        onActivate={() => handleActivate(sequence)}
                                        onPause={() => handlePause(sequence)}
                                        onDelete={() => handleDelete(sequence)}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* AI Intelligence Panel */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-20 bg-card border border-border rounded-xl p-4">
                                <SequenceIntelligencePanel
                                    workspaceId={workspaceId}
                                    sequenceId={selectedSequence?._id}
                                    sequences={sequences}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
