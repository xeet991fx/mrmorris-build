import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as pipelineApi from "@/lib/api/pipeline";
import * as opportunityApi from "@/lib/api/opportunity";
import type {
  Pipeline,
  CreatePipelineData,
  UpdatePipelineData,
  CreateStageData,
  UpdateStageData,
  PipelineQueryParams,
} from "@/lib/api/pipeline";
import type {
  Opportunity,
  CreateOpportunityData,
  UpdateOpportunityData,
  MoveOpportunityData,
  OpportunityQueryParams,
} from "@/lib/api/opportunity";

export type ViewMode = "kanban" | "table";

export type OpportunityColumn =
  | "title"
  | "value"
  | "pipeline"
  | "stage"
  | "contact"
  | "company"
  | "assignedTo"
  | "expectedCloseDate"
  | "status"
  | "priority"
  | "createdAt";

interface PipelineState {
  // Data
  pipelines: Pipeline[];
  currentPipeline: Pipeline | null;
  opportunities: Opportunity[];
  currentOpportunity: Opportunity | null;

  // Kanban data structure (grouped by stages)
  kanbanData: {
    pipeline: {
      _id: string;
      name: string;
      description?: string;
    } | null;
    stages: {
      stage: {
        _id: string;
        name: string;
        order: number;
        color: string;
      };
      opportunities: Opportunity[];
    }[];
  };

  // UI State
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;

  // Table View State
  visibleColumns: OpportunityColumn[];
  columnOrder: OpportunityColumn[];
  columnWidths: Record<string, number>;

  // Filters & Pagination
  filters: {
    pipelineId?: string;
    stageId?: string;
    status?: "open" | "won" | "lost" | "abandoned";
    assignedTo?: string;
    tags?: string[];
    priority?: "low" | "medium" | "high";
  };
  searchQuery: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  // Pipeline Actions
  fetchPipelines: (workspaceId: string, params?: PipelineQueryParams) => Promise<void>;
  fetchPipeline: (workspaceId: string, pipelineId: string) => Promise<void>;
  createPipeline: (workspaceId: string, data: CreatePipelineData) => Promise<Pipeline>;
  updatePipeline: (
    workspaceId: string,
    pipelineId: string,
    data: UpdatePipelineData
  ) => Promise<void>;
  deletePipeline: (workspaceId: string, pipelineId: string) => Promise<void>;
  setCurrentPipeline: (pipeline: Pipeline | null) => void;

  // Stage Actions
  addStage: (workspaceId: string, pipelineId: string, data: CreateStageData) => Promise<void>;
  updateStage: (
    workspaceId: string,
    pipelineId: string,
    stageId: string,
    data: UpdateStageData
  ) => Promise<void>;
  deleteStage: (workspaceId: string, pipelineId: string, stageId: string) => Promise<void>;
  reorderStages: (workspaceId: string, pipelineId: string, stageOrder: string[]) => Promise<void>;

  // Opportunity Actions
  fetchOpportunities: (workspaceId: string, params?: OpportunityQueryParams) => Promise<void>;
  fetchOpportunitiesByPipeline: (workspaceId: string, pipelineId: string) => Promise<void>;
  fetchOpportunity: (workspaceId: string, opportunityId: string) => Promise<void>;
  createOpportunity: (
    workspaceId: string,
    data: CreateOpportunityData
  ) => Promise<Opportunity>;
  updateOpportunity: (
    workspaceId: string,
    opportunityId: string,
    data: UpdateOpportunityData
  ) => Promise<void>;
  moveOpportunity: (
    workspaceId: string,
    opportunityId: string,
    data: MoveOpportunityData
  ) => Promise<void>;
  deleteOpportunity: (workspaceId: string, opportunityId: string) => Promise<void>;
  setCurrentOpportunity: (opportunity: Opportunity | null) => void;

  // UI Actions
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<PipelineState["filters"]>) => void;
  setVisibleColumns: (columns: OpportunityColumn[]) => void;
  resizeColumn: (column: OpportunityColumn, width: number) => void;
  clearError: () => void;

  // Optimistic UI update for drag-and-drop
  optimisticMoveOpportunity: (
    opportunityId: string,
    fromStageId: string,
    toStageId: string
  ) => void;
}

// Default column widths
const DEFAULT_COLUMN_WIDTHS: Record<OpportunityColumn, number> = {
  title: 240,
  value: 128,
  pipeline: 160,
  stage: 160,
  contact: 176,
  company: 176,
  assignedTo: 160,
  expectedCloseDate: 144,
  status: 112,
  priority: 112,
  createdAt: 144,
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => ({
      // Initial state
      pipelines: [],
      currentPipeline: null,
      opportunities: [],
      currentOpportunity: null,
      kanbanData: {
        pipeline: null,
        stages: [],
      },
      isLoading: false,
      error: null,
      viewMode: "kanban",
      visibleColumns: [
        "title",
        "value",
        "stage",
        "contact",
        "company",
        "assignedTo",
        "expectedCloseDate",
        "status",
        "priority",
        "createdAt",
      ],
      columnOrder: [
        "title",
        "value",
        "pipeline",
        "stage",
        "contact",
        "company",
        "assignedTo",
        "expectedCloseDate",
        "status",
        "priority",
        "createdAt",
      ],
      columnWidths: DEFAULT_COLUMN_WIDTHS as Record<string, number>,
      filters: {},
      searchQuery: "",
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
      },

      // Pipeline Actions
      fetchPipelines: async (workspaceId: string, params?: PipelineQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.getPipelines(workspaceId, params);

          if (response.success && response.data) {
            set({
              pipelines: response.data.pipelines,
              isLoading: false,
            });

            // If no current pipeline and pipelines exist, set the first (default) pipeline as current
            const currentPipeline = get().currentPipeline;
            if (!currentPipeline && response.data.pipelines.length > 0) {
              const defaultPipeline = response.data.pipelines.find(p => p.isDefault) || response.data.pipelines[0];
              set({ currentPipeline: defaultPipeline });
            }
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch pipelines. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      fetchPipeline: async (workspaceId: string, pipelineId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.getPipeline(workspaceId, pipelineId);

          if (response.success && response.data) {
            set({
              currentPipeline: response.data.pipeline,
              isLoading: false,
            });

            // Update in pipelines array
            const pipelines = get().pipelines;
            const index = pipelines.findIndex((p) => p._id === pipelineId);
            if (index !== -1) {
              pipelines[index] = response.data.pipeline;
              set({ pipelines: [...pipelines] });
            }
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch pipeline. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createPipeline: async (workspaceId: string, data: CreatePipelineData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.createPipeline(workspaceId, data);

          if (response.success && response.data) {
            const newPipeline = response.data.pipeline;
            set((state) => ({
              pipelines: [...state.pipelines, newPipeline],
              currentPipeline: newPipeline,
              isLoading: false,
            }));

            return newPipeline;
          }

          throw new Error("Failed to create pipeline");
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to create pipeline. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updatePipeline: async (
        workspaceId: string,
        pipelineId: string,
        data: UpdatePipelineData
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.updatePipeline(workspaceId, pipelineId, data);

          if (response.success && response.data) {
            const updatedPipeline = response.data.pipeline;

            set((state) => ({
              pipelines: state.pipelines.map((p) =>
                p._id === pipelineId ? updatedPipeline : p
              ),
              currentPipeline:
                state.currentPipeline?._id === pipelineId
                  ? updatedPipeline
                  : state.currentPipeline,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to update pipeline. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deletePipeline: async (workspaceId: string, pipelineId: string) => {
        set({ isLoading: true, error: null });

        try {
          await pipelineApi.deletePipeline(workspaceId, pipelineId);

          set((state) => {
            const filteredPipelines = state.pipelines.filter((p) => p._id !== pipelineId);
            return {
              pipelines: filteredPipelines,
              currentPipeline:
                state.currentPipeline?._id === pipelineId
                  ? filteredPipelines[0] || null
                  : state.currentPipeline,
              isLoading: false,
            };
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to delete pipeline. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      setCurrentPipeline: (pipeline: Pipeline | null) => {
        set({ currentPipeline: pipeline });
      },

      // Stage Actions
      addStage: async (workspaceId: string, pipelineId: string, data: CreateStageData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.addStage(workspaceId, pipelineId, data);

          if (response.success && response.data) {
            const updatedPipeline = response.data.pipeline;

            set((state) => ({
              pipelines: state.pipelines.map((p) =>
                p._id === pipelineId ? updatedPipeline : p
              ),
              currentPipeline:
                state.currentPipeline?._id === pipelineId
                  ? updatedPipeline
                  : state.currentPipeline,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to add stage. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateStage: async (
        workspaceId: string,
        pipelineId: string,
        stageId: string,
        data: UpdateStageData
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.updateStage(
            workspaceId,
            pipelineId,
            stageId,
            data
          );

          if (response.success && response.data) {
            const updatedPipeline = response.data.pipeline;

            set((state) => ({
              pipelines: state.pipelines.map((p) =>
                p._id === pipelineId ? updatedPipeline : p
              ),
              currentPipeline:
                state.currentPipeline?._id === pipelineId
                  ? updatedPipeline
                  : state.currentPipeline,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to update stage. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deleteStage: async (workspaceId: string, pipelineId: string, stageId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.deleteStage(workspaceId, pipelineId, stageId);

          if (response.success && response.data) {
            const updatedPipeline = response.data.pipeline;

            set((state) => ({
              pipelines: state.pipelines.map((p) =>
                p._id === pipelineId ? updatedPipeline : p
              ),
              currentPipeline:
                state.currentPipeline?._id === pipelineId
                  ? updatedPipeline
                  : state.currentPipeline,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to delete stage. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      reorderStages: async (workspaceId: string, pipelineId: string, stageOrder: string[]) => {
        set({ isLoading: true, error: null });

        try {
          const response = await pipelineApi.reorderStages(workspaceId, pipelineId, stageOrder);

          if (response.success && response.data) {
            const updatedPipeline = response.data.pipeline;

            set((state) => ({
              pipelines: state.pipelines.map((p) =>
                p._id === pipelineId ? updatedPipeline : p
              ),
              currentPipeline:
                state.currentPipeline?._id === pipelineId
                  ? updatedPipeline
                  : state.currentPipeline,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to reorder stages. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Opportunity Actions
      fetchOpportunities: async (workspaceId: string, params?: OpportunityQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await opportunityApi.getOpportunities(workspaceId, params);

          if (response.success && response.data) {
            set({
              opportunities: response.data.opportunities,
              pagination: response.data.pagination,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch opportunities. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      fetchOpportunitiesByPipeline: async (workspaceId: string, pipelineId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await opportunityApi.getOpportunitiesByPipeline(
            workspaceId,
            pipelineId
          );

          if (response.success && response.data) {
            set({
              kanbanData: {
                pipeline: response.data.pipeline,
                stages: response.data.stages,
              },
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch opportunities. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      fetchOpportunity: async (workspaceId: string, opportunityId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await opportunityApi.getOpportunity(workspaceId, opportunityId);

          if (response.success && response.data) {
            set({
              currentOpportunity: response.data.opportunity,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to fetch opportunity. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createOpportunity: async (workspaceId: string, data: CreateOpportunityData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await opportunityApi.createOpportunity(workspaceId, data);

          if (response.success && response.data) {
            const newOpportunity = response.data.opportunity;

            set((state) => ({
              opportunities: [...state.opportunities, newOpportunity],
              isLoading: false,
            }));

            // Refresh kanban data if in kanban view
            if (get().viewMode === "kanban" && get().currentPipeline) {
              await get().fetchOpportunitiesByPipeline(
                workspaceId,
                get().currentPipeline!._id
              );
            }

            return newOpportunity;
          }

          throw new Error("Failed to create opportunity");
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to create opportunity. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateOpportunity: async (
        workspaceId: string,
        opportunityId: string,
        data: UpdateOpportunityData
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await opportunityApi.updateOpportunity(
            workspaceId,
            opportunityId,
            data
          );

          if (response.success && response.data) {
            const updatedOpportunity = response.data.opportunity;

            set((state) => ({
              opportunities: state.opportunities.map((o) =>
                o._id === opportunityId ? updatedOpportunity : o
              ),
              currentOpportunity:
                state.currentOpportunity?._id === opportunityId
                  ? updatedOpportunity
                  : state.currentOpportunity,
              isLoading: false,
            }));

            // Refresh kanban data if in kanban view
            if (get().viewMode === "kanban" && get().currentPipeline) {
              await get().fetchOpportunitiesByPipeline(
                workspaceId,
                get().currentPipeline!._id
              );
            }
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to update opportunity. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      moveOpportunity: async (
        workspaceId: string,
        opportunityId: string,
        data: MoveOpportunityData
      ) => {
        // Don't set isLoading - UI already updated optimistically
        set({ error: null });

        try {
          const response = await opportunityApi.moveOpportunity(
            workspaceId,
            opportunityId,
            data
          );

          if (response.success && response.data) {
            const updatedOpportunity = response.data.opportunity;

            // Update opportunities array (for table view consistency)
            set((state) => ({
              opportunities: state.opportunities.map((o) =>
                o._id === opportunityId ? updatedOpportunity : o
              ),
            }));

            // ✅ NO REFETCH - trust the optimistic update
            // The kanbanData is already correctly updated by optimisticMoveOpportunity
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to move opportunity. Please try again.";

          set({ error: errorMessage });

          // 🔴 REVERT optimistic update on error
          // Re-fetch to restore accurate state from server
          if (get().currentPipeline) {
            await get().fetchOpportunitiesByPipeline(
              workspaceId,
              get().currentPipeline!._id
            );
          }

          throw error;
        }
      },

      deleteOpportunity: async (workspaceId: string, opportunityId: string) => {
        set({ isLoading: true, error: null });

        try {
          await opportunityApi.deleteOpportunity(workspaceId, opportunityId);

          set((state) => ({
            opportunities: state.opportunities.filter((o) => o._id !== opportunityId),
            currentOpportunity:
              state.currentOpportunity?._id === opportunityId
                ? null
                : state.currentOpportunity,
            isLoading: false,
          }));

          // Refresh kanban data if in kanban view
          if (get().viewMode === "kanban" && get().currentPipeline) {
            await get().fetchOpportunitiesByPipeline(
              workspaceId,
              get().currentPipeline!._id
            );
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to delete opportunity. Please try again.";

          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      setCurrentOpportunity: (opportunity: Opportunity | null) => {
        set({ currentOpportunity: opportunity });
      },

      // Optimistic UI update for drag-and-drop
      optimisticMoveOpportunity: (
        opportunityId: string,
        fromStageId: string,
        toStageId: string
      ) => {
        // Safety check: if moving to the same stage, do nothing
        if (fromStageId === toStageId) return;

        set((state) => {
          // Find the opportunity first before any mutations
          const sourceStage = state.kanbanData.stages.find(
            (s) => s.stage._id === fromStageId
          );
          const opportunity = sourceStage?.opportunities.find(
            (o) => o._id === opportunityId
          );

          if (!opportunity) return state; // Return unchanged state

          const newStages = state.kanbanData.stages.map((stageData) => {
            // Remove from source stage
            if (stageData.stage._id === fromStageId) {
              return {
                ...stageData,
                opportunities: stageData.opportunities.filter(
                  (o) => o._id !== opportunityId
                ),
              };
            }

            // Add to destination stage
            if (stageData.stage._id === toStageId) {
              return {
                ...stageData,
                opportunities: [
                  ...stageData.opportunities,
                  { ...opportunity, stageId: toStageId },
                ],
              };
            }

            return stageData;
          });

          return {
            kanbanData: {
              ...state.kanbanData,
              stages: newStages,
            },
          };
        });
      },

      // UI Actions
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setFilters: (filters: Partial<PipelineState["filters"]>) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
      },

      setVisibleColumns: (columns: OpportunityColumn[]) => {
        set({ visibleColumns: columns });
      },

      resizeColumn: (column: OpportunityColumn, width: number) => {
        set((state) => ({
          columnWidths: {
            ...state.columnWidths,
            [column]: width,
          },
        }));
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "pipeline-store",
      partialize: (state) => ({
        viewMode: state.viewMode,
        visibleColumns: state.visibleColumns,
        columnOrder: state.columnOrder,
        columnWidths: state.columnWidths,
      }),
    }
  )
);
