"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";
import EmailBuilderEditor, {
    EmailBuilderEditorRef,
} from "@/components/templates/EmailBuilder/EmailBuilderEditor";
import EmailBuilderToolbar from "@/components/templates/EmailBuilder/EmailBuilderToolbar";
import SendTestEmailModal from "@/components/templates/EmailBuilder/SendTestEmailModal";
import ValidationPanel from "@/components/templates/EmailBuilder/ValidationPanel";
import TemplateSettingsModal from "@/components/templates/EmailBuilder/TemplateSettingsModal";
import IntelligentAIPanel from "@/components/templates/EmailBuilder/IntelligentAIPanel";
import { Mail } from "lucide-react";

export default function EmailBuilderPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const templateId = params.templateId as string;

    const editorRef = useRef<EmailBuilderEditorRef | null>(null);
    const { loadTemplate, isLoading, hasUnsavedChanges, setHasUnsavedChanges } = useEmailTemplateStore();

    const [showTestModal, setShowTestModal] = useState(false);
    const [showValidationPanel, setShowValidationPanel] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);

    useEffect(() => {
        if (workspaceId && templateId) {
            loadTemplate(workspaceId, templateId);
        }
    }, [workspaceId, templateId, loadTemplate]);

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

    const getHtmlFromEditor = (): Promise<string> => {
        return new Promise((resolve) => {
            editorRef.current?.exportHtml((data) => {
                resolve(data.html);
            });
        });
    };

    const handleAIApplyDesign = (html: string, design: any) => {
        if (editorRef.current && design) {
            editorRef.current.loadDesign(design);
            setHasUnsavedChanges(true);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-12 h-12 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                    <div className="flex items-center gap-2 justify-center text-zinc-500">
                        <Mail className="w-4 h-4" />
                        <p className="text-sm">Loading email builder...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-zinc-900">
            {/* Toolbar */}
            <EmailBuilderToolbar
                workspaceId={workspaceId}
                templateId={templateId}
                editorRef={editorRef}
                onSendTest={() => setShowTestModal(true)}
                onValidate={() => setShowValidationPanel(true)}
                onSettings={() => setShowSettings(true)}
                onToggleAI={() => setShowAIPanel(!showAIPanel)}
                isAIPanelOpen={showAIPanel}
            />

            {/* Main Content - Editor with optional AI Panel */}
            <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
                {/* Email Builder */}
                <div className={`flex-1 h-full transition-all duration-300 ${showAIPanel ? 'mr-[400px]' : ''}`}>
                    <EmailBuilderEditor ref={editorRef} workspaceId={workspaceId} />
                </div>

                {/* Intelligent AI Panel (Sidebar) */}
                <IntelligentAIPanel
                    workspaceId={workspaceId}
                    isOpen={showAIPanel}
                    onClose={() => setShowAIPanel(false)}
                    onApplyDesign={handleAIApplyDesign}
                    editorRef={editorRef}
                />
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
