import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  UserCircleIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { Opportunity } from "@/lib/api/opportunity";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
  inWorkflow?: boolean;
}

export default function OpportunityCard({
  opportunity,
  onEdit,
  onDelete,
  inWorkflow = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Format currency
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-neutral-500";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing group hover:border-primary/50 dark:hover:border-primary/30 transition-all shadow-sm hover:shadow-md",
        isDragging && "opacity-50"
      )}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">
            {opportunity.title}
          </h3>
          {inWorkflow && (
            <div className="flex items-center gap-1 mt-1">
              <BoltIcon className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] text-violet-400 font-medium">In Workflow</span>
            </div>
          )}
        </div>

        {/* Actions Menu - Shows on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(opportunity);
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Value */}
      <div className="text-xl font-bold text-black mb-3">
        {formatCurrency(opportunity.value, opportunity.currency)}
      </div>

      {/* Footer with icons */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* Assigned User */}
        {opportunity.assignedTo && (
          <div className="flex items-center gap-1" title="Assigned to">
            <UserCircleIcon className="w-4 h-4" />
            <span className="truncate max-w-[80px]">
              {typeof opportunity.assignedTo === "object"
                ? (opportunity.assignedTo as any).name
                : ""}
            </span>
          </div>
        )}

        {/* Priority Indicator */}
        {opportunity.priority && (
          <div className="flex items-center gap-1">
            <div
              className={cn("w-2 h-2 rounded-full", getPriorityColor(opportunity.priority))}
              title={`Priority: ${opportunity.priority}`}
            />
          </div>
        )}

        {/* Close Date - Show actual for closed deals, expected otherwise */}
        {(opportunity.actualCloseDate || opportunity.expectedCloseDate) && (
          <div className="flex items-center gap-1 ml-auto" title={
            (opportunity.status === "won" || opportunity.status === "lost") && opportunity.actualCloseDate
              ? "Closed on"
              : "Expected close date"
          }>
            <CalendarIcon className="w-4 h-4" />
            <span>
              {(opportunity.status === "won" || opportunity.status === "lost") && opportunity.actualCloseDate
                ? `Closed ${formatDate(opportunity.actualCloseDate)}`
                : formatDate(opportunity.expectedCloseDate)}
            </span>
          </div>
        )}
      </div>

      {/* Contact/Company info */}
      {(opportunity.contactId || opportunity.companyId) && (
        <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground truncate">
          {opportunity.companyId && typeof opportunity.companyId === "object" && (
            <span>{(opportunity.companyId as any).name}</span>
          )}
          {opportunity.contactId && typeof opportunity.contactId === "object" && (
            <span>
              {opportunity.companyId && " • "}
              {(opportunity.contactId as any).firstName} {(opportunity.contactId as any).lastName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
