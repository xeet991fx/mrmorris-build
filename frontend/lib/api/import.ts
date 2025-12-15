import { axiosInstance } from "../axios";

export interface ImportSummary {
    totalRows: number;
    validRows: number;
    imported: number;
    skipped: number;
    errors: number;
}

export interface ColumnMapping {
    sourceColumn: string;
    targetField: string;
    confidence: number;
}

export interface AvailableField {
    key: string;
    label: string;
    required: boolean;
}

export interface ImportResult {
    imported: Array<{ id: string; name: string; email?: string }>;
    skipped: Array<{ email?: string; name?: string; reason: string }>;
    errors: Array<{ email?: string; name?: string; error: string }>;
}

export interface ImportResponse {
    success: boolean;
    message: string;
    data?: {
        summary: ImportSummary;
        columnMappings: ColumnMapping[];
        warnings: string[];
        results: ImportResult;
    };
    error?: string;
}

export interface PreviewResponse {
    success: boolean;
    data?: {
        filename: string;
        totalRows: number;
        headers: string[];
        sampleData: Record<string, any>[];
        columnMappings: ColumnMapping[];
        availableFields: AvailableField[];
        warnings: string[];
    };
    error?: string;
}

/**
 * Preview/analyze a file for import - returns column mappings and sample data
 */
export const previewContacts = async (
    workspaceId: string,
    file: File
): Promise<PreviewResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/contacts/preview`,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 60000,
        }
    );
    return response.data;
};

/**
 * Preview/analyze a file for import - returns column mappings and sample data
 */
export const previewCompanies = async (
    workspaceId: string,
    file: File
): Promise<PreviewResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/companies/preview`,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 60000,
        }
    );
    return response.data;
};

/**
 * Import contacts from a file (CSV, Excel, PDF)
 */
export const importContacts = async (
    workspaceId: string,
    file: File,
    skipDuplicates: boolean = true
): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipDuplicates", String(skipDuplicates));

    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/contacts/import`,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120000, // 2 minutes for large files
        }
    );
    return response.data;
};

/**
 * Import companies from a file (CSV, Excel, PDF)
 */
export const importCompanies = async (
    workspaceId: string,
    file: File,
    skipDuplicates: boolean = true
): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipDuplicates", String(skipDuplicates));

    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/companies/import`,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120000, // 2 minutes for large files
        }
    );
    return response.data;
};
