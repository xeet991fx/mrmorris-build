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
        "absolute right-0 top-0 w-3 h-full cursor-col-resize z-10",
        "-mr-1.5"
      )}
      onMouseDown={handleMouseDown}
    />
  );
}
