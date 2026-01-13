"use client";

import React, { useState } from "react";
import { Form, FormField } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import {
    ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface CanvasFormViewProps {
    form: Form;
    onSubmit: (data: Record<string, any>) => Promise<void>;
    isSubmitting: boolean;
}

export default function CanvasFormView({
    form,
    onSubmit,
    isSubmitting
}: CanvasFormViewProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});

    // Sort elements by z-index
    const elements = [...form.fields].sort((a, b) =>
        (a.canvas?.zIndex || 0) - (b.canvas?.zIndex || 0)
    );

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        await onSubmit(formData);
    };

    const handleChange = (id: string, value: any) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const renderElement = (element: FormField) => {
        const { type, label, placeholder, required, id } = element;
        const value = formData[id] || "";

        // Common styles
        const inputStyles = "w-full flex-1 px-3 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm";

        switch (type) {
            case "heading":
                return <h2 className="text-xl font-bold text-gray-800 w-full h-full flex items-center">{label}</h2>;
            case "paragraph":
                return <p className="text-sm text-gray-600 w-full h-full whitespace-pre-wrap">{label}</p>;
            case "image":
                return null;

            case "divider":
                return <div className="w-full h-px bg-gray-300 my-auto" />;
            case "spacer":
                return <div className="w-full h-full" />; // Invisible spacer
            case "button":
                return (
                    <button
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting}
                        className="w-full h-full bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                        {label || "Submit"}
                    </button>
                );

            // Form Fields
            case "textarea":
                return (
                    <div className="w-full h-full flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1 pointer-events-none truncate">{label}{required && "*"}</label>
                        <textarea
                            value={value}
                            onChange={(e) => handleChange(id, e.target.value)}
                            placeholder={placeholder}
                            className={cn(inputStyles, "resize-none p-2")}
                            required={required}
                        />
                    </div>
                );
            case "select":
                return (
                    <div className="w-full h-full flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1 pointer-events-none truncate">{label}{required && "*"}</label>
                        <select
                            value={value}
                            onChange={(e) => handleChange(id, e.target.value)}
                            className={inputStyles}
                            required={required}
                        >
                            <option value="">{placeholder || "Select..."}</option>
                            {element.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );
            case "checkbox":
                return (
                    <div className="w-full h-full flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleChange(id, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                    </div>
                );
            default:
                return (
                    <div className="w-full h-full flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1 pointer-events-none truncate">{label}{required && "*"}</label>
                        <input
                            type={type}
                            value={value}
                            onChange={(e) => handleChange(id, e.target.value)}
                            placeholder={placeholder}
                            className={inputStyles}
                            required={required}
                        />
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start p-8 overflow-auto">
            <div className="mb-4 text-sm text-gray-500">
                Powered by MorrisB Forms
            </div>
            <form
                onSubmit={handleSubmit}
                className="relative bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200"
                style={{
                    width: 800, // Fixed layout width
                    height: 1200, // Fixed layout height
                    flexShrink: 0
                }}
            >
                {elements.map((element) => {
                    // Skip invisible elements
                    if (element.canvas?.visible === false) return null;

                    return (
                        <div
                            key={element.id}
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
                        </div>
                    );
                })}
            </form>
        </div>
    );
}
