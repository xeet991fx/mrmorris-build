"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, User, Building, Briefcase, Tag } from "lucide-react";
import { createTask, updateTask, CreateTaskInput, UpdateTaskInput, Task } from "@/lib/api/task";
import { toast } from "react-hot-toast";

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    task?: Task | null;
    onSuccess: () => void;
    // Optional: Pre-fill linked entity
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
}

const TASK_TYPES = [
    { value: "call", label: "Call" },
    { value: "email", label: "Email" },
    { value: "meeting", label: "Meeting" },
    { value: "follow_up", label: "Follow-up" },
    { value: "review", label: "Review" },
    { value: "other", label: "Other" },
];

const PRIORITIES = [
    { value: "low", label: "Low", color: "bg-gray-500" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

export default function TaskModal({
    isOpen,
    onClose,
    workspaceId,
    task,
    onSuccess,
    contactId,
    companyId,
    opportunityId,
}: TaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "other",
        priority: "medium",
        dueDate: "",
        dueTime: "",
        estimatedMinutes: "",
        notes: "",
        tags: "",
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || "",
                description: task.description || "",
                type: task.type || "other",
                priority: task.priority || "medium",
                dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
                dueTime: task.dueTime || "",
                estimatedMinutes: task.estimatedMinutes?.toString() || "",
                notes: task.notes || "",
                tags: task.tags?.join(", ") || "",
            });
        } else {
            setFormData({
                title: "",
                description: "",
                type: "other",
                priority: "medium",
                dueDate: "",
                dueTime: "",
                estimatedMinutes: "",
                notes: "",
                tags: "",
            });
        }
    }, [task, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error("Please enter a task title");
            return;
        }

        setLoading(true);
        try {
            const data: CreateTaskInput | UpdateTaskInput = {
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                type: formData.type,
                priority: formData.priority,
                dueDate: formData.dueDate || undefined,
                dueTime: formData.dueTime || undefined,
                estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : undefined,
                tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
            };

            // Add linked entities
            if (contactId) (data as CreateTaskInput).contactId = contactId;
            if (companyId) (data as CreateTaskInput).companyId = companyId;
            if (opportunityId) (data as CreateTaskInput).opportunityId = opportunityId;

            if (task) {
                await updateTask(workspaceId, task._id, data as UpdateTaskInput);
            } else {
                await createTask(workspaceId, data as CreateTaskInput);
            }

            onSuccess();
        } catch (error: any) {
            console.error("Error saving task:", error);
            toast.error(error.response?.data?.error || "Failed to save task");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task ? "Edit Task" : "Create Task"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Task Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Enter task title"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {TASK_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {PRIORITIES.map((priority) => (
                                    <option key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Due Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Calendar size={16} className="inline mr-1" />
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Clock size={16} className="inline mr-1" />
                                Due Time
                            </label>
                            <input
                                type="time"
                                value={formData.dueTime}
                                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add task details..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {/* Estimated Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estimated Time (minutes)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={formData.estimatedMinutes}
                            onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                            placeholder="e.g., 30"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Tag size={16} className="inline mr-1" />
                            Tags (comma separated)
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="e.g., sales, follow-up, important"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
