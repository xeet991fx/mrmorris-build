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
    MiniMap,
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
    BeakerIcon,
    ExclamationCircleIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    DocumentDuplicateIcon,
    ChartBarIcon,
    GlobeAltIcon,
    DocumentTextIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { WorkflowStep, TRIGGER_TYPE_LABELS, ACTION_TYPE_LABELS } from "@/lib/workflow/types";
import { generateStepId } from "@/lib/workflow/api";
import { cloneWorkflow } from "@/lib/api/workflow";
import { cn } from "@/lib/utils";
import { validateWorkflow, ValidationError } from "@/lib/workflow/validation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

// Import custom components
import NodePalette from "@/components/workflows/NodePalette";
import WorkflowConfigPanel from "@/components/workflows/WorkflowConfigPanel";
import ValidationErrorPanel from "@/components/workflows/ValidationErrorPanel";
import BulkEnrollmentModal from "@/components/workflows/BulkEnrollmentModal";
import TestWorkflowModal from "@/components/workflows/TestWorkflowModal";
import FailedEnrollmentsPanel from "@/components/workflows/FailedEnrollmentsPanel";
import WebhookPanel from "@/components/workflows/WebhookPanel";
import GoalSettingsPanel from "@/components/workflows/GoalSettingsPanel";

// Import node components
import TriggerNode from "@/components/workflows/nodes/TriggerNode";
import ActionNode from "@/components/workflows/nodes/ActionNode";
import DelayNode from "@/components/workflows/nodes/DelayNode";
import ConditionNode from "@/components/workflows/nodes/ConditionNode";
import ParallelNode from "@/components/workflows/nodes/ParallelNode";
import MergeNode from "@/components/workflows/nodes/MergeNode";
import TryCatchNode from "@/components/workflows/nodes/TryCatchNode";
import LoopNode from "@/components/workflows/nodes/LoopNode";
import AIAgentNode from "@/components/workflows/nodes/AIAgentNode";
import SlackNode from "@/components/workflows/nodes/SlackNode";
import GoogleSheetsNode from "@/components/workflows/nodes/GoogleSheetsNode";
import NotionNode from "@/components/workflows/nodes/NotionNode";
import HTTPRequestNode from "@/components/workflows/nodes/HTTPRequestNode";
import TransformNode from "@/components/workflows/nodes/TransformNode";
import CustomAnimatedEdge from "@/components/workflows/CustomAnimatedEdge";

// ============================================
// CUSTOM NODE TYPES
// ============================================

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    delay: DelayNode,
    condition: ConditionNode,
    parallel: ParallelNode,
    merge: MergeNode,
    try_catch: TryCatchNode,
    loop: LoopNode,
    transform: TransformNode,
    ai_agent: AIAgentNode,
    integration_slack: SlackNode,
    integration_google_sheets: GoogleSheetsNode,
    integration_notion: NotionNode,
    integration_whatsapp: ActionNode, // Placeholder for future
    integration_discord: ActionNode, // Placeholder for future
    http_request: HTTPRequestNode
};

const edgeTypes = {
    default: CustomAnimatedEdge,
    custom_edge: CustomAnimatedEdge,
    smoothstep: CustomAnimatedEdge,
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
    const edgeStyle = {
        strokeWidth: 2,
        stroke: "#f59e0b",
    };
    steps.forEach((step) => {
        // Handle branches for new node types
        if (step.branches) {
            // Try/Catch branches
            if (step.branches.success) {
                edges.push({
                    id: `${step.id}-${step.branches.success}-success`,
                    source: step.id,
                    target: step.branches.success,
                    sourceHandle: 'success',
                    type: "custom_edge",
                    animated: true,
                    style: edgeStyle,
                    markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
                });
            }
            if (step.branches.error) {
                edges.push({
                    id: `${step.id}-${step.branches.error}-error`,
                    source: step.id,
                    target: step.branches.error,
                    sourceHandle: 'error',
                    type: "custom_edge",
                    animated: true,
                    style: edgeStyle,
                    markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
                });
            }
            // Parallel branches
            if (step.branches.parallel) {
                step.branches.parallel.forEach((targetId, index) => {
                    edges.push({
                        id: `${step.id}-${targetId}-branch-${index}`,
                        source: step.id,
                        target: targetId,
                        sourceHandle: `branch-${index}`,
                        type: "custom_edge",
                        animated: true,
                        style: edgeStyle,
                        markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
                    });
                });
            }
        }

        // Handle regular nextStepIds
        step.nextStepIds.forEach((targetId, index) => {
            let sourceHandle: string | undefined = undefined;

            // Determine handle based on node type
            if (step.type === 'condition') {
                sourceHandle = index === 0 ? 'yes' : 'no';
            } else if (step.type === 'try_catch') {
                sourceHandle = index === 0 ? 'success' : 'error';
            } else if (step.type === 'loop') {
                sourceHandle = index === 0 ? 'loop-body' : 'complete';
            }

            edges.push({
                id: `${step.id}-${targetId}-${sourceHandle || 'default'}`,
                source: step.id,
                target: targetId,
                sourceHandle,
                type: "custom_edge",
                animated: true,
                style: edgeStyle,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#f59e0b",
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
    const [showTestModal, setShowTestModal] = useState(false);
    const [showFailedPanel, setShowFailedPanel] = useState(false);
    const [showWebhookPanel, setShowWebhookPanel] = useState(false);
    const [showGoalSettings, setShowGoalSettings] = useState(false);
    const [failedCount, setFailedCount] = useState(0);
    const [isCloning, setIsCloning] = useState(false);
    const [showQuickTips, setShowQuickTips] = useState(() => {
        // Check localStorage for user preference, default to true
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('workflow-quick-tips-visible');
            return saved !== null ? saved === 'true' : true;
        }
        return true;
    });

    // Edge context menu state
    const [edgeContextMenu, setEdgeContextMenu] = useState<{
        edge: Edge | null;
        x: number;
        y: number;
    } | null>(null);

    // Undo/Redo history
    const [history, setHistory] = useState<WorkflowStep[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const MAX_HISTORY = 50;

    // Push to history when steps change (for undo/redo)
    const pushToHistory = useCallback((steps: WorkflowStep[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(steps)));
            if (newHistory.length > MAX_HISTORY) {
                newHistory.shift();
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [historyIndex]);

    // Undo function
    const handleUndo = useCallback(() => {
        if (historyIndex > 0 && history[historyIndex - 1]) {
            setHistoryIndex(prev => prev - 1);
            updateStepsFromCanvas(history[historyIndex - 1]);
        }
    }, [historyIndex, history, updateStepsFromCanvas]);

    // Redo function
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
            setHistoryIndex(prev => prev + 1);
            updateStepsFromCanvas(history[historyIndex + 1]);
        }
    }, [historyIndex, history, updateStepsFromCanvas]);

    // Toggle quick tips panel
    const handleToggleQuickTips = useCallback(() => {
        setShowQuickTips(prev => {
            const newValue = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('workflow-quick-tips-visible', String(newValue));
            }
            return newValue;
        });
    }, []);

    // Clone workflow handler
    const handleClone = useCallback(async () => {
        if (!currentWorkflow || isCloning) return;

        setIsCloning(true);
        try {
            const result = await cloneWorkflow(workspaceId, workflowId);
            if (result.success && result.data?.workflow) {
                toast.success('Workflow cloned!');
                // Navigate to the cloned workflow
                router.push(`/projects/${workspaceId}/workflows/${result.data.workflow._id}`);
            } else {
                toast.error(result.error || 'Failed to clone workflow');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to clone workflow');
        } finally {
            setIsCloning(false);
        }
    }, [currentWorkflow, isCloning, workspaceId, workflowId, router]);

    // Save workflow
    const handleSave = useCallback(async () => {
        if (!currentWorkflow) return;

        await updateWorkflow(workspaceId, workflowId, {
            name: workflowName,
            steps: currentWorkflow.steps,
        });
    }, [currentWorkflow, workspaceId, workflowId, workflowName, updateWorkflow]);

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

            // Cmd/Ctrl + Z to undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }

            // Cmd/Ctrl + Y or Cmd/Ctrl + Shift + Z to redo
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
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
                setEdgeContextMenu(null);
            }

            // Cmd/Ctrl + B to open bulk enrollment (if active)
            if ((e.metaKey || e.ctrlKey) && e.key === 'b' && currentWorkflow?.status === 'active') {
                e.preventDefault();
                setShowBulkEnrollModal(true);
            }

            // Cmd/Ctrl + T to open test modal
            if ((e.metaKey || e.ctrlKey) && e.key === 't') {
                e.preventDefault();
                setShowTestModal(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasUnsavedChanges, isSaving, selectedStepId, showConfigPanel, currentWorkflow?.status, handleSave, handleUndo, handleRedo, removeStep, selectStep]);

    // Fetch failed enrollment count
    useEffect(() => {
        const fetchFailedCount = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                const token = Cookies.get('token');
                const res = await fetch(
                    `${API_URL}/workspaces/${workspaceId}/workflows/${workflowId}/enrollments?status=failed,retrying`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token && { 'Authorization': `Bearer ${token}` }),
                        },
                    }
                );
                const data = await res.json();
                if (data.success) {
                    setFailedCount(data.data?.enrollments?.length || 0);
                }
            } catch (error) {
                console.error('Failed to fetch failed count:', error);
            }
        };

        if (workspaceId && workflowId) {
            fetchFailedCount();
            // Refresh every 30 seconds
            const interval = setInterval(fetchFailedCount, 30000);
            return () => clearInterval(interval);
        }
    }, [workspaceId, workflowId]);

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
                    type: "custom_edge",
                    animated: true,
                    style: { strokeWidth: 2, stroke: "#f59e0b" },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: "#f59e0b",
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
        setEdgeContextMenu(null);
    }, [selectStep]);

    // Handle edge context menu (right-click)
    const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        setEdgeContextMenu({
            edge,
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    // Handle delete edge from context menu
    const handleDeleteEdge = useCallback(() => {
        if (edgeContextMenu?.edge) {
            disconnectSteps(edgeContextMenu.edge.source, edgeContextMenu.edge.target);
            setEdgeContextMenu(null);
        }
    }, [edgeContextMenu, disconnectSteps]);

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
            } else if (type === "parallel") {
                newStep = {
                    id: generateStepId(),
                    type: "parallel",
                    name: "Parallel Split",
                    config: { branches: [], mode: "wait_all" },
                    position,
                    nextStepIds: [],
                    branches: { parallel: [] },
                };
            } else if (type === "merge") {
                newStep = {
                    id: generateStepId(),
                    type: "merge",
                    name: "Merge",
                    config: { aggregateResults: false },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "try_catch") {
                newStep = {
                    id: generateStepId(),
                    type: "try_catch",
                    name: "Try/Catch",
                    config: { retryOnError: false, maxRetries: 3 },
                    position,
                    nextStepIds: [],
                    branches: { success: "", error: "" },
                };
            } else if (type === "loop") {
                newStep = {
                    id: generateStepId(),
                    type: "loop",
                    name: "Loop",
                    config: {
                        sourceArray: "items",
                        sourceType: "variable",
                        itemVariable: "item",
                        indexVariable: "index",
                        mode: "sequential",
                        maxIterations: 1000
                    },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "transform") {
                newStep = {
                    id: generateStepId(),
                    type: "transform",
                    name: "Transform",
                    config: {
                        actionType: "transform_set",
                        operations: []
                    },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "ai_agent") {
                newStep = {
                    id: generateStepId(),
                    type: "ai_agent",
                    name: "AI Agent",
                    config: {
                        taskPrompt: "",
                        agentType: "auto",
                        timeout: 60000
                    },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "integration_slack") {
                newStep = {
                    id: generateStepId(),
                    type: "integration_slack",
                    name: "Slack",
                    config: {
                        action: "post_message",
                        credentials: { botToken: "" }
                    },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "integration_google_sheets") {
                newStep = {
                    id: generateStepId(),
                    type: "integration_google_sheets",
                    name: "Google Sheets",
                    config: {
                        action: "read",
                        credentialId: "",
                        responseVariable: "sheetsData"
                    },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "integration_notion") {
                newStep = {
                    id: generateStepId(),
                    type: "integration_notion",
                    name: "Notion",
                    config: {
                        action: "create_page",
                        credentialId: "",
                        responseVariable: "notionData"
                    },
                    position,
                    nextStepIds: [],
                };
            } else if (type === "http_request") {
                newStep = {
                    id: generateStepId(),
                    type: "http_request",
                    name: "HTTP Request",
                    config: {
                        method: "GET",
                        url: "",
                        authentication: { type: "none" }
                    },
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
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const token = Cookies.get('token');
            const response = await fetch(`${API_URL}/workspaces/${workspaceId}/workflows/${workflowId}/enroll-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
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

                {/* Right side - analytics, settings button and status badge with extra margin for AI toggle */}
                <div className="flex items-center gap-2 flex-shrink-0 mr-24">
                    <button
                        onClick={() => setShowGoalSettings(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                        title="Workflow Settings & Goals"
                    >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Settings
                    </button>
                    <button
                        onClick={() => router.push(`/projects/${workspaceId}/workflows/${workflowId}/analytics`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                        title="View Analytics"
                    >
                        <ChartBarIcon className="w-4 h-4" />
                        Analytics
                    </button>
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
                {/* Left sidebar - Node Palette */}
                <NodePalette />

                {/* Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onEdgesDelete={onEdgesDelete}
                        onEdgeContextMenu={onEdgeContextMenu}
                        onNodeClick={onNodeClick}
                        onNodesDelete={onNodesDelete}
                        onPaneClick={onPaneClick}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[15, 15]}
                        deleteKeyCode="Delete"
                        className="bg-muted/30"
                    >
                        <Controls className="!bg-card !border-border !shadow-lg" />
                        <MiniMap
                            nodeStrokeColor="#6366f1"
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'trigger': return '#22c55e';
                                    case 'action': return '#3b82f6';
                                    case 'delay': return '#f59e0b';
                                    case 'condition': return '#8b5cf6';
                                    default: return '#6b7280';
                                }
                            }}
                            maskColor="rgba(0, 0, 0, 0.2)"
                            className="!bg-card !border-border !rounded-lg"
                        />
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="var(--border)"
                        />

                        {/* Top-right toolbar with undo/redo/clone */}
                        <Panel position="top-right" className="!m-4">
                            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 flex items-center gap-1">
                                <button
                                    onClick={handleUndo}
                                    disabled={historyIndex <= 0}
                                    className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Undo (Ctrl+Z)"
                                >
                                    <ArrowUturnLeftIcon className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={historyIndex >= history.length - 1}
                                    className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Redo (Ctrl+Y)"
                                >
                                    <ArrowUturnRightIcon className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <div className="w-px h-4 bg-border mx-1" />
                                <button
                                    onClick={handleClone}
                                    disabled={isCloning}
                                    className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                                    title="Duplicate workflow"
                                >
                                    {isCloning ? (
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    ) : (
                                        <DocumentDuplicateIcon className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                        </Panel>

                        {/* Help panel */}
                        {showQuickTips && (
                            <Panel position="bottom-left" className="!m-4 !mb-20">
                                <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground space-y-1 relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-medium text-foreground">Quick Tips</p>
                                        <button
                                            onClick={handleToggleQuickTips}
                                            className="p-0.5 rounded hover:bg-muted transition-colors"
                                            title="Hide quick tips"
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                    <p>• Drag nodes from sidebar to canvas</p>
                                    <p>• Click nodes to configure</p>
                                    <p className="font-medium text-foreground mt-2 mb-1">Keyboard Shortcuts</p>
                                    <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + S</kbd> Save workflow</p>
                                    <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + Z</kbd> Undo</p>
                                    <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + Y</kbd> Redo</p>
                                    <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Delete</kbd> Remove selected node</p>
                                    <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Esc</kbd> Deselect</p>
                                    {currentWorkflow.status === "active" && (
                                        <p>• <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">Ctrl/Cmd + B</kbd> Bulk enroll</p>
                                    )}
                                </div>
                            </Panel>
                        )}
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
                        workspaceId={workspaceId}
                        workflowId={workflowId}
                    />
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="h-14 border-t border-border bg-card flex items-center justify-between px-4 gap-3 flex-shrink-0">
                {/* Left side - Test, Failed, Bulk Enroll */}
                <div className="flex items-center gap-2">
                    {/* Test Workflow Button */}
                    <button
                        onClick={() => setShowTestModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                        <BeakerIcon className="w-4 h-4" />
                        Test Workflow
                    </button>

                    {/* Execution Logs Button */}
                    <button
                        onClick={() => router.push(`/projects/${workspaceId}/workflows/${workflowId}/logs`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                        <DocumentTextIcon className="w-4 h-4" />
                        Execution Logs
                    </button>

                    {/* Webhook Info Button - only show if workflow has webhook trigger */}
                    {currentWorkflow.steps.some(
                        (s) => s.type === "trigger" && s.config?.triggerType === "webhook_received"
                    ) && (
                            <button
                                onClick={() => setShowWebhookPanel(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors"
                            >
                                <GlobeAltIcon className="w-4 h-4" />
                                Webhook Info
                            </button>
                        )}

                    {/* Failed Enrollments Badge */}
                    {failedCount > 0 && (
                        <button
                            onClick={() => setShowFailedPanel(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 transition-colors relative"
                        >
                            <ExclamationCircleIcon className="w-4 h-4" />
                            Failed ({failedCount})
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        </button>
                    )}

                    {/* Bulk Enroll Button */}
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

            {/* Test Workflow Modal */}
            <TestWorkflowModal
                isOpen={showTestModal}
                onClose={() => setShowTestModal(false)}
                workspaceId={workspaceId}
                workflowId={workflowId}
                workflowName={currentWorkflow.name}
            />

            {/* Failed Enrollments Panel */}
            <FailedEnrollmentsPanel
                isOpen={showFailedPanel}
                onClose={() => setShowFailedPanel(false)}
                workspaceId={workspaceId}
                workflowId={workflowId}
            />

            {/* Edge Context Menu */}
            {edgeContextMenu && (
                <>
                    {/* Backdrop to close menu on click */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setEdgeContextMenu(null)}
                    />
                    {/* Context Menu */}
                    <div
                        className="fixed z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[180px]"
                        style={{
                            left: edgeContextMenu.x,
                            top: edgeContextMenu.y,
                        }}
                    >
                        <button
                            onClick={handleDeleteEdge}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Delete Connection
                        </button>
                    </div>
                </>
            )}

            {/* Webhook Info Modal */}
            {showWebhookPanel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Webhook Information</h2>
                            <button
                                onClick={() => setShowWebhookPanel(false)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <WebhookPanel
                                workspaceId={workspaceId}
                                workflowId={workflowId}
                                workflowName={currentWorkflow.name}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Settings & Goals Modal */}
            {showGoalSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Workflow Settings</h2>
                            <button
                                onClick={() => setShowGoalSettings(false)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Description */}
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    Description
                                </label>
                                <textarea
                                    value={currentWorkflow.description || ""}
                                    onChange={(e) =>
                                        updateWorkflow(workspaceId, workflowId, {
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Describe what this workflow does..."
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                                />
                            </div>

                            {/* Allow Re-enrollment */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="allow-reenrollment"
                                    checked={currentWorkflow.allowReenrollment || false}
                                    onChange={(e) =>
                                        updateWorkflow(workspaceId, workflowId, {
                                            allowReenrollment: e.target.checked,
                                        })
                                    }
                                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <label
                                        htmlFor="allow-reenrollment"
                                        className="text-sm font-medium text-foreground cursor-pointer"
                                    >
                                        Allow Re-enrollment
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Allow contacts to be enrolled in this workflow multiple times
                                    </p>
                                </div>
                            </div>

                            {/* Goals */}
                            <GoalSettingsPanel
                                goals={(currentWorkflow.goalCriteria as any) || []}
                                onChange={(goals) =>
                                    updateWorkflow(workspaceId, workflowId, {
                                        goalCriteria: goals as any,
                                    })
                                }
                                workflowSteps={currentWorkflow.steps.map((s) => ({
                                    id: s.id,
                                    name: s.name,
                                }))}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
