"use client";

/**
 * Public Form Page
 *
 * Supports two display modes:
 * - 'classic' = All fields visible (Google Forms style)
 * - 'conversational' = One question at a time (Typeform style)
 */

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getPublicForm, submitForm, Form } from "@/lib/api/form";
import ClassicFormView from "@/components/forms/ClassicFormView";
import ConversationalFormView from "@/components/forms/ConversationalFormView"; // Conversational Mode
import CanvasFormView from "@/components/forms/CanvasFormView";
import { CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

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

const BRAND_GREEN = "#10b981";

export default function PublicFormPage() {
    const params = useParams();
    const formId = params.formId as string;

    const [form, setForm] = useState<Form | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        loadForm();
        // Load reCAPTCHA if configured
        const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (recaptchaSiteKey && !document.querySelector(`script[src*="recaptcha"]`)) {
            const script = document.createElement("script");
            script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
            script.async = true;
            document.head.appendChild(script);
        }
    }, [formId]);

    // Handle iframe height updates
    useEffect(() => {
        const sendHeightUpdate = () => {
            if (window.parent !== window) {
                window.parent.postMessage(
                    { type: "morrisb-form-height", formId, height: document.body.scrollHeight },
                    "*"
                );
            }
        };
        sendHeightUpdate();
        const observer = new ResizeObserver(sendHeightUpdate);
        observer.observe(document.body);
        return () => observer.disconnect();
    }, [formId, isSubmitted]);

    // Handle visitor ID from parent
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "morrisb-visitor-id" && event.data?.formId === formId) {
                try {
                    localStorage.setItem("mb_visitor_id", event.data.visitorId);
                } catch (e) { }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [formId]);

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

    const handleSubmit = async (formData: Record<string, any>) => {
        if (!form) return;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // Get reCAPTCHA token if configured
            let captchaToken: string | undefined;
            const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
            if (recaptchaSiteKey && window.grecaptcha) {
                try {
                    await new Promise<void>((resolve) => window.grecaptcha!.ready(() => resolve()));
                    captchaToken = await window.grecaptcha.execute(recaptchaSiteKey, { action: "submit_form" });
                } catch (e) { }
            }

            const response = await submitForm(formId, formData, {
                url: window.location.href,
                referrer: document.referrer,
                utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
                utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
                utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
                captchaToken,
            });

            if (response.success) {
                setIsSubmitted(true);

                // Track conversion
                if (typeof window !== "undefined" && window.morrisb && form.workspaceId) {
                    try {
                        const tracker = window.morrisb(form.workspaceId.toString());
                        const emailField = form.fields.find((f) => f.type === "email" || f.mapToField === "email");
                        const email = emailField ? formData[emailField.id] : null;
                        if (email) {
                            tracker.identify(email, {
                                firstName: formData[form.fields.find((f) => f.mapToField === "firstName")?.id || ""],
                                lastName: formData[form.fields.find((f) => f.mapToField === "lastName")?.id || ""],
                                company: formData[form.fields.find((f) => f.mapToField === "company")?.id || ""],
                                phone: formData[form.fields.find((f) => f.mapToField === "phone")?.id || ""],
                                source: "form_submission",
                                formId,
                                formName: form.name,
                            });
                        }
                    } catch (e) { }
                }

                // Notify parent window
                if (window.parent !== window) {
                    window.parent.postMessage({ type: "morrisb-form-submit", formId, data: formData }, "*");
                }

                // Redirect if configured
                if (response.redirectUrl) {
                    window.location.href = response.redirectUrl;
                }
            }
        } catch (error: any) {
            console.error("Error submitting form:", error);
            setSubmitError(error.message || "Failed to submit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <style jsx global>{`
                    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
                    * {
                        font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        background: #0a0a0a;
                    }
                `}</style>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                        <motion.div className="absolute inset-0 rounded-full border-2 border-white/10" />
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-transparent"
                            style={{ borderTopColor: BRAND_GREEN }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    // Not Found State
    if (!form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-white mb-2">Form not found</h1>
                    <p className="text-white/40">This form may have been removed or the link is incorrect.</p>
                </motion.div>
            </div>
        );
    }

    // Success State
    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6 relative overflow-hidden">
                <style jsx global>{`
                    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
                    * {
                        font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
                    }
                    body {
                        margin: 0;
                        background: #0a0a0a;
                    }
                `}</style>

                {/* Celebration background */}
                <div className="fixed inset-0">
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
                        style={{ background: `radial-gradient(circle, ${BRAND_GREEN}15 0%, transparent 60%)` }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="text-center z-10"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 12, delay: 0.2 }}
                        className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${BRAND_GREEN}, ${BRAND_GREEN}cc)` }}
                    >
                        <CheckCircleIcon className="w-12 h-12 text-white" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-bold text-white mb-4"
                    >
                        Thank you!
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-white/50 text-lg max-w-md"
                    >
                        {form.settings?.successMessage || "Your response has been recorded."}
                    </motion.p>
                </motion.div>

                {/* Footer */}
                <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white/20 text-xs">
                        <ShieldCheckIcon className="w-4 h-4" />
                        <span>Powered by Clianta</span>
                    </div>
                </div>
            </div>
        );
    }

    // Determine display mode (default to conversational)
    const displayMode = form.settings?.displayMode || "conversational";

    // Render appropriate form view
    if (displayMode === "classic") {
        return (
            <ClassicFormView
                form={form}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        );
    }

    if (displayMode === "canvas") {
        return (
            <CanvasFormView
                form={form}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        );
    }

    // Default: Conversational Form View
    return (
        <ConversationalFormView
            form={form}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    );
}
