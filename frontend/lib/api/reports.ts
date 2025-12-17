/**
 * Reports API Client
 */

import { axiosInstance } from "../axios";

export const getReportsOverview = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/reports/overview`);
    return response.data;
};

export const getReportsPipeline = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/reports/pipeline`);
    return response.data;
};

export const getReportsActivity = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/reports/activity`);
    return response.data;
};

export const getReportsEmail = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/reports/email`);
    return response.data;
};
