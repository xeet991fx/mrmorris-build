import { create } from 'zustand';
import {
    Workflow,
    WorkflowStep,
    WorkflowEnrollment,
    CreateWorkflowInput,
    UpdateWorkflowInput,
} from '@/lib/workflow/types';
import * as workflowApi from '@/lib/workflow/api';
import { toast } from 'sonner';

// ============================================
// STORE STATE INTERFACE
// ============================================

interface WorkflowState {
    // Workflow list
    workflows: Workflow[];
    isLoading: boolean;
    error: string | null;

    // Current workflow being edited
    currentWorkflow: Workflow | null;
    isSaving: boolean;
    hasUnsavedChanges: boolean;

    // Selected node for configuration
    selectedStepId: string | null;

    // Enrollments for current workflow
    enrollments: WorkflowEnrollment[];
    isLoadingEnrollments: boolean;

    // Actions
    fetchWorkflows: (workspaceId: string) => Promise<void>;
    fetchWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
    createWorkflow: (workspaceId: string, data: CreateWorkflowInput) => Promise<Workflow | null>;
    updateWorkflow: (workspaceId: string, workflowId: string, data: UpdateWorkflowInput) => Promise<void>;
    deleteWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
    activateWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
    pauseWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;

    // Step management
    addStep: (step: WorkflowStep) => void;
    updateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
    removeStep: (stepId: string) => void;
    connectSteps: (sourceId: string, targetId: string, sourceHandle?: string) => void;
    disconnectSteps: (sourceId: string, targetId: string) => void;
    selectStep: (stepId: string | null) => void;

    // Local state
    setCurrentWorkflow: (workflow: Workflow | null) => void;
    updateStepsFromCanvas: (steps: WorkflowStep[]) => void;
    markAsSaved: () => void;

    // Enrollments
    fetchEnrollments: (workspaceId: string, workflowId: string) => Promise<void>;
    enrollEntity: (
        workspaceId: string,
        workflowId: string,
        entityType: 'contact' | 'deal' | 'company',
        entityId: string
    ) => Promise<void>;

    // Reset
    reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
    workflows: [],
    isLoading: false,
    error: null,
    currentWorkflow: null,
    isSaving: false,
    hasUnsavedChanges: false,
    selectedStepId: null,
    enrollments: [],
    isLoadingEnrollments: false,
};

// ============================================
// STORE
// ============================================

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    ...initialState,

    // ==========================================
    // WORKFLOW CRUD
    // ==========================================

    fetchWorkflows: async (workspaceId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { workflows } = await workflowApi.fetchWorkflows(workspaceId);
            set({ workflows, isLoading: false });
        } catch (error: any) {
            console.error('Failed to fetch workflows:', error);
            set({ error: error.message, isLoading: false });
            toast.error('Failed to fetch workflows');
        }
    },

    fetchWorkflow: async (workspaceId: string, workflowId: string) => {
        set({ isLoading: true, error: null });
        try {
            const workflow = await workflowApi.fetchWorkflow(workspaceId, workflowId);
            set({ currentWorkflow: workflow, isLoading: false, hasUnsavedChanges: false });
        } catch (error: any) {
            console.error('Failed to fetch workflow:', error);
            set({ error: error.message, isLoading: false });
            toast.error('Failed to fetch workflow');
        }
    },

    createWorkflow: async (workspaceId: string, data: CreateWorkflowInput) => {
        set({ isSaving: true });
        try {
            const workflow = await workflowApi.createWorkflow(workspaceId, data);
            set((state) => ({
                workflows: [workflow, ...state.workflows],
                currentWorkflow: workflow,
                isSaving: false,
                hasUnsavedChanges: false,
            }));
            toast.success('Workflow created successfully!');
            return workflow;
        } catch (error: any) {
            console.error('Failed to create workflow:', error);
            set({ isSaving: false });
            toast.error(error.message || 'Failed to create workflow');
            return null;
        }
    },

    updateWorkflow: async (workspaceId: string, workflowId: string, data: UpdateWorkflowInput) => {
        set({ isSaving: true });
        try {
            const workflow = await workflowApi.updateWorkflow(workspaceId, workflowId, data);
            set((state) => ({
                workflows: state.workflows.map((w) => (w._id === workflowId ? workflow : w)),
                currentWorkflow: workflow,
                isSaving: false,
                hasUnsavedChanges: false,
            }));
            toast.success('Workflow saved successfully!');
        } catch (error: any) {
            console.error('Failed to update workflow:', error);
            set({ isSaving: false });
            toast.error(error.message || 'Failed to save workflow');
        }
    },

    deleteWorkflow: async (workspaceId: string, workflowId: string) => {
        try {
            await workflowApi.deleteWorkflow(workspaceId, workflowId);
            set((state) => ({
                workflows: state.workflows.filter((w) => w._id !== workflowId),
                currentWorkflow: state.currentWorkflow?._id === workflowId ? null : state.currentWorkflow,
            }));
            toast.success('Workflow deleted successfully!');
        } catch (error: any) {
            console.error('Failed to delete workflow:', error);
            toast.error(error.message || 'Failed to delete workflow');
        }
    },

    activateWorkflow: async (workspaceId: string, workflowId: string) => {
        try {
            const workflow = await workflowApi.activateWorkflow(workspaceId, workflowId);
            set((state) => ({
                workflows: state.workflows.map((w) => (w._id === workflowId ? workflow : w)),
                currentWorkflow: state.currentWorkflow?._id === workflowId ? workflow : state.currentWorkflow,
            }));
            toast.success('Workflow activated!');
        } catch (error: any) {
            console.error('Failed to activate workflow:', error);
            toast.error(error.message || 'Failed to activate workflow');
        }
    },

    pauseWorkflow: async (workspaceId: string, workflowId: string) => {
        try {
            const workflow = await workflowApi.pauseWorkflow(workspaceId, workflowId);
            set((state) => ({
                workflows: state.workflows.map((w) => (w._id === workflowId ? workflow : w)),
                currentWorkflow: state.currentWorkflow?._id === workflowId ? workflow : state.currentWorkflow,
            }));
            toast.success('Workflow paused!');
        } catch (error: any) {
            console.error('Failed to pause workflow:', error);
            toast.error(error.message || 'Failed to pause workflow');
        }
    },

    // ==========================================
    // STEP MANAGEMENT
    // ==========================================

    addStep: (step: WorkflowStep) => {
        set((state) => {
            if (!state.currentWorkflow) return state;

            const updatedSteps = [...state.currentWorkflow.steps, step];
            return {
                currentWorkflow: {
                    ...state.currentWorkflow,
                    steps: updatedSteps,
                },
                hasUnsavedChanges: true,
            };
        });
    },

    updateStep: (stepId: string, updates: Partial<WorkflowStep>) => {
        set((state) => {
            if (!state.currentWorkflow) return state;

            const updatedSteps = state.currentWorkflow.steps.map((step) =>
                step.id === stepId ? { ...step, ...updates } : step
            );

            return {
                currentWorkflow: {
                    ...state.currentWorkflow,
                    steps: updatedSteps,
                },
                hasUnsavedChanges: true,
            };
        });
    },

    removeStep: (stepId: string) => {
        set((state) => {
            if (!state.currentWorkflow) return state;

            // Remove the step
            const updatedSteps = state.currentWorkflow.steps.filter((step) => step.id !== stepId);

            // Remove references to this step from other steps' nextStepIds
            const cleanedSteps = updatedSteps.map((step) => ({
                ...step,
                nextStepIds: step.nextStepIds.filter((id) => id !== stepId),
            }));

            return {
                currentWorkflow: {
                    ...state.currentWorkflow,
                    steps: cleanedSteps,
                },
                hasUnsavedChanges: true,
                selectedStepId: state.selectedStepId === stepId ? null : state.selectedStepId,
            };
        });
    },

    connectSteps: (sourceId: string, targetId: string, sourceHandle?: string) => {
        set((state) => {
            if (!state.currentWorkflow) return state;

            const updatedSteps = state.currentWorkflow.steps.map((step) => {
                if (step.id === sourceId) {
                    // For condition nodes, use specific indices: yes=0, no=1
                    if (step.type === 'condition' && sourceHandle) {
                        const newNextStepIds = [...step.nextStepIds];
                        if (sourceHandle === 'yes') {
                            newNextStepIds[0] = targetId;
                        } else if (sourceHandle === 'no') {
                            newNextStepIds[1] = targetId;
                        }
                        return { ...step, nextStepIds: newNextStepIds };
                    }

                    // For other node types, just append if not already connected
                    if (!step.nextStepIds.includes(targetId)) {
                        return {
                            ...step,
                            nextStepIds: [...step.nextStepIds, targetId],
                        };
                    }
                }
                return step;
            });

            return {
                currentWorkflow: {
                    ...state.currentWorkflow,
                    steps: updatedSteps,
                },
                hasUnsavedChanges: true,
            };
        });
    },

    disconnectSteps: (sourceId: string, targetId: string) => {
        set((state) => {
            if (!state.currentWorkflow) return state;

            const updatedSteps = state.currentWorkflow.steps.map((step) => {
                if (step.id === sourceId) {
                    return {
                        ...step,
                        nextStepIds: step.nextStepIds.filter((id) => id !== targetId),
                    };
                }
                return step;
            });

            return {
                currentWorkflow: {
                    ...state.currentWorkflow,
                    steps: updatedSteps,
                },
                hasUnsavedChanges: true,
            };
        });
    },

    selectStep: (stepId: string | null) => {
        set({ selectedStepId: stepId });
    },

    // ==========================================
    // LOCAL STATE
    // ==========================================

    setCurrentWorkflow: (workflow: Workflow | null) => {
        set({ currentWorkflow: workflow, hasUnsavedChanges: false, selectedStepId: null });
    },

    updateStepsFromCanvas: (steps: WorkflowStep[]) => {
        set((state) => {
            if (!state.currentWorkflow) return state;

            return {
                currentWorkflow: {
                    ...state.currentWorkflow,
                    steps,
                },
                hasUnsavedChanges: true,
            };
        });
    },

    markAsSaved: () => {
        set({ hasUnsavedChanges: false });
    },

    // ==========================================
    // ENROLLMENTS
    // ==========================================

    fetchEnrollments: async (workspaceId: string, workflowId: string) => {
        set({ isLoadingEnrollments: true });
        try {
            const { enrollments } = await workflowApi.fetchWorkflowEnrollments(workspaceId, workflowId);
            set({ enrollments, isLoadingEnrollments: false });
        } catch (error: any) {
            console.error('Failed to fetch enrollments:', error);
            set({ isLoadingEnrollments: false });
        }
    },

    enrollEntity: async (
        workspaceId: string,
        workflowId: string,
        entityType: 'contact' | 'deal' | 'company',
        entityId: string
    ) => {
        try {
            const enrollment = await workflowApi.enrollInWorkflow(workspaceId, workflowId, {
                entityType,
                entityId,
            });
            set((state) => ({
                enrollments: [enrollment, ...state.enrollments],
            }));
            toast.success(`${entityType} enrolled in workflow!`);
        } catch (error: any) {
            console.error('Failed to enroll entity:', error);
            toast.error(error.message || 'Failed to enroll in workflow');
        }
    },

    // ==========================================
    // RESET
    // ==========================================

    reset: () => {
        set(initialState);
    },
}));
