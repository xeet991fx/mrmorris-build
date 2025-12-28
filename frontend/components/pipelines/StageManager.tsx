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

interface StageManagerProps {
  stages: StageInput[];
  onChange: (stages: StageInput[]) => void;
  errors?: any;
}

// Predefined color palette
const COLOR_PALETTE = [
  "#9ACD32", // Lime green (brand color)
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Orange
  "#10B981", // Green
  "#EF4444", // Red
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Deep orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
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
      className={`flex items-center gap-3 p-3 bg-neutral-800 border border-neutral-700 rounded-lg ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-white"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Color Picker */}
      <div className="relative">
        <input
          type="color"
          value={stage.color}
          onChange={(e) => onUpdate(index, "color", e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border-2 border-neutral-600"
          title="Stage color"
        />
      </div>

      {/* Stage Name Input */}
      <input
        type="text"
        value={stage.name}
        onChange={(e) => onUpdate(index, "name", e.target.value)}
        placeholder="Stage name"
        className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
        title="Delete stage"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function StageManager({ stages, onChange, errors }: StageManagerProps) {
  const [showColorPalette, setShowColorPalette] = useState(false);

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Stages <span className="text-red-400">*</span>
        </label>
        <span className="text-xs text-neutral-400">
          Drag to reorder • {stages.length}/20 stages
        </span>
      </div>

      {/* Color Palette */}
      <div className="flex flex-wrap gap-2 p-3 bg-neutral-900 border border-neutral-700 rounded-lg">
        <span className="text-xs text-neutral-400 w-full mb-1">Quick colors:</span>
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              if (stages.length > 0) {
                handleUpdateStage(stages.length - 1, "color", color);
              }
            }}
            className="w-6 h-6 rounded border-2 border-neutral-600 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
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
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 border-2 border-dashed border-neutral-700 hover:border-black hover:bg-neutral-800/50 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-400 hover:text-white rounded-lg transition-all"
      >
        <PlusIcon className="w-5 h-5" />
        Add Stage
      </button>

      {/* Validation Error */}
      {errors && (
        <p className="text-xs text-red-400">{errors.message || "Invalid stages"}</p>
      )}
    </div>
  );
}
