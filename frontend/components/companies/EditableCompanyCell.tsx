import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useParams } from "next/navigation";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Company } from "@/lib/api/company";
import { useCompanyStore, CompanyColumn } from "@/store/useCompanyStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface EditableCompanyCellProps {
    company: Company;
    column: CompanyColumn;
    value: string | React.ReactNode;
}

const STATUS_OPTIONS = [
    { value: "lead", label: "Lead" },
    { value: "prospect", label: "Prospect" },
    { value: "customer", label: "Customer" },
    { value: "churned", label: "Churned" },
];

const COMPANY_SIZE_OPTIONS = [
    { value: "1-10", label: "1-10" },
    { value: "11-50", label: "11-50" },
    { value: "51-200", label: "51-200" },
    { value: "201-500", label: "201-500" },
    { value: "501-1000", label: "501-1000" },
    { value: "1001-5000", label: "1001-5000" },
    { value: "5001+", label: "5001+" },
];

export default function EditableCompanyCell({ company, column, value }: EditableCompanyCellProps) {
    const params = useParams();
    const workspaceId = params.id as string;

    const { editingCell, setEditingCell, updateCompanyField, customColumns } = useCompanyStore();
    const [localValue, setLocalValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

    const isEditing =
        editingCell?.companyId === company._id && editingCell?.column === column;

    // Check if this is a custom field
    const customColumnDef = customColumns.find((col) => col.fieldKey === column);
    const isCustomField = !!customColumnDef;

    // Don't allow editing for certain columns
    const isReadOnly = column === "createdAt" || column === "website";

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
                inputRef.current.select();
            }
        }
    }, [isEditing]);

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click navigation
        if (isReadOnly) return;

        // Get the current value for editing
        let currentValue = "";

        if (isCustomField) {
            currentValue = String(company.customFields?.[column] ?? "");
        } else {
            switch (column) {
                case "name":
                    currentValue = company.name || "";
                    break;
                case "industry":
                    currentValue = company.industry || "";
                    break;
                case "phone":
                    currentValue = company.phone || "";
                    break;
                case "companySize":
                    currentValue = company.companySize || "";
                    break;
                case "annualRevenue":
                    currentValue = String(company.annualRevenue || "");
                    break;
                case "employeeCount":
                    currentValue = String(company.employeeCount || "");
                    break;
                case "source":
                    currentValue = company.source || "";
                    break;
                case "notes":
                    currentValue = company.notes || "";
                    break;
                case "status":
                    currentValue = company.status || "lead";
                    break;
            }
        }

        setLocalValue(currentValue);
        setEditingCell({ companyId: company._id, column });
    };

    const handleSave = async () => {
        if (!isEditing) return;

        const currentValue = getCurrentValue();
        if (localValue === currentValue) {
            setEditingCell(null);
            return;
        }

        setIsSaving(true);
        try {
            await updateCompanyField(workspaceId, company._id, column, localValue);
            toast.success("Company updated");
        } catch (error) {
            toast.error("Failed to update company");
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
            e.preventDefault();
            handleSave();
        }
    };

    const getCurrentValue = (): string => {
        if (isCustomField) {
            return String(company.customFields?.[column] ?? "");
        }

        switch (column) {
            case "name":
                return company.name || "";
            case "industry":
                return company.industry || "";
            case "phone":
                return company.phone || "";
            case "companySize":
                return company.companySize || "";
            case "annualRevenue":
                return String(company.annualRevenue || "");
            case "employeeCount":
                return String(company.employeeCount || "");
            case "source":
                return company.source || "";
            case "notes":
                return company.notes || "";
            case "status":
                return company.status || "lead";
            default:
                return "";
        }
    };

    const getInputType = () => {
        switch (column) {
            case "phone":
                return "tel";
            case "annualRevenue":
            case "employeeCount":
                return "number";
            default:
                return "text";
        }
    };

    if (!isEditing) {
        return (
            <div className="min-h-[32px] flex items-center justify-between gap-1 group">
                <span className="truncate">{value}</span>
                {!isReadOnly && (
                    <button
                        onClick={handleEditClick}
                        className="flex-shrink-0 p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit"
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    }

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
                        className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black disabled:opacity-50"
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
                        className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black disabled:opacity-50"
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
                        className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black disabled:opacity-50"
                    />
                );
        }
    }

    // Status select
    if (column === "status") {
        return (
            <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black disabled:opacity-50"
            >
                {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }

    // Company Size select
    if (column === "companySize") {
        return (
            <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black disabled:opacity-50"
            >
                <option value="">Select...</option>
                {COMPANY_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }

    // Notes textarea
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
                className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black resize-none disabled:opacity-50"
            />
        );
    }

    // Default input
    return (
        <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={getInputType()}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:border-black disabled:opacity-50"
        />
    );
}
