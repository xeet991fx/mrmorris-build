import { useState } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Opportunity } from "@/lib/api/opportunity";
import KanbanColumn from "./KanbanColumn";
import OpportunityCardEnhanced from "./OpportunityCardEnhanced";
import OpportunityDetailPanel from "./OpportunityDetailPanel";

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
  const [detailPanelOpportunity, setDetailPanelOpportunity] = useState<Opportunity | null>(
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

    // Get opportunity from drag data
    const dragData = active.data.current;
    if (dragData?.type === "opportunity" && dragData.opportunity) {
      setActiveOpportunity(dragData.opportunity);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // DEBUG: Log what we're getting
    console.log("=== DRAG END ===");
    console.log("active.id:", active.id);
    console.log("over:", over);
    console.log("over?.id:", over?.id);
    console.log("over?.data.current:", over?.data?.current);

    // Always clear drag state
    setActiveOpportunity(null);

    // If no drop target, card snaps back - do nothing
    if (!over) {
      console.log("No drop target - snapping back");
      return;
    }

    // Get data from active (dragged item) and over (drop target)
    const activeData = active.data.current;
    const overData = over.data.current;

    // Validate we're dragging an opportunity
    if (activeData?.type !== "opportunity") {
      return;
    }

    // Get the target stage ID
    let targetStageId: string | null = null;

    if (overData?.type === "stage") {
      // Dropped on a stage column
      targetStageId = overData.stageId;
    } else {
      // Dropped on something else (maybe another card or outside)
      // Try to find which stage the over.id belongs to
      const targetStage = kanbanData.stages.find(
        (stage) => stage.stage._id === over.id
      );
      if (targetStage) {
        targetStageId = targetStage.stage._id;
      }
    }

    // If we couldn't determine a valid target stage, snap back silently
    if (!targetStageId) {
      return;
    }

    const opportunityId = active.id as string;
    const opportunity = activeData.opportunity as Opportunity;

    // Find current stage of the opportunity
    const currentStage = kanbanData.stages.find((stage) =>
      stage.opportunities.some((opp) => opp._id === opportunityId)
    );

    // If we can't find current stage, snap back
    if (!currentStage) {
      return;
    }

    // If dropped in the same stage, snap back (no move needed)
    if (currentStage.stage._id === targetStageId) {
      return;
    }

    // Optimistic update
    optimisticMoveOpportunity(opportunityId, currentStage.stage._id, targetStageId);

    // Make API call
    try {
      await moveOpportunity(workspaceId, opportunityId, {
        stageId: targetStageId,
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
      onDragStart={handleDragStart}
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
                onCardClick={setDetailPanelOpportunity}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Drag Overlay - Shows the card being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeOpportunity ? (
          <div
            className="scale-105 shadow-2xl"
            style={{
              cursor: 'grabbing',
              pointerEvents: 'none',
            }}
          >
            <OpportunityCardEnhanced
              opportunity={activeOpportunity}
              onEdit={() => { }}
              onDelete={() => { }}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Detail Panel */}
      <OpportunityDetailPanel
        isOpen={!!detailPanelOpportunity}
        onClose={() => setDetailPanelOpportunity(null)}
        opportunity={detailPanelOpportunity}
        workspaceId={workspaceId}
        onEdit={onEditOpportunity}
      />
    </DndContext>
  );
}
