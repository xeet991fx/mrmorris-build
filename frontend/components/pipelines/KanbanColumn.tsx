import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Opportunity } from "@/lib/api/opportunity";
import OpportunityCardEnhanced from "./OpportunityCardEnhanced";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: {
    _id: string;
    name: string;
    order: number;
    color: string;
  };
  opportunities: Opportunity[];
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
  onAddOpportunity: (stageId: string) => void;
  onCardClick?: (opportunity: Opportunity) => void;
}

export default function KanbanColumn({
  stage,
  opportunities,
  onEdit,
  onDelete,
  onAddOpportunity,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage._id,
    data: {
      type: "stage",
      stageId: stage._id,
    },
  });

  // Calculate total value of opportunities in this stage
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex-shrink-0 w-[320px] flex flex-col h-full">
      {/* Column Header */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
            <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-full">
              {opportunities.length}
            </span>
          </div>
          <button
            onClick={() => onAddOpportunity(stage._id)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-card rounded transition-colors"
            title="Add opportunity to this stage"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        {totalValue > 0 && (
          <div className="text-xs text-muted-foreground">
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-muted/30 border-2 border-dashed rounded-lg p-2 space-y-3 overflow-y-auto",
          isOver ? "border-black bg-black/10" : "border-border"
        )}
      >
        {opportunities.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div>
              <p className="text-sm text-muted-foreground">No opportunities</p>
              <button
                onClick={() => onAddOpportunity(stage._id)}
                className="mt-2 text-xs text-black hover:underline"
              >
                Add one
              </button>
            </div>
          </div>
        ) : (
          opportunities.map((opportunity, index) => (
            <motion.div
              key={opportunity._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <OpportunityCardEnhanced
                opportunity={opportunity}
                onEdit={onEdit}
                onDelete={onDelete}
                onClick={onCardClick}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
