"use client";

import { useState } from "react";
import { Switch } from "@headlessui/react";
import {
    VideoCameraIcon,
    CircleStackIcon,
    BellIcon,
    ClockIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    UserIcon,
} from "@heroicons/react/24/outline";

interface RecordingSettings {
    enabled: boolean;
    autoStart: boolean;
    notifyParticipants: boolean;
    accessLevel: "host" | "participants" | "workspace";
    retentionDays?: number;
}

interface GoogleCalendarIntegration {
    enabled: boolean;
    calendarId?: string;
}

interface MeetingSchedulerGoogleMeetSettingsProps {
    recordingSettings: RecordingSettings;
    googleCalendarIntegration: GoogleCalendarIntegration;
    locationType: string;
    onRecordingSettingsChange: (settings: RecordingSettings) => void;
    onGoogleCalendarIntegrationChange: (integration: GoogleCalendarIntegration) => void;
    onLocationTypeChange: (type: string) => void;
    googleConnected?: boolean;
    onConnectGoogle?: () => void;
}

const accessLevelOptions = [
    {
        value: "host",
        label: "Host Only",
        description: "Only the meeting host can access recordings",
        icon: UserIcon,
    },
    {
        value: "participants",
        label: "Participants",
        description: "Host and meeting participants can access recordings",
        icon: UserGroupIcon,
    },
    {
        value: "workspace",
        label: "Workspace",
        description: "All workspace members can access recordings",
        icon: BuildingOfficeIcon,
    },
];

const retentionOptions = [
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" },
    { value: 180, label: "6 months" },
    { value: 365, label: "1 year" },
    { value: undefined, label: "Forever" },
];

export function MeetingSchedulerGoogleMeetSettings({
    recordingSettings,
    googleCalendarIntegration,
    locationType,
    onRecordingSettingsChange,
    onGoogleCalendarIntegrationChange,
    onLocationTypeChange,
    googleConnected = false,
    onConnectGoogle,
}: MeetingSchedulerGoogleMeetSettingsProps) {
    const updateRecordingSetting = <K extends keyof RecordingSettings>(
        key: K,
        value: RecordingSettings[K]
    ) => {
        onRecordingSettingsChange({
            ...recordingSettings,
            [key]: value,
        });
    };

    return (
        <div className="space-y-8">
            {/* Google Meet Location Setting */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <VideoCameraIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Google Meet Integration</h3>
                        <p className="text-sm text-gray-500">
                            Automatically create Google Meet links for video meetings
                        </p>
                    </div>
                </div>

                {/* Google Connection Status */}
                {!googleConnected ? (
                    <div className="bg-amber-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-amber-800 mb-3">
                            Connect your Google account to enable automatic Meet link creation
                        </p>
                        <button
                            type="button"
                            onClick={onConnectGoogle}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                                />
                            </svg>
                            Connect Google Account
                        </button>
                    </div>
                ) : (
                    <div className="bg-green-50 rounded-lg p-3 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-sm text-green-800">Google account connected</p>
                    </div>
                )}

                {/* Location Type Selection */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Meeting Location
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => onLocationTypeChange("google_meet")}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${locationType === "google_meet"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <VideoCameraIcon className="w-6 h-6 text-blue-600 mb-2" />
                            <p className="font-medium text-gray-900">Google Meet</p>
                            <p className="text-xs text-gray-500 mt-1">Auto-create Meet links</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => onLocationTypeChange("custom_link")}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${locationType === "custom_link"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <svg className="w-6 h-6 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <p className="font-medium text-gray-900">Custom Link</p>
                            <p className="text-xs text-gray-500 mt-1">Zoom, Teams, etc.</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => onLocationTypeChange("in_person")}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${locationType === "in_person"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <svg className="w-6 h-6 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="font-medium text-gray-900">In Person</p>
                            <p className="text-xs text-gray-500 mt-1">Physical location</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* Recording Settings - Only show if Google Meet is selected */}
            {locationType === "google_meet" && googleConnected && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <CircleStackIcon className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Recording Settings</h3>
                            <p className="text-sm text-gray-500">
                                Configure automatic meeting recording
                            </p>
                        </div>
                    </div>

                    {/* Enable Recording */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Enable Recording</p>
                                <p className="text-sm text-gray-500">
                                    Allow meetings to be recorded automatically
                                </p>
                            </div>
                            <Switch
                                checked={recordingSettings.enabled}
                                onChange={(value: boolean) => updateRecordingSetting("enabled", value)}
                                className={`${recordingSettings.enabled ? "bg-blue-600" : "bg-gray-200"
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                            >
                                <span
                                    className={`${recordingSettings.enabled ? "translate-x-6" : "translate-x-1"
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                            </Switch>
                        </div>

                        {recordingSettings.enabled && (
                            <>
                                {/* Auto-start Recording */}
                                <div className="flex items-center justify-between pl-4 border-l-2 border-gray-100">
                                    <div>
                                        <p className="font-medium text-gray-900">Auto-start Recording</p>
                                        <p className="text-sm text-gray-500">
                                            Automatically start recording when meeting begins
                                        </p>
                                    </div>
                                    <Switch
                                        checked={recordingSettings.autoStart}
                                        onChange={(value: boolean) => updateRecordingSetting("autoStart", value)}
                                        className={`${recordingSettings.autoStart ? "bg-blue-600" : "bg-gray-200"
                                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span
                                            className={`${recordingSettings.autoStart ? "translate-x-6" : "translate-x-1"
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </Switch>
                                </div>

                                {/* Notify Participants */}
                                <div className="flex items-center justify-between pl-4 border-l-2 border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <BellIcon className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-900">Notify Participants</p>
                                            <p className="text-sm text-gray-500">
                                                Inform attendees when recording starts
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={recordingSettings.notifyParticipants}
                                        onChange={(value: boolean) => updateRecordingSetting("notifyParticipants", value)}
                                        className={`${recordingSettings.notifyParticipants ? "bg-blue-600" : "bg-gray-200"
                                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                    >
                                        <span
                                            className={`${recordingSettings.notifyParticipants ? "translate-x-6" : "translate-x-1"
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </Switch>
                                </div>

                                {/* Access Level */}
                                <div className="pl-4 border-l-2 border-gray-100">
                                    <label className="block font-medium text-gray-900 mb-3">
                                        Recording Access Level
                                    </label>
                                    <div className="space-y-2">
                                        {accessLevelOptions.map((option) => (
                                            <label
                                                key={option.value}
                                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${recordingSettings.accessLevel === option.value
                                                        ? "border-blue-500 bg-blue-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="accessLevel"
                                                    value={option.value}
                                                    checked={recordingSettings.accessLevel === option.value}
                                                    onChange={(e) =>
                                                        updateRecordingSetting(
                                                            "accessLevel",
                                                            e.target.value as RecordingSettings["accessLevel"]
                                                        )
                                                    }
                                                    className="sr-only"
                                                />
                                                <option.icon className="w-5 h-5 text-gray-500" />
                                                <div>
                                                    <p className="font-medium text-gray-900">{option.label}</p>
                                                    <p className="text-xs text-gray-500">{option.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Retention Period */}
                                <div className="pl-4 border-l-2 border-gray-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <ClockIcon className="w-5 h-5 text-gray-400" />
                                        <label className="block font-medium text-gray-900">
                                            Recording Retention
                                        </label>
                                    </div>
                                    <select
                                        value={recordingSettings.retentionDays || ""}
                                        onChange={(e) =>
                                            updateRecordingSetting(
                                                "retentionDays",
                                                e.target.value ? parseInt(e.target.value) : undefined
                                            )
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {retentionOptions.map((option) => (
                                            <option key={option.label} value={option.value || ""}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Recordings will be automatically deleted after this period
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Recording Requirements Notice */}
                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> Recording features require Google Workspace Business Standard
                            or higher. Recordings are stored in the host's Google Drive.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
