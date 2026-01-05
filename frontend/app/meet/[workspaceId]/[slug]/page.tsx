"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon, ClockIcon, CheckCircleIcon, UserIcon, MapPinIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";

interface Scheduler {
  _id: string;
  name: string;
  description?: string;
  duration: number;
  timezone: string;
  location: {
    type: string;
    details?: string;
  };
  enableQualification: boolean;
  qualificationQuestions?: Array<{
    id: string;
    question: string;
    type: string;
    options?: string[];
    required: boolean;
  }>;
  brandColor?: string;
  logoUrl?: string;
  thankYouMessage?: string;
}

interface TimeSlot {
  start: string;
  end: string;
  hostUserId: string;
  hostName: string;
}

export default function PublicBookingPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const slug = params.slug as string;

  const [scheduler, setScheduler] = useState<Scheduler | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Form state
  const [step, setStep] = useState<'select' | 'details' | 'confirmation'>('select');
  const [attendee, setAttendee] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [qualificationAnswers, setQualificationAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedMeeting, setBookedMeeting] = useState<any>(null);

  // Fetch scheduler details
  useEffect(() => {
    fetchScheduler();
  }, [workspaceId, slug]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (scheduler && selectedDate) {
      fetchAvailableSlots();
    }
  }, [scheduler, selectedDate]);

  const fetchScheduler = async () => {
    try {
      const response = await axiosInstance.get(
        `/workspaces/public/${workspaceId}/schedulers/${slug}`
      );
      if (response.data.success) {
        setScheduler(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Scheduler not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await axiosInstance.get(
        `/workspaces/public/${workspaceId}/schedulers/${slug}/slots`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      );

      if (response.data.success) {
        setAvailableSlots(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot) return;

    // Validate required fields
    if (!attendee.name || !attendee.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post(
        `/workspaces/public/${workspaceId}/schedulers/${slug}/book`,
        {
          selectedSlot: {
            start: selectedSlot.start,
            end: selectedSlot.end,
          },
          attendee: {
            ...attendee,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          qualificationAnswers,
        }
      );

      if (response.data.success) {
        setBookedMeeting(response.data.data);
        setStep('confirmation');
        toast.success('Meeting booked successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to book meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  if (!scheduler) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">Scheduler not found</p>
        </div>
      </div>
    );
  }

  const brandColor = scheduler.brandColor || '#3B82F6';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          {scheduler.logoUrl && (
            <img src={scheduler.logoUrl} alt="Logo" className="h-12 mb-4" />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{scheduler.name}</h1>
          {scheduler.description && (
            <p className="text-gray-600">{scheduler.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              <span>{scheduler.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
              <span className="capitalize">{scheduler.location.type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Time */}
          {step === 'select' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Date & Time</h2>

              {/* Simple Date Navigation */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() - 1);
                      setSelectedDate(newDate);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Previous Day
                  </button>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{formatDate(selectedDate)}</p>
                  </div>
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(newDate.getDate() + 1);
                      setSelectedDate(newDate);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Next Day
                  </button>
                </div>
              </div>

              {/* Available Time Slots */}
              {loadingSlots ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading available times...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No available times for this date</p>
                  <p className="text-sm text-gray-500 mt-2">Please select another date</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      className="px-4 py-3 text-center border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                      style={{
                        borderColor: selectedSlot === slot ? brandColor : undefined,
                        backgroundColor: selectedSlot === slot ? `${brandColor}10` : undefined,
                      }}
                    >
                      <p className="font-medium text-gray-900">{formatTime(slot.start)}</p>
                      <p className="text-xs text-gray-500 mt-1">with {slot.hostName}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Enter Details */}
          {step === 'details' && selectedSlot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm p-8"
            >
              <button
                onClick={() => setStep('select')}
                className="text-sm text-gray-600 hover:text-gray-900 mb-6"
              >
                ← Back to time selection
              </button>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Your Details</h2>
              <p className="text-gray-600 mb-6">
                {formatDate(new Date(selectedSlot.start))} at {formatTime(selectedSlot.start)}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Attendee Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={attendee.name}
                    onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={attendee.email}
                    onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={attendee.phone}
                    onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Qualification Questions */}
                {scheduler.enableQualification && scheduler.qualificationQuestions && scheduler.qualificationQuestions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {q.question} {q.required && '*'}
                    </label>
                    {q.type === 'text' && (
                      <input
                        type="text"
                        required={q.required}
                        value={qualificationAnswers[q.id] || ''}
                        onChange={(e) => setQualificationAnswers({
                          ...qualificationAnswers,
                          [q.id]: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                    {q.type === 'select' && q.options && (
                      <select
                        required={q.required}
                        value={qualificationAnswers[q.id] || ''}
                        onChange={(e) => setQualificationAnswers({
                          ...qualificationAnswers,
                          [q.id]: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select an option</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirmation' && bookedMeeting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-sm p-8 text-center"
            >
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Confirmed!</h2>
              <p className="text-gray-600 mb-6">
                {scheduler.thankYouMessage || 'Your meeting has been scheduled successfully. You will receive a confirmation email shortly.'}
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Date & Time</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(new Date(bookedMeeting.scheduledAt))} at{' '}
                        {formatTime(bookedMeeting.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ClockIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">{scheduler.duration} minutes</p>
                    </div>
                  </div>
                  {bookedMeeting.location?.details && (
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium text-gray-900 break-all">
                          {bookedMeeting.location.details}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Check your email for the calendar invitation and meeting details.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
