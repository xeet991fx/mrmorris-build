import axiosInstance from "../axios";

/**
 * Meeting API
 * 
 * Frontend API functions for meeting management
 */

export interface MeetingAttendee {
    type: "user" | "contact";
    userId?: string;
    contactId?: string;
    email: string;
    name: string;
    status: "pending" | "accepted" | "declined" | "tentative";
}

export interface Meeting {
    _id: string;
    workspaceId: string;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    meetingTypeId?: {
        _id: string;
        name: string;
        color: string;
        duration: number;
    };
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
    timezone?: string;
    location?: string;
    meetingUrl?: string;
    conferenceProvider?: "zoom" | "google_meet" | "teams" | "custom";
    attendees: MeetingAttendee[];
    status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
    contactId?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    companyId?: {
        _id: string;
        name: string;
    };
    notes?: string;
    outcome?: string;
    calendarEventId?: string;
    calendarEventLink?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MeetingType {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    duration: number;
    color: string;
    slug: string;
    isActive: boolean;
    locationType: "in_person" | "video" | "phone" | "custom";
    conferenceProvider?: "zoom" | "google_meet" | "teams";
    availability: Array<{
        day: number;
        startTime: string;
        endTime: string;
    }>;
    timezone: string;
    totalBookings: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMeetingInput {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
    timezone?: string;
    location?: string;
    meetingUrl?: string;
    conferenceProvider?: string;
    attendees?: MeetingAttendee[];
    contactId?: string;
    companyId?: string;
    notes?: string;
}

// Get meetings
export async function getMeetings(
    workspaceId: string,
    filters?: { startDate?: string; endDate?: string; status?: string; page?: number; limit?: number }
) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await axiosInstance.get(`/workspaces/${workspaceId}/meetings?${params.toString()}`);
    return response.data;
}

// Get single meeting
export async function getMeeting(workspaceId: string, meetingId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/meetings/${meetingId}`);
    return response.data;
}

// Create meeting
export async function createMeeting(workspaceId: string, data: CreateMeetingInput) {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/meetings`, data);
    return response.data;
}

// Update meeting
export async function updateMeeting(workspaceId: string, meetingId: string, data: Partial<CreateMeetingInput>) {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/meetings/${meetingId}`, data);
    return response.data;
}

// Delete meeting
export async function deleteMeeting(workspaceId: string, meetingId: string) {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/meetings/${meetingId}`);
    return response.data;
}

// Get meeting types
export async function getMeetingTypes(workspaceId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/meeting-types`);
    return response.data;
}

// Create meeting type
export async function createMeetingType(workspaceId: string, data: Partial<MeetingType>) {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/meeting-types`, data);
    return response.data;
}

// Update meeting type
export async function updateMeetingType(workspaceId: string, typeId: string, data: Partial<MeetingType>) {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/meeting-types/${typeId}`, data);
    return response.data;
}

// Delete meeting type
export async function deleteMeetingType(workspaceId: string, typeId: string) {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/meeting-types/${typeId}`);
    return response.data;
}
