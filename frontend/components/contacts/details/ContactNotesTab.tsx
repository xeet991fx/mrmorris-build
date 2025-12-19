"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Contact } from "@/lib/api/contact";
import { useContactStore } from "@/store/useContactStore";
import toast from "react-hot-toast";

interface ContactNotesTabProps {
    contact: Contact;
    workspaceId: string;
    onUpdate: () => void;
}

export default function ContactNotesTab({
    contact,
    workspaceId,
    onUpdate,
}: ContactNotesTabProps) {
    const { updateContact } = useContactStore();
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(contact.notes || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateContact(workspaceId, contact._id, { notes });
            toast.success("Notes saved successfully");
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            toast.error("Failed to save notes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setNotes(contact.notes || "");
        setIsEditing(false);
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Notes</h3>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-background bg-[#9ACD32] hover:bg-[#8BC22A] rounded-lg transition-colors disabled:opacity-50"
                        >
                            <CheckIcon className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[200px]"
            >
                {isEditing ? (
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this contact..."
                        className="w-full h-[300px] px-4 py-3 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 resize-none"
                    />
                ) : notes ? (
                    <div className="p-4 rounded-lg border border-border bg-card">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <PencilIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No notes yet</p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="mt-3 px-4 py-2 text-sm font-medium text-background bg-[#9ACD32] hover:bg-[#8BC22A] rounded-lg transition-colors"
                        >
                            Add Notes
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
