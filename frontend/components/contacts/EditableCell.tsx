import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useParams } from "next/navigation";
import { Contact } from "@/lib/api/contact";
import { useContactStore, ContactColumn } from "@/store/useContactStore";
import { updateLeadScore } from "@/lib/api/leadScore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface EditableCellProps {
  contact: Contact;
  column: ContactColumn;
  value: string | JSX.Element;
}

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "inactive", label: "Inactive" },
];

export default function EditableCell({ contact, column, value }: EditableCellProps) {
  const params = useParams();
  const workspaceId = params.id as string;

  const { editingCell, setEditingCell, updateContactField, customColumns } = useContactStore();
  const [localValue, setLocalValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const isEditing =
    editingCell?.contactId === contact._id && editingCell?.column === column;

  // Check if this is a custom field
  const customColumnDef = customColumns.find((col) => col.fieldKey === column);
  const isCustomField = !!customColumnDef;

  // Don't allow editing for certain columns
  const isReadOnly = column === "createdAt";
  const isLeadScore = column === "leadScore";

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleClick = () => {
    if (isReadOnly) return;

    // Get the current value for editing
    let currentValue = "";

    if (isCustomField) {
      // Handle custom field value
      currentValue = String(contact.customFields?.[column] ?? "");
    } else {
      // Handle built-in fields
      switch (column) {
        case "name":
          currentValue = `${contact.firstName} ${contact.lastName}`;
          break;
        case "email":
          currentValue = contact.email || "";
          break;
        case "phone":
          currentValue = contact.phone || "";
          break;
        case "company":
          currentValue = contact.company || "";
          break;
        case "jobTitle":
          currentValue = contact.jobTitle || "";
          break;
        case "source":
          currentValue = contact.source || "";
          break;
        case "notes":
          currentValue = contact.notes || "";
          break;
        case "status":
          currentValue = contact.status || "lead";
          break;
        case "leadScore":
          currentValue = String(contact.leadScore?.currentScore || 0);
          break;
      }
    }

    setLocalValue(currentValue);
    setEditingCell({ contactId: contact._id, column });
  };

  const handleSave = async () => {
    if (!isEditing) return;

    // Don't save if value hasn't changed
    const currentValue = getCurrentValue();
    if (localValue === currentValue) {
      setEditingCell(null);
      return;
    }

    setIsSaving(true);
    try {
      if (isLeadScore) {
        // Special handling for lead score
        const newScore = parseInt(localValue, 10);
        if (isNaN(newScore)) {
          toast.error("Please enter a valid number");
          return;
        }
        const currentScore = contact.leadScore?.currentScore || 0;
        const pointsDiff = newScore - currentScore;
        await updateLeadScore(workspaceId, contact._id, { points: pointsDiff, reason: "Manual update" });
        toast.success("Lead score updated");
        // Refresh contacts to get updated score
        const { fetchContacts } = useContactStore.getState();
        fetchContacts(workspaceId);
      } else {
        await updateContactField(workspaceId, contact._id, column, localValue);
        toast.success("Contact updated");
      }
    } catch (error) {
      toast.error(isLeadScore ? "Failed to update lead score" : "Failed to update contact");
      console.error("Error updating:", error);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setLocalValue("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && column !== "notes") {
      // Allow Enter in notes (textarea), but save on Enter for other fields
      e.preventDefault();
      handleSave();
    }
  };

  const getCurrentValue = (): string => {
    if (isCustomField) {
      return String(contact.customFields?.[column] ?? "");
    }

    switch (column) {
      case "name":
        return `${contact.firstName} ${contact.lastName}`;
      case "email":
        return contact.email || "";
      case "phone":
        return contact.phone || "";
      case "company":
        return contact.company || "";
      case "jobTitle":
        return contact.jobTitle || "";
      case "source":
        return contact.source || "";
      case "notes":
        return contact.notes || "";
      case "status":
        return contact.status || "lead";
      default:
        return "";
    }
  };

  const getInputType = () => {
    switch (column) {
      case "email":
        return "email";
      case "phone":
        return "tel";
      default:
        return "text";
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "min-h-[32px] flex items-center",
          !isReadOnly && "cursor-pointer hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
        )}
        title={isReadOnly ? undefined : "Click to edit"}
      >
        {value}
      </div>
    );
  }

  // Render different input types based on column
  // Handle custom field inputs
  if (isCustomField && customColumnDef) {
    switch (customColumnDef.fieldType) {
      case "number":
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] disabled:opacity-50"
          />
        );
      case "select":
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] disabled:opacity-50"
          >
            <option value="">Select...</option>
            {customColumnDef.selectOptions?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case "text":
      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] disabled:opacity-50"
          />
        );
    }
  }

  // Handle built-in field status
  if (column === "status") {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Lead score - special number input
  if (isLeadScore) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        min="0"
        max="100"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="w-20 px-2 py-1 bg-input border border-primary/50 rounded text-sm text-foreground text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        placeholder="0"
      />
    );
  }

  if (column === "notes") {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        rows={2}
        className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] resize-none disabled:opacity-50"
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={getInputType()}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      disabled={isSaving}
      className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] disabled:opacity-50"
    />
  );
}
