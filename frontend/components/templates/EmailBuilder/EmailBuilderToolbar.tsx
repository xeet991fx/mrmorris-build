"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    Cog6ToothIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import { Mail, Save } from "lucide-react";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";
import DevicePreviewToggle from "./DevicePreviewToggle";
import { EmailBuilderEditorRef } from "./EmailBuilderEditor";
import { cn } from "@/lib/utils";

interface EmailBuilderToolbarProps {
    workspaceId: string;
    templateId: string;
    editorRef: React.RefObject<EmailBuilderEditorRef | null>;
    onSendTest: () => void;
    onValidate: () => void;
    onSettings: () => void;
    onToggleAI: () => void;
    isAIPanelOpen: boolean;
}

export default function EmailBuilderToolbar({
    workspaceId,
    templateId,
    editorRef,
    onSendTest,
    onValidate,
    onSettings,
    onToggleAI,
    isAIPanelOpen,
}: EmailBuilderToolbarProps) {
    const router = useRouter();
    const { currentTemplate, isSaving, hasUnsavedChanges, saveTemplate, setHasUnsavedChanges } = useEmailTemplateStore();

    const handleSave = async () => {
        if (!editorRef.current) {
            console.error("Editor reference not available");
            return;
        }

        try {
            editorRef.current.exportHtml((data) => {
                if (!data || !data.design || !data.html) {
                    console.error("Invalid data from editor:", data);
                    return;
                }

                const { design, html } = data;
                saveTemplate(workspaceId, templateId, {
                    builderJson: design,
                    htmlContent: html,
                });
            });
        } catch (error) {
            console.error("Error during save:", error);
        }
    };

    const handleExit = () => {
        if (hasUnsavedChanges) {
            if (confirm("You have unsaved changes. Discard them and exit?")) {
                router.push(`/projects/${workspaceId}/email-templates`);
            }
        } else {
            router.push(`/projects/${workspaceId}/email-templates`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div
            className="relative flex-shrink-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div className="flex items-center justify-between px-4 py-3">
                {/* Left: Back button and template name */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExit}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                        title="Back to templates"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-violet-500" />
                        <div>
                            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                {currentTemplate?.name || "Untitled Template"}
                            </h1>
                            {hasUnsavedChanges && (
                                <span className="text-xs text-amber-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Unsaved changes
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center: Device preview toggle */}
                <DevicePreviewToggle />

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleAI}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            isAIPanelOpen
                                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25"
                                : "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 text-violet-600 dark:text-violet-400 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 border border-violet-200 dark:border-violet-800"
                        )}
                        title="AI Design Assistant"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">AI Assistant</span>
                    </button>

                    <button
                        onClick={onSettings}
                        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Template settings"
                    >
                        <Cog6ToothIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">Settings</span>
                    </button>

                    <button
                        onClick={onValidate}
                        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Validate links and images"
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">Validate</span>
                    </button>

                    <button
                        onClick={onSendTest}
                        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Send test email"
                    >
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">Test</span>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            hasUnsavedChanges
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
