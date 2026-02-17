/**
 * Report Dashboards API Client
 */

import { axiosInstance } from "../axios";

// ─── Dashboard CRUD ────────────────────────────────────────────

export const getReportDashboards = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/report-dashboards`);
    return response.data;
};

export const createReportDashboard = async (workspaceId: string, data: { name: string; description?: string }) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/report-dashboards`, data);
    return response.data;
};

export const getReportDashboard = async (workspaceId: string, dashboardId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/report-dashboards/${dashboardId}`);
    return response.data;
};

export const updateReportDashboard = async (
    workspaceId: string,
    dashboardId: string,
    data: { name?: string; description?: string; isFavorite?: boolean; reports?: any[]; tabs?: any[] }
) => {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/report-dashboards/${dashboardId}`, data);
    return response.data;
};

export const deleteReportDashboard = async (workspaceId: string, dashboardId: string) => {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/report-dashboards/${dashboardId}`);
    return response.data;
};

export const addReportWidget = async (
    workspaceId: string,
    dashboardId: string,
    data: { type: string; title: string; chartType: string; config?: any; position?: any; definition?: any }
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/reports`,
        data
    );
    return response.data;
};

export const updateReportWidget = async (
    workspaceId: string,
    dashboardId: string,
    reportId: string,
    data: Partial<{ type: string; title: string; chartType: string; config: any; position: any; definition: any; note: string; tabId: string }>
) => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/reports/${reportId}`,
        data
    );
    return response.data;
};

export const removeReportWidget = async (workspaceId: string, dashboardId: string, reportId: string) => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/reports/${reportId}`
    );
    return response.data;
};

export const duplicateReportWidget = async (
    workspaceId: string,
    dashboardId: string,
    reportId: string,
    targetDashboardId?: string
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/reports/${reportId}/duplicate`,
        targetDashboardId ? { targetDashboardId } : {}
    );
    return response.data;
};

// ─── Report Data ───────────────────────────────────────────────

export const getReportData = async (workspaceId: string, type: string, config: any = {}, definition?: any) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/report-data`, { type, config, definition });
    return response.data;
};

export const getDrillDownData = async (
    workspaceId: string,
    definition: any,
    context: {
        groupByValue?: any;
        segmentByValue?: any;
        page?: number;
        limit?: number;
        sort?: { field: string; direction: "asc" | "desc" };
        search?: string;
    }
) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/report-data/drill-down`, {
        definition,
        context,
        // Backend expects sort/search as top-level or in context?
        // Step 696 view shows: const { definition, context, sort, search } = req.body;
        // AND drillContext = { ...context, sort, search }
        // So passing them in context object HERE might not work if backend expects them top-level
        // BUT wait, look at my backend implementation in ReportData.ts (Step 700ish):
        // const drillContext = { ...(context || {}), sort: sort || undefined, search: search || undefined };
        // So backend expects `sort` and `search` as siblings to `context`.
        // I should update this function to send them correctly.
        sort: context.sort,
        search: context.search,
    });
    return response.data;
};

// ─── Report Sources Discovery ──────────────────────────────────

export const getReportSources = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/report-sources`);
    return response.data;
};

// ─── Dashboard Cloning ─────────────────────────────────────────

export const cloneReportDashboard = async (workspaceId: string, dashboardId: string) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/clone`
    );
    return response.data;
};

// ─── Filter Presets ────────────────────────────────────────────

export const saveFilterPreset = async (
    workspaceId: string,
    dashboardId: string,
    data: { name: string; filters: { key: string; value: string; label: string }[]; dateRange?: string }
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/filter-presets`,
        data
    );
    return response.data;
};

export const deleteFilterPreset = async (workspaceId: string, dashboardId: string, presetId: string) => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/filter-presets/${presetId}`
    );
    return response.data;
};

// ─── Report Templates ──────────────────────────────────────────

export const getReportTemplates = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/report-templates`);
    return response.data;
};

export const createReportTemplate = async (
    workspaceId: string,
    data: { name: string; description?: string; type: string; chartType: string; config?: any; definition?: any }
) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/report-templates`, data);
    return response.data;
};

export const deleteReportTemplate = async (workspaceId: string, templateId: string) => {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/report-templates/${templateId}`);
    return response.data;
};

// ─── Sharing ───────────────────────────────────────────────────

export const shareDashboard = async (
    workspaceId: string,
    dashboardId: string,
    action: "generate" | "revoke"
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/share`,
        { action }
    );
    return response.data;
};

export const getSharedDashboard = async (token: string) => {
    const response = await axiosInstance.get(`/shared/dashboards/${token}`);
    return response.data;
};

// ─── Access Permissions ────────────────────────────────────────

export const updateDashboardAccess = async (
    workspaceId: string,
    dashboardId: string,
    data: { type: "private" | "team" | "workspace"; allowedUsers?: string[] }
) => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/access`,
        data
    );
    return response.data;
};

// ─── Custom Field Definitions (for filtering) ─────────────────

export const getReportCustomFields = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/report-custom-fields`);
    return response.data;
};

// ─── Email Subscriptions ───────────────────────────────────────

export const getSubscriptions = async (workspaceId: string, dashboardId: string) => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/subscriptions`
    );
    return response.data;
};

export const createSubscription = async (
    workspaceId: string,
    dashboardId: string,
    data: {
        frequency: "daily" | "weekly" | "monthly";
        dayOfWeek?: number;
        dayOfMonth?: number;
        timeOfDay?: string;
        timezone?: string;
        recipients: { email: string; name?: string }[];
        subject?: string;
        message?: string;
        format?: "pdf" | "inline" | "csv";
    }
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/subscriptions`,
        data
    );
    return response.data;
};

export const updateSubscription = async (
    workspaceId: string,
    dashboardId: string,
    subscriptionId: string,
    data: Partial<{
        frequency: string;
        dayOfWeek: number;
        dayOfMonth: number;
        timeOfDay: string;
        timezone: string;
        recipients: { email: string; name?: string }[];
        subject: string;
        message: string;
        format: string;
        isActive: boolean;
    }>
) => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/subscriptions/${subscriptionId}`,
        data
    );
    return response.data;
};

export const deleteSubscription = async (
    workspaceId: string,
    dashboardId: string,
    subscriptionId: string
) => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/subscriptions/${subscriptionId}`
    );
    return response.data;
};

// ─── Embed Dashboard ──────────────────────────────────────────

export const getEmbedDashboard = async (token: string) => {
    const response = await axiosInstance.get(`/shared/embed/${token}`);
    return response.data;
};

// ─── Widget Comments ──────────────────────────────────────────

export const getWidgetComments = async (
    workspaceId: string,
    dashboardId: string,
    widgetId?: string
) => {
    const params = widgetId ? `?widgetId=${widgetId}` : "";
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/comments${params}`
    );
    return response.data;
};

export const createWidgetComment = async (
    workspaceId: string,
    dashboardId: string,
    data: { widgetId: string; text: string; mentions?: string[] }
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/comments`,
        data
    );
    return response.data;
};

export const deleteWidgetComment = async (
    workspaceId: string,
    dashboardId: string,
    commentId: string
) => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/report-dashboards/${dashboardId}/comments/${commentId}`
    );
    return response.data;
};

