import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContactColumn } from "@/store/useContactStore";
import ColumnResizeHandle from "./ColumnResizeHandle";
import { cn } from "@/lib/utils";

interface DraggableColumnHeaderProps {
  column: ContactColumn;
  label: string;
  width: number;
  sortColumn: ContactColumn | null;
  sortDirection: "asc" | "desc";
  onSort: (column: ContactColumn) => void;
}

export default function DraggableColumnHeader({
  column,
  label,
  width,
  sortColumn,
  sortDirection,
  onSort,
}: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "px-4 py-2 h-8 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide relative",
        "border-r border-border last:border-r-0",
        isDragging && "opacity-50 bg-muted/50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing select-none"
        onClick={() => onSort(column)}
      >


        {/* Column label */}
        <span className="hover:text-foreground transition-colors truncate">
          {label}
        </span>

        {/* Sort indicator */}
        {sortColumn === column && (
          <span className="text-[#9ACD32] flex-shrink-0">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>

      {/* Resize handle */}
      <ColumnResizeHandle column={column} />
    </th>
  );
}
