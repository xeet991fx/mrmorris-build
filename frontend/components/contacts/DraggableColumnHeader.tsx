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
        "px-4 py-2 h-8 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider relative",
        "border-r border-zinc-200 dark:border-zinc-800 last:border-r-0",
        isDragging && "opacity-50 bg-zinc-100 dark:bg-zinc-800"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing select-none"
        onClick={() => onSort(column)}
      >
        {/* Column label */}
        <span className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors truncate">
          {label}
        </span>

        {/* Sort indicator */}
        {sortColumn === column && (
          <span className="text-zinc-700 dark:text-zinc-300 flex-shrink-0">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>

      {/* Resize handle */}
      <ColumnResizeHandle column={column} />
    </th>
  );
}
