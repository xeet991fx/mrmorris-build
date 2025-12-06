import { useState } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Opportunity } from "@/lib/api/opportunity";
import KanbanColumn from "./KanbanColumn";
import OpportunityCard from "./OpportunityCard";

interface PipelineKanbanViewProps {
  onEditOpportunity: (opportunity: Opportunity) => void;
  onDeleteOpportunity: (opportunityId: string) => void;
  onAddOpportunity: (stageId?: string) => void;
}

export default function PipelineKanbanView({
  onEditOpportunity,
  onDeleteOpportunity,
  onAddOpportunity,
}: PipelineKanbanViewProps) {
  const params = useParams();
  const workspaceId = params.id as string;

  const { kanbanData, moveOpportunity, optimisticMoveOpportunity, isLoading } =
    usePipelineStore();

  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(
    null
  );

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // Find the opportunity being dragged
    const opportunity = kanbanData.stages
      .flatMap((stage) => stage.opportunities)
      .find((opp) => opp._id === active.id);

    if (opportunity) {
      setActiveOpportunity(opportunity);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const opportunityId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage of the opportunity
    const currentStage = kanbanData.stages.find((stage) =>
      stage.opportunities.some((opp) => opp._id === opportunityId)
    );

    if (!currentStage) return;

    // If hovering over the same stage, prevent the drop
    // This stops DndKit's sortable from reordering within the same stage
    if (currentStage.stage._id === newStageId) {
      return false;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveOpportunity(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage of the opportunity
    const currentStage = kanbanData.stages.find((stage) =>
      stage.opportunities.some((opp) => opp._id === opportunityId)
    );

    if (!currentStage) return;

    // If dropped in the same stage, do nothing
    if (currentStage.stage._id === newStageId) return;

    // Optimistic update
    optimisticMoveOpportunity(opportunityId, currentStage.stage._id, newStageId);

    // Make API call
    try {
      await moveOpportunity(workspaceId, opportunityId, {
        stageId: newStageId,
      });
      toast.success("Opportunity moved successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to move opportunity");
      // The store's moveOpportunity already handles refetch on error to revert
    }
  };

  const handleDragCancel = () => {
    setActiveOpportunity(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (!kanbanData.pipeline) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-neutral-400">No pipeline selected</p>
        </div>
      </div>
    );
  }

  if (kanbanData.stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-neutral-400 mb-2">
            This pipeline has no stages
          </p>
          <p className="text-xs text-neutral-500">
            Add stages to start organizing opportunities
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Horizontal scrollable container - Full height */}
      <div className="overflow-x-auto h-[calc(100vh-200px)] -mx-8 px-8">
        <div className="flex gap-4 min-w-max h-full">
          {kanbanData.stages.map((stageData, index) => (
            <motion.div
              key={stageData.stage._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <KanbanColumn
                stage={stageData.stage}
                opportunities={stageData.opportunities}
                onEdit={onEditOpportunity}
                onDelete={onDeleteOpportunity}
                onAddOpportunity={() => onAddOpportunity(stageData.stage._id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Drag Overlay - Shows the card being dragged */}
      <DragOverlay>
        {activeOpportunity ? (
          <div className="opacity-90">
            <OpportunityCard
              opportunity={activeOpportunity}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
