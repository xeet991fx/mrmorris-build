import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as workspaceApi from "@/lib/api/workspace";
import type { Workspace } from "@/lib/api/workspace";

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createWorkspace: (name: string) => Promise<Workspace>;
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (id: string) => Promise<void>;
  updateWorkspace: (id: string, data: { name: string }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,
      error: null,

      /**
       * Create a new workspace
       */
      createWorkspace: async (name: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await workspaceApi.createWorkspace({ name });

          if (response.success && response.data) {
            const newWorkspace = response.data.workspace;

            // Add to workspaces list
            set((state) => ({
              workspaces: [...state.workspaces, newWorkspace],
              currentWorkspace: newWorkspace,
              isLoading: false,
              error: null,
            }));

            return newWorkspace;
          }

          throw new Error("Failed to create workspace");
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to create workspace. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Fetch all workspaces for the current user
       */
      fetchWorkspaces: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await workspaceApi.getWorkspaces();

          if (response.success && response.data) {
            set({
              workspaces: response.data.workspaces,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch workspaces. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Fetch a specific workspace by ID
       */
      fetchWorkspace: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await workspaceApi.getWorkspace(id);

          if (response.success && response.data) {
            const workspace = response.data.workspace;

            // Update the workspace in the list and set as current
            set((state) => ({
              workspaces: state.workspaces.map((w) => (w._id === id ? workspace : w)),
              currentWorkspace: workspace,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch workspace. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Update a workspace
       */
      updateWorkspace: async (id: string, data: { name: string }) => {
        set({ isLoading: true, error: null });

        try {
          const response = await workspaceApi.updateWorkspace(id, data);

          if (response.success && response.data) {
            const updatedWorkspace = response.data.workspace;

            // Update in workspaces list and current workspace
            set((state) => ({
              workspaces: state.workspaces.map((w) => (w._id === id ? updatedWorkspace : w)),
              currentWorkspace:
                state.currentWorkspace?._id === id ? updatedWorkspace : state.currentWorkspace,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to update workspace. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Delete a workspace
       */
      deleteWorkspace: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await workspaceApi.deleteWorkspace(id);

          if (response.success) {
            // Remove from workspaces list and clear current if it was deleted
            set((state) => ({
              workspaces: state.workspaces.filter((w) => w._id !== id),
              currentWorkspace: state.currentWorkspace?._id === id ? null : state.currentWorkspace,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to delete workspace. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },


      /**
       * Set current workspace (for navigation)
       */
      setCurrentWorkspace: (workspace: Workspace | null) => {
        set({ currentWorkspace: workspace });
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
