import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as projectApi from "@/lib/api/project";
import type { Project, OnboardingData } from "@/lib/api/project";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createProject: (name: string) => Promise<Project>;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  updateProject: (id: string, data: { name: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  saveOnboarding: (projectId: string, data: OnboardingData, step?: number, complete?: boolean) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,

      /**
       * Create a new project
       */
      createProject: async (name: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await projectApi.createProject({ name });

          if (response.success && response.data) {
            const newProject = response.data.project;

            // Add to projects list
            set((state) => ({
              projects: [...state.projects, newProject],
              currentProject: newProject,
              isLoading: false,
              error: null,
            }));

            return newProject;
          }

          throw new Error("Failed to create project");
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to create project. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Fetch all projects for the current user
       */
      fetchProjects: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await projectApi.getProjects();

          if (response.success && response.data) {
            set({
              projects: response.data.projects,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch projects. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Fetch a specific project by ID
       */
      fetchProject: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await projectApi.getProject(id);

          if (response.success && response.data) {
            const project = response.data.project;

            // Update the project in the list and set as current
            set((state) => ({
              projects: state.projects.map((p) => (p._id === id ? project : p)),
              currentProject: project,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch project. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Update a project
       */
      updateProject: async (id: string, data: { name: string }) => {
        set({ isLoading: true, error: null });

        try {
          const response = await projectApi.updateProject(id, data);

          if (response.success && response.data) {
            const updatedProject = response.data.project;

            // Update in projects list and current project
            set((state) => ({
              projects: state.projects.map((p) => (p._id === id ? updatedProject : p)),
              currentProject:
                state.currentProject?._id === id ? updatedProject : state.currentProject,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to update project. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Delete a project
       */
      deleteProject: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await projectApi.deleteProject(id);

          if (response.success) {
            // Remove from projects list and clear current if it was deleted
            set((state) => ({
              projects: state.projects.filter((p) => p._id !== id),
              currentProject: state.currentProject?._id === id ? null : state.currentProject,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to delete project. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Save onboarding data for a project
       */
      saveOnboarding: async (projectId: string, data: OnboardingData, step?: number, complete?: boolean) => {
        set({ isLoading: true, error: null });

        try {
          const response = await projectApi.saveProjectOnboarding(projectId, data, complete);

          if (response.success && response.data) {
            const updatedProject = response.data.project;

            // Update in projects list and current project
            set((state) => ({
              projects: state.projects.map((p) =>
                p._id === projectId ? updatedProject : p
              ),
              currentProject:
                state.currentProject?._id === projectId
                  ? updatedProject
                  : state.currentProject,
              isLoading: false,
              error: null,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to save onboarding data. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Set current project (for navigation)
       */
      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "project-storage",
      partialize: (state) => ({
        currentProject: state.currentProject,
      }),
    }
  )
);
