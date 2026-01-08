import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@headlessui/react";
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { Company } from "@/lib/api/company";
import { useCompanyStore, CompanyColumn, BuiltInColumn } from "@/store/useCompanyStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import EditableCompanyCell from "./EditableCompanyCell";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CompanyTableRowProps {
  company: Company;
  index: number;
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
  orderedColumns: CompanyColumn[];
  initial?: any;
  animate?: any;
  transition?: any;
}

export default function CompanyTableRow({
  company,
  index,
  onEdit,
  onDelete,
  orderedColumns,
  initial,
  animate,
  transition,
}: CompanyTableRowProps) {
  const router = useRouter();
  const {
    selectedCompanies,
    toggleCompanySelection,
    customColumns,
    editingCell,
  } = useCompanyStore();
  const { currentWorkspace } = useWorkspaceStore();

  const isSelected = selectedCompanies.includes(company._id);

  // Handle row click to navigate to company details
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if a cell is being edited
    if (editingCell) {
      return;
    }

    // Don't navigate if clicking on checkbox or actions
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('[data-actions]') ||
      target.closest('button') ||
      target.closest('[role="menu"]') ||
      target.closest('a')
    ) {
      return;
    }
    if (currentWorkspace?._id) {
      router.push(`/projects/${currentWorkspace._id}/companies/${company._id}`);
    }
  };

  // Helper to check if column is built-in
  const isBuiltInColumn = (column: CompanyColumn): column is BuiltInColumn => {
    return [
      "name",
      "industry",
      "website",
      "phone",
      "companySize",
      "annualRevenue",
      "employeeCount",
      "status",
      "source",
      "notes",
      "createdAt",
    ].includes(column);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const getCellContent = (column: CompanyColumn) => {
    // Handle built-in columns
    if (isBuiltInColumn(column)) {
      switch (column) {
        case "name":
          return company.name;
        case "industry":
          return company.industry || "—";
        case "website":
          return company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {company.website}
            </a>
          ) : (
            "—"
          );
        case "phone":
          return company.phone || "—";
        case "companySize":
          return company.companySize ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
              {company.companySize}
            </span>
          ) : (
            "—"
          );
        case "annualRevenue":
          return company.annualRevenue
            ? formatCurrency(company.annualRevenue)
            : "—";
        case "employeeCount":
          return company.employeeCount
            ? formatNumber(company.employeeCount)
            : "—";
        case "source":
          return company.source || "—";
        case "notes":
          return company.notes ? (
            <span className="line-clamp-1" title={company.notes}>
              {company.notes}
            </span>
          ) : (
            "—"
          );
        case "status":
          return (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                "bg-muted text-muted-foreground border border-border"
              )}
            >
              {company.status || "lead"}
            </span>
          );
        case "createdAt":
          return format(new Date(company.createdAt), "MMM d, yyyy");
        default:
          return "—";
      }
    }

    // Handle custom columns
    const customValue = company.customFields?.[column];
    const columnDef = customColumns.find((col) => col.fieldKey === column);

    if (customValue === undefined || customValue === null || customValue === "") {
      return "—";
    }

    // Format based on field type
    switch (columnDef?.fieldType) {
      case "number":
        return new Intl.NumberFormat().format(Number(customValue));
      case "select":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
            {customValue}
          </span>
        );
      case "text":
      default:
        return String(customValue);
    }
  };

  return (
    <motion.tr
      initial={initial}
      animate={animate}
      transition={transition}
      onClick={handleRowClick}
      className={cn(
        "border-b border-border hover:bg-muted/30 transition-colors cursor-pointer",
        isSelected && "bg-muted/50"
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-1 h-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleCompanySelection(company._id)}
          className="w-4 h-4 rounded border-border bg-input text-black focus:ring-primary focus:ring-offset-0"
        />
      </td>

      {/* Dynamic Columns */}
      {orderedColumns.map((column) => (
        <td
          key={column}
          className="px-4 py-1 h-8 text-sm text-foreground border-r border-border"
        >
          <EditableCompanyCell
            company={company}
            column={column}
            value={getCellContent(column)}
          />
        </td>
      ))}

      {/* Actions */}
      <td className="px-4 py-1 h-8" data-actions>
        <div className="flex items-center gap-1">
          {/* Edit Button - Always visible */}
          <button
            onClick={() => onEdit(company)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit company"
          >
            <PencilIcon className="w-4 h-4" />
          </button>

          {/* More Actions Menu */}
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <EllipsisVerticalIcon className="w-4 h-4" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-1 w-36 origin-top-right bg-card border border-border rounded-lg shadow-xl overflow-hidden z-10">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => onEdit(company)}
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
                    onClick={() => onDelete(company._id)}
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
        </div>
      </td>
    </motion.tr>
  );
}

