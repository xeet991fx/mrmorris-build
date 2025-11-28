import { useState, useRef, useEffect } from "react";
import { useCompanyStore, CompanyColumn } from "@/store/useCompanyStore";
import { cn } from "@/lib/utils";

interface ColumnResizeHandleProps {
  column: CompanyColumn;
}

export default function ColumnResizeHandle({ column }: ColumnResizeHandleProps) {
  const { resizeColumn, columnWidths } = useCompanyStore();
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      resizeColumn(column, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, column, resizeColumn]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[column];
  };

  return (
    <div
      className={cn(
        "absolute right-0 top-0 w-1 h-full cursor-col-resize group z-10",
        "hover:bg-[#9ACD32]/50 transition-colors",
        isResizing && "bg-[#9ACD32]"
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Visual handle indicator */}
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent",
          "group-hover:bg-[#9ACD32] transition-colors rounded-full",
          isResizing && "bg-[#9ACD32]"
        )}
      />
    </div>
  );
}
