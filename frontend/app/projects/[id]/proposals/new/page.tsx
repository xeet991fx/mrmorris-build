"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createProposal, type PricingItem } from "@/lib/api/proposal";
import { getOpportunities } from "@/lib/api/opportunity";
import toast from "react-hot-toast";

export default function NewProposalPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [opportunities, setOpportunities] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        opportunityId: "",
        title: "",
        templateType: "standard" as "standard" | "enterprise" | "startup" | "custom",
        executiveSummary: "",
        problemStatement: "",
        proposedSolution: "",
        deliverables: [""],
        timeline: "",
        whyUs: "",
        terms: "",
        pricing: {
            items: [{ name: "", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }] as PricingItem[],
            discount: 0,
            discountType: "fixed" as "fixed" | "percentage",
            tax: 0,
            currency: "USD",
        },
    });

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        try {
            const response = await getOpportunities(workspaceId, { status: "open" });
            if (response.success && response.data) {
                setOpportunities(response.data.opportunities || []);
            }
        } catch (error) {
            console.error("Failed to fetch opportunities:", error);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const addPricingItem = () => {
        setFormData((prev) => ({
            ...prev,
            pricing: {
                ...prev.pricing,
                items: [
                    ...prev.pricing.items,
                    { name: "", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 },
                ],
            },
        }));
    };

    const removePricingItem = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            pricing: {
                ...prev.pricing,
                items: prev.pricing.items.filter((_, i) => i !== index),
            },
        }));
    };

    const updatePricingItem = (index: number, field: keyof PricingItem, value: any) => {
        setFormData((prev) => {
            const items = [...prev.pricing.items];
            items[index] = { ...items[index], [field]: value };
            return {
                ...prev,
                pricing: { ...prev.pricing, items },
            };
        });
    };

    const addDeliverable = () => {
        setFormData((prev) => ({
            ...prev,
            deliverables: [...prev.deliverables, ""],
        }));
    };

    const updateDeliverable = (index: number, value: string) => {
        setFormData((prev) => {
            const deliverables = [...prev.deliverables];
            deliverables[index] = value;
            return { ...prev, deliverables };
        });
    };

    const removeDeliverable = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            deliverables: prev.deliverables.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.opportunityId) {
            toast.error("Please select an opportunity");
            return;
        }

        if (!formData.title) {
            toast.error("Please enter a title");
            return;
        }

        try {
            setIsLoading(true);
            const response = await createProposal(workspaceId, {
                ...formData,
                deliverables: formData.deliverables.filter((d) => d.trim()),
            });

            if (response.success) {
                toast.success("Proposal created successfully");
                router.push(`/projects/${workspaceId}/proposals/${response.data._id}`);
            }
        } catch (error: any) {
            console.error("Create proposal error:", error);
            toast.error(error.response?.data?.error || "Failed to create proposal");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateSubtotal = () => {
        return formData.pricing.items.reduce((sum, item) => {
            const itemTotal = item.quantity * item.unitPrice;
            const discount = item.discount || 0;
            return sum + (itemTotal - (itemTotal * discount / 100));
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const discountAmount = formData.pricing.discountType === "percentage"
            ? subtotal * (formData.pricing.discount || 0) / 100
            : formData.pricing.discount || 0;
        return subtotal - discountAmount + (formData.pricing.tax || 0);
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-foreground">Create New Proposal</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Opportunity *
                            </label>
                            <select
                                value={formData.opportunityId}
                                onChange={(e) => updateField("opportunityId", e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-[#9ACD32]/50"
                                required
                            >
                                <option value="">Select opportunity</option>
                                {opportunities.map((opp) => (
                                    <option key={opp._id} value={opp._id}>
                                        {opp.name} - ${opp.value?.toLocaleString() || 0}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Proposal Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => updateField("title", e.target.value)}
                                placeholder="Q1 2025 Marketing Services Proposal"
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#9ACD32]/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Template Type
                            </label>
                            <select
                                value={formData.templateType}
                                onChange={(e) => updateField("templateType", e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-[#9ACD32]/50"
                            >
                                <option value="standard">Standard</option>
                                <option value="enterprise">Enterprise</option>
                                <option value="startup">Startup</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">Content</h2>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Executive Summary
                            </label>
                            <textarea
                                value={formData.executiveSummary}
                                onChange={(e) => updateField("executiveSummary", e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#9ACD32]/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Problem Statement
                            </label>
                            <textarea
                                value={formData.problemStatement}
                                onChange={(e) => updateField("problemStatement", e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#9ACD32]/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Proposed Solution
                            </label>
                            <textarea
                                value={formData.proposedSolution}
                                onChange={(e) => updateField("proposedSolution", e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#9ACD32]/50"
                            />
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Pricing</h2>
                            <button
                                type="button"
                                onClick={addPricingItem}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-[#9ACD32]/20 text-[#9ACD32] rounded-lg hover:bg-[#9ACD32]/30"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.pricing.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-background rounded-lg">
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updatePricingItem(index, "name", e.target.value)}
                                        placeholder="Item name"
                                        className="col-span-4 px-3 py-2 bg-card border border-border rounded text-foreground text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updatePricingItem(index, "quantity", Number(e.target.value))}
                                        placeholder="Qty"
                                        className="col-span-2 px-3 py-2 bg-card border border-border rounded text-foreground text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => updatePricingItem(index, "unitPrice", Number(e.target.value))}
                                        placeholder="Price"
                                        className="col-span-2 px-3 py-2 bg-card border border-border rounded text-foreground text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={item.discount || 0}
                                        onChange={(e) => updatePricingItem(index, "discount", Number(e.target.value))}
                                        placeholder="Disc %"
                                        className="col-span-2 px-3 py-2 bg-card border border-border rounded text-foreground text-sm"
                                    />
                                    <div className="col-span-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">
                                            ${(item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)).toFixed(2)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removePricingItem(index)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-border space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="text-foreground">${calculateSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold">
                                <span className="text-foreground">Total:</span>
                                <span className="text-[#9ACD32]">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-[#9ACD32] text-black rounded-lg font-medium hover:bg-[#8BC428] disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? "Creating..." : "Create Proposal"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
