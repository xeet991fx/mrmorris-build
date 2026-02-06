"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";
import { MeetingSchedulerGoogleMeetSettings } from "@/components/meet";
import { useGoogleConnection } from "@/hooks/useGoogleConnection";

interface AvailabilityWindow {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

interface QualificationQuestion {
    id: string;
    question: string;
    type: "text" | "select" | "radio" | "checkbox";
    options?: string[];
    required: boolean;
    disqualifyValue?: string;
}

interface SchedulerFormData {
    name: string;
    slug: string;
    description: string;
    duration: number;
    timezone: string;
    location: {
        type: string;
        details: string;
    };
    availabilityWindows: AvailabilityWindow[];
    minNotice: number;
    maxAdvanceBooking: number;
    enableQualification: boolean;
    qualificationQuestions: QualificationQuestion[];
    confirmationEmail: {
        enabled: boolean;
        subject: string;
        body: string;
    };
    reminderEmail: {
        enabled: boolean;
        hoursBeforeMeeting: number;
    };
    recordingSettings: {
        enabled: boolean;
        autoStart: boolean;
        notifyParticipants: boolean;
        accessLevel: "host" | "participants" | "workspace";
        retentionDays?: number;
    };
    googleCalendarIntegration: {
        enabled: boolean;
        calendarId?: string;
    };
    brandColor: string;
    thankYouMessage: string;
}

const DAYS_OF_WEEK = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const DEFAULT_AVAILABILITY: AvailabilityWindow[] = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
];

const DEFAULT_FORM_DATA: SchedulerFormData = {
    name: "",
    slug: "",
    description: "",
    duration: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: {
        type: "google_meet",
        details: "",
    },
    availabilityWindows: DEFAULT_AVAILABILITY,
    minNotice: 2,
    maxAdvanceBooking: 30,
    enableQualification: false,
    qualificationQuestions: [],
    confirmationEmail: {
        enabled: true,
        subject: "",
        body: "",
    },
    reminderEmail: {
        enabled: true,
        hoursBeforeMeeting: 24,
    },
    recordingSettings: {
        enabled: false,
        autoStart: false,
        notifyParticipants: true,
        accessLevel: "host",
        retentionDays: undefined,
    },
    googleCalendarIntegration: {
        enabled: false,
        calendarId: undefined,
    },
    brandColor: "#2563eb",
    thankYouMessage: "Thank you for scheduling a meeting with us!",
};

export default function SchedulerFormPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const schedulerId = params.schedulerId as string | undefined;

    const isEditing = !!schedulerId;

    const [formData, setFormData] = useState<SchedulerFormData>(DEFAULT_FORM_DATA);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"basic" | "availability" | "google-meet" | "qualification" | "emails" | "branding">("basic");

    const { connected: googleConnected, connectGoogle, loading: googleLoading } = useGoogleConnection();

    // Fetch scheduler data if editing
    useEffect(() => {
        if (isEditing) {
            fetchScheduler();
        }
    }, [schedulerId]);

    const fetchScheduler = async () => {
        try {
            const response = await axiosInstance.get(
                `/workspaces/${workspaceId}/meeting-schedulers/${schedulerId}`
            );
            if (response.data.success) {
                const scheduler = response.data.data;
                setFormData({
                    name: scheduler.name || "",
                    slug: scheduler.slug || "",
                    description: scheduler.description || "",
                    duration: scheduler.duration || 30,
                    timezone: scheduler.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    location: scheduler.location || { type: "google_meet", details: "" },
                    availabilityWindows: scheduler.availabilityWindows || DEFAULT_AVAILABILITY,
                    minNotice: scheduler.minNotice || 2,
                    maxAdvanceBooking: scheduler.maxAdvanceBooking || 30,
                    enableQualification: scheduler.enableQualification || false,
                    qualificationQuestions: scheduler.qualificationQuestions || [],
                    confirmationEmail: scheduler.confirmationEmail || { enabled: true, subject: "", body: "" },
                    reminderEmail: scheduler.reminderEmail || { enabled: true, hoursBeforeMeeting: 24 },
                    recordingSettings: scheduler.recordingSettings || DEFAULT_FORM_DATA.recordingSettings,
                    googleCalendarIntegration: scheduler.googleCalendarIntegration || { enabled: false },
                    brandColor: scheduler.brandColor || "#2563eb",
                    thankYouMessage: scheduler.thankYouMessage || "",
                });
            }
        } catch (error: any) {
            toast.error("Failed to fetch scheduler");
            router.push(`/projects/${workspaceId}/meetings/schedulers`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEditing) {
                await axiosInstance.put(
                    `/workspaces/${workspaceId}/meeting-schedulers/${schedulerId}`,
                    formData
                );
                toast.success("Scheduler updated successfully");
            } else {
                await axiosInstance.post(
                    `/workspaces/${workspaceId}/meeting-schedulers`,
                    formData
                );
                toast.success("Scheduler created successfully");
            }
            router.push(`/projects/${workspaceId}/meetings/schedulers`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to save scheduler");
        } finally {
            setSaving(false);
        }
    };

    const updateFormData = <K extends keyof SchedulerFormData>(
        key: K,
        value: SchedulerFormData[K]
    ) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    };

    const addAvailabilityWindow = () => {
        const nextDay = (formData.availabilityWindows.length % 7);
        setFormData((prev) => ({
            ...prev,
            availabilityWindows: [
                ...prev.availabilityWindows,
                { dayOfWeek: nextDay, startTime: "09:00", endTime: "17:00" },
            ],
        }));
    };

    const removeAvailabilityWindow = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            availabilityWindows: prev.availabilityWindows.filter((_, i) => i !== index),
        }));
    };

    const updateAvailabilityWindow = (
        index: number,
        field: keyof AvailabilityWindow,
        value: any
    ) => {
        setFormData((prev) => ({
            ...prev,
            availabilityWindows: prev.availabilityWindows.map((window, i) =>
                i === index ? { ...window, [field]: value } : window
            ),
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading scheduler...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push(`/projects/${workspaceId}/meetings/schedulers`)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {isEditing ? "Edit Scheduler" : "Create Scheduler"}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {isEditing ? "Update your booking page settings" : "Set up a new booking page"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !formData.name}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Scheduler"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-6">
                    <nav className="flex gap-6 -mb-px">
                        {[
                            { id: "basic", label: "Basic Info" },
                            { id: "availability", label: "Availability" },
                            { id: "google-meet", label: "Google Meet" },
                            { id: "qualification", label: "Qualification" },
                            { id: "emails", label: "Emails" },
                            { id: "branding", label: "Branding" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Form Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit}>
                    {/* Basic Info Tab */}
                    {activeTab === "basic" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>

                                <div className="space-y-6">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Scheduler Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => {
                                                updateFormData("name", e.target.value);
                                                if (!isEditing && !formData.slug) {
                                                    updateFormData("slug", generateSlug(e.target.value));
                                                }
                                            }}
                                            placeholder="e.g., 30-Minute Strategy Call"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>

                                    {/* Slug */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            URL Slug *
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">
                                                /meet/{workspaceId}/
                                            </span>
                                            <input
                                                type="text"
                                                value={formData.slug}
                                                onChange={(e) => updateFormData("slug", generateSlug(e.target.value))}
                                                placeholder="strategy-call"
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateFormData("description", e.target.value)}
                                            placeholder="Brief description of the meeting type..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Duration (minutes) *
                                        </label>
                                        <select
                                            value={formData.duration}
                                            onChange={(e) => updateFormData("duration", parseInt(e.target.value))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value={15}>15 minutes</option>
                                            <option value={30}>30 minutes</option>
                                            <option value={45}>45 minutes</option>
                                            <option value={60}>60 minutes</option>
                                            <option value={90}>90 minutes</option>
                                            <option value={120}>2 hours</option>
                                        </select>
                                    </div>

                                    {/* Scheduling Options */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Minimum Notice (hours)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.minNotice}
                                                onChange={(e) => updateFormData("minNotice", parseInt(e.target.value))}
                                                min={0}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Max Advance Booking (days)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.maxAdvanceBooking}
                                                onChange={(e) => updateFormData("maxAdvanceBooking", parseInt(e.target.value))}
                                                min={1}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Availability Tab */}
                    {activeTab === "availability" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Availability Windows</h2>
                                    <button
                                        type="button"
                                        onClick={addAvailabilityWindow}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Window
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.availabilityWindows.map((window, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                                        >
                                            <select
                                                value={window.dayOfWeek}
                                                onChange={(e) =>
                                                    updateAvailabilityWindow(index, "dayOfWeek", parseInt(e.target.value))
                                                }
                                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                {DAYS_OF_WEEK.map((day, i) => (
                                                    <option key={day} value={i}>
                                                        {day}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="time"
                                                value={window.startTime}
                                                onChange={(e) =>
                                                    updateAvailabilityWindow(index, "startTime", e.target.value)
                                                }
                                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />

                                            <span className="text-gray-500">to</span>

                                            <input
                                                type="time"
                                                value={window.endTime}
                                                onChange={(e) =>
                                                    updateAvailabilityWindow(index, "endTime", e.target.value)
                                                }
                                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => removeAvailabilityWindow(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    {formData.availabilityWindows.length === 0 && (
                                        <p className="text-center text-gray-500 py-8">
                                            No availability windows set. Add one to get started.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Google Meet Tab */}
                    {activeTab === "google-meet" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <MeetingSchedulerGoogleMeetSettings
                                recordingSettings={formData.recordingSettings}
                                googleCalendarIntegration={formData.googleCalendarIntegration}
                                locationType={formData.location.type}
                                onRecordingSettingsChange={(settings) =>
                                    updateFormData("recordingSettings", settings)
                                }
                                onGoogleCalendarIntegrationChange={(integration) =>
                                    updateFormData("googleCalendarIntegration", integration)
                                }
                                onLocationTypeChange={(type) =>
                                    updateFormData("location", { ...formData.location, type })
                                }
                                googleConnected={googleConnected}
                                onConnectGoogle={() => connectGoogle(window.location.pathname)}
                            />
                        </motion.div>
                    )}

                    {/* Qualification Tab */}
                    {activeTab === "qualification" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Lead Qualification</h2>
                                <p className="text-gray-600 mb-4">
                                    Configure qualification questions for booking page. (Coming soon)
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="enableQualification"
                                        checked={formData.enableQualification}
                                        onChange={(e) => updateFormData("enableQualification", e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="enableQualification" className="text-sm text-gray-700">
                                        Enable lead qualification questions
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Emails Tab */}
                    {activeTab === "emails" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Confirmation Email */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Confirmation Email</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="confirmationEnabled"
                                            checked={formData.confirmationEmail.enabled}
                                            onChange={(e) =>
                                                updateFormData("confirmationEmail", {
                                                    ...formData.confirmationEmail,
                                                    enabled: e.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="confirmationEnabled" className="text-sm text-gray-700">
                                            Send confirmation email after booking
                                        </label>
                                    </div>

                                    {formData.confirmationEmail.enabled && (
                                        <div className="space-y-4 mt-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Email Subject (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.confirmationEmail.subject}
                                                    onChange={(e) =>
                                                        updateFormData("confirmationEmail", {
                                                            ...formData.confirmationEmail,
                                                            subject: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Your meeting has been scheduled"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reminder Email */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Reminder Email</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="reminderEnabled"
                                            checked={formData.reminderEmail.enabled}
                                            onChange={(e) =>
                                                updateFormData("reminderEmail", {
                                                    ...formData.reminderEmail,
                                                    enabled: e.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="reminderEnabled" className="text-sm text-gray-700">
                                            Send reminder email before meeting
                                        </label>
                                    </div>

                                    {formData.reminderEmail.enabled && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Hours before meeting
                                            </label>
                                            <select
                                                value={formData.reminderEmail.hoursBeforeMeeting}
                                                onChange={(e) =>
                                                    updateFormData("reminderEmail", {
                                                        ...formData.reminderEmail,
                                                        hoursBeforeMeeting: parseInt(e.target.value),
                                                    })
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value={1}>1 hour</option>
                                                <option value={2}>2 hours</option>
                                                <option value={4}>4 hours</option>
                                                <option value={24}>24 hours</option>
                                                <option value={48}>48 hours</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Branding Tab */}
                    {activeTab === "branding" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Branding & Customization</h2>

                                <div className="space-y-6">
                                    {/* Brand Color */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Brand Color
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={formData.brandColor}
                                                onChange={(e) => updateFormData("brandColor", e.target.value)}
                                                className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={formData.brandColor}
                                                onChange={(e) => updateFormData("brandColor", e.target.value)}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Thank You Message */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Thank You Message
                                        </label>
                                        <textarea
                                            value={formData.thankYouMessage}
                                            onChange={(e) => updateFormData("thankYouMessage", e.target.value)}
                                            placeholder="Message shown after booking is confirmed..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </form>
            </div>
        </div>
    );
}
