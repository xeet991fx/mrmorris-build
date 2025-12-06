// @ts-nocheck
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Opportunity } from "@/lib/api/opportunity";
import OpportunityTableRow from "./OpportunityTableRow";
import { cn } from "@/lib/utils";

interface PipelineTableViewProps {
  onEditOpportunity: (opportunity: Opportunity) => void;
  onDeleteOpportunity: (opportunityId: string) => void;
}

type SortColumn =
  | "title"
  | "value"
  | "stage"
  | "assignedTo"
  | "priority"
  | "expectedCloseDate"
  | "status";
type SortDirection = "asc" | "desc";

const PRIORITY_ORDER = { low: 1, medium: 2, high: 3 };
const STATUS_ORDER = { open: 1, won: 2, lost: 3, abandoned: 4 };

export default function PipelineTableView({
  onEditOpportunity,
  onDeleteOpportunity,
}: PipelineTableViewProps) {
  const { kanbanData, currentPipeline } = usePipelineStore();

  const [sortColumn, setSortColumn] = useState<SortColumn>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten all opportunities from kanban data
  const allOpportunities = useMemo(() => {
    if (!kanbanData || !kanbanData.stages || !currentPipeline) return [];

    const opportunities: Opportunity[] = [];
    kanbanData.stages.forEach((stageData) => {
      if (stageData.opportunities) {
        opportunities.push(...stageData.opportunities);
      }
    });

    return opportunities;
  }, [kanbanData, currentPipeline]);

  // Get stage info for an opportunity
  const getStageInfo = (opportunity: Opportunity) => {
    const stage = currentPipeline?.stages.find(
      (s) => s._id === opportunity.stageId
    );
    return {
      name: stage?.name || "—",
      color: stage?.color || "#6B7280",
    };
  };

  // Filter and sort opportunities
  const filteredAndSortedOpportunities = useMemo(() => {
    let filtered = allOpportunities;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (opp) =>
          opp.title?.toLowerCase().includes(query) ||
          opp.description?.toLowerCase().includes(query) ||
          opp.source?.toLowerCase().includes(query) ||
          opp.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "value":
          aValue = a.value || 0;
          bValue = b.value || 0;
          break;
        case "stage":
          const aStage = getStageInfo(a);
          const bStage = getStageInfo(b);
          aValue = aStage.name.toLowerCase();
          bValue = bStage.name.toLowerCase();
          break;
        case "assignedTo":
          aValue = a.assignedTo?.toLowerCase() || "";
          bValue = b.assignedTo?.toLowerCase() || "";
          break;
        case "priority":
          aValue = PRIORITY_ORDER[a.priority || "low"];
          bValue = PRIORITY_ORDER[b.priority || "low"];
          break;
        case "expectedCloseDate":
          aValue = a.expectedCloseDate
            ? new Date(a.expectedCloseDate).getTime()
            : 0;
          bValue = b.expectedCloseDate
            ? new Date(b.expectedCloseDate).getTime()
            : 0;
          break;
        case "status":
          aValue = STATUS_ORDER[a.status || "active"];
          bValue = STATUS_ORDER[b.status || "active"];
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allOpportunities, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ChevronUpDownIcon className="w-4 h-4 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="w-4 h-4 text-[#9ACD32]" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-[#9ACD32]" />
    );
  };

  const SortableHeader = ({
    column,
    children,
    className,
  }: {
    column: SortColumn;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={cn("px-4 py-3", className)}>
      <button
        onClick={() => handleSort(column)}
        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-[#9ACD32] transition-colors"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </th>
  );

  if (!currentPipeline) {
    return (
      <div className="bg-card border border-border rounded-lg p-12">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Select a pipeline to view opportunities
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search opportunities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-transparent"
        />
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-x-auto rounded-lg border border-border"
      >
        <table className="w-full">
          <thead className="bg-card/95 border-b border-border">
            <tr>
              <SortableHeader column="title">Title</SortableHeader>
              <SortableHeader column="value">Value</SortableHeader>
              <SortableHeader column="stage">Stage</SortableHeader>
              <SortableHeader column="assignedTo">Assigned To</SortableHeader>
              <SortableHeader column="priority">Priority</SortableHeader>
              <SortableHeader column="expectedCloseDate">
                Expected Close
              </SortableHeader>
              <SortableHeader column="status">Status</SortableHeader>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOpportunities.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {searchQuery
                    ? "No opportunities found matching your search"
                    : "No opportunities yet"}
                </td>
              </tr>
            ) : (
              filteredAndSortedOpportunities.map((opportunity, index) => {
                const stageInfo = getStageInfo(opportunity);
                return (
                  <OpportunityTableRow
                    key={opportunity._id}
                    opportunity={opportunity}
                    index={index}
                    onEdit={onEditOpportunity}
                    onDelete={onDeleteOpportunity}
                    stageName={stageInfo.name}
                    stageColor={stageInfo.color}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Summary */}
      {filteredAndSortedOpportunities.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg text-sm"
        >
          <div className="text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filteredAndSortedOpportunities.length}
            </span>{" "}
            {filteredAndSortedOpportunities.length === 1
              ? "opportunity"
              : "opportunities"}
            {searchQuery && " matching your search"}
          </div>
          <div className="text-foreground">
            Total Value:{" "}
            <span className="font-semibold text-[#9ACD32]">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(
                filteredAndSortedOpportunities.reduce(
                  (sum, opp) => sum + (opp.value || 0),
                  0
                )
              )}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
