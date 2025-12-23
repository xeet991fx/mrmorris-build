"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";
import EmailBuilderEditor, {
    EmailBuilderEditorRef,
} from "@/components/templates/EmailBuilder/EmailBuilderEditor";
import EmailBuilderToolbar from "@/components/templates/EmailBuilder/EmailBuilderToolbar";
import SendTestEmailModal from "@/components/templates/EmailBuilder/SendTestEmailModal";
import ValidationPanel from "@/components/templates/EmailBuilder/ValidationPanel";
import TemplateSettingsModal from "@/components/templates/EmailBuilder/TemplateSettingsModal";

// ============================================
// MAIN BUILDER PAGE
// ============================================

export default function EmailBuilderPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const templateId = params.templateId as string;

    const editorRef = useRef<EmailBuilderEditorRef | null>(null);
    const { loadTemplate, isLoading, hasUnsavedChanges } = useEmailTemplateStore();

    const [showTestModal, setShowTestModal] = useState(false);
    const [showValidationPanel, setShowValidationPanel] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Load template on mount
    useEffect(() => {
        if (workspaceId && templateId) {
            loadTemplate(workspaceId, templateId);
        }
    }, [workspaceId, templateId, loadTemplate]);

    // Warn user before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Helper to get HTML from editor
    const getHtmlFromEditor = (): Promise<string> => {
        return new Promise((resolve) => {
            editorRef.current?.exportHtml((data) => {
                resolve(data.html);
            });
        });
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9ACD32] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading email builder...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-gray-900">
            {/* Toolbar */}
            <EmailBuilderToolbar
                workspaceId={workspaceId}
                templateId={templateId}
                editorRef={editorRef}
                onSendTest={() => setShowTestModal(true)}
                onValidate={() => setShowValidationPanel(true)}
                onSettings={() => setShowSettings(true)}
            />

            {/* Email Builder - Full Screen */}
            <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
                <EmailBuilderEditor ref={editorRef} workspaceId={workspaceId} />
            </div>

            {/* Modals */}
            <SendTestEmailModal
                isOpen={showTestModal}
                onClose={() => setShowTestModal(false)}
                workspaceId={workspaceId}
                templateId={templateId}
                onGetHtml={getHtmlFromEditor}
            />

            <ValidationPanel
                isOpen={showValidationPanel}
                onClose={() => setShowValidationPanel(false)}
                workspaceId={workspaceId}
                templateId={templateId}
                onGetHtml={getHtmlFromEditor}
            />

            <TemplateSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
}
