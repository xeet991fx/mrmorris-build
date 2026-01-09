import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@headlessui/react";
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, BoltIcon } from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Contact } from "@/lib/api/contact";
import { useContactStore, ContactColumn, BuiltInColumn } from "@/store/useContactStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import EditableCell from "./EditableCell";
import EnrollInWorkflowModal from "@/components/workflows/EnrollInWorkflowModal";
import LeadScoreBadge from "./LeadScoreBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { apolloApi } from "@/lib/apollo-api";
import { toast } from "sonner";

interface ContactTableRowProps {
  contact: Contact;
  index: number;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  orderedColumns: ContactColumn[];
  initial?: any;
  animate?: any;
  transition?: any;
}

export default function ContactTableRow({
  contact,
  index,
  onEdit,
  onDelete,
  orderedColumns,
  initial,
  animate,
  transition,
}: ContactTableRowProps) {
  const router = useRouter();
  const {
    selectedContacts,
    toggleContactSelection,
    customColumns,
    editingCell,
  } = useContactStore();
  const { currentWorkspace } = useWorkspaceStore();

  const isSelected = selectedContacts.includes(contact._id);
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // Handle row click to navigate to contact details
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
      target.closest('[role="menu"]')
    ) {
      return;
    }
    if (currentWorkspace?._id) {
      router.push(`/projects/${currentWorkspace._id}/contacts/${contact._id}`);
    }
  };

  // Handle Apollo enrichment
  const handleEnrich = async () => {
    if (!currentWorkspace?._id) {
      toast.error("No workspace selected");
      return;
    }

    setIsEnriching(true);
    try {
      await apolloApi.enrichContact(currentWorkspace._id, contact._id);
    } catch (error) {
      // Error already handled by apolloApi
    } finally {
      setIsEnriching(false);
    }
  };

  // Helper to check if column is built-in
  const isBuiltInColumn = (column: ContactColumn): column is BuiltInColumn => {
    return [
      "name",
      "email",
      "phone",
      "company",
      "jobTitle",
      "source",
      "notes",
      "status",
      "leadScore",
      "createdAt",
    ].includes(column);
  };

  const getCellContent = (column: ContactColumn) => {
    // Handle built-in columns
    if (isBuiltInColumn(column)) {
      switch (column) {
        case "name":
          return fullName;
        case "email":
          return contact.email || "—";
        case "phone":
          return contact.phone || "—";
        case "company":
          return contact.company || "—";
        case "jobTitle":
          return contact.jobTitle || "—";
        case "source":
          return contact.source || "—";
        case "notes":
          return contact.notes ? (
            <span className="line-clamp-1" title={contact.notes}>
              {contact.notes}
            </span>
          ) : (
            "—"
          );
        case "status":
          return (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                contact.status === "customer" &&
                "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                contact.status === "prospect" &&
                "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                contact.status === "lead" &&
                "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                contact.status === "inactive" &&
                "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}
            >
              {contact.status || "lead"}
            </span>
          );
        case "leadScore":
          return contact.leadScore ? (
            <LeadScoreBadge
              score={contact.leadScore.currentScore}
              grade={contact.leadScore.grade}
              size="sm"
              showScore={true}
            />
          ) : (
            <span className="text-xs text-zinc-400">No score</span>
          );
        case "createdAt":
          return format(new Date(contact.createdAt), "MMM d, yyyy");
        default:
          return "—";
      }
    }

    // Handle custom columns
    const customValue = contact.customFields?.[column];
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
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
          onChange={() => toggleContactSelection(contact._id)}
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
              <EditableCell
                contact={contact}
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

                <Menu.Items className="absolute right-0 mt-1 w-44 origin-top-right bg-white dark:bg-zinc-900 rounded-lg shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden z-10">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onEdit(contact)}
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
                        onClick={() => setShowWorkflowModal(true)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                          active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                        )}
                      >
                        <BoltIcon className="w-3.5 h-3.5" />
                        Add to Workflow
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleEnrich}
                        disabled={isEnriching}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors text-violet-600 dark:text-violet-400",
                          active ? "bg-violet-50 dark:bg-violet-900/20" : "",
                          isEnriching && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isEnriching ? "Enriching..." : "Enrich with Apollo"}
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onDelete(contact._id)}
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

      {/* Workflow Enrollment Modal */}
      <EnrollInWorkflowModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        entityType="contact"
        entityId={contact._id}
        entityName={fullName}
      />
    </motion.tr>
  );
}
