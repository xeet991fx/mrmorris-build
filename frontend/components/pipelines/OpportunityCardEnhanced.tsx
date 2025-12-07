import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  UserCircleIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  PaperClipIcon,
  ChatBubbleLeftIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { Opportunity } from "@/lib/api/opportunity";
import { cn } from "@/lib/utils";
import {
  getDaysInStage,
  getDaysSinceLastActivity,
  calculateDealTemperature,
  getTemperatureIcon,
  getTemperatureColor,
  formatRelativeTime,
  formatCurrency,
  getInitials,
  getStageAgingColor,
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
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate metrics
  const daysInStage = getDaysInStage(opportunity);
  const daysSinceActivity = getDaysSinceLastActivity(opportunity);
  const temperature =
    opportunity.dealTemperature || calculateDealTemperature(opportunity);
  const temperatureIcon = getTemperatureIcon(temperature);
  const temperatureColor = getTemperatureColor(temperature);

  // Get contact and company info
  const contact =
    typeof opportunity.contactId === "object" ? opportunity.contactId : null;
  const company =
    typeof opportunity.companyId === "object" ? opportunity.companyId : null;

  const contactName = contact
    ? `${(contact as any).firstName} ${(contact as any).lastName}`
    : null;
  const companyName = company ? (company as any).name : null;

  // Get contact photo or initials
  const contactPhoto = contact ? (contact as any).photo : null;
  const contactInitials = contactName ? getInitials(contactName) : "?";

  // Handle card click (open detail panel)
  const handleCardClick = () => {
    if (onClick) {
      onClick(opportunity);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer group hover:border-neutral-600 transition-all relative",
        isDragging && "opacity-50 cursor-grabbing",
        // Border color based on temperature
        temperature === "hot" && "border-red-500/30 hover:border-red-500/50",
        temperature === "warm" && "border-yellow-500/30 hover:border-yellow-500/50",
        temperature === "cold" && "border-blue-500/30 hover:border-blue-500/50",
        !temperature && "border-border"
      )}
    >
      {/* Header Row: Temperature + Value + Menu */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Temperature Icon */}
          <span className={cn("text-xl", temperatureColor)} title={temperature}>
            {temperatureIcon}
          </span>

          {/* Deal Value */}
          <div className="text-lg font-bold text-[#84cc16]">
            {formatCurrency(opportunity.value, opportunity.currency, true)}
          </div>
        </div>

        {/* Three-dot menu (always visible on hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-neutral-700"
            title="Actions"
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div
              className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(opportunity);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Log email
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-2"
              >
                <EnvelopeIcon className="w-4 h-4" />
                Log Email
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Log call
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 flex items-center gap-2"
              >
                <PhoneIcon className="w-4 h-4" />
                Log Call
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(opportunity._id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-neutral-700 flex items-center gap-2 border-t border-border"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Section: Photo + Name + Company */}
      {(contactName || companyName) && (
        <div className="flex items-center gap-2 mb-3">
          {/* Contact Photo/Avatar */}
          {contactName && (
            <div className="flex-shrink-0">
              {contactPhoto ? (
                <img
                  src={contactPhoto}
                  alt={contactName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-foreground font-semibold text-sm">
                  {contactInitials}
                </div>
              )}
            </div>
          )}

          {/* Contact Name + Company */}
          <div className="flex-1 min-w-0">
            {contactName && (
              <div className="text-sm font-semibold text-foreground truncate">
                <UserCircleIcon className="w-3 h-3 inline mr-1" />
                {contactName}
              </div>
            )}
            {companyName && (
              <div className="text-xs text-muted-foreground truncate">
                {companyName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deal Title */}
      <div className="mb-3">
        <h3 className="text-sm font-medium text-neutral-200 line-clamp-2">
          {opportunity.title}
        </h3>
      </div>

      {/* Metrics Row: Days in Stage + Last Activity */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1" title={`${daysInStage} days in current stage`}>
          <CalendarIcon className="w-3 h-3" />
          <span className={getStageAgingColor(daysInStage)}>
            {daysInStage}d in stage
          </span>
        </div>

        <div className="flex items-center gap-1" title={`Last activity: ${formatRelativeTime(opportunity.lastActivityAt)}`}>
          <span className="text-muted-foreground">🕐</span>
          <span>{formatRelativeTime(opportunity.lastActivityAt)}</span>
        </div>
      </div>

      {/* Next Action Row */}
      {opportunity.nextAction && (
        <div className="mb-2 flex items-start gap-1 text-xs text-neutral-300 bg-neutral-700/30 rounded px-2 py-1">
          <BoltIcon className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-500" />
          <span className="line-clamp-1">{opportunity.nextAction}</span>
        </div>
      )}

      {/* Footer Stats: Files, Notes, Last Call */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2">
        {/* File count */}
        {(opportunity as any).fileCount > 0 && (
          <div className="flex items-center gap-1" title="Attachments">
            <PaperClipIcon className="w-3 h-3" />
            <span>{(opportunity as any).fileCount}</span>
          </div>
        )}

        {/* Activity count */}
        {opportunity.activityCount && opportunity.activityCount > 0 && (
          <div className="flex items-center gap-1" title="Activities">
            <ChatBubbleLeftIcon className="w-3 h-3" />
            <span>{opportunity.activityCount}</span>
          </div>
        )}

        {/* Last call */}
        {opportunity.callCount && opportunity.callCount > 0 && (
          <div className="flex items-center gap-1" title="Calls logged">
            <PhoneIcon className="w-3 h-3" />
            <span>{opportunity.callCount}</span>
          </div>
        )}

        {/* Probability */}
        {opportunity.probability && (
          <div className="ml-auto text-xs font-medium text-muted-foreground" title="Close probability">
            {opportunity.probability}%
          </div>
        )}
      </div>

      {/* Click anywhere to open detail panel hint */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground">
          Click to view details
        </div>
      </div>
    </div>
  );
}
