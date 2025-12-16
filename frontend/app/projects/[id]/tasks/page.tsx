"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, CheckCircle, Clock, AlertCircle, Filter } from "lucide-react";
import { getTasks, getTaskCounts, Task, TaskCounts, TaskFilters } from "@/lib/api/task";
import TaskModal from "@/components/tasks/TaskModal";
import TaskCard from "@/components/tasks/TaskCard";
import { toast } from "react-hot-toast";

type ViewMode = "list" | "board";
type FilterStatus = "all" | "pending" | "in_progress" | "completed" | "overdue";

export default function TasksPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [counts, setCounts] = useState<TaskCounts | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const filters: TaskFilters = {
                page,
                limit: 20,
                sortBy: "dueDate",
                sortOrder: "asc",
            };

            if (filterStatus !== "all") {
                if (filterStatus === "overdue") {
                    filters.dueBefore = new Date().toISOString();
                    filters.status = ["pending", "in_progress"];
                } else {
                    filters.status = filterStatus;
                }
            }

            const [tasksResponse, countsResponse] = await Promise.all([
                getTasks(workspaceId, filters),
                getTaskCounts(workspaceId),
            ]);

            if (tasksResponse.success) {
                setTasks(tasksResponse.data);
                setTotalPages(tasksResponse.pagination?.totalPages || 1);
            }

            if (countsResponse.success) {
                setCounts(countsResponse.data);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (workspaceId) {
            fetchTasks();
        }
    }, [workspaceId, filterStatus, page]);

    const handleTaskCreated = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
        fetchTasks();
        toast.success("Task created successfully");
    };

    const handleTaskUpdated = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
        fetchTasks();
        toast.success("Task updated successfully");
    };

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const statusFilters: { key: FilterStatus; label: string; icon: React.ReactNode; color: string }[] = [
        { key: "all", label: "All Tasks", icon: <Filter size={16} />, color: "bg-gray-500" },
        { key: "pending", label: "Pending", icon: <Clock size={16} />, color: "bg-yellow-500" },
        { key: "in_progress", label: "In Progress", icon: <AlertCircle size={16} />, color: "bg-blue-500" },
        { key: "completed", label: "Completed", icon: <CheckCircle size={16} />, color: "bg-green-500" },
        { key: "overdue", label: "Overdue", icon: <AlertCircle size={16} />, color: "bg-red-500" },
    ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your tasks and stay on top of your work
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSelectedTask(null);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    New Task
                </button>
            </div>

            {/* Stats Cards */}
            {counts && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{counts.total}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-yellow-600">Pending</div>
                        <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-blue-600">In Progress</div>
                        <div className="text-2xl font-bold text-blue-600">{counts.in_progress}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-green-600">Completed</div>
                        <div className="text-2xl font-bold text-green-600">{counts.completed}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-red-600">Overdue</div>
                        <div className="text-2xl font-bold text-red-600">{counts.overdue}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                {statusFilters.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => setFilterStatus(filter.key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${filterStatus === filter.key
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                    >
                        {filter.icon}
                        {filter.label}
                        {counts && filter.key !== "all" && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterStatus === filter.key ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"
                                }`}>
                                {filter.key === "overdue" ? counts.overdue : counts[filter.key as keyof TaskCounts]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <CheckCircle size={48} className="text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {filterStatus === "all" ? "Create your first task to get started" : "No tasks match this filter"}
                    </p>
                    <button
                        onClick={() => {
                            setSelectedTask(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        Create Task
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <TaskCard
                            key={task._id}
                            task={task}
                            workspaceId={workspaceId}
                            onEdit={() => handleEditTask(task)}
                            onUpdate={fetchTasks}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Task Modal */}
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTask(null);
                }}
                workspaceId={workspaceId}
                task={selectedTask}
                onSuccess={selectedTask ? handleTaskUpdated : handleTaskCreated}
            />
        </div>
    );
}
