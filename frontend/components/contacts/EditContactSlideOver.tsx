"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { updateContactSchema, UpdateContactInput } from "@/lib/validations/contact";
import { useContactStore } from "@/store/useContactStore";
import { Contact } from "@/lib/api/contact";
import ContactForm from "./ContactForm";

interface EditContactSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    contact: Contact | null;
}

export default function EditContactSlideOver({
    isOpen,
    onClose,
    workspaceId,
    contact,
}: EditContactSlideOverProps) {
    const { updateContact, isLoading } = useContactStore();

    const form = useForm<UpdateContactInput>({
        resolver: zodResolver(updateContactSchema),
    });

    const { handleSubmit, reset } = form;

    // Update form when contact changes
    useEffect(() => {
        if (contact) {
            reset({
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email || "",
                phone: contact.phone || "",
                company: contact.company || "",
                jobTitle: contact.jobTitle || "",
                source: contact.source || "",
                status: contact.status || "lead",
                notes: contact.notes || "",
                tags: contact.tags || [],
                linkedin: contact.linkedin || "",
                twitter: contact.twitter || "",
                website: contact.website || "",
                address: {
                    street: contact.address?.street || "",
                    city: contact.address?.city || "",
                    state: contact.address?.state || "",
                    country: contact.address?.country || "",
                    zipCode: contact.address?.zipCode || "",
                },
            });
        }
    }, [contact, reset]);

    const onSubmit = async (data: UpdateContactInput) => {
        if (!contact) return;
        try {
            await updateContact(workspaceId, contact._id, data);
            toast.success("Contact updated successfully!");
            onClose();
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to update contact";
            toast.error(message);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && contact && (
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
                                    Edit Contact
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
