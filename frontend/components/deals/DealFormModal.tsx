"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useDealStore, DealStage } from "@/store/useDealStore";
import type { Deal, CreateDealData, UpdateDealData } from "@/lib/api/deal";
import { cn } from "@/lib/utils";

interface DealFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    deal?: Deal | null;
    workspaceId: string;
    companies?: Array<{ _id: string; name: string }>;
    contacts?: Array<{ _id: string; firstName: string; lastName: string }>;
}

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
    { value: "lead", label: "Lead" },
    { value: "qualified", label: "Qualified" },
    { value: "proposal", label: "Proposal" },
    { value: "negotiation", label: "Negotiation" },
    { value: "closed_won", label: "Closed Won" },
    { value: "closed_lost", label: "Closed Lost" },
];

const ICP_OPTIONS = [
    { value: "", label: "Not Set" },
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

export default function DealFormModal({
    isOpen,
    onClose,
    deal,
    workspaceId,
    companies = [],
    contacts = [],
}: DealFormModalProps) {
    const { createDeal, updateDeal, isLoading } = useDealStore();
    const isEditing = !!deal;

    const [formData, setFormData] = useState<CreateDealData>({
        name: "",
        description: "",
        companyId: "",
        contacts: [],
        stage: "lead",
        value: 0,
        currency: "USD",
        probability: 0,
        icpFit: undefined,
        source: "",
        notes: "",
    });

    useEffect(() => {
        if (deal) {
            setFormData({
                name: deal.name,
                description: deal.description || "",
                companyId: typeof deal.companyId === "string" ? deal.companyId : deal.companyId?._id || "",
                contacts: deal.contacts?.map(c => typeof c === "string" ? c : c._id) || [],
                stage: deal.stage,
                value: deal.value,
                currency: deal.currency,
                probability: deal.probability || 0,
                icpFit: deal.icpFit,
                source: deal.source || "",
                notes: deal.notes || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
                companyId: "",
                contacts: [],
                stage: "lead",
                value: 0,
                currency: "USD",
                probability: 0,
                icpFit: undefined,
                source: "",
                notes: "",
            });
        }
    }, [deal, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = {
            ...formData,
            companyId: formData.companyId || undefined,
            contacts: formData.contacts?.length ? formData.contacts : undefined,
            icpFit: formData.icpFit || undefined,
        };

        if (isEditing) {
            const result = await updateDeal(workspaceId, deal._id, data as UpdateDealData);
            if (result) onClose();
        } else {
            const result = await createDeal(workspaceId, data);
            if (result) onClose();
        }
    };

    const handleChange = (field: keyof CreateDealData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {isEditing ? "Edit Deal" : "Create New Deal"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-zinc-500" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* Deal Name */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Deal Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g., Enterprise License Deal"
                            />
                        </div>

                        {/* Value and Currency Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Deal Value
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.value}
                                        onChange={(e) => handleChange("value", Number(e.target.value))}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Stage
                                </label>
                                <select
                                    value={formData.stage}
                                    onChange={(e) => handleChange("stage", e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {STAGE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Company and Probability Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Company
                                </label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => handleChange("companyId", e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">Select a company...</option>
                                    {companies.map((company) => (
                                        <option key={company._id} value={company._id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Probability (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.probability}
                                    onChange={(e) => handleChange("probability", Number(e.target.value))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* ICP Fit and Source Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    ICP Fit
                                </label>
                                <select
                                    value={formData.icpFit || ""}
                                    onChange={(e) => handleChange("icpFit", e.target.value || undefined)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {ICP_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Source
                                </label>
                                <input
                                    type="text"
                                    value={formData.source}
                                    onChange={(e) => handleChange("source", e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g., Website, Referral"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange("description", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                placeholder="Add any notes about this deal..."
                            />
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !formData.name}
                            className="px-6 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                        >
                            {isLoading ? "Saving..." : isEditing ? "Update Deal" : "Create Deal"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
