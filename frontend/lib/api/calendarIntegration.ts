import { axiosInstance } from "../axios";

/**
 * Calendar Integration API
 */

export interface CalendarIntegration {
    _id: string;
    userId: string;
    workspaceId: string;
    provider: "google" | "outlook";
    email: string;
    isActive: boolean;
    lastSyncAt?: string;
    syncError?: string;
    syncEnabled: boolean;
    twoWaySync: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CalendarEvent {
    _id: string;
    workspaceId: string;
    title: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime: string;
    timezone: string;
    attendees: { email: string; name?: string; status: string }[];
    contactId?: { firstName: string; lastName: string; email: string };
    status: string;
    meetingLink?: string;
    externalId?: string;
    provider?: "google" | "outlook" | "internal";
    createdAt: string;
}

/**
 * Get Google Calendar connect URL
 */
export const getCalendarConnectUrl = async (workspaceId: string) => {
    const response = await axiosInstance.get(
        `/calendar/connect/google?workspaceId=${workspaceId}`
    );
    return response.data;
};

/**
 * Get all calendar integrations for workspace
 */
export const getCalendarIntegrations = async (workspaceId: string) => {
    const response = await axiosInstance.get(
        `/calendar/integrations?workspaceId=${workspaceId}`
    );
    return response.data;
};

/**
 * Disconnect calendar integration
 */
export const disconnectCalendarIntegration = async (integrationId: string) => {
    const response = await axiosInstance.delete(
        `/calendar/${integrationId}/disconnect`
    );
    return response.data;
};

/**
 * Sync calendar events
 */
export const syncCalendar = async (integrationId: string) => {
    const response = await axiosInstance.post(
        `/calendar/${integrationId}/sync`
    );
    return response.data;
};

/**
 * Get calendar events for workspace
 */
export const getCalendarEvents = async (
    workspaceId: string,
    startDate?: string,
    endDate?: string
) => {
    let url = `/calendar/events?workspaceId=${workspaceId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await axiosInstance.get(url);
    return response.data;
};

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (data: {
    workspaceId: string;
    title: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime?: string;
    attendees?: { email: string }[];
    contactId?: string;
    syncToGoogle?: boolean;
}) => {
    const response = await axiosInstance.post("/calendar/events", data);
    return response.data;
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (eventId: string) => {
    const response = await axiosInstance.delete(`/calendar/events/${eventId}`);
    return response.data;
};

/**
 * Update a calendar event
 */
export const updateCalendarEvent = async (
    eventId: string,
    data: {
        title?: string;
        description?: string;
        location?: string;
        startTime?: string;
        endTime?: string;
    }
) => {
    const response = await axiosInstance.patch(`/calendar/events/${eventId}`, data);
    return response.data;
};

/**
 * Sync a local event to Google Calendar
 */
export const syncEventToGoogle = async (eventId: string) => {
    const response = await axiosInstance.post(`/calendar/events/${eventId}/sync-to-google`);
    return response.data;
};

/**
 * Remove event from Google Calendar (unsync)
 */
export const unsyncEventFromGoogle = async (eventId: string) => {
    const response = await axiosInstance.post(`/calendar/events/${eventId}/unsync-from-google`);
    return response.data;
};
