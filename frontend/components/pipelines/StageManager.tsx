import { useState } from "react";
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
import { PlusIcon, TrashIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { StageInput } from "@/lib/validations/pipeline";
import { cn } from "@/lib/utils";

interface StageManagerProps {
  stages: StageInput[];
  onChange: (stages: StageInput[]) => void;
  errors?: any;
}

// Predefined color palette
const COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EF4444", // Red
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#9333EA", // Violet
];

function SortableStageItem({
  stage,
  index,
  onUpdate,
  onDelete,
}: {
  stage: StageInput;
  index: number;
  onUpdate: (index: number, field: keyof StageInput, value: any) => void;
  onDelete: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage._id || `stage-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        "bg-white dark:bg-zinc-800",
        "border-zinc-200 dark:border-zinc-700",
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
      <div className="relative flex-shrink-0">
        <input
          type="color"
          value={stage.color}
          onChange={(e) => onUpdate(index, "color", e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-200 dark:border-zinc-600 bg-transparent"
          title="Stage color"
        />
      </div>

      {/* Stage Name Input */}
      <input
        type="text"
        value={stage.name}
        onChange={(e) => onUpdate(index, "name", e.target.value)}
        placeholder="Stage name"
        className={cn(
          "flex-1 px-3 py-2 rounded-lg text-sm transition-colors",
          "bg-zinc-50 dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-700",
          "text-zinc-900 dark:text-zinc-100",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        )}
      />

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        title="Delete stage"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function StageManager({ stages, onChange, errors }: StageManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex(
        (s) => (s._id || `stage-${stages.indexOf(s)}`) === active.id
      );
      const newIndex = stages.findIndex(
        (s) => (s._id || `stage-${stages.indexOf(s)}`) === over.id
      );

      const reorderedStages = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i,
      }));

      onChange(reorderedStages);
    }
  };

  const handleAddStage = () => {
    const newStage: StageInput = {
      name: "",
      color: COLOR_PALETTE[stages.length % COLOR_PALETTE.length],
      order: stages.length,
    };
    onChange([...stages, newStage]);
  };

  const handleUpdateStage = (index: number, field: keyof StageInput, value: any) => {
    const updatedStages = stages.map((stage, i) =>
      i === index ? { ...stage, [field]: value } : stage
    );
    onChange(updatedStages);
  };

  const handleDeleteStage = (index: number) => {
    if (stages.length === 1) {
      alert("Pipeline must have at least one stage");
      return;
    }
    const updatedStages = stages.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      order: i,
    }));
    onChange(updatedStages);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Stages <span className="text-rose-500">*</span>
        </label>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Drag to reorder • {stages.length}/20 stages
        </span>
      </div>

      {/* Quick Color Palette */}
      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-2">Quick colors:</span>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                if (stages.length > 0) {
                  handleUpdateStage(stages.length - 1, "color", color);
                }
              }}
              className="w-6 h-6 rounded-md border-2 border-white dark:border-zinc-700 shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stages List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((s, i) => s._id || `stage-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <SortableStageItem
                key={stage._id || `stage-${index}`}
                stage={stage}
                index={index}
                onUpdate={handleUpdateStage}
                onDelete={handleDeleteStage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Stage Button */}
      <button
        type="button"
        onClick={handleAddStage}
        disabled={stages.length >= 20}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all",
          "border-2 border-dashed",
          "border-zinc-300 dark:border-zinc-700",
          "hover:border-emerald-400 dark:hover:border-emerald-500",
          "text-zinc-500 dark:text-zinc-400",
          "hover:text-emerald-600 dark:hover:text-emerald-400",
          "hover:bg-emerald-50 dark:hover:bg-emerald-500/5",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-300 disabled:hover:text-zinc-500"
        )}
      >
        <PlusIcon className="w-5 h-5" />
        Add Stage
      </button>

      {/* Validation Error */}
      {errors && (
        <p className="text-xs text-rose-500">{errors.message || "Invalid stages"}</p>
      )}
    </div>
  );
}
