"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    TrashIcon,
    PencilIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";
import { useTaskStore } from "@/store/useTaskStore";
import { Task, CreateTaskData, UpdateTaskData } from "@/lib/api/task";
import { cn } from "@/lib/utils";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { TaskIntelligencePanel } from "@/components/tasks/TaskIntelligencePanel";

// ============================================
// TASK MODAL COMPONENT
// ============================================

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task | null;
    workspaceId: string;
}

function TaskModal({ isOpen, onClose, task, workspaceId }: TaskModalProps) {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
                <h2 className="text-xl font-bold text-foreground mb-4">
                    {task ? "Edit Task" : "Create Task"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter task title..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="Add description..."
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.title.trim()}
                            className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : task ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ============================================
// TASK CARD COMPONENT
// ============================================

const PRIORITY_COLORS = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS = {
    todo: ClockIcon,
    in_progress: ClockIcon,
    completed: CheckCircleSolidIcon,
    cancelled: ExclamationTriangleIcon,
};

function TaskCard({
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
    const StatusIcon = STATUS_ICONS[task.status];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all",
                isCompleted && "opacity-60"
            )}
        >
            <div className="flex items-start gap-3">
                <button
                    onClick={onComplete}
                    disabled={isCompleted}
                    className={cn(
                        "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isCompleted
                            ? "border-green-500 bg-green-500"
                            : "border-muted-foreground hover:border-green-500"
                    )}
                >
                    {isCompleted && <CheckCircleIcon className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                            "font-medium text-foreground truncate",
                            isCompleted && "line-through"
                        )}>
                            {task.title}
                        </h3>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                            {task.priority}
                        </span>
                    </div>
                    {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                        </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {task.dueDate && (
                            <span className={cn("flex items-center gap-1", isOverdue && "text-red-500")}>
                                <ClockIcon className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        )}
                        <span className="capitalize">{task.status.replace("_", " ")}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
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

    // Track actions for AI insights
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        if (workspaceId) {
            fetchTasks(workspaceId);
            fetchStats(workspaceId);
        }
    }, [workspaceId, fetchTasks, fetchStats, statusFilter, priorityFilter]);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    // Filter tasks locally for search
    const filteredTasks = tasks.filter((task) => {
        if (!searchQuery) return true;
        return (
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="min-h-screen bg-card/95">
            <TaskModal
                isOpen={isModalOpen}
                onClose={handleClose}
                task={editingTask}
                workspaceId={workspaceId}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10 bg-card">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
                    <p className="text-xs text-muted-foreground">
                        Manage your to-dos and follow-ups
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Task
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-foreground">{stats.byStatus.todo || 0}</p>
                            <p className="text-sm text-muted-foreground">To Do</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-blue-500">{stats.byStatus.in_progress || 0}</p>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-red-500">{stats.overdue || 0}</p>
                            <p className="text-sm text-muted-foreground">Overdue</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <p className="text-2xl font-bold text-green-500">{stats.byStatus.completed || 0}</p>
                            <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Task Intelligence */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <TaskIntelligencePanel
                    workspaceId={workspaceId}
                    tasks={tasks}
                    onTaskAction={(taskId, action) => {
                        track(action, 'task', taskId);
                        // Handle action execution
                    }}
                />
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-2">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Status</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                        ))}
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-16">
                        <CheckCircleIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first task to get started</p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Create Task
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map((task) => (
                            <TaskCard
                                key={task._id}
                                task={task}
                                onComplete={() => completeTask(workspaceId, task._id)}
                                onEdit={() => handleEdit(task)}
                                onDelete={() => deleteTask(workspaceId, task._id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
