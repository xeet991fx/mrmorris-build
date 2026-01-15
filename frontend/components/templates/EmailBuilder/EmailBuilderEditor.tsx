"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";
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
    isReady: () => boolean;
}

interface EmailBuilderEditorProps {
    workspaceId: string;
}

// Convert legacy HTML body to Unlayer design structure
const convertLegacyHtmlToDesign = (htmlContent: string, templateName?: string) => {
    // Generate unique IDs
    const generateId = () => `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
        counters: {
            u_column: 1,
            u_row: 1,
            u_content_text: 1,
            u_content_html: 1,
        },
        body: {
            id: generateId(),
            rows: [
                {
                    id: generateId(),
                    cells: [1],
                    columns: [
                        {
                            id: generateId(),
                            contents: [
                                {
                                    id: generateId(),
                                    type: "html",
                                    values: {
                                        containerPadding: "20px",
                                        html: htmlContent,
                                    },
                                },
                            ],
                            values: {
                                backgroundColor: "#ffffff",
                                padding: "0px",
                                border: {},
                                borderRadius: "0px",
                            },
                        },
                    ],
                    values: {
                        displayCondition: null,
                        columns: false,
                        backgroundColor: "#ffffff",
                        columnsBackgroundColor: "",
                        backgroundImage: {
                            url: "",
                            fullWidth: true,
                            repeat: false,
                            center: true,
                            cover: false,
                        },
                        padding: "0px",
                        hideDesktop: false,
                        hideMobile: false,
                        noStackMobile: false,
                    },
                },
            ],
            values: {
                textColor: "#000000",
                backgroundColor: "#f5f5f5",
                backgroundImage: {
                    url: "",
                    fullWidth: true,
                    repeat: false,
                    center: true,
                    cover: false,
                },
                fontFamily: {
                    label: "Arial",
                    value: "arial,helvetica,sans-serif",
                },
                contentWidth: "600px",
                contentAlign: "center",
                preheaderText: "",
                linkStyle: {
                    body: true,
                    linkColor: "#0000ee",
                    linkHoverColor: "#0000ee",
                    linkUnderline: true,
                    linkHoverUnderline: true,
                },
            },
        },
    };
};

// Default empty email design for completely new templates
const getEmptyDesign = () => {
    const generateId = () => `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
        counters: {
            u_column: 1,
            u_row: 1,
            u_content_text: 1,
        },
        body: {
            id: generateId(),
            rows: [
                {
                    id: generateId(),
                    cells: [1],
                    columns: [
                        {
                            id: generateId(),
                            contents: [
                                {
                                    id: generateId(),
                                    type: "text",
                                    values: {
                                        containerPadding: "30px",
                                        textAlign: "center",
                                        lineHeight: "150%",
                                        text: "<h1 style='font-size: 28px; font-weight: bold; color: #1a1a1a; margin-bottom: 16px;'>Your Email Title</h1><p style='font-size: 16px; line-height: 160%; color: #4a4a4a;'>Start creating your email by clicking on elements in the left panel. Drag and drop content blocks to build your template.</p>",
                                    },
                                },
                            ],
                            values: {
                                backgroundColor: "#ffffff",
                                padding: "0px",
                                border: {},
                                borderRadius: "0px",
                            },
                        },
                    ],
                    values: {
                        displayCondition: null,
                        columns: false,
                        backgroundColor: "#ffffff",
                        columnsBackgroundColor: "",
                        backgroundImage: {
                            url: "",
                            fullWidth: true,
                            repeat: false,
                            center: true,
                            cover: false,
                        },
                        padding: "10px",
                        hideDesktop: false,
                        hideMobile: false,
                        noStackMobile: false,
                    },
                },
            ],
            values: {
                textColor: "#000000",
                backgroundColor: "#f0f0f0",
                backgroundImage: {
                    url: "",
                    fullWidth: true,
                    repeat: false,
                    center: true,
                    cover: false,
                },
                fontFamily: {
                    label: "Arial",
                    value: "arial,helvetica,sans-serif",
                },
                contentWidth: "600px",
                contentAlign: "center",
                preheaderText: "",
                linkStyle: {
                    body: true,
                    linkColor: "#6366f1",
                    linkHoverColor: "#4f46e5",
                    linkUnderline: true,
                    linkHoverUnderline: true,
                },
            },
        },
    };
};

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
        const [isEditorReady, setIsEditorReady] = useState(false);
        const hasLoadedDesign = useRef(false);
        const { currentTemplate, setHasUnsavedChanges } = useEmailTemplateStore();

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            exportHtml: (callback: (data: { design: any; html: string }) => void) => {
                if (!isEditorReady) {
                    console.warn("Editor not ready yet");
                    return;
                }
                const editor = emailEditorRef.current?.editor;
                if (editor?.exportHtml) {
                    editor.exportHtml((data: { design: any; html: string }) => {
                        callback(data);
                    });
                } else {
                    console.error("Editor exportHtml not available");
                }
            },
            loadDesign: (design: any) => {
                if (!isEditorReady) {
                    console.warn("Editor not ready yet");
                    return;
                }
                const editor = emailEditorRef.current?.editor;
                if (editor?.loadDesign) {
                    editor.loadDesign(design);
                } else {
                    console.error("Editor loadDesign not available");
                }
            },
            isReady: () => isEditorReady,
        }), [isEditorReady]);

        // Load design when both editor is ready AND template is loaded
        useEffect(() => {
            if (isEditorReady && currentTemplate && !hasLoadedDesign.current) {
                const editor = emailEditorRef.current?.editor;
                if (editor?.loadDesign) {
                    if (currentTemplate.builderJson) {
                        // Load existing Unlayer design
                        console.log("Loading existing builder JSON");
                        editor.loadDesign(currentTemplate.builderJson);
                    } else if (currentTemplate.body || currentTemplate.htmlContent) {
                        // Convert legacy HTML to Unlayer design
                        const legacyHtml = currentTemplate.htmlContent || currentTemplate.body || "";
                        console.log("Converting legacy HTML to Unlayer design");
                        const design = convertLegacyHtmlToDesign(legacyHtml, currentTemplate.name);
                        editor.loadDesign(design);
                        // Mark as unsaved so user can save the converted design
                        setHasUnsavedChanges(true);
                    } else {
                        // Load empty design for completely new templates
                        console.log("Loading empty design for new template");
                        editor.loadDesign(getEmptyDesign());
                    }
                    hasLoadedDesign.current = true;
                }
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isEditorReady, currentTemplate]);

        // Handle editor ready
        const handleReady = () => {
            console.log("Email editor is ready");
            setIsEditorReady(true);

            const editor = emailEditorRef.current?.editor;

            // Register callback for design changes
            if (editor?.registerCallback) {
                editor.registerCallback('design:updated', () => {
                    setHasUnsavedChanges(true);
                });
            }
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
