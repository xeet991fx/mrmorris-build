import { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon, TrashIcon, Bars3Icon, CheckIcon } from "@heroicons/react/24/outline";
import { Stage } from "@/lib/api/pipeline";
import { usePipelineStore } from "@/store/usePipelineStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface StageEditorProps {
    pipelineId: string;
    workspaceId: string;
    stages: Stage[];
    onStagesUpdated?: () => void;
}

// Color palette
const COLOR_PALETTE = [
    "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444",
    "#6366F1", "#14B8A6", "#F97316", "#06B6D4", "#84CC16", "#9333EA",
];

interface SortableStageItemProps {
    stage: Stage;
    onUpdate: (stageId: string, name: string, color: string) => void;
    onDelete: (stageId: string) => void;
    isUpdating: boolean;
}

function SortableStageItem({ stage, onUpdate, onDelete, isUpdating }: SortableStageItemProps) {
    const [localName, setLocalName] = useState(stage.name);
    const [localColor, setLocalColor] = useState(stage.color);
    const [hasChanges, setHasChanges] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: stage._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    useEffect(() => {
        setHasChanges(localName !== stage.name || localColor !== stage.color);
    }, [localName, localColor, stage.name, stage.color]);

    const handleSave = () => {
        if (hasChanges && localName.trim()) {
            onUpdate(stage._id, localName.trim(), localColor);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                "bg-white dark:bg-zinc-800",
                "border-zinc-200 dark:border-zinc-700",
                hasChanges && "ring-2 ring-amber-400",
                isDragging && "opacity-50"
            )}
        >
            {/* Drag Handle */}
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
                <Bars3Icon className="w-5 h-5" />
            </button>

            {/* Color Picker */}
            <input
                type="color"
                value={localColor}
                onChange={(e) => setLocalColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-200 dark:border-zinc-600 bg-transparent flex-shrink-0"
            />

            {/* Name Input */}
            <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="Stage name"
                className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm transition-colors",
                    "bg-zinc-50 dark:bg-zinc-900",
                    "border border-zinc-200 dark:border-zinc-700",
                    "text-zinc-900 dark:text-zinc-100",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500"
                )}
            />

            {/* Save Button (if changes) */}
            {hasChanges && (
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isUpdating || !localName.trim()}
                    className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50"
                    title="Save changes"
                >
                    <CheckIcon className="w-5 h-5" />
                </button>
            )}

            {/* Delete Button */}
            <button
                type="button"
                onClick={() => onDelete(stage._id)}
                disabled={isUpdating}
                className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
                title="Delete stage"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
    );
}

export default function StageEditor({ pipelineId, workspaceId, stages, onStagesUpdated }: StageEditorProps) {
    const { addStage, updateStage, deleteStage, reorderStages, fetchPipelines } = usePipelineStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState(COLOR_PALETTE[0]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = stages.findIndex((s) => s._id === active.id);
        const newIndex = stages.findIndex((s) => s._id === over.id);
        const newOrder = arrayMove(stages, oldIndex, newIndex).map((s) => s._id);

        setIsUpdating(true);
        try {
            await reorderStages(workspaceId, pipelineId, newOrder);
            await fetchPipelines(workspaceId);
            onStagesUpdated?.();
        } catch (error) {
            toast.error("Failed to reorder stages");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddStage = async () => {
        if (!newStageName.trim()) {
            toast.error("Please enter a stage name");
            return;
        }

        setIsUpdating(true);
        try {
            await addStage(workspaceId, pipelineId, {
                name: newStageName.trim(),
                color: newStageColor,
                order: stages.length,
            });
            await fetchPipelines(workspaceId);
            setNewStageName("");
            setNewStageColor(COLOR_PALETTE[(stages.length + 1) % COLOR_PALETTE.length]);
            toast.success("Stage added!");
            onStagesUpdated?.();
        } catch (error) {
            toast.error("Failed to add stage");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateStage = async (stageId: string, name: string, color: string) => {
        setIsUpdating(true);
        try {
            await updateStage(workspaceId, pipelineId, stageId, { name, color });
            await fetchPipelines(workspaceId);
            toast.success("Stage updated!");
            onStagesUpdated?.();
        } catch (error) {
            toast.error("Failed to update stage");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        if (stages.length <= 1) {
            toast.error("Pipeline must have at least one stage");
            return;
        }

        if (!confirm("Delete this stage? Opportunities in this stage will need to be moved.")) return;

        setIsUpdating(true);
        try {
            await deleteStage(workspaceId, pipelineId, stageId);
            await fetchPipelines(workspaceId);
            toast.success("Stage deleted!");
            onStagesUpdated?.();
        } catch (error) {
            toast.error("Failed to delete stage");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Pipeline Stages
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Drag to reorder • {stages.length} stages
                </span>
            </div>

            {/* Quick Color Palette */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-2">New stage color:</span>
                <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setNewStageColor(color)}
                            className={cn(
                                "w-6 h-6 rounded-md border-2 shadow-sm hover:scale-110 transition-transform",
                                newStageColor === color ? "ring-2 ring-offset-2 ring-zinc-400" : "border-white dark:border-zinc-700"
                            )}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>

            {/* Stages List */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stages.map((s) => s._id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {stages.map((stage) => (
                            <SortableStageItem
                                key={stage._id}
                                stage={stage}
                                onUpdate={handleUpdateStage}
                                onDelete={handleDeleteStage}
                                isUpdating={isUpdating}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add New Stage */}
            <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
                <input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-200 dark:border-zinc-600 bg-transparent flex-shrink-0"
                />
                <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                    placeholder="New stage name..."
                    className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-sm",
                        "bg-white dark:bg-zinc-900",
                        "border border-zinc-200 dark:border-zinc-700",
                        "text-zinc-900 dark:text-zinc-100",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    )}
                />
                <button
                    type="button"
                    onClick={handleAddStage}
                    disabled={isUpdating || !newStageName.trim()}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        "bg-emerald-600 text-white hover:bg-emerald-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            {isUpdating && (
                <div className="text-center text-xs text-zinc-500">Saving...</div>
            )}
        </div>
    );
}
