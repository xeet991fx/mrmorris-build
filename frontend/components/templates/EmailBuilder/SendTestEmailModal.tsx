"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { Send } from "lucide-react";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";
import { cn } from "@/lib/utils";

interface SendTestEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    templateId: string;
    onGetHtml: () => Promise<string>;
}

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
            const html = await onGetHtml();
            await sendTestEmail(workspaceId, templateId, email, html);
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
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Send className="w-5 h-5 text-emerald-500" />
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Send Test Email</h2>
                                <p className="text-xs text-zinc-500">Preview how your email looks</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <XMarkIcon className="w-5 h-5 text-zinc-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Recipient Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                <strong>Note:</strong> Variables like <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-xs">{"{{firstName}}"}</code> will be replaced with sample data.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || !email}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                            {isSending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Test
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
