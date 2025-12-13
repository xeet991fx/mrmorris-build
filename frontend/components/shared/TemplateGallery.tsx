"use client";

import { motion } from "framer-motion";
import { PlusIcon, ArrowLongRightIcon } from "@heroicons/react/24/outline";

interface Template {
    id: string;
    title: string;
    description: string;
    icon?: string; // Emoji
    tags?: string[];
}

interface TemplateGalleryProps {
    title: string;
    description: string;
    templates: Template[];
    onSelect: (templateId: string) => void;
    onCreateBlank: () => void;
    actionLabel?: string;
}

export function TemplateGallery({
    title,
    description,
    templates,
    onSelect,
    onCreateBlank,
    actionLabel = "Create Blank",
}: TemplateGalleryProps) {
    return (
        <div className="w-full max-w-5xl mx-auto py-12 px-4">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
                    {title}
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    {description}
                </p>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {/* Blank Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    onClick={onCreateBlank}
                    className="group relative bg-card border border-dashed border-border hover:border-primary/50 rounded-xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center min-h-[200px]"
                >
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <PlusIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{actionLabel}</h3>
                    <p className="text-sm text-muted-foreground">Start from scratch with an empty canvas</p>

                    <div className="absolute inset-x-0 bottom-0 top-0 bg-primary/0 group-hover:bg-primary/5 transition-colors rounded-xl" />
                </motion.div>

                {/* Template Cards */}
                {templates.map((template) => (
                    <motion.div
                        key={template.id}
                        whileHover={{ y: -4 }}
                        onClick={() => onSelect(template.id)}
                        className="group relative bg-card border border-border hover:border-primary/50 rounded-xl p-6 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col min-h-[200px]"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-3xl">{template.icon || "📄"}</span>
                            {template.tags && template.tags.length > 0 && (
                                <span className="px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs font-medium">
                                    {template.tags[0]}
                                </span>
                            )}
                        </div>

                        <div className="mt-auto">
                            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                {template.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {template.description}
                            </p>

                            <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                Use Template <ArrowLongRightIcon className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
