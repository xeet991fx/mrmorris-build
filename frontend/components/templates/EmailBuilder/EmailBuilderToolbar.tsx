"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";
import DevicePreviewToggle from "./DevicePreviewToggle";
import { EmailBuilderEditorRef } from "./EmailBuilderEditor";

// ============================================
// TYPES
// ============================================

interface EmailBuilderToolbarProps {
    workspaceId: string;
    templateId: string;
    editorRef: React.RefObject<EmailBuilderEditorRef | null>;
    onSendTest: () => void;
    onValidate: () => void;
    onSettings: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function EmailBuilderToolbar({
    workspaceId,
    templateId,
    editorRef,
    onSendTest,
    onValidate,
    onSettings,
}: EmailBuilderToolbarProps) {
    const router = useRouter();
    const { currentTemplate, isSaving, hasUnsavedChanges, saveTemplate } = useEmailTemplateStore();

    // Handle save
    const handleSave = () => {
        editorRef.current?.exportHtml((data) => {
            const { design, html } = data;
            saveTemplate(workspaceId, templateId, {
                builderJson: design,
                htmlContent: html,
            });
        });
    };

    // Handle exit
    const handleExit = () => {
        if (hasUnsavedChanges) {
            if (confirm("You have unsaved changes. Discard them and exit?")) {
                router.push(`/projects/${workspaceId}/email-templates`);
            }
        } else {
            router.push(`/projects/${workspaceId}/email-templates`);
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+S or Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div
            className="flex-shrink-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left: Back button and template name */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExit}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        title="Back to templates"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">
                            {currentTemplate?.name || "Untitled Template"}
                        </h1>
                        {hasUnsavedChanges && (
                            <span className="text-xs text-orange-600">• Unsaved changes</span>
                        )}
                    </div>
                </div>

                {/* Center: Device preview toggle */}
                <DevicePreviewToggle />

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onSettings}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                        title="Template settings"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                        <span className="hidden md:inline">Settings</span>
                    </button>

                    <button
                        onClick={onValidate}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                        title="Validate links and images"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="hidden md:inline">Validate</span>
                    </button>

                    <button
                        onClick={onSendTest}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                        title="Send test email"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                        <span className="hidden md:inline">Send Test</span>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
