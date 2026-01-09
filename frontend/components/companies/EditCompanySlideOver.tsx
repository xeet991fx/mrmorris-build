"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { updateCompanySchema, UpdateCompanyInput } from "@/lib/validations/company";
import { useCompanyStore } from "@/store/useCompanyStore";
import { Company } from "@/lib/api/company";
import CompanyForm from "./CompanyForm";

interface EditCompanySlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    company: Company | null;
}

export default function EditCompanySlideOver({
    isOpen,
    onClose,
    workspaceId,
    company,
}: EditCompanySlideOverProps) {
    const { updateCompany, isLoading } = useCompanyStore();

    const form = useForm<UpdateCompanyInput>({
        resolver: zodResolver(updateCompanySchema),
    });

    const { handleSubmit, reset } = form;

    // Update form when company changes
    useEffect(() => {
        if (company) {
            reset({
                name: company.name,
                industry: company.industry || "",
                website: company.website || "",
                phone: company.phone || "",
                companySize: company.companySize,
                annualRevenue: company.annualRevenue,
                employeeCount: company.employeeCount,
                linkedinUrl: company.linkedinUrl || "",
                twitterUrl: company.twitterUrl || "",
                facebookUrl: company.facebookUrl || "",
                address: company.address || {
                    street: "",
                    city: "",
                    state: "",
                    country: "",
                    zipCode: "",
                },
                status: company.status || "lead",
                source: company.source || "",
                notes: company.notes || "",
                tags: company.tags || [],
            });
        }
    }, [company, reset]);

    const onSubmit = async (data: UpdateCompanyInput) => {
        if (!company) return;
        try {
            await updateCompany(workspaceId, company._id, data);
            toast.success("Company updated successfully!");
            onClose();
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to update company";
            toast.error(message);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && company && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/30 z-40"
                    />
                    {/* Slide-over panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-zinc-900 z-50 shadow-2xl flex flex-col"
                    >
                        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    Edit Company
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-6">
                                <CompanyForm form={form} />
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-5 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {isLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
