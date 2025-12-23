"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";
import dynamic from "next/dynamic";

// Dynamically import EmailEditor to avoid SSR issues
const EmailEditor = dynamic(() => import("react-email-editor"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    ),
});

// ============================================
// TYPES
// ============================================

export interface EmailBuilderEditorRef {
    exportHtml: (callback: (data: { design: any; html: string }) => void) => void;
    loadDesign: (design: any) => void;
}

interface EmailBuilderEditorProps {
    workspaceId: string;
}

// ============================================
// UNLAYER CONFIGURATION
// ============================================

const getUnlayerOptions = (workspaceId: string) => ({
    projectId: process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID ? parseInt(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID) : undefined,
    displayMode: "email" as const,
    appearance: {
        theme: "light" as const,
        panels: {
            tools: {
                dock: "left" as const,
            },
        },
    },
    features: {
        imageEditor: true,
        stockImages: true,
        undoRedo: true,
        textEditor: {
            spellChecker: true,
        },
    },
    mergeTags: {
        firstName: {
            name: "First Name",
            value: "{{firstName}}",
            sample: "John",
        },
        lastName: {
            name: "Last Name",
            value: "{{lastName}}",
            sample: "Doe",
        },
        email: {
            name: "Email",
            value: "{{email}}",
            sample: "john@example.com",
        },
        company: {
            name: "Company",
            value: "{{company}}",
            sample: "Acme Inc",
        },
        phone: {
            name: "Phone",
            value: "{{phone}}",
            sample: "+1234567890",
        },
    },
    tools: {
        // Disable advanced features for basic tier
        form: { enabled: false },
    },
    // Image upload configuration
    images: {
        url: `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/upload-image`,
        headers: {
            Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
        },
    },
});

// ============================================
// COMPONENT
// ============================================

const EmailBuilderEditor = forwardRef<EmailBuilderEditorRef, EmailBuilderEditorProps>(
    ({ workspaceId }, ref) => {
        const emailEditorRef = useRef<any>(null);
        const { currentTemplate, setHasUnsavedChanges } = useEmailTemplateStore();

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            exportHtml: (callback: (data: { design: any; html: string }) => void) => {
                emailEditorRef.current?.exportHtml((data: { design: any; html: string }) => {
                    callback(data);
                });
            },
            loadDesign: (design: any) => {
                emailEditorRef.current?.loadDesign(design);
            },
        }));

        // Handle editor ready
        const handleReady = () => {
            console.log("Email editor is ready");

            // Load existing design if available
            if (currentTemplate?.builderJson) {
                emailEditorRef.current?.loadDesign(currentTemplate.builderJson);
            }

            // Add event listener for design changes
            // Note: onDesignChange prop doesn't exist, we need to use addEventListener
            emailEditorRef.current?.addEventListener('design:updated', () => {
                setHasUnsavedChanges(true);
            });
        };

        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <EmailEditor
                    ref={emailEditorRef}
                    onReady={handleReady}
                    options={getUnlayerOptions(workspaceId)}
                    style={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        border: "none"
                    }}
                />
            </div>
        );
    }
);

EmailBuilderEditor.displayName = "EmailBuilderEditor";

export default EmailBuilderEditor;
