"use client";

import { motion } from "framer-motion";
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { useEmailTemplateStore, ValidationError } from "@/store/useEmailTemplateStore";

// ============================================
// TYPES
// ============================================

interface ValidationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    templateId: string;
    onGetHtml: () => Promise<string>;
}

// ============================================
// COMPONENT
// ============================================

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl max-h-[80vh] overflow-auto bg-card border border-border rounded-xl shadow-2xl mx-4 z-10"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Email Validation</h2>
                            <p className="text-sm text-muted-foreground">
                                Check for broken links and images
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
                    {/* Validate Button */}
                    {!isValidating && validationErrors.length === 0 && (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                Click the button below to validate your email template
                            </p>
                            <button
                                onClick={handleValidate}
                                className="px-6 py-3 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                            >
                                Run Validation
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isValidating && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Validating your email template...</p>
                        </div>
                    )}

                    {/* Results */}
                    {!isValidating && validationErrors.length > 0 && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                    <XCircleIcon className="w-5 h-5 text-red-600" />
                                    <span className="font-medium text-foreground">{errorCount} Errors</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
                                    <span className="font-medium text-foreground">{warningCount} Warnings</span>
                                </div>
                                <button
                                    onClick={handleValidate}
                                    className="ml-auto text-sm text-primary hover:underline"
                                >
                                    Re-validate
                                </button>
                            </div>

                            {/* Error List */}
                            <div className="space-y-2">
                                {validationErrors.map((error, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border ${
                                            error.severity === "error"
                                                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                                                : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {error.severity === "error" ? (
                                                <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p
                                                    className={`text-sm font-medium ${
                                                        error.severity === "error"
                                                            ? "text-red-900 dark:text-red-200"
                                                            : "text-orange-900 dark:text-orange-200"
                                                    }`}
                                                >
                                                    {error.type
                                                        .replace(/-/g, " ")
                                                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                </p>
                                                <p
                                                    className={`text-sm mt-1 ${
                                                        error.severity === "error"
                                                            ? "text-red-800 dark:text-red-300"
                                                            : "text-orange-800 dark:text-orange-300"
                                                    }`}
                                                >
                                                    {error.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {!isValidating && validationErrors.length === 0 && errorCount === 0 && warningCount === 0 && (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                All checks passed!
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Your email template has no broken links or images.
                            </p>
                            <button
                                onClick={handleValidate}
                                className="text-sm text-primary hover:underline"
                            >
                                Re-validate
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
