import { Fragment, useState } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useCompanyStore, CompanyColumn, BuiltInColumn } from "@/store/useCompanyStore";
import { cn } from "@/lib/utils";
import type { CustomColumnDefinition } from "@/lib/api/customField";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

interface CompanyColumnManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const BUILT_IN_COLUMN_LABELS: Record<BuiltInColumn, string> = {
    name: "Company Name",
    industry: "Industry",
    website: "Website",
    phone: "Phone",
    companySize: "Company Size",
    annualRevenue: "Annual Revenue",
    employeeCount: "Employee Count",
    status: "Status",
    source: "Lead Source",
    notes: "Notes",
    createdAt: "Created Date",
};

export default function CompanyColumnManager({ isOpen, onClose }: CompanyColumnManagerProps) {
    const params = useParams();
    const workspaceId = params.id as string;

    const {
        visibleColumns,
        setVisibleColumns,
        resetColumnConfiguration,
        customColumns,
        protectedColumns,
        columnLabels,
        updateColumnLabel,
        resetColumnLabel,
        createCustomColumn,
        updateCustomColumn,
        deleteCustomColumn,
    } = useCompanyStore();

    const [selectedTab, setSelectedTab] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingColumn, setEditingColumn] = useState<CustomColumnDefinition | null>(null);
    const [deletingColumn, setDeletingColumn] = useState<CustomColumnDefinition | null>(null);

    // New column form state
    const [newColumnLabel, setNewColumnLabel] = useState("");
    const [newColumnType, setNewColumnType] = useState<"text" | "number" | "select">("text");
    const [newColumnOptions, setNewColumnOptions] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Get all available columns (built-in + custom active columns)
    const allColumns: Array<{ value: CompanyColumn; label: string; isCustom: boolean; isProtected: boolean }> = [
        ...Object.entries(BUILT_IN_COLUMN_LABELS).map(([value, label]) => ({
            value: value as BuiltInColumn,
            label,
            isCustom: false,
            isProtected: protectedColumns.includes(value as BuiltInColumn),
        })),
        ...customColumns
            .filter((col) => col.isActive)
            .map((col) => ({
                value: col.fieldKey,
                label: col.fieldLabel,
                isCustom: true,
                isProtected: false,
            })),
    ];

    const toggleColumn = (column: CompanyColumn) => {
        if (visibleColumns.includes(column)) {
            // Prevent hiding all columns - keep at least one
            if (visibleColumns.length > 1) {
                setVisibleColumns(visibleColumns.filter((c) => c !== column));
            }
        } else {
            setVisibleColumns([...visibleColumns, column]);
        }
    };

    const handleReset = () => {
        resetColumnConfiguration();
        onClose();
    };

    const handleCreateColumn = async () => {
        if (!newColumnLabel.trim()) {
            toast.error("Column label is required");
            return;
        }

        setIsCreating(true);
        try {
            await createCustomColumn(workspaceId, {
                fieldLabel: newColumnLabel.trim(),
                fieldType: newColumnType,
                selectOptions: newColumnType === "select"
                    ? newColumnOptions.split(",").map((o) => o.trim()).filter(Boolean)
                    : undefined,
                entityType: "company",
            });
            toast.success("Column created successfully");
            setNewColumnLabel("");
            setNewColumnType("text");
            setNewColumnOptions("");
            setShowAddModal(false);
        } catch (error) {
            toast.error("Failed to create column");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteColumn = async (column: CustomColumnDefinition) => {
        try {
            await deleteCustomColumn(workspaceId, column._id, true);
            toast.success("Column deleted");
            setDeletingColumn(null);
        } catch (error) {
            toast.error("Failed to delete column");
        }
    };

    const getColumnLabel = (column: CompanyColumn): string => {
        // Check for custom label override
        if (columnLabels[column]) {
            return columnLabels[column];
        }

        // Check if it's a custom column
        const customCol = customColumns.find((c) => c.fieldKey === column);
        if (customCol) {
            return customCol.fieldLabel;
        }

        // Fall back to default built-in label
        return BUILT_IN_COLUMN_LABELS[column as BuiltInColumn] || column;
    };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-card border border-border p-6 text-left align-middle shadow-xl transition-all">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-6">
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-semibold text-foreground"
                                            >
                                                Manage Company Columns
                                            </Dialog.Title>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Tabs */}
                                        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                                            <Tab.List className="flex space-x-1 rounded-lg bg-background p-1 mb-6">
                                                <Tab
                                                    className={({ selected }) =>
                                                        cn(
                                                            "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                                                            "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-background ring-[#9ACD32]/50",
                                                            selected
                                                                ? "bg-muted text-foreground shadow"
                                                                : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                                                        )
                                                    }
                                                >
                                                    Show/Hide
                                                </Tab>
                                                <Tab
                                                    className={({ selected }) =>
                                                        cn(
                                                            "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                                                            "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-background ring-[#9ACD32]/50",
                                                            selected
                                                                ? "bg-muted text-foreground shadow"
                                                                : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                                                        )
                                                    }
                                                >
                                                    Custom Columns
                                                </Tab>
                                                <Tab
                                                    className={({ selected }) =>
                                                        cn(
                                                            "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                                                            "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-background ring-[#9ACD32]/50",
                                                            selected
                                                                ? "bg-muted text-foreground shadow"
                                                                : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                                                        )
                                                    }
                                                >
                                                    Edit Labels
                                                </Tab>
                                            </Tab.List>

                                            <Tab.Panels>
                                                {/* Tab 1: Show/Hide Columns */}
                                                <Tab.Panel className="space-y-2">
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Select which columns to display in the companies table. You can also
                                                        drag column headers to reorder them and drag their edges to resize.
                                                    </p>

                                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                                        {allColumns.map((column) => {
                                                            const isVisible = visibleColumns.includes(column.value);
                                                            const isOnlyVisible = isVisible && visibleColumns.length === 1;

                                                            return (
                                                                <label
                                                                    key={column.value}
                                                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isVisible}
                                                                        onChange={() => toggleColumn(column.value)}
                                                                        disabled={isOnlyVisible}
                                                                        className="w-4 h-4 rounded border-border bg-muted text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    />
                                                                    <span
                                                                        className={cn(
                                                                            "text-sm flex-1",
                                                                            isVisible ? "text-foreground" : "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {getColumnLabel(column.value)}
                                                                    </span>
                                                                    {column.isCustom && (
                                                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                            Custom
                                                                        </span>
                                                                    )}
                                                                    {column.isProtected && (
                                                                        <LockClosedIcon className="w-4 h-4 text-muted-foreground" title="Protected column" />
                                                                    )}
                                                                    {isOnlyVisible && (
                                                                        <span className="text-xs text-muted-foreground ml-auto">
                                                                            (Required)
                                                                        </span>
                                                                    )}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </Tab.Panel>

                                                {/* Tab 2: Custom Columns */}
                                                <Tab.Panel className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-muted-foreground">
                                                            Create and manage custom columns for tracking additional company data.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddModal(true)}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-background bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors"
                                                        >
                                                            <PlusIcon className="w-4 h-4" />
                                                            Add Column
                                                        </button>
                                                    </div>

                                                    {customColumns.filter((col) => col.isActive).length === 0 ? (
                                                        <div className="py-12 text-center">
                                                            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                                                <PlusIcon className="w-8 h-8 text-muted-foreground" />
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-4">
                                                                No custom columns yet. Click &quot;Add Column&quot; to create one.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                                            {customColumns
                                                                .filter((col) => col.isActive)
                                                                .sort((a, b) => a.order - b.order)
                                                                .map((column) => (
                                                                    <div
                                                                        key={column._id}
                                                                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                                                    >
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-medium text-foreground">
                                                                                    {column.fieldLabel}
                                                                                </span>
                                                                                <span
                                                                                    className={cn(
                                                                                        "text-xs px-2 py-0.5 rounded capitalize",
                                                                                        column.fieldType === "text" &&
                                                                                        "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                                                                        column.fieldType === "number" &&
                                                                                        "bg-green-500/10 text-green-400 border border-green-500/20",
                                                                                        column.fieldType === "select" &&
                                                                                        "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                                                    )}
                                                                                >
                                                                                    {column.fieldType}
                                                                                </span>
                                                                                {column.isRequired && (
                                                                                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                                                                        Required
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground font-mono mt-1">
                                                                                {column.fieldKey}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDeletingColumn(column)}
                                                                            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-400 transition-colors"
                                                                            title="Delete column"
                                                                        >
                                                                            <TrashIcon className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </Tab.Panel>

                                                {/* Tab 3: Edit Labels */}
                                                <Tab.Panel className="space-y-4">
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Customize how column names appear in the table.
                                                    </p>

                                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                                        {allColumns.map((column) => {
                                                            const currentLabel = getColumnLabel(column.value);
                                                            const hasCustomLabel = !!columnLabels[column.value];

                                                            return (
                                                                <div
                                                                    key={column.value}
                                                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                                                                >
                                                                    <div className="flex-1 space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                                {column.value}
                                                                            </span>
                                                                            {column.isCustom && (
                                                                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                                    Custom
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            value={currentLabel}
                                                                            onChange={(e) =>
                                                                                updateColumnLabel(column.value, e.target.value)
                                                                            }
                                                                            className="w-full px-2 py-1 bg-muted border border-border rounded text-sm text-foreground focus:outline-none focus:border-[#9ACD32] transition-colors"
                                                                        />
                                                                    </div>
                                                                    {!column.isCustom && hasCustomLabel && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => resetColumnLabel(column.value)}
                                                                            className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                                                                            title="Reset to default"
                                                                        >
                                                                            Reset
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </Tab.Panel>
                                            </Tab.Panels>
                                        </Tab.Group>

                                        {/* Actions */}
                                        <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                                            <button
                                                type="button"
                                                onClick={handleReset}
                                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                                title="Reset columns, order, and widths to defaults"
                                            >
                                                Reset All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm font-medium text-background bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </motion.div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Add Column Modal */}
            <Transition appear show={showAddModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowAddModal(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-card border border-border p-6 shadow-xl transition-all">
                                    <Dialog.Title className="text-lg font-semibold text-foreground mb-4">
                                        Add Custom Column
                                    </Dialog.Title>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Column Label
                                            </label>
                                            <input
                                                type="text"
                                                value={newColumnLabel}
                                                onChange={(e) => setNewColumnLabel(e.target.value)}
                                                placeholder="e.g., Contract Value"
                                                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-[#9ACD32]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Field Type
                                            </label>
                                            <select
                                                value={newColumnType}
                                                onChange={(e) => setNewColumnType(e.target.value as "text" | "number" | "select")}
                                                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-[#9ACD32]"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="select">Select (Dropdown)</option>
                                            </select>
                                        </div>

                                        {newColumnType === "select" && (
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Options (comma-separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newColumnOptions}
                                                    onChange={(e) => setNewColumnOptions(e.target.value)}
                                                    placeholder="Option 1, Option 2, Option 3"
                                                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-[#9ACD32]"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateColumn}
                                            disabled={isCreating || !newColumnLabel.trim()}
                                            className="px-4 py-2 text-sm font-medium text-background bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {isCreating ? "Creating..." : "Create Column"}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Delete Confirmation */}
            <Transition appear show={!!deletingColumn} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setDeletingColumn(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-card border border-border p-6 shadow-xl transition-all">
                                    <Dialog.Title className="text-lg font-semibold text-foreground mb-2">
                                        Delete Column
                                    </Dialog.Title>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Are you sure you want to delete &quot;{deletingColumn?.fieldLabel}&quot;? This will also delete all data in this column.
                                    </p>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setDeletingColumn(null)}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deletingColumn && handleDeleteColumn(deletingColumn)}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                        >
                                            Delete Column
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
