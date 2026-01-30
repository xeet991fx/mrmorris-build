import { create } from "zustand";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

export interface EmailTemplate {
    _id: string;
    workspaceId: string;
    createdBy: string;
    name: string;
    subject: string;
    body?: string;
    builderJson?: any;
    htmlContent?: string;
    thumbnailUrl?: string;
    category: string;
    description?: string;
    isDefault: boolean;
    isPredesigned: boolean;
    variables: string[];
    version: number;
    usageCount: number;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ValidationError {
    type: "broken-link" | "invalid-link" | "missing-image" | "broken-image" | "unreachable-image";
    message: string;
    severity: "error" | "warning";
}

interface EmailTemplateState {
    // Current template being edited
    currentTemplate: EmailTemplate | null;
    isLoading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;

    // Preview settings
    previewDevice: "desktop" | "mobile" | "tablet";

    // Validation
    validationErrors: ValidationError[];
    isValidating: boolean;

    // Actions
    loadTemplate: (workspaceId: string, templateId: string) => Promise<void>;
    saveTemplate: (workspaceId: string, templateId: string, data: any) => Promise<void>;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
    setPreviewDevice: (device: "desktop" | "mobile" | "tablet") => void;
    validateTemplate: (workspaceId: string, templateId: string, html: string) => Promise<void>;
    sendTestEmail: (workspaceId: string, templateId: string, email: string, html: string) => Promise<void>;
    reset: () => void;
}

// ============================================
// ZUSTAND STORE
// ============================================

export const useEmailTemplateStore = create<EmailTemplateState>((set, get) => ({
    // Initial state
    currentTemplate: null,
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    previewDevice: "desktop",
    validationErrors: [],
    isValidating: false,

    // Load template from backend
    loadTemplate: async (workspaceId: string, templateId: string) => {
        set({ isLoading: true });
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${templateId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();
            if (data.success) {
                set({
                    currentTemplate: data.data,
                    isLoading: false,
                    hasUnsavedChanges: false,
                });
            } else {
                throw new Error(data.error || "Failed to load template");
            }
        } catch (error: any) {
            console.error("Load template error:", error);
            toast.error(error.message || "Failed to load template");
            set({ isLoading: false });
        }
    },

    // Save template to backend
    saveTemplate: async (workspaceId: string, templateId: string, data: any) => {
        set({ isSaving: true });
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            const currentTemplate = get().currentTemplate;
            if (!currentTemplate) {
                throw new Error("No current template loaded");
            }

            if (!data.builderJson || !data.htmlContent) {
                throw new Error("Missing required template data");
            }

            const payload = {
                name: currentTemplate.name || data.name,
                subject: currentTemplate.subject || data.subject,
                category: currentTemplate.category || data.category || "custom",
                description: currentTemplate.description || data.description,
                builderJson: data.builderJson,
                htmlContent: data.htmlContent,
            };

            console.log("Saving template to:", `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${templateId}`);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${templateId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Save failed with status:", res.status, errorText);
                throw new Error(`Server error: ${res.status} ${res.statusText}`);
            }

            const responseData = await res.json();
            console.log("Save response:", responseData);

            if (responseData.success) {
                set({
                    currentTemplate: responseData.data,
                    isSaving: false,
                    hasUnsavedChanges: false,
                });
                toast.success("Template saved successfully!");
            } else {
                throw new Error(responseData.error || "Failed to save template");
            }
        } catch (error: any) {
            console.error("Save template error:", error);
            toast.error(error.message || "Failed to save template");
            set({ isSaving: false });
        }
    },

    // Set unsaved changes flag
    setHasUnsavedChanges: (hasChanges: boolean) => {
        set({ hasUnsavedChanges: hasChanges });
    },

    // Set preview device
    setPreviewDevice: (device: "desktop" | "mobile" | "tablet") => {
        set({ previewDevice: device });
    },

    // Validate template (links and images)
    validateTemplate: async (workspaceId: string, templateId: string, html: string) => {
        set({ isValidating: true, validationErrors: [] });
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${templateId}/validate`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ html }),
                }
            );

            const data = await res.json();
            if (data.success) {
                set({
                    validationErrors: data.data.errors || [],
                    isValidating: false,
                });

                if (data.data.errors?.length === 0) {
                    toast.success("All links and images are valid!");
                } else {
                    toast.error(`Found ${data.data.errors.length} validation issue(s)`);
                }
            } else {
                throw new Error(data.error || "Validation failed");
            }
        } catch (error: any) {
            console.error("Validate template error:", error);
            toast.error(error.message || "Failed to validate template");
            set({ isValidating: false });
        }
    },

    // Send test email
    sendTestEmail: async (
        workspaceId: string,
        templateId: string,
        email: string,
        html: string
    ) => {
        try {
            const token = localStorage.getItem("token");
            const currentTemplate = get().currentTemplate;

            const sampleData = {
                firstName: "John",
                lastName: "Doe",
                email: email,
                company: "Sample Company",
                phone: "+1234567890",
            };

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${templateId}/send-test`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        html,
                        subject: currentTemplate?.subject || "Test Email",
                        sampleData,
                    }),
                }
            );

            const data = await res.json();
            if (data.success) {
                toast.success(`Test email sent to ${email}!`);
            } else {
                throw new Error(data.error || "Failed to send test email");
            }
        } catch (error: any) {
            console.error("Send test email error:", error);
            toast.error(error.message || "Failed to send test email");
        }
    },

    // Reset store
    reset: () => {
        set({
            currentTemplate: null,
            isLoading: false,
            isSaving: false,
            hasUnsavedChanges: false,
            previewDevice: "desktop",
            validationErrors: [],
            isValidating: false,
        });
    },
}));
