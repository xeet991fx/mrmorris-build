"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";

interface Scheduler {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  duration: number;
  isActive: boolean;
  location: {
    type: string;
  };
  stats: {
    totalBookings: number;
    completedMeetings: number;
    cancelledMeetings: number;
  };
  createdAt: string;
}

export default function SchedulersPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSchedulers();
  }, [workspaceId]);

  const fetchSchedulers = async () => {
    try {
      const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/meeting-schedulers`
      );

      if (response.data.success) {
        setSchedulers(response.data.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to fetch schedulers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduler?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/workspaces/${workspaceId}/meeting-schedulers/${id}`);
      toast.success('Scheduler deleted successfully');
      fetchSchedulers();
    } catch (error: any) {
      toast.error('Failed to delete scheduler');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await axiosInstance.put(`/workspaces/${workspaceId}/meeting-schedulers/${id}`, {
        isActive: !currentStatus,
      });
      toast.success(`Scheduler ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchSchedulers();
    } catch (error: any) {
      toast.error('Failed to update scheduler');
    }
  };

  const copyBookingLink = (slug: string) => {
    const link = `${window.location.origin}/meet/${workspaceId}/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Booking link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading schedulers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meeting Schedulers</h1>
            <p className="text-gray-600 mt-1">
              Create and manage your booking pages (Calendly-style)
            </p>
          </div>
          <button
            onClick={() => router.push(`/projects/${workspaceId}/meetings/schedulers/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Scheduler
          </button>
        </div>

        {/* Schedulers Grid */}
        {schedulers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No schedulers yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first meeting scheduler to start accepting bookings
            </p>
            <button
              onClick={() => router.push(`/projects/${workspaceId}/meetings/schedulers/new`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Scheduler
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedulers.map((scheduler) => (
              <motion.div
                key={scheduler._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {scheduler.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {scheduler.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          scheduler.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {scheduler.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>{scheduler.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="capitalize">
                        {scheduler.location.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {scheduler.stats.totalBookings}
                      </p>
                      <p className="text-xs text-gray-600">Bookings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {scheduler.stats.completedMeetings}
                      </p>
                      <p className="text-xs text-gray-600">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {scheduler.stats.cancelledMeetings}
                      </p>
                      <p className="text-xs text-gray-600">Cancelled</p>
                    </div>
                  </div>

                  {/* Booking Link */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-gray-600 truncate">
                        /meet/{workspaceId}/{scheduler.slug}
                      </code>
                      <button
                        onClick={() => copyBookingLink(scheduler.slug)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Copy booking link"
                      >
                        <LinkIcon className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/projects/${workspaceId}/meetings/schedulers/${scheduler._id}/edit`
                        )
                      }
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(scheduler._id, scheduler.isActive)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        scheduler.isActive
                          ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                          : 'text-white bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {scheduler.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(scheduler._id)}
                      className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
