"use client";

/**
 * Classic Form View - Google Forms Style
 *
 * All fields visible on a single canvas with vertical scroll.
 * Classic form filling experience.
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { Form, FormField } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import { getVisibleFields } from "@/lib/formHelpers";

interface ClassicFormViewProps {
    form: Form;
    onSubmit: (data: Record<string, any>) => Promise<void>;
    isSubmitting: boolean;
}

const BRAND_GREEN = "#10b981";

export default function ClassicFormView({
    form,
    onSubmit,
    isSubmitting,
}: ClassicFormViewProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const formRef = useRef<HTMLFormElement>(null);

    const visibleFields = getVisibleFields(
        form.fields,
        formData,
        null,
        form.maxProgressiveFields
    ).filter((f) => f.type !== "hidden" && f.type !== "divider");

    const handleChange = (fieldId: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldId]: value }));
        if (errors[fieldId]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const handleFileChange = async (fieldId: string, file: File | null) => {
        if (!file) {
            handleChange(fieldId, null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            handleChange(fieldId, {
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target?.result,
            });
        };
        reader.readAsDataURL(file);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        for (const field of visibleFields) {
            const value = formData[field.id];

            if (field.required && !value) {
                newErrors[field.id] = "This field is required";
                continue;
            }

            if (field.type === "email" && value) {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    newErrors[field.id] = "Please enter a valid email";
                }
            }

            if (field.type === "url" && value) {
                try {
                    new URL(value);
                } catch {
                    newErrors[field.id] = "Please enter a valid URL";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            // Scroll to first error
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                document
                    .getElementById(`field-${firstErrorField}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }
        await onSubmit(formData);
    };

    const renderField = (field: FormField) => {
        const hasError = !!errors[field.id];
        const value = formData[field.id];

        const baseInputClasses = cn(
            "w-full px-4 py-3 rounded-lg border transition-all duration-200",
            "bg-white/5 text-white placeholder:text-white/30",
            hasError
                ? "border-red-500 focus:border-red-400"
                : "border-white/10 focus:border-white/30 hover:border-white/20"
        );

        switch (field.type) {
            case "textarea":
            case "richtext":
                return (
                    <textarea
                        value={value || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Enter your response..."}
                        rows={4}
                        className={cn(baseInputClasses, "resize-none")}
                    />
                );

            case "select":
            case "country":
            case "state":
                return (
                    <select
                        value={value || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className={baseInputClasses}
                    >
                        <option value="">Select an option...</option>
                        {(field.options || []).map((opt, i) => (
                            <option key={i} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );

            case "checkbox":
                return (
                    <div className="space-y-2">
                        {(field.options || []).map((opt, i) => {
                            const isChecked = (value || []).includes(opt);
                            return (
                                <label
                                    key={i}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                                        "border",
                                        isChecked
                                            ? "bg-white/10 border-white/30"
                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-5 h-5 rounded flex items-center justify-center transition-all",
                                            isChecked ? "bg-green-500" : "bg-white/10 border border-white/20"
                                        )}
                                    >
                                        {isChecked && (
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                            const current = value || [];
                                            handleChange(
                                                field.id,
                                                e.target.checked
                                                    ? [...current, opt]
                                                    : current.filter((v: string) => v !== opt)
                                            );
                                        }}
                                        className="sr-only"
                                    />
                                    <span className="text-white/80">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                );

            case "radio":
                return (
                    <div className="space-y-2">
                        {(field.options || []).map((opt, i) => (
                            <label
                                key={i}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                                    "border",
                                    value === opt
                                        ? "bg-white/10 border-white/30"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                                        value === opt ? "bg-green-500" : "bg-white/10 border border-white/20"
                                    )}
                                >
                                    {value === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    checked={value === opt}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    className="sr-only"
                                />
                                <span className="text-white/80">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case "rating":
                return (
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => handleChange(field.id, star)}
                                className={cn(
                                    "w-12 h-12 rounded-lg text-2xl transition-all",
                                    (value || 0) >= star
                                        ? "bg-amber-500/20 scale-110"
                                        : "bg-white/5 grayscale opacity-30 hover:opacity-50"
                                )}
                            >
                                *
                            </button>
                        ))}
                    </div>
                );

            case "file":
                return (
                    <div>
                        <input
                            type="file"
                            id={`file-${field.id}`}
                            className="hidden"
                            onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                        />
                        <label
                            htmlFor={`file-${field.id}`}
                            className={cn(
                                "flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all",
                                value
                                    ? "border-green-500/50 bg-green-500/5"
                                    : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                            )}
                        >
                            {value ? (
                                <>
                                    <CheckCircleIcon className="w-8 h-8 text-green-400 mb-2" />
                                    <span className="text-white">{value.name}</span>
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-8 h-8 text-white/30 mb-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                    <span className="text-white/50">Click to upload file</span>
                                </>
                            )}
                        </label>
                    </div>
                );

            case "gdpr_consent":
            case "marketing_consent":
                return (
                    <label
                        className={cn(
                            "flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all",
                            "border",
                            value
                                ? "bg-white/10 border-white/30"
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                    >
                        <div
                            className={cn(
                                "w-5 h-5 rounded flex items-center justify-center transition-all mt-0.5 flex-shrink-0",
                                value ? "bg-green-500" : "bg-white/10 border border-white/20"
                            )}
                        >
                            {value && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </div>
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleChange(field.id, e.target.checked)}
                            className="sr-only"
                        />
                        <span className="text-white/80 text-sm leading-relaxed">
                            {field.gdprSettings?.consentText ||
                                (field.type === "gdpr_consent"
                                    ? "I agree to the privacy policy"
                                    : "I want to receive marketing emails")}
                        </span>
                    </label>
                );

            default:
                return (
                    <input
                        type={field.type === "phone" ? "tel" : field.type}
                        value={value || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Enter your response..."}
                        className={baseInputClasses}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
            <style jsx global>{`
                @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
                * {
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
                }
                body {
                    margin: 0;
                    background: #0a0a0a;
                }
                ::selection {
                    background: ${BRAND_GREEN}40;
                    color: white;
                }
            `}</style>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto"
            >
                {/* Form Header */}
                <div className="mb-8 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-bold text-white mb-3"
                    >
                        {form.name}
                    </motion.h1>
                    {form.description && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-white/50 text-lg"
                        >
                            {form.description}
                        </motion.p>
                    )}
                </div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8"
                >
                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                        {visibleFields.map((field, index) => (
                            <motion.div
                                key={field.id}
                                id={`field-${field.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                                className="space-y-2"
                            >
                                <label className="block">
                                    <span className="text-white font-medium">
                                        {field.label}
                                        {field.required && (
                                            <span className="text-red-400 ml-1">*</span>
                                        )}
                                    </span>
                                    {field.helpText && (
                                        <span className="block text-sm text-white/40 mt-1">
                                            {field.helpText}
                                        </span>
                                    )}
                                </label>

                                {renderField(field)}

                                <AnimatePresence>
                                    {errors[field.id] && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2 text-red-400 text-sm"
                                        >
                                            <ExclamationCircleIcon className="w-4 h-4" />
                                            {errors[field.id]}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}

                        {/* Submit Button */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="pt-4"
                        >
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full py-4 rounded-xl font-semibold text-white text-lg",
                                    "transition-all duration-200",
                                    "disabled:opacity-60 disabled:cursor-not-allowed",
                                    "flex items-center justify-center gap-2"
                                )}
                                style={{ background: form.settings?.primaryColor || BRAND_GREEN }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        {form.settings?.submitButtonText || "Submit"}
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </form>
                </motion.div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
                        <ShieldCheckIcon className="w-4 h-4" />
                        <span>Powered by Clianta</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
