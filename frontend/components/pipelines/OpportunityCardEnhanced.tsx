import { useDraggable } from "@dnd-kit/core";
import {
  UserCircleIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Opportunity } from "@/lib/api/opportunity";
import { cn } from "@/lib/utils";
import {
  getDaysInStage,
  formatRelativeTime,
  formatCurrency,
  getInitials,
  getStageAgingColor,
  calculateDealTemperature,
} from "@/lib/utils/opportunityUtils";
import { useState } from "react";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
  onClick?: (opportunity: Opportunity) => void;
}

export default function OpportunityCardEnhanced({
  opportunity,
  onEdit,
  onDelete,
  onClick,
}: OpportunityCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: opportunity._id,
    data: {
      type: "opportunity",
      opportunity,
    },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Calculate metrics
  const daysInStage = getDaysInStage(opportunity);
  const temperature = opportunity.dealTemperature || calculateDealTemperature(opportunity);

  // Get contact and company info
  const contact = typeof opportunity.contactId === "object" ? opportunity.contactId : null;
  const company = typeof opportunity.companyId === "object" ? opportunity.companyId : null;
  const contactName = contact ? `${(contact as any).firstName} ${(contact as any).lastName}` : null;
  const companyName = company ? (company as any).name : null;
  const contactPhoto = contact ? (contact as any).photo : null;
  const contactInitials = contactName ? getInitials(contactName) : "?";

  const handleCardClick = () => {
    if (onClick) onClick(opportunity);
  };

  // Temperature left border color
  const getTempBorderColor = (temp: string) => {
    switch (temp) {
      case "hot": return "border-l-rose-500";
      case "warm": return "border-l-amber-500";
      case "cold": return "border-l-blue-500";
      default: return "border-l-zinc-300 dark:border-l-zinc-600";
    }
  };

  // Priority badge
  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case "high": return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
      case "low": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      default: return "";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDragging ? {} : listeners)}
      onClick={handleCardClick}
      className={cn(
        "relative group rounded-xl border-l-4 transition-all duration-150",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-700",
        "hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600",
        "p-3.5",
        getTempBorderColor(temperature),
        isDragging && "opacity-50"
      )}
    >
      {/* Row 1: Title + Menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 flex-1">
          {opportunity.title}
        </h3>

        {/* Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 mt-1 w-40 z-20 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(opportunity); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <PencilIcon className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <EnvelopeIcon className="w-3.5 h-3.5" /> Log Email
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <PhoneIcon className="w-3.5 h-3.5" /> Log Call
              </button>
              <div className="border-t border-zinc-100 dark:border-zinc-700" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(opportunity._id); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
              >
                <TrashIcon className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Value */}
      <div className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
        {formatCurrency(opportunity.value, opportunity.currency, true)}
      </div>

      {/* Row 3: Contact/Company (inline) */}
      {(contactName || companyName) && (
        <div className="flex items-center gap-2 mb-2 text-xs text-zinc-600 dark:text-zinc-400">
          {contactName && (
            <>
              {contactPhoto ? (
                <img src={contactPhoto} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-semibold">
                  {contactInitials}
                </div>
              )}
              <span className="truncate max-w-[80px]">{contactName}</span>
            </>
          )}
          {contactName && companyName && <span className="text-zinc-300 dark:text-zinc-600">•</span>}
          {companyName && (
            <span className="truncate max-w-[100px] flex items-center gap-1">
              <BuildingOfficeIcon className="w-3 h-3 flex-shrink-0" />
              {companyName}
            </span>
          )}
        </div>
      )}

      {/* Row 4: Meta info */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        {/* Days in stage */}
        <span className={cn("flex items-center gap-1", daysInStage > 0 ? getStageAgingColor(daysInStage) : "text-emerald-600")}>
          <CalendarIcon className="w-3 h-3" />
          {daysInStage > 0 ? `${daysInStage}d in stage` : "New"}
        </span>

        {/* Expected Close Date */}
        {opportunity.expectedCloseDate && (
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {new Date(opportunity.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}

        {/* Last activity */}
        {opportunity.lastActivityAt && (
          <span>
            Last: {formatRelativeTime(opportunity.lastActivityAt)}
          </span>
        )}

        {/* Probability */}
        {opportunity.probability && (
          <span className="font-medium">{opportunity.probability}%</span>
        )}

        {/* Priority */}
        {opportunity.priority && (
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase", getPriorityStyle(opportunity.priority))}>
            {opportunity.priority}
          </span>
        )}
      </div>

      {/* Next Action (if exists) */}
      {opportunity.nextAction && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-amber-600 dark:text-amber-400 line-clamp-1">
          → {opportunity.nextAction}
        </div>
      )}
    </div>
  );
}
