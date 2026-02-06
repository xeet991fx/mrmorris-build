// Google Meet and Recording Types

export interface IGoogleMeetData {
    meetingCode: string;
    conferenceId: string;
    hangoutLink: string;
    entryPoints?: IGoogleMeetEntryPoint[];
    recordingEnabled: boolean;
    recording?: IGoogleMeetRecording;
}

export interface IGoogleMeetEntryPoint {
    uri: string;
    label?: string;
    entryPointType: "video" | "phone" | "sip" | "more";
}

export interface IGoogleMeetRecording {
    status: "not_started" | "recording" | "completed" | "failed";
    driveFileId?: string;
    driveFileUrl?: string;
    recordedAt?: string;
    duration?: number;
    transcriptFileId?: string;
    transcriptUrl?: string;
}

export interface IRecordingSettings {
    enabled: boolean;
    autoStart: boolean;
    notifyParticipants: boolean;
    accessLevel: "host" | "participants" | "workspace";
    retentionDays?: number;
}

export interface IGoogleCalendarIntegration {
    enabled: boolean;
    calendarId?: string;
}

export interface IGoogleConnectionStatus {
    connected: boolean;
    connectedAt?: string;
}

// API Request/Response Types

export interface CreateGoogleMeetRequest {
    conferenceDataVersion?: number;
}

export interface CreateGoogleMeetResponse {
    success: boolean;
    data?: IGoogleMeetData;
    error?: string;
}

export interface GetGoogleMeetResponse {
    success: boolean;
    data?: IGoogleMeetData;
    error?: string;
}

export interface GoogleAuthUrlResponse {
    success: boolean;
    data?: {
        authUrl: string;
    };
    error?: string;
}

export interface GoogleConnectionStatusResponse {
    success: boolean;
    data?: IGoogleConnectionStatus;
    error?: string;
}

export interface RecordingListItem {
    _id: string;
    meetingId: string;
    meetingTitle: string;
    scheduledAt: string;
    duration: number;
    attendees: {
        name: string;
        email: string;
    }[];
    googleMeet: {
        hangoutLink: string;
        recording: IGoogleMeetRecording;
    };
}

export interface ListRecordingsResponse {
    success: boolean;
    data?: RecordingListItem[];
    error?: string;
}

export interface GetRecordingResponse {
    success: boolean;
    data?: {
        driveFileId: string;
        driveFileUrl: string;
        name: string;
        mimeType: string;
        size: number;
        createdTime: string;
        duration?: number;
    };
    error?: string;
}

export interface ShareRecordingRequest {
    emails: string[];
    role?: "reader" | "writer";
    sendNotification?: boolean;
}

export interface ShareRecordingResponse {
    success: boolean;
    data?: {
        sharedWith: string[];
    };
    error?: string;
}

export interface UpdateRecordingStatusRequest {
    status: "not_started" | "recording" | "completed" | "failed";
    driveFileId?: string;
    driveFileUrl?: string;
    duration?: number;
}

export interface UpdateRecordingStatusResponse {
    success: boolean;
    data?: {
        recording: IGoogleMeetRecording;
    };
    error?: string;
}
