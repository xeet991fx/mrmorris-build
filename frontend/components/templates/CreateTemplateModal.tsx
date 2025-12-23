"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { XMarkIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

// ============================================
// TYPES
// ============================================

interface CreateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

const CATEGORIES = [
    { value: "welcome", label: "Welcome" },
    { value: "follow-up", label: "Follow-up" },
    { value: "nurture", label: "Nurture" },
    { value: "promotion", label: "Promotion" },
    { value: "announcement", label: "Announcement" },
    { value: "custom", label: "Custom" },
];

// ============================================
// COMPONENT
// ============================================

export default function CreateTemplateModal({
    isOpen,
    onClose,
    workspaceId,
}: CreateTemplateModalProps) {
    const router = useRouter();
    const [name, setName] = useState("Untitled Template");
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("custom");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name,
                        subject: subject || "Your subject here",
                        body: "",
                        category,
                        description,
                    }),
                }
            );

            const data = await res.json();
            if (data.success) {
                // Navigate to builder
                router.push(`/projects/${workspaceId}/email-templates/${data.data._id}/builder`);
            }
        } catch (error) {
            console.error("Failed to create template:", error);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl mx-4 z-10"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#9ACD32]/10 flex items-center justify-center">
                            <EnvelopeIcon className="w-5 h-5 text-[#9ACD32]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Create New Template</h2>
                            <p className="text-sm text-muted-foreground">
                                Set up your email template details
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    {/* Template Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Template Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Welcome Email"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 focus:border-[#9ACD32]"
                            autoFocus
                        />
                    </div>

                    {/* Email Subject */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Email Subject *
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g., Welcome {{firstName}}!"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 focus:border-[#9ACD32]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Use variables like {"{" + "{firstName}}"}, {"{" + "{company}}"}, etc.
                        </p>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 focus:border-[#9ACD32]"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of when to use this template"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 focus:border-[#9ACD32] resize-none"
                        />
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
                            disabled={isCreating || !name || !subject}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Creating...
                                </>
                            ) : (
                                "Create & Open Builder"
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
