import axiosInstance from "../axios";

/**
 * Report API
 * 
 * Frontend API functions for reports and forecasts
 */

export interface ReportFilter {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "gt" | "lt" | "gte" | "lte" | "in" | "between";
    value: any;
}

export interface ReportColumn {
    field: string;
    label: string;
    visible: boolean;
    width?: number;
}

export interface Report {
    _id: string;
    workspaceId: string;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    name: string;
    description?: string;
    type: "contacts" | "companies" | "opportunities" | "activities" | "tasks" | "emails" | "custom";
    baseEntity: string;
    filters: ReportFilter[];
    columns: ReportColumn[];
    sortBy?: {
        field: string;
        order: "asc" | "desc";
    };
    chartType?: "bar" | "line" | "pie" | "table" | "funnel";
    isPublic: boolean;
    lastRunAt?: string;
    runCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReportInput {
    name: string;
    description?: string;
    type: string;
    baseEntity: string;
    filters?: ReportFilter[];
    columns?: ReportColumn[];
    chartType?: string;
    isPublic?: boolean;
}

// Get reports
export async function getReports(workspaceId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/reports`);
    return response.data;
}

// Get single report
export async function getReport(workspaceId: string, reportId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/reports/${reportId}`);
    return response.data;
}

// Create report
export async function createReport(workspaceId: string, data: CreateReportInput) {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/reports`, data);
    return response.data;
}

// Update report
export async function updateReport(workspaceId: string, reportId: string, data: Partial<CreateReportInput>) {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/reports/${reportId}`, data);
    return response.data;
}

// Delete report
export async function deleteReport(workspaceId: string, reportId: string) {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/reports/${reportId}`);
    return response.data;
}

// Get forecasts
export async function getForecasts(workspaceId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/forecasts`);
    return response.data;
}

// Get pipeline forecast
export async function getPipelineForecast(workspaceId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/forecast/pipeline`);
    return response.data;
}
