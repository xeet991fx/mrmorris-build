"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { workflowTemplates, WorkflowTemplate, cloneTemplateSteps } from "@/lib/workflow/templates";
import { cn } from "@/lib/utils";

// ============================================
// PROPS
// ============================================

interface WorkflowTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: WorkflowTemplate, steps: any[]) => void;
}

// ============================================
// TEMPLATE CARD
// ============================================

function TemplateCard({
    template,
    onSelect,
}: {
    template: WorkflowTemplate;
    onSelect: () => void;
}) {
    const stepCounts = {
        actions: template.steps.filter((s) => s.type === "action").length,
        delays: template.steps.filter((s) => s.type === "delay").length,
    };

    return (
        <button
            onClick={onSelect}
            className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all group"
        >
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br flex-shrink-0",
                        template.color
                    )}
                >
                    {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {template.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">{template.triggerEntityType}-based</span>
                        <span>•</span>
                        <span>{stepCounts.actions} actions</span>
                        <span>•</span>
                        <span>{stepCounts.delays} delays</span>
                    </div>
                </div>
            </div>
        </button>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkflowTemplatesModal({
    isOpen,
    onClose,
    onSelectTemplate,
}: WorkflowTemplatesModalProps) {
    const handleSelectTemplate = (template: WorkflowTemplate) => {
        const steps = cloneTemplateSteps(template.id);
        onSelectTemplate(template, steps);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-card border border-border shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                            <DocumentDuplicateIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-lg font-semibold text-foreground">
                                                Start from Template
                                            </Dialog.Title>
                                            <p className="text-xs text-muted-foreground">
                                                Choose a pre-built workflow to get started
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                                    {workflowTemplates.map((template) => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            onSelect={() => handleSelectTemplate(template)}
                                        />
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-4 border-t border-border bg-muted/30">
                                    <p className="text-xs text-muted-foreground text-center">
                                        Templates can be customized after creation
                                    </p>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
