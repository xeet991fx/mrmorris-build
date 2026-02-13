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
    data: { name?: string; description?: string; isFavorite?: boolean; reports?: any[] }
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
    data: { type: string; title: string; chartType: string; config?: any; position?: any; definition?: any }
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
    context: { groupByValue?: any; segmentByValue?: any; page?: number; limit?: number }
) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/report-data/drill-down`, {
        definition,
        context,
    });
    return response.data;
};

// ─── Report Sources Discovery ──────────────────────────────────

export const getReportSources = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/report-sources`);
    return response.data;
};
