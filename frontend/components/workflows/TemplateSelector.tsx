"use client";

import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { workflowTemplates, WorkflowTemplate } from "@/lib/workflow/templates";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: WorkflowTemplate) => void;
    onCreateBlank: () => void;
}

export default function TemplateSelector({
    isOpen,
    onClose,
    onSelectTemplate,
    onCreateBlank,
}: TemplateSelectorProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">Choose a Template</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Start with a pre-built workflow or create from scratch
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Blank Option */}
                        <div
                            onClick={() => {
                                onCreateBlank();
                                onClose();
                            }}
                            className="group mb-6 p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-muted/50 cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                                    <SparklesIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                        Start from Scratch
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Build a custom workflow with complete control
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Templates Grid */}
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                                Pre-built Templates
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {workflowTemplates.map((template) => (
                                    <motion.div
                                        key={template.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            onSelectTemplate(template);
                                            onClose();
                                        }}
                                        className="group p-5 border border-border rounded-xl hover:border-primary hover:shadow-lg cursor-pointer transition-all bg-card"
                                    >
                                        {/* Icon & Title */}
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                                                template.color
                                            )}>
                                                {template.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                    {template.name}
                                                </h4>
                                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize mt-1">
                                                    {template.category.replace('-', ' ')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            {template.description}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-foreground">{template.steps.length}</span>
                                                <span>steps</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="capitalize">{template.triggerEntityType}</span>
                                                <span>based</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-border bg-muted/30">
                        <p className="text-xs text-muted-foreground text-center">
                            All templates can be customized after creation
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
