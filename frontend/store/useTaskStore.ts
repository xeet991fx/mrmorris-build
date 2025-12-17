import { create } from "zustand";
import { toast } from "sonner";
import {
    Task,
    CreateTaskData,
    UpdateTaskData,
    getTasks,
    createTask as createTaskApi,
    updateTask as updateTaskApi,
    deleteTask as deleteTaskApi,
    completeTask as completeTaskApi,
    getTaskStats,
} from "@/lib/api/task";

// ============================================
// STORE STATE
// ============================================

interface TaskState {
    tasks: Task[];
    isLoading: boolean;
    error: string | null;

    stats: {
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        overdue: number;
        dueToday: number;
    } | null;

    // Filters
    statusFilter: string;
    priorityFilter: string;
    searchQuery: string;

    // Actions
    fetchTasks: (workspaceId: string) => Promise<void>;
    fetchStats: (workspaceId: string) => Promise<void>;
    createTask: (workspaceId: string, data: CreateTaskData) => Promise<Task | null>;
    updateTask: (workspaceId: string, taskId: string, data: UpdateTaskData) => Promise<void>;
    deleteTask: (workspaceId: string, taskId: string) => Promise<void>;
    completeTask: (workspaceId: string, taskId: string) => Promise<void>;

    setStatusFilter: (status: string) => void;
    setPriorityFilter: (priority: string) => void;
    setSearchQuery: (query: string) => void;

    reset: () => void;
}

const initialState = {
    tasks: [],
    isLoading: false,
    error: null,
    stats: null,
    statusFilter: "all",
    priorityFilter: "all",
    searchQuery: "",
};

// ============================================
// STORE
// ============================================

export const useTaskStore = create<TaskState>((set, get) => ({
    ...initialState,

    fetchTasks: async (workspaceId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { statusFilter, priorityFilter, searchQuery } = get();
            const params: any = {};
            if (statusFilter !== "all") params.status = statusFilter;
            if (priorityFilter !== "all") params.priority = priorityFilter;
            if (searchQuery) params.search = searchQuery;

            const response = await getTasks(workspaceId, params);
            if (response.success && response.data) {
                set({ tasks: response.data.tasks, isLoading: false });
            } else {
                throw new Error(response.error || "Failed to fetch tasks");
            }
        } catch (error: any) {
            console.error("Failed to fetch tasks:", error);
            set({ error: error.message, isLoading: false });
            toast.error("Failed to fetch tasks");
        }
    },

    fetchStats: async (workspaceId: string) => {
        try {
            const response = await getTaskStats(workspaceId);
            if (response.success && response.data) {
                set({ stats: response.data });
            }
        } catch (error: any) {
            console.error("Failed to fetch task stats:", error);
        }
    },

    createTask: async (workspaceId: string, data: CreateTaskData) => {
        try {
            const response = await createTaskApi(workspaceId, data);
            if (response.success && response.data) {
                set((state) => ({
                    tasks: [response.data!.task, ...state.tasks],
                }));
                toast.success("Task created!");
                return response.data.task;
            } else {
                throw new Error(response.error || "Failed to create task");
            }
        } catch (error: any) {
            console.error("Failed to create task:", error);
            toast.error(error.message || "Failed to create task");
            return null;
        }
    },

    updateTask: async (workspaceId: string, taskId: string, data: UpdateTaskData) => {
        try {
            const response = await updateTaskApi(workspaceId, taskId, data);
            if (response.success && response.data) {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t._id === taskId ? response.data!.task : t
                    ),
                }));
                toast.success("Task updated!");
            } else {
                throw new Error(response.error || "Failed to update task");
            }
        } catch (error: any) {
            console.error("Failed to update task:", error);
            toast.error(error.message || "Failed to update task");
        }
    },

    deleteTask: async (workspaceId: string, taskId: string) => {
        try {
            const response = await deleteTaskApi(workspaceId, taskId);
            if (response.success) {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t._id !== taskId),
                }));
                toast.success("Task deleted!");
            } else {
                throw new Error("Failed to delete task");
            }
        } catch (error: any) {
            console.error("Failed to delete task:", error);
            toast.error(error.message || "Failed to delete task");
        }
    },

    completeTask: async (workspaceId: string, taskId: string) => {
        try {
            const response = await completeTaskApi(workspaceId, taskId);
            if (response.success && response.data) {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t._id === taskId ? response.data!.task : t
                    ),
                }));
                toast.success("Task completed! 🎉");
            } else {
                throw new Error(response.error || "Failed to complete task");
            }
        } catch (error: any) {
            console.error("Failed to complete task:", error);
            toast.error(error.message || "Failed to complete task");
        }
    },

    setStatusFilter: (status: string) => set({ statusFilter: status }),
    setPriorityFilter: (priority: string) => set({ priorityFilter: priority }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),

    reset: () => set(initialState),
}));
