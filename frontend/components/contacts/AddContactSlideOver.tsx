"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createContactSchema, CreateContactInput } from "@/lib/validations/contact";
import { useContactStore } from "@/store/useContactStore";
import ContactForm from "./ContactForm";

interface AddContactSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

export default function AddContactSlideOver({
    isOpen,
    onClose,
    workspaceId,
}: AddContactSlideOverProps) {
    const { createContact, isLoading } = useContactStore();

    const form = useForm<CreateContactInput>({
        resolver: zodResolver(createContactSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            company: "",
            jobTitle: "",
            source: "",
            status: "lead",
            notes: "",
            tags: [],
            linkedin: "",
            twitter: "",
            website: "",
            address: {
                street: "",
                city: "",
                state: "",
                country: "",
                zipCode: "",
            },
        },
    });

    const { handleSubmit, reset } = form;

    useEffect(() => {
        if (isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const onSubmit = async (data: CreateContactInput) => {
        try {
            await createContact(workspaceId, data);
            toast.success("Contact created successfully!");
            reset();
            onClose();
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to create contact";
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
                                    Add New Contact
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
                                <ContactForm form={form} />
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
                                    {isLoading ? "Creating..." : "Create Contact"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
