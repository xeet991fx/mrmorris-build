"use client";

/**
 * Conversational Form View - Typeform Style
 *
 * One question at a time with smooth animations.
 * Premium conversational experience with keyboard navigation.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
    ChevronDownIcon,
    ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import { getVisibleFields } from "@/lib/formHelpers";

interface ConversationalFormViewProps {
    form: Form;
    onSubmit: (data: Record<string, any>) => Promise<void>;
    isSubmitting: boolean;
}

const BRAND_GREEN = "#10b981";

// Animated counter for progress
const AnimatedNumber = ({ value }: { value: number }) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const controls = animate(0, value, {
            duration: 0.5,
            onUpdate(v) {
                node.textContent = Math.round(v).toString();
            },
        });

        return () => controls.stop();
    }, [value]);

    return <span ref={ref}>0</span>;
};

export default function ConversationalFormView({
    form,
    onSubmit,
    isSubmitting,
}: ConversationalFormViewProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const visibleFields = getVisibleFields(
        form.fields,
        formData,
        null,
        form.maxProgressiveFields
    ).filter((f) => f.type !== "hidden" && f.type !== "divider");

    const totalSteps = visibleFields.length;
    const currentField = visibleFields[currentStep];
    const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

    // Focus input when step changes
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [currentStep]);

    const validateCurrentField = (): boolean => {
        if (!currentField) return true;

        const newErrors: Record<string, string> = {};

        if (currentField.required && !formData[currentField.id]) {
            newErrors[currentField.id] = "This field is required";
        }

        if (currentField.type === "email" && formData[currentField.id]) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[currentField.id])) {
                newErrors[currentField.id] = "Please enter a valid email address";
            }
        }

        if (currentField.type === "url" && formData[currentField.id]) {
            try {
                new URL(formData[currentField.id]);
            } catch {
                newErrors[currentField.id] = "Please enter a valid URL";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = useCallback(() => {
        if (!validateCurrentField()) return;

        if (currentStep < totalSteps - 1) {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
            setErrors({});
        }
    }, [currentStep, totalSteps, formData, currentField]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep((prev) => prev - 1);
            setErrors({});
        }
    }, [currentStep]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (currentStep === totalSteps - 1) {
                    handleSubmit();
                } else {
                    nextStep();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nextStep, currentStep, totalSteps]);

    const handleSubmit = async () => {
        if (!validateCurrentField()) return;
        await onSubmit(formData);
    };

    const handleChange = (fieldId: string, value: any) => {
        setFormData({ ...formData, [fieldId]: value });
        if (errors[fieldId]) setErrors({});
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

    // Animation variants
    const slideVariants = {
        enter: (direction: number) => ({
            y: direction > 0 ? 80 : -80,
            opacity: 0,
            scale: 0.95,
        }),
        center: {
            y: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction: number) => ({
            y: direction > 0 ? -80 : 80,
            opacity: 0,
            scale: 0.95,
        }),
    };

    const renderFieldInput = (field: any) => {
        const value = formData[field.id];

        switch (field.type) {
            case "textarea":
            case "richtext":
                return (
                    <textarea
                        ref={inputRef as any}
                        value={value || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Type your answer here..."}
                        rows={4}
                        className={cn(
                            "w-full bg-transparent border-b-2 text-white text-xl md:text-2xl py-3 resize-none transition-colors placeholder:text-white/25",
                            errors[field.id] ? "border-red-400" : "border-white/20 focus:border-white/50"
                        )}
                    />
                );

            case "select":
            case "country":
            case "state":
                return (
                    <div className="space-y-3">
                        {(field.options || []).map((opt: string, i: number) => (
                            <motion.button
                                key={i}
                                type="button"
                                onClick={() => {
                                    handleChange(field.id, opt);
                                    setTimeout(nextStep, 200);
                                }}
                                whileHover={{ x: 4 }}
                                className={cn(
                                    "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                                    value === opt
                                        ? "bg-white/10 border-2"
                                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                                )}
                                style={value === opt ? { borderColor: BRAND_GREEN } : {}}
                            >
                                <span
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                                    style={{
                                        background: value === opt ? BRAND_GREEN : "rgba(255,255,255,0.1)",
                                        color: value === opt ? "white" : "rgba(255,255,255,0.6)",
                                    }}
                                >
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-white text-lg">{opt}</span>
                            </motion.button>
                        ))}
                    </div>
                );

            case "checkbox":
                return (
                    <div className="space-y-3">
                        {(field.options || []).map((opt: string, i: number) => {
                            const isSelected = (value || []).includes(opt);
                            return (
                                <motion.button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        const current = value || [];
                                        handleChange(
                                            field.id,
                                            isSelected
                                                ? current.filter((v: string) => v !== opt)
                                                : [...current, opt]
                                        );
                                    }}
                                    whileHover={{ x: 4 }}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                                        isSelected
                                            ? "bg-white/10 border-2"
                                            : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                                    )}
                                    style={isSelected ? { borderColor: BRAND_GREEN } : {}}
                                >
                                    <span
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                                        style={{
                                            background: isSelected ? BRAND_GREEN : "rgba(255,255,255,0.1)",
                                            color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                                        }}
                                    >
                                        {isSelected ? "V" : String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="text-white text-lg">{opt}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                );

            case "radio":
                return (
                    <div className="space-y-3">
                        {(field.options || []).map((opt: string, i: number) => (
                            <motion.button
                                key={i}
                                type="button"
                                onClick={() => {
                                    handleChange(field.id, opt);
                                    setTimeout(nextStep, 200);
                                }}
                                whileHover={{ x: 4 }}
                                className={cn(
                                    "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                                    value === opt
                                        ? "bg-white/10 border-2"
                                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                                )}
                                style={value === opt ? { borderColor: BRAND_GREEN } : {}}
                            >
                                <span
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                                    style={{
                                        background: value === opt ? BRAND_GREEN : "rgba(255,255,255,0.1)",
                                        color: value === opt ? "white" : "rgba(255,255,255,0.6)",
                                    }}
                                >
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-white text-lg">{opt}</span>
                            </motion.button>
                        ))}
                    </div>
                );

            case "rating":
                return (
                    <div className="flex gap-3 flex-wrap">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <motion.button
                                key={star}
                                type="button"
                                onClick={() => handleChange(field.id, star)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    "w-16 h-16 rounded-2xl text-3xl transition-all",
                                    (value || 0) >= star
                                        ? "bg-amber-500/20"
                                        : "bg-white/5 grayscale opacity-30"
                                )}
                            >
                                *
                            </motion.button>
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
                                "flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                                value
                                    ? "border-green-500/50 bg-green-500/5"
                                    : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                            )}
                        >
                            {value ? (
                                <>
                                    <CheckCircleIcon className="w-10 h-10 text-green-400 mb-3" />
                                    <span className="text-white text-lg">{value.name}</span>
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-10 h-10 text-white/30 mb-3"
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
                                    <span className="text-white/50 text-lg">Click to upload</span>
                                </>
                            )}
                        </label>
                    </div>
                );

            case "gdpr_consent":
            case "marketing_consent":
                return (
                    <motion.button
                        type="button"
                        onClick={() => handleChange(field.id, !value)}
                        whileHover={{ x: 4 }}
                        className={cn(
                            "w-full flex items-start gap-4 p-5 rounded-xl text-left transition-all",
                            value
                                ? "bg-white/10 border-2"
                                : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                        )}
                        style={value ? { borderColor: BRAND_GREEN } : {}}
                    >
                        <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5"
                            style={{
                                background: value ? BRAND_GREEN : "rgba(255,255,255,0.1)",
                                color: value ? "white" : "rgba(255,255,255,0.6)",
                            }}
                        >
                            {value ? "V" : ""}
                        </span>
                        <div>
                            <p className="text-white text-lg leading-relaxed">
                                {field.gdprSettings?.consentText ||
                                    (field.type === "gdpr_consent"
                                        ? "I agree to the privacy policy"
                                        : "I want to receive marketing emails")}
                            </p>
                        </div>
                    </motion.button>
                );

            default:
                return (
                    <input
                        ref={inputRef as any}
                        type={field.type === "phone" ? "tel" : field.type}
                        value={value || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Type your answer here..."}
                        className={cn(
                            "w-full bg-transparent border-b-2 text-white text-xl md:text-2xl py-3 transition-colors placeholder:text-white/25",
                            errors[field.id] ? "border-red-400" : "border-white/20 focus:border-white/50"
                        )}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden">
            <style jsx global>{`
                @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");
                * {
                    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    background: #0a0a0a;
                }
                ::selection {
                    background: ${BRAND_GREEN}40;
                    color: white;
                }
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 1000px #0a0a0a inset !important;
                    -webkit-text-fill-color: white !important;
                }
                input:focus,
                textarea:focus,
                select:focus {
                    outline: none;
                }
            `}</style>

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20"
                    style={{
                        background: `radial-gradient(circle, ${BRAND_GREEN}30 0%, transparent 60%)`,
                        filter: "blur(100px)",
                    }}
                    animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-15"
                    style={{
                        background: "radial-gradient(circle, #6366f130 0%, transparent 60%)",
                        filter: "blur(80px)",
                    }}
                    animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            {/* Top Bar - Progress & Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50">
                {/* Progress Bar */}
                <div className="h-1 bg-white/5">
                    <motion.div
                        className="h-full"
                        style={{ background: BRAND_GREEN }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.button
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                currentStep === 0
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : "bg-white/10 text-white hover:bg-white/15"
                            )}
                        >
                            <ArrowUpIcon className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={nextStep}
                            disabled={currentStep === totalSteps - 1}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all rotate-180",
                                currentStep === totalSteps - 1
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : "bg-white/10 text-white hover:bg-white/15"
                            )}
                        >
                            <ArrowUpIcon className="w-4 h-4" />
                        </motion.button>
                    </div>

                    <div className="text-white/40 text-sm font-medium">
                        <span className="text-white">
                            <AnimatedNumber value={currentStep + 1} />
                        </span>
                        <span className="mx-1">of</span>
                        <span>{totalSteps}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-32">
                <div className="w-full max-w-xl">
                    <AnimatePresence mode="wait" custom={direction}>
                        {currentField && (
                            <motion.div
                                key={currentField.id}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {/* Question Number */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span
                                        className="text-sm font-semibold px-2.5 py-1 rounded-md"
                                        style={{ background: `${BRAND_GREEN}20`, color: BRAND_GREEN }}
                                    >
                                        {currentStep + 1}
                                    </span>
                                    <ChevronDownIcon className="w-3 h-3 text-white/30 rotate-[-90deg]" />
                                </div>

                                {/* Question */}
                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-8 leading-tight">
                                    {currentField.label}
                                    {currentField.required && <span className="text-red-400 ml-1">*</span>}
                                </h2>

                                {/* Input Field */}
                                <div className="mb-6">{renderFieldInput(currentField)}</div>

                                {/* Error Message */}
                                <AnimatePresence>
                                    {errors[currentField.id] && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-red-400 text-sm mb-4 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            {errors[currentField.id]}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                {/* Action Button */}
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        type="button"
                                        onClick={currentStep === totalSteps - 1 ? handleSubmit : nextStep}
                                        disabled={isSubmitting}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                                        style={{ background: BRAND_GREEN }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : currentStep === totalSteps - 1 ? (
                                            <>
                                                Submit
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </>
                                        ) : (
                                            <>
                                                OK
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </>
                                        )}
                                    </motion.button>

                                    <span className="text-white/30 text-sm">
                                        press{" "}
                                        <kbd className="px-2 py-1 rounded bg-white/10 text-white/50 font-mono text-xs">
                                            Enter
                                        </kbd>
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white/20 text-xs">
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                    <span>Powered by Clianta</span>
                </div>

                {/* Keyboard hints */}
                <div className="hidden md:flex items-center gap-4 text-white/20 text-xs">
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">UP</kbd>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">DN</kbd>
                        navigate
                    </span>
                </div>
            </div>
        </div>
    );
}
