import axiosInstance from "../axios";

/**
 * Team API
 * 
 * Frontend API functions for team and member management
 */

export interface TeamMember {
    userId: {
        _id: string;
        name: string;
        email: string;
        profilePicture?: string;
    };
    role: "owner" | "admin" | "manager" | "member";
    joinedAt: string;
}

export interface Team {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    members: TeamMember[];
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RoleInfo {
    type: string;
    name: string;
    permissions: string[];
}

// Get teams in workspace
export async function getTeams(workspaceId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/teams`);
    return response.data;
}

// Get single team
export async function getTeam(workspaceId: string, teamId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/teams/${teamId}`);
    return response.data;
}

// Create team
export async function createTeam(workspaceId: string, data: { name: string; description?: string }) {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/teams`, data);
    return response.data;
}

// Update team
export async function updateTeam(workspaceId: string, teamId: string, data: { name?: string; description?: string }) {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/teams/${teamId}`, data);
    return response.data;
}

// Delete team
export async function deleteTeam(workspaceId: string, teamId: string) {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/teams/${teamId}`);
    return response.data;
}

// Add member to team
export async function addTeamMember(workspaceId: string, teamId: string, userId: string, role: string = "member") {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/teams/${teamId}/members`, { userId, role });
    return response.data;
}

// Update member role
export async function updateMemberRole(workspaceId: string, teamId: string, memberId: string, role: string) {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/teams/${teamId}/members/${memberId}`, { role });
    return response.data;
}

// Remove member from team
export async function removeTeamMember(workspaceId: string, teamId: string, memberId: string) {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/teams/${teamId}/members/${memberId}`);
    return response.data;
}

// Get available roles
export async function getRoles(workspaceId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/roles`);
    return response.data;
}
