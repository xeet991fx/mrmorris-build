"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    PencilIcon,
    XMarkIcon,
    CalendarDaysIcon,
    FlagIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useTaskStore } from "@/store/useTaskStore";
import { Task, CreateTaskData } from "@/lib/api/task";
import { cn } from "@/lib/utils";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { TaskIntelligencePanel } from "@/components/tasks/TaskIntelligencePanel";

// ============================================
// SLIDE-OVER MODAL COMPONENT
// ============================================

interface TaskSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task | null;
    workspaceId: string;
}

function TaskSlideOver({ isOpen, onClose, task, workspaceId }: TaskSlideOverProps) {
    const { createTask, updateTask } = useTaskStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CreateTaskData>({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: "",
        tags: [],
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || "",
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
                tags: task.tags || [],
            });
        } else {
            setFormData({
                title: "",
                description: "",
                status: "todo",
                priority: "medium",
                dueDate: "",
                tags: [],
            });
        }
    }, [task, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        setIsSubmitting(true);
        if (task) {
            await updateTask(workspaceId, task._id, formData);
        } else {
            await createTask(workspaceId, formData);
        }
        setIsSubmitting(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-40"
                    />
                    {/* Slide-over panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 z-50 shadow-2xl"
                    >
                        <form onSubmit={handleSubmit} className="h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {task ? "Edit Task" : "New Task"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                                {/* Title */}
                                <div>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full text-xl font-medium bg-transparent border-0 border-b-2 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 dark:focus:border-emerald-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0 pb-2 transition-colors"
                                        placeholder="Task title..."
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:border-zinc-300 dark:focus:border-zinc-700 resize-none transition-colors"
                                        placeholder="Add description..."
                                        rows={3}
                                    />
                                </div>

                                {/* Priority & Status */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 block">
                                            Priority
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {(["low", "medium", "high", "urgent"] as const).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, priority: p })}
                                                    className={cn(
                                                        "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                                        formData.priority === p
                                                            ? p === "urgent" ? "bg-red-500 text-white"
                                                                : p === "high" ? "bg-orange-500 text-white"
                                                                    : p === "medium" ? "bg-blue-500 text-white"
                                                                        : "bg-zinc-500 text-white"
                                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                    )}
                                                >
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 block">
                                            Status
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {(["todo", "in_progress", "completed"] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, status: s })}
                                                    className={cn(
                                                        "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                                        formData.status === s
                                                            ? "bg-emerald-500 text-white"
                                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                    )}
                                                >
                                                    {s === "in_progress" ? "In Progress" : s === "todo" ? "To Do" : "Completed"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.title.trim()}
                                    className="flex-1 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : task ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// TASK ROW COMPONENT
// ============================================

function TaskRow({
    task,
    onComplete,
    onEdit,
    onDelete,
}: {
    task: Task;
    onComplete: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
    const isCompleted = task.status === "completed";

    const priorityColors = {
        low: "text-zinc-400",
        medium: "text-blue-500",
        high: "text-orange-500",
        urgent: "text-red-500",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer",
                isCompleted && "opacity-50"
            )}
            onClick={onEdit}
        >
            {/* Checkbox */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                }}
                disabled={isCompleted}
                className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                    isCompleted
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-500"
                )}
            >
                {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate",
                    isCompleted && "line-through text-zinc-500 dark:text-zinc-500"
                )}>
                    {task.title}
                </p>
                {task.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {task.description}
                    </p>
                )}
            </div>

            {/* Priority indicator */}
            <FlagIcon className={cn("w-4 h-4 flex-shrink-0", priorityColors[task.priority])} />

            {/* Due date */}
            {task.dueDate && (
                <span className={cn(
                    "text-xs flex-shrink-0",
                    isOverdue ? "text-red-500" : "text-zinc-400"
                )}>
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

export default function TasksPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { track } = useInsightTracking({
        workspaceId,
        page: 'tasks',
        enabled: !!workspaceId,
    });

    const {
        tasks,
        isLoading,
        stats,
        statusFilter,
        priorityFilter,
        searchQuery,
        fetchTasks,
        fetchStats,
        completeTask,
        deleteTask,
        setStatusFilter,
        setPriorityFilter,
        setSearchQuery,
    } = useTaskStore();

    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        if (workspaceId) {
            fetchTasks(workspaceId);
            fetchStats(workspaceId);
        }
    }, [workspaceId, fetchTasks, fetchStats, statusFilter, priorityFilter]);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsSlideOverOpen(true);
    };

    const handleCreate = () => {
        setEditingTask(null);
        setIsSlideOverOpen(true);
    };

    const handleClose = () => {
        setIsSlideOverOpen(false);
        setEditingTask(null);
    };

    const filteredTasks = tasks.filter((task) => {
        if (!searchQuery) return true;
        return (
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    // Group tasks by status for display
    const todoTasks = filteredTasks.filter(t => t.status === 'todo');
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');

    return (
        <div className="h-full overflow-y-auto">
            <TaskSlideOver
                isOpen={isSlideOverOpen}
                onClose={handleClose}
                task={editingTask}
                workspaceId={workspaceId}
            />

            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Tasks
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Track and manage your work
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        New Task
                    </button>
                </motion.div>

                {/* Stats Row */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.byStatus.todo || 0}</span>
                            <span className="text-sm text-zinc-500">to do</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-500">{stats.byStatus.in_progress || 0}</span>
                            <span className="text-sm text-zinc-500">in progress</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-red-500">{stats.overdue || 0}</span>
                            <span className="text-sm text-zinc-500">overdue</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-emerald-500">{stats.byStatus.completed || 0}</span>
                            <span className="text-sm text-zinc-500">completed</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Search & Filter Bar */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
                >
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {(["all", "todo", "in_progress", "completed"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap",
                                    statusFilter === status
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 sm:bg-transparent dark:sm:bg-transparent"
                                )}
                            >
                                {status === "all" ? "All" : status === "in_progress" ? "In Progress" : status === "todo" ? "To Do" : "Done"}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Task List */}
            <div className="px-8 pb-8">
                {isLoading ? (
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <CheckCircleIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No tasks</h3>
                        <p className="text-sm text-zinc-500 mb-6">Create your first task to get started</p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            New Task
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredTasks.map((task, index) => (
                            <TaskRow
                                key={task._id}
                                task={task}
                                onComplete={() => completeTask(workspaceId, task._id)}
                                onEdit={() => handleEdit(task)}
                                onDelete={() => deleteTask(workspaceId, task._id)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
