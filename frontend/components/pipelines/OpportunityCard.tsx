import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  UserCircleIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Opportunity } from "@/lib/api/opportunity";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
}

export default function OpportunityCard({
  opportunity,
  onEdit,
  onDelete,
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
        "bg-neutral-800 border border-neutral-700 rounded-lg p-3 cursor-grab active:cursor-grabbing group hover:border-neutral-600 transition-all",
        isDragging && "opacity-50"
      )}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">
          {opportunity.title}
        </h3>

        {/* Actions Menu - Shows on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(opportunity);
            }}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Value */}
      <div className="text-xl font-bold text-[#9ACD32] mb-3">
        {formatCurrency(opportunity.value, opportunity.currency)}
      </div>

      {/* Footer with icons */}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
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

        {/* Expected Close Date */}
        {opportunity.expectedCloseDate && (
          <div className="flex items-center gap-1 ml-auto" title="Expected close date">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDate(opportunity.expectedCloseDate)}</span>
          </div>
        )}
      </div>

      {/* Contact/Company info */}
      {(opportunity.contactId || opportunity.companyId) && (
        <div className="mt-2 pt-2 border-t border-neutral-700 text-xs text-neutral-400 truncate">
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
