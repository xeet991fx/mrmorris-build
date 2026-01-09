"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { useEmailTemplateStore, ValidationError } from "@/store/useEmailTemplateStore";
import { cn } from "@/lib/utils";

interface ValidationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    templateId: string;
    onGetHtml: () => Promise<string>;
}

export default function ValidationPanel({
    isOpen,
    onClose,
    workspaceId,
    templateId,
    onGetHtml,
}: ValidationPanelProps) {
    const { validationErrors, isValidating, validateTemplate } = useEmailTemplateStore();

    const handleValidate = async () => {
        const html = await onGetHtml();
        await validateTemplate(workspaceId, templateId, html);
    };

    if (!isOpen) return null;

    const errorCount = validationErrors.filter((e) => e.severity === "error").length;
    const warningCount = validationErrors.filter((e) => e.severity === "warning").length;

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
                    className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Email Validation</h2>
                                <p className="text-xs text-zinc-500">Check for broken links and images</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <XMarkIcon className="w-5 h-5 text-zinc-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        {/* Initial State */}
                        {!isValidating && validationErrors.length === 0 && (
                            <div className="text-center py-12">
                                <ShieldCheck className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                                <p className="text-zinc-500 mb-6">Click the button below to validate your email template</p>
                                <button
                                    onClick={handleValidate}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all mx-auto"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    Run Validation
                                </button>
                            </div>
                        )}

                        {/* Loading State */}
                        {isValidating && (
                            <div className="text-center py-12">
                                <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-zinc-500">Validating your email template...</p>
                            </div>
                        )}

                        {/* Results */}
                        {!isValidating && validationErrors.length > 0 && (
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <XCircleIcon className="w-5 h-5 text-rose-500" />
                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{errorCount} Errors</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{warningCount} Warnings</span>
                                    </div>
                                    <button
                                        onClick={handleValidate}
                                        className="ml-auto flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Re-validate
                                    </button>
                                </div>

                                {/* Error List */}
                                <div className="space-y-2">
                                    {validationErrors.map((error, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "p-4 rounded-xl",
                                                error.severity === "error"
                                                    ? "bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50"
                                                    : "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                {error.severity === "error" ? (
                                                    <XCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className={cn(
                                                        "text-sm font-medium",
                                                        error.severity === "error" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"
                                                    )}>
                                                        {error.type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                    </p>
                                                    <p className={cn(
                                                        "text-sm mt-1",
                                                        error.severity === "error" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                                                    )}>
                                                        {error.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success State (after validation with no errors) */}
                        {!isValidating && validationErrors.length === 0 && errorCount === 0 && warningCount === 0 && (
                            <div className="text-center py-12">
                                <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">All checks passed!</h3>
                                <p className="text-zinc-500 mb-4">Your email template has no broken links or images.</p>
                                <button
                                    onClick={handleValidate}
                                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 mx-auto"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Re-validate
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end p-5 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
