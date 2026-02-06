import { Fragment, useState } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { XMarkIcon, PlusIcon, TrashIcon, LockClosedIcon, CheckIcon } from "@heroicons/react/24/outline";
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
    deals: "Deals",
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
        deleteCustomColumn,
    } = useCompanyStore();

    const [selectedTab, setSelectedTab] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deletingColumn, setDeletingColumn] = useState<CustomColumnDefinition | null>(null);

    // New column form state
    const [newColumnLabel, setNewColumnLabel] = useState("");
    const [newColumnType, setNewColumnType] = useState<"text" | "number" | "select">("text");
    const [newColumnOptions, setNewColumnOptions] = useState("");
    const [isCreating, setIsCreating] = useState(false);

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
        if (columnLabels[column]) {
            return columnLabels[column];
        }
        const customCol = customColumns.find((c) => c.fieldKey === column);
        if (customCol) {
            return customCol.fieldLabel;
        }
        return BUILT_IN_COLUMN_LABELS[column as BuiltInColumn] || column;
    };

    const tabItems = ["Visibility", "Custom Fields", "Labels"];

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    {/* Backdrop */}
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
                    </Transition.Child>

                    {/* Sidebar Panel */}
                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                                <Transition.Child
                                    as={Fragment}
                                    enter="transform transition ease-out duration-300"
                                    enterFrom="translate-x-full"
                                    enterTo="translate-x-0"
                                    leave="transform transition ease-in duration-200"
                                    leaveFrom="translate-x-0"
                                    leaveTo="translate-x-full"
                                >
                                    <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                                        <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-2xl">
                                            {/* Header */}
                                            <div className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-800">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <Dialog.Title className="text-xl font-semibold text-zinc-900 dark:text-white">
                                                            Manage Columns
                                                        </Dialog.Title>
                                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                            Customize your company table layout
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={onClose}
                                                        className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                                    >
                                                        <XMarkIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 overflow-y-auto">
                                                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                                                    <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 px-6 pt-4 pb-2">
                                                        <Tab.List className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                                            {tabItems.map((tab) => (
                                                                <Tab
                                                                    key={tab}
                                                                    className={({ selected }) =>
                                                                        cn(
                                                                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 outline-none",
                                                                            selected
                                                                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                                                                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                                                        )
                                                                    }
                                                                >
                                                                    {tab}
                                                                </Tab>
                                                            ))}
                                                        </Tab.List>
                                                    </div>

                                                    <Tab.Panels className="px-6 py-4">
                                                        {/* Tab 1: Visibility */}
                                                        <Tab.Panel className="focus:outline-none">
                                                            <div className="space-y-3">
                                                                {allColumns.map((column, index) => {
                                                                    const isVisible = visibleColumns.includes(column.value);
                                                                    const isOnlyVisible = isVisible && visibleColumns.length === 1;

                                                                    return (
                                                                        <motion.button
                                                                            key={column.value}
                                                                            initial={{ opacity: 0, x: 20 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: index * 0.02 }}
                                                                            onClick={() => !isOnlyVisible && toggleColumn(column.value)}
                                                                            disabled={isOnlyVisible}
                                                                            className={cn(
                                                                                "w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200",
                                                                                isVisible
                                                                                    ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30"
                                                                                    : "bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700",
                                                                                isOnlyVisible && "opacity-60 cursor-not-allowed"
                                                                            )}
                                                                        >
                                                                            <div
                                                                                className={cn(
                                                                                    "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all",
                                                                                    isVisible
                                                                                        ? "bg-emerald-500 text-white"
                                                                                        : "border-2 border-zinc-300 dark:border-zinc-600"
                                                                                )}
                                                                            >
                                                                                {isVisible && <CheckIcon className="w-3 h-3" />}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className={cn(
                                                                                    "text-sm font-medium block",
                                                                                    isVisible ? "text-emerald-900 dark:text-emerald-100" : "text-zinc-700 dark:text-zinc-200"
                                                                                )}>
                                                                                    {getColumnLabel(column.value)}
                                                                                </span>
                                                                            </div>
                                                                            {column.isCustom && (
                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                                                                                    Custom
                                                                                </span>
                                                                            )}
                                                                            {column.isProtected && (
                                                                                <LockClosedIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                                                            )}
                                                                        </motion.button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </Tab.Panel>

                                                        {/* Tab 2: Custom Fields */}
                                                        <Tab.Panel className="focus:outline-none">
                                                            <div className="space-y-4">
                                                                <button
                                                                    onClick={() => setShowAddModal(true)}
                                                                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all"
                                                                >
                                                                    <PlusIcon className="w-5 h-5" />
                                                                    <span className="text-sm font-medium">Add Custom Field</span>
                                                                </button>

                                                                {customColumns.filter((col) => col.isActive).length === 0 ? (
                                                                    <div className="py-12 text-center">
                                                                        <p className="text-sm text-zinc-400">No custom fields created yet</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {customColumns
                                                                            .filter((col) => col.isActive)
                                                                            .sort((a, b) => a.order - b.order)
                                                                            .map((column, index) => (
                                                                                <motion.div
                                                                                    key={column._id}
                                                                                    initial={{ opacity: 0, x: 20 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                    transition={{ delay: index * 0.05 }}
                                                                                    className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                                                                >
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                                                                {column.fieldLabel}
                                                                                            </span>
                                                                                            <span
                                                                                                className={cn(
                                                                                                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide",
                                                                                                    column.fieldType === "text" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                                                                                                    column.fieldType === "number" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                                                                    column.fieldType === "select" && "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                                                                                )}
                                                                                            >
                                                                                                {column.fieldType}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-xs text-zinc-400 font-mono">{column.fieldKey}</span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => setDeletingColumn(column)}
                                                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-all"
                                                                                    >
                                                                                        <TrashIcon className="w-4 h-4" />
                                                                                    </button>
                                                                                </motion.div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Tab.Panel>

                                                        {/* Tab 3: Labels */}
                                                        <Tab.Panel className="focus:outline-none">
                                                            <div className="space-y-3">
                                                                {allColumns.map((column, index) => {
                                                                    const currentLabel = getColumnLabel(column.value);
                                                                    const hasCustomLabel = !!columnLabels[column.value];

                                                                    return (
                                                                        <motion.div
                                                                            key={column.value}
                                                                            initial={{ opacity: 0, x: 20 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: index * 0.02 }}
                                                                            className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                                                                        >
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-xs text-zinc-400 font-medium">
                                                                                    {column.isCustom ? column.label : BUILT_IN_COLUMN_LABELS[column.value as BuiltInColumn]}
                                                                                </span>
                                                                                {column.isCustom && (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                                                                                        Custom
                                                                                    </span>
                                                                                )}
                                                                                {hasCustomLabel && !column.isCustom && (
                                                                                    <button
                                                                                        onClick={() => resetColumnLabel(column.value)}
                                                                                        className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                                                                    >
                                                                                        Reset
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                value={currentLabel}
                                                                                onChange={(e) => updateColumnLabel(column.value, e.target.value)}
                                                                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                                                                                placeholder="Enter custom label"
                                                                            />
                                                                        </motion.div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </Tab.Panel>
                                                    </Tab.Panels>
                                                </Tab.Group>
                                            </div>

                                            {/* Footer */}
                                            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={handleReset}
                                                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors"
                                                    >
                                                        Reset to defaults
                                                    </button>
                                                    <button
                                                        onClick={onClose}
                                                        className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Add Column Modal */}
            <Transition appear show={showAddModal} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={() => setShowAddModal(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-all">
                                    <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Add Custom Column
                                    </Dialog.Title>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Column Label
                                            </label>
                                            <input
                                                value={newColumnLabel}
                                                onChange={(e) => setNewColumnLabel(e.target.value)}
                                                placeholder="e.g., Contract Value"
                                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                Field Type
                                            </label>
                                            <div className="flex gap-2">
                                                {["text", "number", "select"].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setNewColumnType(type as any)}
                                                        className={cn(
                                                            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                                                            newColumnType === type
                                                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                        )}
                                                    >
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {newColumnType === "select" && (
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                    Options (comma-separated)
                                                </label>
                                                <input
                                                    value={newColumnOptions}
                                                    onChange={(e) => setNewColumnOptions(e.target.value)}
                                                    placeholder="Option 1, Option 2, Option 3"
                                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setShowAddModal(false)}
                                            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateColumn}
                                            disabled={isCreating || !newColumnLabel.trim()}
                                            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
                                        >
                                            {isCreating ? "Creating..." : "Create"}
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
                <Dialog as="div" className="relative z-[60]" onClose={() => setDeletingColumn(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl transition-all">
                                    <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                                        Delete Column
                                    </Dialog.Title>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                                        Are you sure you want to delete &quot;{deletingColumn?.fieldLabel}&quot;? This action cannot be undone.
                                    </p>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setDeletingColumn(null)}
                                            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => deletingColumn && handleDeleteColumn(deletingColumn)}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                                        >
                                            Delete
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
