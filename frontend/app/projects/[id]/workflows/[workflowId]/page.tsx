"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    Connection,
    addEdge,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    Panel,
    MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import {
    ArrowLeftIcon,
    PlayIcon,
    PauseIcon,
    CloudArrowUpIcon,
    Cog6ToothIcon,
    TrashIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { WorkflowStep, TRIGGER_TYPE_LABELS, ACTION_TYPE_LABELS } from "@/lib/workflow/types";
import { generateStepId } from "@/lib/workflow/api";
import { cn } from "@/lib/utils";
import { validateWorkflow, ValidationError } from "@/lib/workflow/validation";

// Import custom components
import WorkflowSidebar from "@/components/workflows/WorkflowSidebar";
import WorkflowConfigPanel from "@/components/workflows/WorkflowConfigPanel";
import ValidationErrorPanel from "@/components/workflows/ValidationErrorPanel";
import BulkEnrollmentModal from "@/components/workflows/BulkEnrollmentModal";
import TriggerNode from "@/components/workflows/nodes/TriggerNode";
import ActionNode from "@/components/workflows/nodes/ActionNode";
import DelayNode from "@/components/workflows/nodes/DelayNode";
import ConditionNode from "@/components/workflows/nodes/ConditionNode";

// ============================================
// CUSTOM NODE TYPES
// ============================================

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    delay: DelayNode,
    condition: ConditionNode,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function stepsToNodes(steps: WorkflowStep[], selectedId: string | null): Node[] {
    return steps.map((step) => ({
        id: step.id,
        type: step.type,
        position: step.position,
        data: {
            step,
            isSelected: step.id === selectedId,
        },
        selected: step.id === selectedId,
    }));
}

function stepsToEdges(steps: WorkflowStep[]): Edge[] {
    const edges: Edge[] = [];
    steps.forEach((step) => {
        step.nextStepIds.forEach((targetId, index) => {
            // For condition nodes, determine which handle based on index
            let sourceHandle: string | undefined = undefined;
            if (step.type === 'condition') {
                sourceHandle = index === 0 ? 'yes' : 'no';
            }

            edges.push({
                id: `${step.id}-${targetId}-${sourceHandle || 'default'}`,
                source: step.id,
                target: targetId,
                sourceHandle,
                type: "smoothstep",
                animated: true,
                style: { stroke: "#8b5cf6", strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#8b5cf6",
                },
            });
        });
    });
    return edges;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WorkflowEditorPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const workflowId = params.workflowId as string;

    const {
        currentWorkflow,
        isLoading,
        isSaving,
        hasUnsavedChanges,
        selectedStepId,
        fetchWorkflow,
        updateWorkflow,
        activateWorkflow,
        pauseWorkflow,
        addStep,
        updateStep,
        removeStep,
        connectSteps,
        disconnectSteps,
        selectStep,
        updateStepsFromCanvas,
    } = useWorkflowStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [workflowName, setWorkflowName] = useState("");
    const [showConfigPanel, setShowConfigPanel] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);
    const [showValidationPanel, setShowValidationPanel] = useState(false);
    const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);

    // Fetch workflow on mount
    useEffect(() => {
        if (workspaceId && workflowId) {
            fetchWorkflow(workspaceId, workflowId);
        }
    }, [workspaceId, workflowId, fetchWorkflow]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && !isSaving) {
                    handleSave();
                }
            }

            // Delete key to remove selected step
            if (e.key === 'Delete' && selectedStepId && !showConfigPanel) {
                e.preventDefault();
                removeStep(selectedStepId);
                selectStep(null);
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                selectStep(null);
                setShowConfigPanel(false);
                setShowValidationPanel(false);
            }

            // Cmd/Ctrl + B to open bulk enrollment (if active)
            if ((e.metaKey || e.ctrlKey) && e.key === 'b' && currentWorkflow?.status === 'active') {
                e.preventDefault();
                setShowBulkEnrollModal(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, isSaving, selectedStepId, showConfigPanel, currentWorkflow?.status]);

    // Sync nodes and edges with workflow steps
    useEffect(() => {
        if (currentWorkflow) {
            setNodes(stepsToNodes(currentWorkflow.steps, selectedStepId));
            setEdges(stepsToEdges(currentWorkflow.steps));
            setWorkflowName(currentWorkflow.name);
        }
    }, [currentWorkflow, selectedStepId, setNodes, setEdges]);

    // Handle node position change
    const handleNodesChange = useCallback(
        (changes: any) => {
            onNodesChange(changes);

            // Update step positions when nodes are moved
            const positionChanges = changes.filter(
                (change: any) => change.type === "position" && change.position
            );

            if (positionChanges.length > 0 && currentWorkflow) {
                const updatedSteps = currentWorkflow.steps.map((step) => {
                    const change = positionChanges.find((c: any) => c.id === step.id);
                    if (change && change.position) {
                        return { ...step, position: change.position };
                    }
                    return step;
                });
                updateStepsFromCanvas(updatedSteps);
            }
        },
        [onNodesChange, currentWorkflow, updateStepsFromCanvas]
    );

    // Handle connection between nodes
    const onConnect = useCallback(
        (connection: Connection) => {
            if (connection.source && connection.target) {
                // Pass sourceHandle for condition nodes to know yes/no
                connectSteps(connection.source, connection.target, connection.sourceHandle || undefined);
                setEdges((eds) => addEdge({
                    ...connection,
                    type: "smoothstep",
                    animated: true,
                    style: { stroke: "#8b5cf6", strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: "#8b5cf6",
                    },
                }, eds));
            }
        },
        [connectSteps, setEdges]
    );

    // Handle edge deletion
    const onEdgesDelete = useCallback(
        (deletedEdges: Edge[]) => {
            deletedEdges.forEach((edge) => {
                disconnectSteps(edge.source, edge.target);
            });
        },
        [disconnectSteps]
    );

    // Handle node click
    const onNodeClick = useCallback(
        (_: any, node: Node) => {
            selectStep(node.id);
            setShowConfigPanel(true);
        },
        [selectStep]
    );

    // Handle node deletion
    const onNodesDelete = useCallback(
        (deletedNodes: Node[]) => {
            deletedNodes.forEach((node) => {
                removeStep(node.id);
            });
            selectStep(null);
            setShowConfigPanel(false);
        },
        [removeStep, selectStep]
    );

    // Handle pane click (deselect)
    const onPaneClick = useCallback(() => {
        selectStep(null);
        setShowConfigPanel(false);
    }, [selectStep]);

    // Handle drag from sidebar
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow-type");
            if (!type) return;

            // Calculate position relative to canvas
            const reactFlowBounds = (
                event.target as HTMLElement
            ).closest(".react-flow")?.getBoundingClientRect();

            if (!reactFlowBounds) return;

            // Calculate position relative to canvas center
            const position = {
                x: event.clientX - reactFlowBounds.left - 75,
                y: event.clientY - reactFlowBounds.top - 40,
            };

            // Create new step based on type
            let newStep: WorkflowStep;

            if (type === "trigger") {
                newStep = {
                    id: generateStepId(),
                    type: "trigger",
                    name: "New Trigger",
                    config: { triggerType: "contact_created" },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "action") {
                newStep = {
                    id: generateStepId(),
                    type: "action",
                    name: "New Action",
                    config: { actionType: "update_field" },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "delay") {
                newStep = {
                    id: generateStepId(),
                    type: "delay",
                    name: "Wait",
                    config: { delayType: "duration", delayValue: 1, delayUnit: "days" },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "condition") {
                newStep = {
                    id: generateStepId(),
                    type: "condition",
                    name: "Condition",
                    config: { conditions: [{ field: "status", operator: "equals", value: "" }] },
                    position,
                    nextStepIds: [],
                };
            } else {
                return;
            }

            addStep(newStep);
            selectStep(newStep.id);
            setShowConfigPanel(true);
        },
        [addStep, selectStep]
    );

    // Save workflow
    const handleSave = async () => {
        if (!currentWorkflow) return;

        await updateWorkflow(workspaceId, workflowId, {
            name: workflowName,
            steps: currentWorkflow.steps,
        });
    };

    // Activate workflow
    const handleActivate = async () => {
        if (!currentWorkflow) return;

        // Validate workflow first
        const validation = validateWorkflow(currentWorkflow);

        if (!validation.isValid) {
            setValidationErrors(validation.errors);
            setValidationWarnings(validation.warnings);
            setShowValidationPanel(true);
            return;
        }

        // Save first if there are unsaved changes
        if (hasUnsavedChanges) {
            await handleSave();
        }
        await activateWorkflow(workspaceId, workflowId);
    };

    // Pause workflow
    const handlePause = async () => {
        await pauseWorkflow(workspaceId, workflowId);
    };

    // Bulk enrollment
    const handleBulkEnroll = async (contactIds: string[]) => {
        try {
            const response = await fetch(`/api/workspace/${workspaceId}/workflows/${workflowId}/enroll-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityIds: contactIds }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to enroll contacts');
            }

            // Refresh workflow to update stats
            await fetchWorkflow(workspaceId, workflowId);
        } catch (error: any) {
            throw error;
        }
    };

    // Go back to workflows list
    const handleBack = () => {
        if (hasUnsavedChanges) {
            if (!confirm("You have unsaved changes. Are you sure you want to leave?")) {
                return;
            }
        }
        router.push(`/projects/${workspaceId}/workflows`);
    };

    // Get selected step data
    const selectedStep = useMemo(() => {
        if (!selectedStepId || !currentWorkflow) return null;
        return currentWorkflow.steps.find((s) => s.id === selectedStepId) || null;
    }, [selectedStepId, currentWorkflow]);

    if (isLoading || !currentWorkflow) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading workflow...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Header - simplified */}
            <div className="h-12 border-b border-border bg-card flex items-center px-4 flex-shrink-0 gap-3">
                {/* Left side - back button and name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                        onClick={handleBack}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                        title="Back to workflows"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </button>

                    <input
                        type="text"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        className="text-base font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-foreground min-w-0 max-w-[300px]"
                        placeholder="Workflow name..."
                    />

                    {hasUnsavedChanges && (
                        <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                            Unsaved
                        </span>
                    )}
                </div>

                {/* Right side - status badge with extra margin for AI toggle */}
                <div className="flex items-center gap-2 flex-shrink-0 mr-24">
                    <span
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap",
                            currentWorkflow.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : currentWorkflow.status === "paused"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        )}
                    >
                        {currentWorkflow.status}
                    </span>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar - Toolbox */}
                <WorkflowSidebar />

                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onEdgesDelete={onEdgesDelete}
                        onNodeClick={onNodeClick}
                        onNodesDelete={onNodesDelete}
                        onPaneClick={onPaneClick}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[15, 15]}
                        deleteKeyCode="Delete"
                        className="bg-muted/30"
                    >
                        <Controls className="!bg-card !border-border !shadow-lg" />
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="var(--border)"
                        />

                        {/* Help panel */}
                        <Panel position="bottom-left" className="!m-4 !mb-20">
                            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground space-y-1">
                                <p className="font-medium text-foreground mb-1">Quick Tips</p>
                                <p>• Drag nodes from sidebar to canvas</p>
                                <p>• Click nodes to configure</p>
                                <p className="font-medium text-foreground mt-2 mb-1">Keyboard Shortcuts</p>
                                <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + S</kbd> Save workflow</p>
                                <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Delete</kbd> Remove selected node</p>
                                <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Esc</kbd> Deselect</p>
                                {currentWorkflow.status === "active" && (
                                    <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + B</kbd> Bulk enroll</p>
                                )}
                            </div>
                        </Panel>
                    </ReactFlow>

                    {/* Validation Error Panel */}
                    {showValidationPanel && (
                        <ValidationErrorPanel
                            errors={validationErrors}
                            warnings={validationWarnings}
                            onClose={() => setShowValidationPanel(false)}
                            onNodeClick={(nodeId) => {
                                selectStep(nodeId);
                                setShowConfigPanel(true);
                                setShowValidationPanel(false);
                            }}
                        />
                    )}
                </div>

                {/* Right sidebar - Configuration */}
                {showConfigPanel && selectedStep && (
                    <WorkflowConfigPanel
                        step={selectedStep}
                        onUpdate={(updates: Partial<WorkflowStep>) => updateStep(selectedStep.id, updates)}
                        onDelete={() => {
                            removeStep(selectedStep.id);
                            setShowConfigPanel(false);
                        }}
                        onClose={() => {
                            selectStep(null);
                            setShowConfigPanel(false);
                        }}
                    />
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="h-14 border-t border-border bg-card flex items-center justify-between px-4 gap-3 flex-shrink-0">
                {/* Left side - Bulk Enroll */}
                <div>
                    {currentWorkflow.status === "active" && (
                        <button
                            onClick={() => setShowBulkEnrollModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                        >
                            <UserGroupIcon className="w-4 h-4" />
                            Bulk Enroll
                        </button>
                    )}
                </div>

                {/* Right side - Save and Activate/Pause */}
                <div className="flex items-center gap-3">
                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>

                    {/* Activate/Pause button */}
                    {currentWorkflow.status === "active" ? (
                        <button
                            onClick={handlePause}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors"
                        >
                            <PauseIcon className="w-4 h-4" />
                            Pause Workflow
                        </button>
                    ) : (
                        <button
                            onClick={handleActivate}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                            <PlayIcon className="w-4 h-4" />
                            Activate Workflow
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Enrollment Modal */}
            <BulkEnrollmentModal
                isOpen={showBulkEnrollModal}
                onClose={() => setShowBulkEnrollModal(false)}
                workspaceId={workspaceId}
                workflowId={workflowId}
                workflowName={currentWorkflow.name}
                onEnroll={handleBulkEnroll}
            />
        </div>
    );
}
