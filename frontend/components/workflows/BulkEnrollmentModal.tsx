"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, UserGroupIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface Contact {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
}

interface BulkEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    workflowId: string;
    workflowName: string;
    onEnroll: (contactIds: string[]) => Promise<void>;
}

export default function BulkEnrollmentModal({
    isOpen,
    onClose,
    workspaceId,
    workflowId,
    workflowName,
    onEnroll,
}: BulkEnrollmentModalProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen, workspaceId]);

    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/workspace/${workspaceId}/contacts`);
            if (!response.ok) throw new Error('Failed to fetch contacts');
            const data = await response.json();
            setContacts(data.contacts || []);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            toast.error('Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (contactId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(contactId)) {
            newSelected.delete(contactId);
        } else {
            newSelected.add(contactId);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredContacts.map(c => c._id)));
        }
    };

    const handleEnroll = async () => {
        if (selectedIds.size === 0) {
            toast.error('Please select at least one contact');
            return;
        }

        setIsEnrolling(true);
        try {
            await onEnroll(Array.from(selectedIds));
            toast.success(`Enrolled ${selectedIds.size} contact(s) in ${workflowName}`);
            onClose();
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Failed to enroll contacts:', error);
            toast.error('Failed to enroll contacts');
        } finally {
            setIsEnrolling(false);
        }
    };

    const filteredContacts = contacts.filter(contact =>
        searchQuery === "" ||
        contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <UserGroupIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Bulk Enrollment</h2>
                                <p className="text-sm text-muted-foreground">
                                    Select contacts to enroll in "{workflowName}"
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 py-4 border-b border-border">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* Select All */}
                    {filteredContacts.length > 0 && (
                        <div className="px-6 py-3 border-b border-border bg-muted/30">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                />
                                <span className="text-sm font-medium text-foreground">
                                    Select All ({filteredContacts.length})
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Contact List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <p className="text-muted-foreground">
                                    {searchQuery ? "No contacts match your search" : "No contacts available"}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filteredContacts.map((contact) => (
                                    <label
                                        key={contact._id}
                                        className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(contact._id)}
                                            onChange={() => handleToggle(contact._id)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-foreground">
                                                    {contact.firstName} {contact.lastName}
                                                </p>
                                                {contact.company && (
                                                    <span className="text-xs text-muted-foreground">
                                                        • {contact.company}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {contact.email}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''} selected
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnroll}
                                disabled={selectedIds.size === 0 || isEnrolling}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isEnrolling ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                                        Enrolling...
                                    </>
                                ) : (
                                    `Enroll ${selectedIds.size > 0 ? selectedIds.size : ''} Contact${selectedIds.size !== 1 ? 's' : ''}`
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
