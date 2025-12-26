"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowPathIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { getPublicForm, submitForm, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";

// Declare morrisb tracking interface
declare global {
    interface Window {
        morrisb?: (workspaceId: string) => {
            identify: (email: string, properties?: Record<string, any>) => void;
            track: (eventType: string, eventName: string, properties?: Record<string, any>) => void;
        };
    }
}

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
    }, [formId]);

    // Listen for visitor ID from parent window (when embedded in iframe)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Accept messages from any origin for visitor ID
            if (event.data?.type === 'morrisb-visitor-id' && event.data?.formId === formId) {
                // Store visitor ID in localStorage for tracking
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

        // Send initial height
        sendHeightUpdate();

        // Send height on window resize
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

        const newErrors: Record<string, string> = {};

        for (const field of form.fields) {
            if (field.required && !formData[field.id]) {
                newErrors[field.id] = `${field.label} is required`;
            }

            // Email validation
            if (field.type === 'email' && formData[field.id]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData[field.id])) {
                    newErrors[field.id] = 'Please enter a valid email address';
                }
            }

            // URL validation
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
            const response = await submitForm(formId, formData, {
                url: window.location.href,
                referrer: document.referrer,
                utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
                utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
                utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
            });

            if (response.success) {
                setIsSubmitted(true);

                // Track visitor identification
                if (typeof window !== 'undefined' && window.morrisb && form?.workspaceId) {
                    try {
                        const tracker = window.morrisb(form.workspaceId.toString());

                        // Find email field
                        const emailField = form.fields.find(f => f.type === 'email' || f.mapToContactField === 'email');
                        const email = emailField ? formData[emailField.id] : null;

                        if (email) {
                            tracker.identify(email, {
                                firstName: formData[form.fields.find(f => f.mapToContactField === 'firstName')?.id || ''],
                                lastName: formData[form.fields.find(f => f.mapToContactField === 'lastName')?.id || ''],
                                company: formData[form.fields.find(f => f.mapToContactField === 'company')?.id || ''],
                                phone: formData[form.fields.find(f => f.mapToContactField === 'phone')?.id || ''],
                                source: 'form_submission',
                                formId: formId,
                                formName: form.name,
                            });
                        }
                    } catch (error) {
                        console.warn('Tracking identify error:', error);
                    }
                }

                // Notify parent window about form submission (when embedded in iframe)
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
        // Clear error when user types
        if (errors[fieldId]) {
            setErrors({ ...errors, [fieldId]: '' });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Form Not Found</h1>
                    <p className="text-muted-foreground">This form may have been removed or unpublished.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{
                backgroundColor: form.settings.backgroundColor || '#ffffff',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl"
            >
                <div className="bg-white rounded-lg shadow-lg p-8">
                    {isSubmitted ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                            <p className="text-gray-600">{form.settings.successMessage}</p>
                        </motion.div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.name}</h1>
                            {form.description && (
                                <p className="text-gray-600 mb-8">{form.description}</p>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {form.fields.map((field) => (
                                    <div key={field.id}>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>

                                        {field.type === 'textarea' ? (
                                            <textarea
                                                value={formData[field.id] || ''}
                                                onChange={(e) => handleChange(field.id, e.target.value)}
                                                placeholder={field.placeholder}
                                                className={cn(
                                                    "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-offset-2 outline-none",
                                                    errors[field.id]
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : "border-gray-300 focus:ring-blue-500"
                                                )}
                                                rows={4}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                value={formData[field.id] || ''}
                                                onChange={(e) => handleChange(field.id, e.target.value)}
                                                className={cn(
                                                    "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-offset-2 outline-none",
                                                    errors[field.id]
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : "border-gray-300 focus:ring-blue-500"
                                                )}
                                            >
                                                <option value="">{field.placeholder || 'Select an option'}</option>
                                                {field.options?.map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'checkbox' ? (
                                            <div className="space-y-2">
                                                {field.options?.map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-2">
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
                                                            className="rounded"
                                                            style={{ accentColor: form.settings.primaryColor }}
                                                        />
                                                        <span className="text-sm text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : field.type === 'radio' ? (
                                            <div className="space-y-2">
                                                {field.options?.map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name={field.id}
                                                            value={opt}
                                                            checked={formData[field.id] === opt}
                                                            onChange={(e) => handleChange(field.id, e.target.value)}
                                                            className="rounded-full"
                                                            style={{ accentColor: form.settings.primaryColor }}
                                                        />
                                                        <span className="text-sm text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                type={field.type}
                                                value={formData[field.id] || ''}
                                                onChange={(e) => handleChange(field.id, e.target.value)}
                                                placeholder={field.placeholder}
                                                className={cn(
                                                    "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-offset-2 outline-none",
                                                    errors[field.id]
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : "border-gray-300 focus:ring-blue-500"
                                                )}
                                            />
                                        )}

                                        {errors[field.id] && (
                                            <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>
                                        )}
                                    </div>
                                ))}

                                {errors.submit && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-600 text-sm">{errors.submit}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full px-6 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                                    style={{
                                        backgroundColor: form.settings.primaryColor,
                                    }}
                                >
                                    {isSubmitting ? "Submitting..." : form.settings.submitButtonText}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
