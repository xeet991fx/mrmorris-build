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
              className="text-primary hover:underline"
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
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
                company.status === "customer" &&
                "bg-green-500/10 text-green-400 border border-green-500/20",
                company.status === "prospect" &&
                "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                company.status === "lead" &&
                "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                company.status === "churned" &&
                "bg-red-500/10 text-red-400 border border-red-500/20"
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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
        "border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer",
        isSelected && "bg-zinc-100/50 dark:bg-zinc-800/30"
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-1 h-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleCompanySelection(company._id)}
          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 checked:bg-emerald-500 checked:border-emerald-500 accent-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
        />
      </td>

      {/* Dynamic Columns */}
      {orderedColumns.map((column, index) => (
        <td
          key={column}
          className="px-4 py-1 h-8 text-sm text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 truncate">
              <EditableCompanyCell
                company={company}
                column={column}
                value={getCellContent(column)}
              />
            </div>
            {/* Actions menu in last column */}
            {index === orderedColumns.length - 1 && (
              <Menu as="div" className="relative flex-shrink-0" data-actions>
                <Menu.Button className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <EllipsisVerticalIcon className="w-4 h-4" />
                </Menu.Button>

                <Menu.Items className="absolute right-0 mt-1 w-36 origin-top-right bg-white dark:bg-zinc-900 rounded-lg shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden z-10">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onEdit(company)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                          active ? "bg-zinc-100 dark:bg-zinc-800" : ""
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
                          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors text-red-600 dark:text-red-400",
                          active ? "bg-red-50 dark:bg-red-900/20" : ""
                        )}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            )}
          </div>
        </td>
      ))}
    </motion.tr>
  );
}

