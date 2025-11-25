import { Menu } from "@headlessui/react";
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { Contact } from "@/lib/api/contact";
import { useContactStore, ContactColumn } from "@/store/useContactStore";
import EditableCell from "./EditableCell";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ContactTableRowProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  orderedColumns: ContactColumn[];
  initial?: any;
  animate?: any;
  transition?: any;
}

export default function ContactTableRow({
  contact,
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
  } = useContactStore();

  const isSelected = selectedContacts.includes(contact._id);
  const fullName = `${contact.firstName} ${contact.lastName}`;

  const getCellContent = (column: ContactColumn) => {
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
                "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
            )}
          >
            {contact.status || "lead"}
          </span>
        );
      case "createdAt":
        return format(new Date(contact.createdAt), "MMM d, yyyy");
      default:
        return "—";
    }
  };

  return (
    <motion.tr
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn(
        "border-b border-neutral-700/50 hover:bg-neutral-800/50 transition-colors",
        isSelected && "bg-neutral-700/30"
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleContactSelection(contact._id)}
          className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
        />
      </td>

      {/* Dynamic Columns */}
      {orderedColumns.map((column) => (
        <td
          key={column}
          className="px-4 py-3 text-sm text-neutral-300"
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
          <Menu.Button className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors">
            <EllipsisVerticalIcon className="w-4 h-4" />
          </Menu.Button>

          <Menu.Items className="absolute right-0 mt-1 w-36 origin-top-right bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-10">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onEdit(contact)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    active ? "bg-neutral-700 text-white" : "text-neutral-300"
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
    </motion.tr>
  );
}
