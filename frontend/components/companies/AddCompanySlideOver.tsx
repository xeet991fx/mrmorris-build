"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createCompanySchema, CreateCompanyInput } from "@/lib/validations/company";
import { useCompanyStore } from "@/store/useCompanyStore";
import { updateContact, getContacts, Contact } from "@/lib/api/contact";
import CompanyForm from "./CompanyForm";

interface AddCompanySlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

export default function AddCompanySlideOver({
    isOpen,
    onClose,
    workspaceId,
}: AddCompanySlideOverProps) {
    const { createCompany, isLoading } = useCompanyStore();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);

    const form = useForm<CreateCompanyInput>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            name: "",
            industry: "",
            website: "",
            phone: "",
            domain: "",
            companySize: undefined,
            annualRevenue: undefined,
            employeeCount: undefined,
            linkedinUrl: "",
            twitterUrl: "",
            facebookUrl: "",
            address: {
                street: "",
                city: "",
                state: "",
                country: "",
                zipCode: "",
            },
            status: "lead",
            source: "",
            notes: "",
            tags: [],
            associatedContacts: [],
        },
    });

    const { handleSubmit, reset } = form;

    // Fetch contacts when modal opens
    useEffect(() => {
        const fetchContacts = async () => {
            if (!isOpen || !workspaceId) return;

            setIsLoadingContacts(true);
            try {
                const response = await getContacts(workspaceId, { limit: 1000 });
                if (response.success && response.data) {
                    // Only show contacts without a company or with no companyId
                    const availableContacts = response.data.contacts.filter(
                        (c) => !c.companyId
                    );
                    setContacts(availableContacts);
                }
            } catch (error) {
                console.error("Failed to fetch contacts:", error);
            } finally {
                setIsLoadingContacts(false);
            }
        };

        fetchContacts();
    }, [isOpen, workspaceId]);

    useEffect(() => {
        if (isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const onSubmit = async (data: CreateCompanyInput) => {
        try {
            // Extract associated contacts before creating
            const associatedContactIds = data.associatedContacts || [];

            // Remove associatedContacts from data as backend doesn't handle it
            const { associatedContacts, ...companyData } = data;

            // Create company
            const company = await createCompany(workspaceId, companyData);

            // Link contacts to the company if any were selected
            if (associatedContactIds.length > 0 && company?._id) {
                await Promise.all(
                    associatedContactIds.map(async (contactId) => {
                        try {
                            await updateContact(workspaceId, contactId, {
                                companyId: company._id,
                                company: company.name,
                            });
                        } catch (error) {
                            console.error(`Failed to link contact ${contactId}:`, error);
                        }
                    })
                );
            }

            toast.success("Company created successfully!");
            reset();
            onClose();
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to create company";
            toast.error(message);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                                    Add New Company
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
                                <CompanyForm
                                    form={form}
                                    contacts={contacts}
                                    isLoadingContacts={isLoadingContacts}
                                />
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
                                    {isLoading ? "Creating..." : "Create Company"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
