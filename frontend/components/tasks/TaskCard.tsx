"use client";

import { useState } from "react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
    CheckCircle,
    Clock,
    AlertCircle,
    MoreHorizontal,
    Edit,
    Trash2,
    Phone,
    Mail,
    Calendar as CalendarIcon,
    User,
    Building,
    Briefcase,
    Tag
} from "lucide-react";
import { completeTask, deleteTask, Task } from "@/lib/api/task";
import { toast } from "react-hot-toast";

interface TaskCardProps {
    task: Task;
    workspaceId: string;
    onEdit: () => void;
    onUpdate: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    call: <Phone size={14} />,
    email: <Mail size={14} />,
    meeting: <CalendarIcon size={14} />,
    follow_up: <Clock size={14} />,
    review: <CheckCircle size={14} />,
    other: <AlertCircle size={14} />,
};

const PRIORITY_COLORS: Record<string, string> = {
    low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
    pending: { bg: "bg-yellow-500", icon: <Clock size={16} /> },
    in_progress: { bg: "bg-blue-500", icon: <AlertCircle size={16} /> },
    completed: { bg: "bg-green-500", icon: <CheckCircle size={16} /> },
    cancelled: { bg: "bg-gray-500", icon: <AlertCircle size={16} /> },
};

export default function TaskCard({ task, workspaceId, onEdit, onUpdate }: TaskCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(false);

    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed";
    const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

    const handleComplete = async () => {
        setLoading(true);
        try {
            await completeTask(workspaceId, task._id);
            toast.success("Task completed!");
            onUpdate();
        } catch (error) {
            console.error("Error completing task:", error);
            toast.error("Failed to complete task");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this task?")) return;

        setLoading(true);
        try {
            await deleteTask(workspaceId, task._id);
            toast.success("Task deleted");
            onUpdate();
        } catch (error) {
            console.error("Error deleting task:", error);
            toast.error("Failed to delete task");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg border ${isOverdue ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
            } p-4 hover:shadow-md transition-shadow`}>
            <div className="flex items-start gap-3">
                {/* Completion Checkbox */}
                <button
                    onClick={handleComplete}
                    disabled={loading || task.status === "completed"}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === "completed"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 dark:border-gray-600 hover:border-green-500"
                        }`}
                >
                    {task.status === "completed" && <CheckCircle size={12} />}
                </button>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h3 className={`font-medium ${task.status === "completed"
                                    ? "text-gray-400 line-through"
                                    : "text-gray-900 dark:text-white"
                                }`}>
                                {task.title}
                            </h3>

                            {task.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                    {task.description}
                                </p>
                            )}
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <MoreHorizontal size={16} className="text-gray-400" />
                            </button>

                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 w-32">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onEdit();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            <Edit size={14} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                handleDelete();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        {/* Type Badge */}
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
                            {TYPE_ICONS[task.type]}
                            {task.type.replace("_", " ")}
                        </span>

                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                        </span>

                        {/* Due Date */}
                        {task.dueDate && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue
                                    ? "text-red-600"
                                    : isDueToday
                                        ? "text-orange-600"
                                        : "text-gray-500 dark:text-gray-400"
                                }`}>
                                <CalendarIcon size={12} />
                                {isOverdue
                                    ? `Overdue by ${formatDistanceToNow(new Date(task.dueDate))}`
                                    : isDueToday
                                        ? `Due today${task.dueTime ? ` at ${task.dueTime}` : ""}`
                                        : format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                        )}

                        {/* Assignee */}
                        {task.assigneeId && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <User size={12} />
                                {task.assigneeId.name}
                            </span>
                        )}

                        {/* Contact */}
                        {task.contactId && (
                            <span className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                                <User size={12} />
                                {task.contactId.firstName} {task.contactId.lastName}
                            </span>
                        )}

                        {/* Company */}
                        {task.companyId && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Building size={12} />
                                {task.companyId.name}
                            </span>
                        )}

                        {/* Opportunity */}
                        {task.opportunityId && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Briefcase size={12} />
                                {task.opportunityId.title}
                            </span>
                        )}

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                                <Tag size={12} className="text-gray-400" />
                                {task.tags.slice(0, 2).map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300"
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {task.tags.length > 2 && (
                                    <span className="text-xs text-gray-400">
                                        +{task.tags.length - 2}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
