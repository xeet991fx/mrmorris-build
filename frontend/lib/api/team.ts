/**
 * Team API Client
 */

import { axiosInstance } from "../axios";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type Role = "owner" | "admin" | "member" | "viewer";

export interface TeamMember {
    _id: string;
    workspaceId: string;
    userId?: {
        _id: string;
        name: string;
        email: string;
        profilePicture?: string;
    };
    role: Role;
    invitedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    invitedAt?: string;
    joinedAt?: string;
    status: "pending" | "active" | "removed";
    inviteEmail?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TeamOwner {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    role: "owner";
    status: "active";
}

export interface TeamResponse {
    success: boolean;
    data?: {
        owner: TeamOwner;
        members: TeamMember[];
        isOwner: boolean;
        currentUserRole: Role | null;
    };
    error?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

export const getTeam = async (workspaceId: string): Promise<TeamResponse> => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/team`);
    return response.data;
};

export const inviteTeamMember = async (
    workspaceId: string,
    data: { email: string; role: "admin" | "member" | "viewer" }
): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/team/invite`, data);
    return response.data;
};

export const updateMemberRole = async (
    workspaceId: string,
    memberId: string,
    role: "admin" | "member" | "viewer"
): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/team/${memberId}/role`, { role });
    return response.data;
};

export const removeMember = async (
    workspaceId: string,
    memberId: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/team/${memberId}`);
    return response.data;
};

export const acceptInvite = async (token: string): Promise<{ success: boolean; data?: { workspaceId: string }; error?: string }> => {
    const response = await axiosInstance.get(`/team/accept/${token}`);
    return response.data;
};
