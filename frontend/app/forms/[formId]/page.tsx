"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    SparklesIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { getPublicForm, submitForm, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import { getVisibleFields, validateVisibleFields } from "@/lib/formHelpers";

// Declare morrisb tracking interface
declare global {
    interface Window {
        morrisb?: (workspaceId: string) => {
            identify: (email: string, properties?: Record<string, any>) => void;
            track: (eventType: string, eventName: string, properties?: Record<string, any>) => void;
        };
        grecaptcha?: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

// Premium Animated Background Component
const AnimatedBackground = () => (
    <>
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/10 to-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/40 rounded-full"
                initial={{
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                    y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                }}
                animate={{
                    y: [0, Math.random() * -200, 0],
                    opacity: [0.2, 0.8, 0.2],
                }}
                transition={{
                    duration: 5 + Math.random() * 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        ))}
    </>
);

// Premium Input Component
interface PremiumInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    error?: string;
    primaryColor?: string;
    min?: number | string;
    max?: number | string;
    pattern?: string;
}

const PremiumInput = ({ value, onChange, placeholder, type = "text", error, primaryColor = "#3b82f6", min, max, pattern }: PremiumInputProps) => (
    <div className="relative group">
        <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            pattern={pattern}
            className={cn(
                "w-full px-5 py-4 rounded-xl border-2 bg-white/80 backdrop-blur-sm",
                "text-gray-800 placeholder:text-gray-400",
                "transition-all duration-300 ease-out",
                "focus:outline-none focus:bg-white",
                error
                    ? "border-red-400 shadow-red-100"
                    : "border-gray-200 hover:border-gray-300 focus:shadow-lg"
            )}
            style={{
                boxShadow: error ? undefined : undefined,
            }}
            onFocus={(e) => {
                if (!error) {
                    e.target.style.borderColor = primaryColor;
                    e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20, 0 10px 40px -10px ${primaryColor}40`;
                }
            }}
            onBlur={(e) => {
                if (!error) {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = '';
                }
            }}
        />
        {/* Animated underline */}
        <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full origin-left"
            style={{ backgroundColor: primaryColor }}
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
        />
    </div>
);

// Premium Textarea Component
interface PremiumTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    error?: string;
    primaryColor?: string;
}

const PremiumTextarea = ({ value, onChange, placeholder, rows = 4, error, primaryColor = "#3b82f6" }: PremiumTextareaProps) => (
    <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
            "w-full px-5 py-4 rounded-xl border-2 bg-white/80 backdrop-blur-sm resize-none",
            "text-gray-800 placeholder:text-gray-400",
            "transition-all duration-300 ease-out",
            "focus:outline-none focus:bg-white",
            error
                ? "border-red-400 shadow-red-100"
                : "border-gray-200 hover:border-gray-300"
        )}
        onFocus={(e) => {
            if (!error) {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20, 0 10px 40px -10px ${primaryColor}40`;
            }
        }}
        onBlur={(e) => {
            if (!error) {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '';
            }
        }}
    />
);

// Premium Select Component
interface PremiumSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    options: string[];
    error?: string;
    primaryColor?: string;
}

const PremiumSelect = ({ value, onChange, placeholder, options, error, primaryColor = "#3b82f6" }: PremiumSelectProps) => (
    <div className="relative">
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                "w-full px-5 py-4 rounded-xl border-2 bg-white/80 backdrop-blur-sm appearance-none cursor-pointer",
                "text-gray-800",
                "transition-all duration-300 ease-out",
                "focus:outline-none focus:bg-white",
                error
                    ? "border-red-400 shadow-red-100"
                    : "border-gray-200 hover:border-gray-300"
            )}
            onFocus={(e) => {
                if (!error) {
                    e.target.style.borderColor = primaryColor;
                    e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20, 0 10px 40px -10px ${primaryColor}40`;
                }
            }}
            onBlur={(e) => {
                if (!error) {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = '';
                }
            }}
        >
            <option value="">{placeholder || 'Select an option'}</option>
            {options.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
            ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>
);

export default function PublicFormPage() {
    const params = useParams();
    const formId = params.formId as string;

    const [form, setForm] = useState<Form | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadForm();

        // Load reCAPTCHA v3 script
        const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (recaptchaSiteKey && !document.querySelector(`script[src*="recaptcha"]`)) {
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }, [formId]);

    // Listen for visitor ID from parent window (when embedded in iframe)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'morrisb-visitor-id' && event.data?.formId === formId) {
                try {
                    localStorage.setItem('mb_visitor_id', event.data.visitorId);
                } catch (e) {
                    console.warn('Cannot set visitor ID in localStorage:', e);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [formId]);

    // Send height updates to parent window (when embedded in iframe)
    useEffect(() => {
        const sendHeightUpdate = () => {
            if (window.parent !== window) {
                const height = document.body.scrollHeight;
                window.parent.postMessage({
                    type: 'morrisb-form-height',
                    formId,
                    height
                }, '*');
            }
        };

        sendHeightUpdate();
        const observer = new ResizeObserver(sendHeightUpdate);
        observer.observe(document.body);

        return () => observer.disconnect();
    }, [formId, isSubmitted]);

    const loadForm = async () => {
        try {
            const response = await getPublicForm(formId);
            if (response.success) {
                setForm(response.data);
            }
        } catch (error) {
            console.error("Error loading form:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = (): boolean => {
        if (!form) return false;

        const validation = validateVisibleFields(
            form.fields,
            formData,
            null,
            form.maxProgressiveFields
        );

        if (!validation.isValid) {
            setErrors(validation.errors);
            return false;
        }

        const newErrors: Record<string, string> = {};
        const visibleFields = getVisibleFields(form.fields, formData, null, form.maxProgressiveFields);

        for (const field of visibleFields) {
            if (field.type === 'email' && formData[field.id]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData[field.id])) {
                    newErrors[field.id] = 'Please enter a valid email address';
                }
            }

            if (field.type === 'url' && formData[field.id]) {
                try {
                    new URL(formData[field.id]);
                } catch {
                    newErrors[field.id] = 'Please enter a valid URL';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Execute reCAPTCHA v3
            let captchaToken: string | undefined;
            const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

            if (recaptchaSiteKey && window.grecaptcha) {
                try {
                    await new Promise<void>((resolve) => window.grecaptcha!.ready(() => resolve()));
                    captchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'submit_form' });
                } catch (captchaError) {
                    console.error('reCAPTCHA error:', captchaError);
                    // Continue without CAPTCHA if it fails
                }
            }

            const response = await submitForm(formId, formData, {
                url: window.location.href,
                referrer: document.referrer,
                utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
                utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
                utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
                captchaToken,
            });

            if (response.success) {
                setIsSubmitted(true);

                // Track visitor identification
                if (typeof window !== 'undefined' && window.morrisb && form?.workspaceId) {
                    try {
                        const tracker = window.morrisb(form.workspaceId.toString());
                        const emailField = form.fields.find(f => f.type === 'email' || f.mapToField === 'email');
                        const email = emailField ? formData[emailField.id] : null;

                        if (email) {
                            tracker.identify(email, {
                                firstName: formData[form.fields.find(f => f.mapToField === 'firstName')?.id || ''],
                                lastName: formData[form.fields.find(f => f.mapToField === 'lastName')?.id || ''],
                                company: formData[form.fields.find(f => f.mapToField === 'company')?.id || ''],
                                phone: formData[form.fields.find(f => f.mapToField === 'phone')?.id || ''],
                                source: 'form_submission',
                                formId: formId,
                                formName: form.name,
                            });
                        }
                    } catch (error) {
                        console.warn('Tracking identify error:', error);
                    }
                }

                if (window.parent !== window) {
                    window.parent.postMessage({
                        type: 'morrisb-form-submit',
                        formId,
                        data: formData
                    }, '*');
                }

                if (response.redirectUrl) {
                    window.location.href = response.redirectUrl;
                }
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrors({ submit: 'Failed to submit form. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (fieldId: string, value: any) => {
        setFormData({ ...formData, [fieldId]: value });
        if (errors[fieldId]) {
            setErrors({ ...errors, [fieldId]: '' });
        }
    };

    const handleFileChange = async (fieldId: string, file: File | null) => {
        if (!file) {
            handleChange(fieldId, null);
            return;
        }

        const field = form?.fields.find(f => f.id === fieldId);
        const maxSize = field?.validation?.max || 10;
        if (file.size > maxSize * 1024 * 1024) {
            setErrors({ ...errors, [fieldId]: `File size must be less than ${maxSize}MB` });
            return;
        }

        const allowedTypes = field?.validation?.pattern;
        if (allowedTypes) {
            const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
            const allowed = allowedTypes.split(',').map((t: string) => t.trim().toLowerCase());
            if (!allowed.includes(fileExt)) {
                setErrors({ ...errors, [fieldId]: `Allowed file types: ${allowedTypes}` });
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            handleChange(fieldId, {
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target?.result
            });
        };
        reader.readAsDataURL(file);
    };

    // Loading State with Premium Animation
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 mx-auto mb-4"
                    >
                        <div className="w-full h-full rounded-full border-4 border-blue-200 border-t-blue-600" />
                    </motion.div>
                    <p className="text-gray-500 font-medium">Loading form...</p>
                </motion.div>
            </div>
        );
    }

    // Form Not Found State
    if (!form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 relative overflow-hidden">
                <AnimatedBackground />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center z-10 px-6"
                >
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-2xl shadow-red-200">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Form Not Found</h1>
                    <p className="text-gray-600 max-w-md">
                        This form may have been removed, unpublished, or the link is incorrect.
                    </p>
                </motion.div>
            </div>
        );
    }

    const primaryColor = form.settings.primaryColor || '#3b82f6';

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden"
            style={{
                background: form.settings.backgroundColor
                    ? form.settings.backgroundColor
                    : `linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b4e 50%, #1a1a3e 75%, #0f0f23 100%)`,
            }}
        >
            {/* Animated Background Elements */}
            <AnimatedBackground />

            {/* Glowing orbs for dramatic effect */}
            <div
                className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-60"
                style={{ background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)` }}
            />
            <div
                className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-60"
                style={{ background: `radial-gradient(circle, #8b5cf640 0%, transparent 70%)` }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Premium Card with Glow Effect */}
                <div
                    className="relative group"
                    style={{
                        filter: `drop-shadow(0 0 40px ${primaryColor}20)`
                    }}
                >
                    {/* Gradient Border Glow */}
                    <div
                        className="absolute -inset-[1px] rounded-[28px] opacity-75"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor}60, #8b5cf650, ${primaryColor}60)`,
                        }}
                    />

                    <div className="relative bg-white/95 backdrop-blur-2xl rounded-[27px] shadow-2xl overflow-hidden">
                        {/* Premium Header with Gradient */}
                        <div
                            className="h-1.5"
                            style={{
                                background: `linear-gradient(90deg, ${primaryColor}, #8b5cf6, #ec4899, ${primaryColor})`
                            }}
                        />

                        <div className="p-8 md:p-12">
                            {isSubmitted ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", damping: 20 }}
                                    className="text-center py-12"
                                >
                                    {/* Success Animation */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", damping: 10, delay: 0.2 }}
                                        className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}aa)`,
                                            boxShadow: `0 20px 60px -15px ${primaryColor}60`
                                        }}
                                    >
                                        <CheckCircleIcon className="w-12 h-12 text-white" />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                                            Thank You! 🎉
                                        </h2>
                                        <p className="text-gray-600 text-lg">
                                            {form.settings.successMessage || "Your submission has been received."}
                                        </p>
                                    </motion.div>

                                    {/* Confetti-like elements */}
                                    {[...Array(8)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-3 h-3 rounded-full"
                                            style={{ backgroundColor: primaryColor }}
                                            initial={{
                                                x: '50%',
                                                y: '30%',
                                                scale: 0,
                                                opacity: 1
                                            }}
                                            animate={{
                                                x: `${Math.random() * 100}%`,
                                                y: `${Math.random() * 100}%`,
                                                scale: [0, 1, 0],
                                                opacity: [1, 1, 0]
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                delay: 0.3 + i * 0.1,
                                                ease: "easeOut"
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            ) : (
                                <>
                                    {/* Form Header */}
                                    <div className="mb-8">
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="flex items-center gap-3 mb-4"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style={{
                                                    background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`
                                                }}
                                            >
                                                <SparklesIcon className="w-5 h-5" style={{ color: primaryColor }} />
                                            </div>
                                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                                                {form.name}
                                            </h1>
                                        </motion.div>

                                        {form.description && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="text-gray-600 text-lg"
                                            >
                                                {form.description}
                                            </motion.p>
                                        )}
                                    </div>

                                    {/* Form Fields */}
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <AnimatePresence mode="sync">
                                            {getVisibleFields(form.fields, formData, null, form.maxProgressiveFields).map((field, index) => (
                                                <motion.div
                                                    key={field.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                                >
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        {field.label}
                                                        {field.required && (
                                                            <span className="text-red-500 ml-1">*</span>
                                                        )}
                                                    </label>

                                                    {/* File Upload */}
                                                    {field.type === 'file' ? (
                                                        <motion.div
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            className="relative"
                                                        >
                                                            <input
                                                                type="file"
                                                                onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                                                                accept={field.fileSettings?.allowedTypes?.map((t: string) => `.${t}`).join(',')}
                                                                className="hidden"
                                                                id={`file-${field.id}`}
                                                                multiple={field.fileSettings?.multiple}
                                                            />
                                                            <label
                                                                htmlFor={`file-${field.id}`}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
                                                                    errors[field.id]
                                                                        ? "border-red-400 bg-red-50"
                                                                        : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white"
                                                                )}
                                                            >
                                                                {formData[field.id] ? (
                                                                    <div className="text-center">
                                                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                                                                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                                                        </div>
                                                                        <p className="font-medium text-gray-900">{formData[field.id].name}</p>
                                                                        <p className="text-sm text-gray-500 mt-1">
                                                                            {(formData[field.id].size / 1024).toFixed(2)} KB
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center">
                                                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                            </svg>
                                                                        </div>
                                                                        <p className="font-medium text-gray-700">{field.placeholder || 'Click to upload or drag and drop'}</p>
                                                                        <p className="text-sm text-gray-500 mt-1">
                                                                            {field.fileSettings?.allowedTypes?.join(', ') || 'All types'} • Max {field.fileSettings?.maxSize || 10}MB
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </label>
                                                        </motion.div>
                                                    ) : field.type === 'textarea' || field.type === 'richtext' ? (
                                                        <PremiumTextarea
                                                            value={formData[field.id]}
                                                            onChange={(value) => handleChange(field.id, value)}
                                                            placeholder={field.placeholder}
                                                            rows={field.type === 'richtext' ? 8 : 4}
                                                            error={errors[field.id]}
                                                            primaryColor={primaryColor}
                                                        />
                                                    ) : field.type === 'select' || field.type === 'country' || field.type === 'state' ? (
                                                        <PremiumSelect
                                                            value={formData[field.id]}
                                                            onChange={(value) => handleChange(field.id, value)}
                                                            placeholder={field.placeholder}
                                                            options={
                                                                field.type === 'country'
                                                                    ? ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'India', 'Japan']
                                                                    : field.type === 'state'
                                                                        ? ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania']
                                                                        : field.options || []
                                                            }
                                                            error={errors[field.id]}
                                                            primaryColor={primaryColor}
                                                        />
                                                    ) : field.type === 'checkbox' ? (
                                                        <div className="space-y-3">
                                                            {field.options?.map((opt: string, i: number) => (
                                                                <motion.label
                                                                    key={i}
                                                                    whileHover={{ scale: 1.01 }}
                                                                    whileTap={{ scale: 0.99 }}
                                                                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-white hover:border-gray-200 transition-all duration-200"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        value={opt}
                                                                        checked={(formData[field.id] || []).includes(opt)}
                                                                        onChange={(e) => {
                                                                            const current = formData[field.id] || [];
                                                                            const updated = e.target.checked
                                                                                ? [...current, opt]
                                                                                : current.filter((v: string) => v !== opt);
                                                                            handleChange(field.id, updated);
                                                                        }}
                                                                        className="w-5 h-5 rounded border-gray-300"
                                                                        style={{ accentColor: primaryColor }}
                                                                    />
                                                                    <span className="text-gray-700 font-medium">{opt}</span>
                                                                </motion.label>
                                                            ))}
                                                        </div>
                                                    ) : field.type === 'radio' ? (
                                                        <div className="space-y-3">
                                                            {field.options?.map((opt: string, i: number) => (
                                                                <motion.label
                                                                    key={i}
                                                                    whileHover={{ scale: 1.01 }}
                                                                    whileTap={{ scale: 0.99 }}
                                                                    className={cn(
                                                                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                                                        formData[field.id] === opt
                                                                            ? "border-2 bg-white shadow-lg"
                                                                            : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200"
                                                                    )}
                                                                    style={formData[field.id] === opt ? { borderColor: primaryColor } : {}}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name={field.id}
                                                                        value={opt}
                                                                        checked={formData[field.id] === opt}
                                                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                                                        className="w-5 h-5"
                                                                        style={{ accentColor: primaryColor }}
                                                                    />
                                                                    <span className="text-gray-700 font-medium">{opt}</span>
                                                                </motion.label>
                                                            ))}
                                                        </div>
                                                    ) : field.type === 'rating' ? (
                                                        <div className="flex gap-2 p-4 bg-gray-50/50 rounded-xl">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <motion.button
                                                                    key={star}
                                                                    type="button"
                                                                    whileHover={{ scale: 1.2 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={() => handleChange(field.id, star)}
                                                                    className="text-4xl transition-all duration-200"
                                                                >
                                                                    <span
                                                                        style={{
                                                                            filter: (formData[field.id] || 0) >= star
                                                                                ? 'grayscale(0)'
                                                                                : 'grayscale(1) opacity(0.3)'
                                                                        }}
                                                                    >
                                                                        ⭐
                                                                    </span>
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    ) : field.type === 'gdpr_consent' || field.type === 'marketing_consent' ? (
                                                        <motion.label
                                                            whileHover={{ scale: 1.005 }}
                                                            className="flex items-start gap-4 p-5 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-100 rounded-xl cursor-pointer hover:bg-white hover:border-gray-200 transition-all duration-200"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={formData[field.id] || false}
                                                                onChange={(e) => handleChange(field.id, e.target.checked)}
                                                                className="mt-1 w-5 h-5 rounded border-gray-300"
                                                                style={{ accentColor: primaryColor }}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <ShieldCheckIcon className="w-4 h-4 text-gray-500" />
                                                                    <span className="text-sm font-medium text-gray-600">
                                                                        {field.type === 'gdpr_consent' ? 'Privacy & Data Protection' : 'Marketing Communications'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-gray-700">
                                                                    {field.gdprSettings?.consentText ||
                                                                        (field.type === 'gdpr_consent'
                                                                            ? 'I agree to the privacy policy and consent to my data being processed'
                                                                            : 'I would like to receive marketing communications')}
                                                                </span>
                                                                {field.gdprSettings?.privacyPolicyUrl && (
                                                                    <a
                                                                        href={field.gdprSettings.privacyPolicyUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-sm font-medium ml-2 hover:underline"
                                                                        style={{ color: primaryColor }}
                                                                    >
                                                                        View Privacy Policy →
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </motion.label>
                                                    ) : field.type === 'divider' ? (
                                                        <div className="flex items-center gap-4 py-2">
                                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                                        </div>
                                                    ) : field.type === 'html' ? (
                                                        <div className="prose max-w-none p-4 bg-gray-50 rounded-xl" dangerouslySetInnerHTML={{ __html: field.defaultValue || '' }} />
                                                    ) : field.type === 'hidden' ? (
                                                        <input type="hidden" value={field.defaultValue || ''} onChange={() => { }} />
                                                    ) : field.type === 'datetime' ? (
                                                        <PremiumInput
                                                            type="datetime-local"
                                                            value={formData[field.id]}
                                                            onChange={(value) => handleChange(field.id, value)}
                                                            error={errors[field.id]}
                                                            primaryColor={primaryColor}
                                                        />
                                                    ) : (
                                                        <PremiumInput
                                                            type={field.type}
                                                            value={formData[field.id]}
                                                            onChange={(value) => handleChange(field.id, value)}
                                                            placeholder={field.placeholder}
                                                            error={errors[field.id]}
                                                            primaryColor={primaryColor}
                                                            min={field.validation?.min}
                                                            max={field.validation?.max}
                                                            pattern={field.validation?.pattern}
                                                        />
                                                    )}

                                                    {/* Error Message */}
                                                    <AnimatePresence>
                                                        {errors[field.id] && (
                                                            <motion.p
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="text-red-500 text-sm mt-2 flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                                {errors[field.id]}
                                                            </motion.p>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {/* Submit Error */}
                                        <AnimatePresence>
                                            {errors.submit && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="p-4 bg-red-50 border border-red-200 rounded-xl"
                                                >
                                                    <p className="text-red-600 text-sm flex items-center gap-2">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {errors.submit}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Premium Submit Button */}
                                        <motion.button
                                            type="submit"
                                            disabled={isSubmitting}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="relative w-full px-8 py-4 rounded-xl font-semibold text-white text-lg overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{
                                                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                                                boxShadow: `0 10px 40px -10px ${primaryColor}80`,
                                            }}
                                        >
                                            {/* Button Shine Effect */}
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                                                animate={{ x: ['-200%', '200%'] }}
                                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                                            />

                                            <span className="relative flex items-center justify-center gap-2">
                                                {isSubmitting ? (
                                                    <>
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                        >
                                                            <ArrowPathIcon className="w-5 h-5" />
                                                        </motion.div>
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        {form.settings.submitButtonText || 'Submit'}
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                        </svg>
                                                    </>
                                                )}
                                            </span>
                                        </motion.button>
                                    </form>

                                    {/* Trust Badge */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-8 pt-6 border-t border-gray-100"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                                            <ShieldCheckIcon className="w-4 h-4" />
                                            <span>Secure form powered by Clianta</span>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
