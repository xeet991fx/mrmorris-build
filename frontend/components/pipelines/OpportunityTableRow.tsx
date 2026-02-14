// @ts-nocheck
import { Menu } from "@headlessui/react";
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Opportunity } from "@/lib/api/opportunity";
import { cn } from "@/lib/utils";

interface OpportunityTableRowProps {
  opportunity: Opportunity;
  index: number;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
  stageName?: string;
  stageColor?: string;
  initial?: any;
  animate?: any;
  transition?: any;
}

const PRIORITY_CONFIG = {
  low: {
    color: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
    label: "Low",
  },
  medium: {
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    label: "Medium",
  },
  high: {
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "High",
  },
};

const STATUS_CONFIG = {
  open: {
    color: "bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/20",
    label: "Open",
  },
  won: {
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    label: "Won",
  },
  lost: {
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    label: "Lost",
  },
  abandoned: {
    color: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
    label: "Abandoned",
  },
};

export default function OpportunityTableRow({
  opportunity,
  index,
  onEdit,
  onDelete,
  stageName,
  stageColor,
  initial,
  animate,
  transition,
}: OpportunityTableRowProps) {
  // Format currency
  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opportunity.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(opportunity.value || 0);

  // Calculate weighted value
  const weightedValue = ((opportunity.value || 0) * (opportunity.probability || 0)) / 100;
  const formattedWeightedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opportunity.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(weightedValue);

  return (
    <motion.tr
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn(
        "border-b border-border hover:bg-accent/50 dark:hover:bg-accent/20 transition-colors cursor-pointer",
        index % 2 === 0 ? "bg-background" : "bg-muted/10"
      )}
    >
      {/* Title */}
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {opportunity.title || "—"}
      </td>

      {/* Value */}
      <td className="px-4 py-3 text-sm text-foreground">
        <div className="flex flex-col">
          <span className="font-semibold">{formattedValue}</span>
          {opportunity.probability !== undefined && opportunity.probability > 0 && (
            <span className="text-xs text-muted-foreground">
              {formattedWeightedValue} ({opportunity.probability}%)
            </span>
          )}
        </div>
      </td>

      {/* Stage */}
      <td className="px-4 py-3 text-sm">
        {stageName && stageColor ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: `${stageColor}15`,
              color: stageColor,
              borderColor: `${stageColor}40`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stageColor }}
            />
            {stageName}
          </span>
        ) : (
          "—"
        )}
      </td>

      {/* Assigned User */}
      <td className="px-4 py-3 text-sm text-foreground">
        {opportunity.assignedTo ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {typeof opportunity.assignedTo === 'object' && opportunity.assignedTo.name
                ? opportunity.assignedTo.name.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {typeof opportunity.assignedTo === 'object'
                ? opportunity.assignedTo.name
                : `User ${opportunity.assignedTo.substring(0, 8)}`}
            </span>
          </div>
        ) : (
          "—"
        )}
      </td>

      {/* Priority */}
      <td className="px-4 py-3 text-sm">
        {opportunity.priority ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
              PRIORITY_CONFIG[opportunity.priority]?.color
            )}
          >
            {PRIORITY_CONFIG[opportunity.priority]?.label}
          </span>
        ) : (
          "—"
        )}
      </td>

      {/* Close Date - Show actual for closed deals, expected otherwise */}
      <td className="px-4 py-3 text-sm text-foreground">
        {(opportunity.status === "won" || opportunity.status === "lost") && opportunity.actualCloseDate ? (
          <div className="flex flex-col">
            <span className="font-medium">{format(new Date(opportunity.actualCloseDate), "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">Closed</span>
          </div>
        ) : opportunity.expectedCloseDate ? (
          format(new Date(opportunity.expectedCloseDate), "MMM d, yyyy")
        ) : (
          "—"
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-sm">
        {opportunity.status ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
              STATUS_CONFIG[opportunity.status]?.color
            )}
          >
            {STATUS_CONFIG[opportunity.status]?.label}
          </span>
        ) : (
          "—"
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <EllipsisVerticalIcon className="w-4 h-4" />
          </Menu.Button>

          <Menu.Items className="absolute right-0 mt-1 w-36 origin-top-right bg-card border border-border rounded-lg shadow-xl overflow-hidden z-10">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onEdit(opportunity)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    active ? "bg-muted text-foreground" : "text-foreground"
                  )}
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onDelete(opportunity._id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    active ? "bg-red-500/20 text-red-400" : "text-red-400"
                  )}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Menu>
      </td>
    </motion.tr>
  );
}
