"use client";

/**
 * Canvas Form View - Premium 2D Form Renderer
 * 
 * Features:
 * - Dynamic theming based on form settings
 * - Gradient backgrounds with glassmorphism
 * - Smooth animations and hover effects
 * - Modern input styling with focus states
 */

import React, { useState, useMemo } from "react";
import { Form, FormField } from "@/lib/api/form";
import { motion } from "framer-motion";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface CanvasFormViewProps {
    form: Form;
    onSubmit: (data: Record<string, any>) => Promise<void>;
    isSubmitting: boolean;
}

// Generate color palette from primary color
function generateColorPalette(primaryColor: string) {
    // Convert hex to HSL for better manipulation
    const hexToHSL = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    };

    const hsl = hexToHSL(primaryColor || '#3b82f6');

    return {
        primary: primaryColor || '#3b82f6',
        primaryLight: `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 15, 95)}%)`,
        primaryDark: `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 15, 20)}%)`,
        primaryGlow: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.3)`,
        primarySoft: `hsla(${hsl.h}, ${Math.max(hsl.s - 30, 20)}%, ${Math.min(hsl.l + 35, 95)}%, 0.8)`,
        gradient: `linear-gradient(135deg, hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%) 0%, hsl(${(hsl.h + 30) % 360}, ${hsl.s}%, ${hsl.l}%) 100%)`,
        bgGradient: `linear-gradient(135deg, hsl(${hsl.h}, ${Math.max(hsl.s - 40, 10)}%, 97%) 0%, hsl(${(hsl.h + 20) % 360}, ${Math.max(hsl.s - 50, 5)}%, 94%) 100%)`,
    };
}

export default function CanvasFormView({
    form,
    onSubmit,
    isSubmitting
}: CanvasFormViewProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Generate color palette from form's primary color
    const colors = useMemo(() =>
        generateColorPalette(form.settings?.primaryColor || '#3b82f6'),
        [form.settings?.primaryColor]
    );

    const isDarkTheme = form.settings?.theme === 'dark';

    // Sort elements by z-index
    const elements = [...form.fields].sort((a, b) =>
        (a.canvas?.zIndex || 0) - (b.canvas?.zIndex || 0)
    );

    // Check if form has a button element
    const hasButtonElement = elements.some(el => el.type === 'button');

    // Calculate canvas size based on elements
    const canvasSize = useMemo(() => {
        if (elements.length === 0) {
            return { width: 500, height: 400 };
        }

        let maxRight = 0;
        let maxBottom = 0;

        elements.forEach(el => {
            const right = (el.canvas?.x || 50) + (el.canvas?.width || 200);
            const bottom = (el.canvas?.y || 50) + (el.canvas?.height || 60);
            maxRight = Math.max(maxRight, right);
            maxBottom = Math.max(maxBottom, bottom);
        });

        // Add padding and space for submit button if needed
        const buttonSpace = hasButtonElement ? 40 : 100;
        return {
            width: Math.max(500, Math.min(900, maxRight + 60)),
            height: Math.max(300, maxBottom + buttonSpace)
        };
    }, [elements, hasButtonElement]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        await onSubmit(formData);
    };

    const handleChange = (id: string, value: any) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // Dynamic input styles based on theme
    const getInputStyles = (isFocused: boolean) => `
        w-full flex-1 px-4 py-3 
        ${isDarkTheme
            ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
            : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400'
        }
        border-2 rounded-xl 
        backdrop-blur-sm
        transition-all duration-300 ease-out
        text-sm
        ${isFocused
            ? `border-[${colors.primary}] shadow-lg ring-2`
            : 'hover:border-gray-300 hover:shadow-md'
        }
        focus:outline-none focus:border-[${colors.primary}] focus:shadow-lg focus:ring-2
    `.replace(/\s+/g, ' ').trim();

    const renderElement = (element: FormField) => {
        const { type, label, placeholder, required, id } = element;
        const value = formData[id] || "";
        const isFocused = focusedField === id;

        const labelClasses = `
            block text-sm font-semibold mb-2 pointer-events-none truncate
            ${isDarkTheme ? 'text-gray-200' : 'text-gray-700'}
            transition-colors duration-200
        `.replace(/\s+/g, ' ').trim();

        switch (type) {
            case "heading":
                return (
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-2xl font-bold w-full h-full flex items-center
                            ${isDarkTheme ? 'text-white' : 'text-gray-900'}
                        `}
                        style={{
                            background: colors.gradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        {label}
                    </motion.h2>
                );

            case "paragraph":
                return (
                    <p className={`text-sm w-full h-full whitespace-pre-wrap leading-relaxed
                        ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}
                    `}>
                        {label}
                    </p>
                );

            case "divider":
                return (
                    <div
                        className="w-full h-px my-auto"
                        style={{ background: colors.gradient }}
                    />
                );

            case "spacer":
                return <div className="w-full h-full" />;

            case "button":
                return (
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: `0 10px 40px ${colors.primaryGlow}` }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting}
                        className="w-full h-full text-white font-bold rounded-xl 
                            disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center justify-center gap-3
                            transition-all duration-300 ease-out
                            shadow-lg hover:shadow-2xl"
                        style={{
                            background: colors.gradient,
                            boxShadow: `0 4px 20px ${colors.primaryGlow}`,
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>{label || form.settings?.submitButtonText || "Submit"}</span>
                            </>
                        )}
                    </motion.button>
                );

            case "textarea":
                return (
                    <div className="w-full h-full flex flex-col">
                        <label className={labelClasses}>
                            {label}
                            {required && <span style={{ color: colors.primary }} className="ml-1">*</span>}
                        </label>
                        <textarea
                            value={value}
                            onChange={(e) => handleChange(id, e.target.value)}
                            onFocus={() => setFocusedField(id)}
                            onBlur={() => setFocusedField(null)}
                            placeholder={placeholder || "Enter your message..."}
                            className={`${getInputStyles(isFocused)} resize-none flex-1`}
                            style={{
                                borderColor: isFocused ? colors.primary : undefined,
                                boxShadow: isFocused ? `0 0 0 3px ${colors.primaryGlow}` : undefined,
                            }}
                            required={required}
                        />
                    </div>
                );

            case "select":
                return (
                    <div className="w-full h-full flex flex-col">
                        <label className={labelClasses}>
                            {label}
                            {required && <span style={{ color: colors.primary }} className="ml-1">*</span>}
                        </label>
                        <select
                            value={value}
                            onChange={(e) => handleChange(id, e.target.value)}
                            onFocus={() => setFocusedField(id)}
                            onBlur={() => setFocusedField(null)}
                            className={getInputStyles(isFocused)}
                            style={{
                                borderColor: isFocused ? colors.primary : undefined,
                                boxShadow: isFocused ? `0 0 0 3px ${colors.primaryGlow}` : undefined,
                            }}
                            required={required}
                        >
                            <option value="">{placeholder || "Select an option..."}</option>
                            {element.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );

            case "checkbox":
                return (
                    <div className="w-full h-full flex items-center gap-3">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200
                                ${value
                                    ? ''
                                    : isDarkTheme ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white/80'
                                }
                            `}
                            style={{
                                background: value ? colors.gradient : undefined,
                                borderColor: value ? colors.primary : undefined,
                            }}
                            onClick={() => handleChange(id, !value)}
                        >
                            {value && (
                                <motion.svg
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </motion.svg>
                            )}
                        </motion.div>
                        <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-200' : 'text-gray-700'}`}>
                            {label}
                        </span>
                    </div>
                );

            // Default input fields (text, email, phone, number, etc.)
            default:
                return (
                    <div className="w-full h-full flex flex-col">
                        <label className={labelClasses}>
                            {label}
                            {required && <span style={{ color: colors.primary }} className="ml-1">*</span>}
                        </label>
                        <input
                            type={type}
                            value={value}
                            onChange={(e) => handleChange(id, e.target.value)}
                            onFocus={() => setFocusedField(id)}
                            onBlur={() => setFocusedField(null)}
                            placeholder={placeholder || `Enter ${label?.toLowerCase() || 'value'}...`}
                            className={getInputStyles(isFocused)}
                            style={{
                                borderColor: isFocused ? colors.primary : undefined,
                                boxShadow: isFocused ? `0 0 0 3px ${colors.primaryGlow}` : undefined,
                            }}
                            required={required}
                        />
                    </div>
                );
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-start p-8 overflow-auto"
            style={{
                background: isDarkTheme
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                    : colors.bgGradient,
            }}
        >
            {/* Animated background elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-30 blur-3xl"
                    style={{ background: colors.primarySoft }}
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 60, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-3xl"
                    style={{ background: colors.primarySoft }}
                />
            </div>

            {/* Header with branding */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 flex items-center gap-2 text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}
            >
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Powered by Clianta</span>
            </motion.div>

            {/* Form Title */}
            {form.name && form.name !== 'Untitled Form' && (
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-3xl font-bold mb-2 text-center
                        ${isDarkTheme ? 'text-white' : 'text-gray-900'}
                    `}
                    style={{
                        background: colors.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    {form.name}
                </motion.h1>
            )}

            {form.description && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`text-center mb-8 max-w-lg ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}
                >
                    {form.description}
                </motion.p>
            )}

            {/* Canvas Form Container */}
            <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onSubmit={handleSubmit}
                className={`relative rounded-3xl overflow-hidden backdrop-blur-xl z-10
                    ${isDarkTheme
                        ? 'bg-gray-900/70 border border-gray-800'
                        : 'bg-white/70 border border-white/50'
                    }
                `}
                style={{
                    width: canvasSize.width,
                    minHeight: canvasSize.height,
                    flexShrink: 0,
                    boxShadow: isDarkTheme
                        ? `0 25px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`
                        : `0 25px 80px -20px ${colors.primaryGlow}, 0 0 0 1px rgba(255,255,255,0.8)`,
                    paddingBottom: hasButtonElement ? 0 : 80,
                }}
            >
                {/* Gradient border effect */}
                <div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primarySoft} 0%, transparent 50%, ${colors.primarySoft} 100%)`,
                        opacity: 0.1,
                    }}
                />

                {/* Form Elements */}
                {elements.map((element, index) => {
                    if (element.canvas?.visible === false) return null;

                    return (
                        <motion.div
                            key={element.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            style={{
                                position: 'absolute',
                                left: element.canvas?.x || 50,
                                top: element.canvas?.y || 50,
                                width: element.canvas?.width || 200,
                                height: element.canvas?.height || 60,
                                zIndex: element.canvas?.zIndex || 1,
                            }}
                        >
                            {renderElement(element)}
                        </motion.div>
                    );
                })}

                {/* Auto Submit Button - shown if no button element exists */}
                {!hasButtonElement && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: elements.length * 0.05 + 0.1, duration: 0.3 }}
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                            bottom: 24,
                            width: 'calc(100% - 80px)',
                            maxWidth: 400,
                        }}
                    >
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: `0 10px 40px ${colors.primaryGlow}` }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 text-white font-bold rounded-xl
                                disabled:opacity-50 disabled:cursor-not-allowed
                                flex items-center justify-center gap-3
                                transition-all duration-300 ease-out
                                shadow-lg hover:shadow-2xl"
                            style={{
                                background: colors.gradient,
                                boxShadow: `0 4px 20px ${colors.primaryGlow}`,
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>{form.settings?.submitButtonText || "Submit"}</span>
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </motion.form>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={`mt-8 text-xs ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}
            >
                🔒 Your data is encrypted and secure
            </motion.div>
        </div>
    );
}
