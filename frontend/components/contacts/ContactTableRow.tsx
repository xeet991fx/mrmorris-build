import { useState } from "react";
import { Menu } from "@headlessui/react";
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, BoltIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { Contact } from "@/lib/api/contact";
import { useContactStore, ContactColumn, BuiltInColumn } from "@/store/useContactStore";
import EditableCell from "./EditableCell";
import EnrollInWorkflowModal from "@/components/workflows/EnrollInWorkflowModal";
import LeadScoreBadge from "./LeadScoreBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const {
    selectedContacts,
    toggleContactSelection,
    customColumns,
  } = useContactStore();

  const isSelected = selectedContacts.includes(contact._id);
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

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
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                contact.status === "customer" &&
                "bg-green-500/10 text-green-400 border border-green-500/20",
                contact.status === "prospect" &&
                "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                contact.status === "lead" &&
                "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                contact.status === "inactive" &&
                "bg-muted text-muted-foreground border border-border"
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
            <span className="text-xs text-gray-500">No score</span>
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
      className={cn(
        "border-b border-border hover:bg-muted/30 transition-colors",
        isSelected && "bg-muted/20"
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleContactSelection(contact._id)}
          className="w-4 h-4 rounded border-border bg-input text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
        />
      </td>

      {/* Dynamic Columns */}
      {orderedColumns.map((column) => (
        <td
          key={column}
          className="px-4 py-3 text-sm text-foreground"
        >
          <EditableCell
            contact={contact}
            column={column}
            value={getCellContent(column)}
          />
        </td>
      ))}

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
                  onClick={() => onEdit(contact)}
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
                  onClick={() => setShowWorkflowModal(true)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    active ? "bg-muted text-foreground" : "text-foreground"
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
                  onClick={() => onDelete(contact._id)}
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
