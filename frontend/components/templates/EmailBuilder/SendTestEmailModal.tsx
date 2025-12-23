"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";

// ============================================
// TYPES
// ============================================

interface SendTestEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    templateId: string;
    onGetHtml: () => Promise<string>;
}

// ============================================
// COMPONENT
// ============================================

export default function SendTestEmailModal({
    isOpen,
    onClose,
    workspaceId,
    templateId,
    onGetHtml,
}: SendTestEmailModalProps) {
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { sendTestEmail } = useEmailTemplateStore();

    const handleSend = async () => {
        if (!email || !email.includes("@")) {
            alert("Please enter a valid email address");
            return;
        }

        setIsSending(true);
        try {
            // Get HTML from editor
            const html = await onGetHtml();

            // Send test email
            await sendTestEmail(workspaceId, templateId, email, html);

            // Close modal
            onClose();
            setEmail("");
        } catch (error) {
            console.error("Failed to send test email:", error);
        } finally {
            setIsSending(false);
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
                className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl mx-4 z-10"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#9ACD32]/10 flex items-center justify-center">
                            <PaperAirplaneIcon className="w-5 h-5 text-[#9ACD32]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Send Test Email</h2>
                            <p className="text-sm text-muted-foreground">
                                Preview how your email looks in an inbox
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

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Recipient Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 focus:border-[#9ACD32]"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSend();
                                }
                            }}
                        />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>Note:</strong> Variables like <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-xs">{"{" + "{firstName}}"}</code> will be replaced with sample data (e.g., "John").
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || !email}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="w-4 h-4" />
                                Send Test Email
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
