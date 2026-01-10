"use client";

import { useState, useCallback, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    ArrowUpTrayIcon,
    DocumentTextIcon,
    TableCellsIcon,
    DocumentIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    SparklesIcon,
    ChevronDownIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    importContacts,
    importCompanies,
    previewContacts,
    previewCompanies,
    ImportResponse,
    PreviewResponse,
    AvailableField,
} from "@/lib/api/import";
import { cn } from "@/lib/utils";

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    type: "contacts" | "companies";
    onSuccess: () => void;
}

type Step = "upload" | "analyzing" | "mapping" | "importing" | "results";

interface MappingState {
    sourceColumn: string;
    targetField: string;
    enabled: boolean;
    sample: string;
}

export default function ImportModal({
    isOpen,
    onClose,
    workspaceId,
    type,
    onSuccess,
}: ImportModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [importResult, setImportResult] = useState<ImportResponse | null>(null);
    const [previewData, setPreviewData] = useState<PreviewResponse["data"] | null>(null);
    const [mappings, setMappings] = useState<MappingState[]>([]);
    const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStep("upload");
        setFile(null);
        setIsDragging(false);
        setIsProcessing(false);
        setImportResult(null);
        setPreviewData(null);
        setMappings([]);
        setAvailableFields([]);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const validateFile = (file: File): boolean => {
        const validExtensions = [".csv", ".xlsx", ".xls", ".pdf"];
        const extension = "." + file.name.split(".").pop()?.toLowerCase();

        if (!validExtensions.includes(extension)) {
            toast.error("Please upload a CSV, Excel, or PDF file");
            return false;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be less than 10MB");
            return false;
        }

        return true;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && validateFile(droppedFile)) {
            setFile(droppedFile);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && validateFile(selectedFile)) {
            setFile(selectedFile);
        }
    };

    const getFileIcon = () => {
        if (!file) return DocumentIcon;
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "csv") return TableCellsIcon;
        if (ext === "xlsx" || ext === "xls") return TableCellsIcon;
        if (ext === "pdf") return DocumentTextIcon;
        return DocumentIcon;
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStep("analyzing");

        try {
            const result = type === "contacts"
                ? await previewContacts(workspaceId, file)
                : await previewCompanies(workspaceId, file);

            if (result.success && result.data) {
                setPreviewData(result.data);
                setAvailableFields(result.data.availableFields);

                const initialMappings: MappingState[] = result.data.headers.map((header) => {
                    const aiMapping = result.data!.columnMappings.find(
                        (m) => m.sourceColumn === header
                    );
                    const sample = result.data!.sampleData[0]?.[header] ?? "";

                    return {
                        sourceColumn: header,
                        targetField: aiMapping?.targetField || "_skip",
                        enabled: !!aiMapping && aiMapping.targetField !== "_skip",
                        sample: String(sample).slice(0, 50),
                    };
                });

                setMappings(initialMappings);
                setStep("mapping");
            } else {
                toast.error(result.error || "Failed to analyze file");
                setStep("upload");
            }
        } catch (error: any) {
            console.error("Analyze error:", error);
            toast.error("Failed to analyze file: " + (error.response?.data?.error || error.message));
            setStep("upload");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStep("importing");

        try {
            const result = type === "contacts"
                ? await importContacts(workspaceId, file, skipDuplicates)
                : await importCompanies(workspaceId, file, skipDuplicates);

            setImportResult(result);
            setStep("results");

            if (result.success && result.data && result.data.summary.imported > 0) {
                toast.success(`Successfully imported ${result.data.summary.imported} ${type}`);
                onSuccess();
            } else if (result.success && result.data?.summary.imported === 0) {
                toast.error("No records were imported. Check for duplicates or data issues.");
            }
        } catch (error: any) {
            console.error("Import error:", error);
            setImportResult({
                success: false,
                message: "Import failed",
                error: error.response?.data?.error || error.message || "Failed to import file",
            });
            setStep("results");
            toast.error("Import failed: " + (error.response?.data?.error || error.message));
        } finally {
            setIsProcessing(false);
        }
    };

    const updateMapping = (sourceColumn: string, targetField: string) => {
        setMappings((prev) =>
            prev.map((m) =>
                m.sourceColumn === sourceColumn
                    ? { ...m, targetField, enabled: targetField !== "_skip" }
                    : m
            )
        );
    };

    const toggleColumn = (sourceColumn: string) => {
        setMappings((prev) =>
            prev.map((m) =>
                m.sourceColumn === sourceColumn
                    ? { ...m, enabled: !m.enabled, targetField: m.enabled ? "_skip" : m.targetField }
                    : m
            )
        );
    };

    const enabledMappingsCount = mappings.filter((m) => m.enabled).length;
    const FileIcon = getFileIcon();

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                                                        Import {type === "contacts" ? "Contacts" : "Companies"}
                                                    </Dialog.Title>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                            {step === "upload" && "Upload your file to get started"}
                                                            {step === "analyzing" && "Analyzing your file..."}
                                                            {step === "mapping" && "Review column mappings"}
                                                            {step === "importing" && "Importing data..."}
                                                            {step === "results" && "Import complete"}
                                                        </p>
                                                        {step === "mapping" && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                                <SparklesIcon className="w-3 h-3" />
                                                                AI Analyzed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleClose}
                                                    className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                                >
                                                    <XMarkIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto px-6 py-6">
                                            <AnimatePresence mode="wait">
                                                {/* Step: Upload */}
                                                {step === "upload" && (
                                                    <motion.div
                                                        key="upload"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="space-y-6"
                                                    >
                                                        <div
                                                            onDragOver={handleDragOver}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={handleDrop}
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className={cn(
                                                                "relative rounded-2xl p-12 text-center cursor-pointer transition-all border-2 border-dashed",
                                                                isDragging
                                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                                                    : file
                                                                        ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800/50"
                                                                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                            )}
                                                        >
                                                            <input
                                                                ref={fileInputRef}
                                                                type="file"
                                                                accept=".csv,.xlsx,.xls,.pdf"
                                                                onChange={handleFileSelect}
                                                                className="hidden"
                                                            />

                                                            {file ? (
                                                                <div className="space-y-3">
                                                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                                        <FileIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{file.name}</p>
                                                                        <p className="text-xs text-zinc-500 mt-0.5">
                                                                            {(file.size / 1024).toFixed(1)} KB
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFile(null);
                                                                        }}
                                                                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                                                                    >
                                                                        Remove file
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                                        <ArrowUpTrayIcon className="w-7 h-7 text-zinc-400" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                                            Drop your file here
                                                                        </p>
                                                                        <p className="text-xs text-zinc-500 mt-0.5">
                                                                            or click to browse
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-400">
                                                                        CSV, Excel, or PDF up to 10MB
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                                            <SparklesIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-sm font-medium text-zinc-900 dark:text-white">AI-Powered Analysis</p>
                                                                <p className="text-xs text-zinc-500 mt-0.5">
                                                                    Our AI will detect columns and suggest mappings automatically.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* Step: Analyzing */}
                                                {step === "analyzing" && (
                                                    <motion.div
                                                        key="analyzing"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="py-16 text-center space-y-4"
                                                    >
                                                        <div className="relative w-16 h-16 mx-auto">
                                                            <div className="w-16 h-16 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                            <SparklesIcon className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">Analyzing your file...</p>
                                                            <p className="text-xs text-zinc-500 mt-1">
                                                                Detecting columns and mapping to fields
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* Step: Mapping */}
                                                {step === "mapping" && previewData && (
                                                    <motion.div
                                                        key="mapping"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="space-y-6"
                                                    >
                                                        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                                            <div>
                                                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{previewData.filename}</p>
                                                                <p className="text-xs text-zinc-500">{previewData.totalRows} rows found</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{enabledMappingsCount} columns</p>
                                                                <p className="text-xs text-zinc-500">selected</p>
                                                            </div>
                                                        </div>

                                                        {previewData.warnings && previewData.warnings.length > 0 && (
                                                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                                                                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Warnings:</p>
                                                                {previewData.warnings.map((warning, i) => (
                                                                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400 mt-1">{warning}</p>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="space-y-2">
                                                            {mappings.map((mapping, index) => (
                                                                <motion.div
                                                                    key={mapping.sourceColumn}
                                                                    initial={{ opacity: 0, x: 20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.03 }}
                                                                    className={cn(
                                                                        "p-4 rounded-xl transition-all",
                                                                        mapping.enabled
                                                                            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30"
                                                                            : "bg-zinc-50 dark:bg-zinc-800/50 border border-transparent opacity-60"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => toggleColumn(mapping.sourceColumn)}
                                                                            className={cn(
                                                                                "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all",
                                                                                mapping.enabled
                                                                                    ? "bg-emerald-500 text-white"
                                                                                    : "border-2 border-zinc-300 dark:border-zinc-600"
                                                                            )}
                                                                        >
                                                                            {mapping.enabled && <CheckIcon className="w-3 h-3" />}
                                                                        </button>

                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                                                                {mapping.sourceColumn}
                                                                            </p>
                                                                            {mapping.sample && (
                                                                                <p className="text-xs text-zinc-400 truncate mt-0.5">
                                                                                    e.g. &quot;{mapping.sample}&quot;
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <span className="text-zinc-300 dark:text-zinc-600">→</span>

                                                                        <div className="relative min-w-[140px]">
                                                                            <select
                                                                                value={mapping.targetField}
                                                                                onChange={(e) => updateMapping(mapping.sourceColumn, e.target.value)}
                                                                                disabled={!mapping.enabled}
                                                                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-emerald-500"
                                                                            >
                                                                                <option value="_skip">Skip</option>
                                                                                {availableFields
                                                                                    .filter((f) => f.key !== "_skip")
                                                                                    .map((field) => (
                                                                                        <option key={field.key} value={field.key}>
                                                                                            {field.label} {field.required && "*"}
                                                                                        </option>
                                                                                    ))}
                                                                            </select>
                                                                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>

                                                        <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={skipDuplicates}
                                                                onChange={(e) => setSkipDuplicates(e.target.checked)}
                                                                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500/20"
                                                            />
                                                            <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                                                Skip duplicate {type === "contacts" ? "emails" : "company names"}
                                                            </span>
                                                        </label>
                                                    </motion.div>
                                                )}

                                                {/* Step: Importing */}
                                                {step === "importing" && (
                                                    <motion.div
                                                        key="importing"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="py-16 text-center space-y-4"
                                                    >
                                                        <div className="w-16 h-16 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">Importing {type}...</p>
                                                            <p className="text-xs text-zinc-500 mt-1">This may take a moment</p>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* Step: Results */}
                                                {step === "results" && importResult && (
                                                    <motion.div
                                                        key="results"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        className="space-y-6"
                                                    >
                                                        <div className={cn(
                                                            "p-6 rounded-2xl",
                                                            importResult.success && importResult.data?.summary.imported
                                                                ? "bg-emerald-50 dark:bg-emerald-900/20"
                                                                : importResult.success
                                                                    ? "bg-amber-50 dark:bg-amber-900/20"
                                                                    : "bg-red-50 dark:bg-red-900/20"
                                                        )}>
                                                            <div className="flex items-center gap-4">
                                                                {importResult.success && importResult.data?.summary.imported ? (
                                                                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                                        <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                                                    </div>
                                                                ) : importResult.success ? (
                                                                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                                        <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-medium text-zinc-900 dark:text-white">{importResult.message}</p>
                                                                    {importResult.error && (
                                                                        <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{importResult.error}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {importResult.data?.summary && (
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                                                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                                        {importResult.data.summary.imported}
                                                                    </p>
                                                                    <p className="text-xs text-zinc-500 mt-1">Imported</p>
                                                                </div>
                                                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
                                                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                                                        {importResult.data.summary.skipped}
                                                                    </p>
                                                                    <p className="text-xs text-zinc-500 mt-1">Skipped</p>
                                                                </div>
                                                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                                                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                                        {importResult.data.summary.errors}
                                                                    </p>
                                                                    <p className="text-xs text-zinc-500 mt-1">Errors</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {importResult.data?.results.skipped && importResult.data.results.skipped.length > 0 && (
                                                            <details className="text-sm">
                                                                <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium">
                                                                    View skipped records ({importResult.data.results.skipped.length})
                                                                </summary>
                                                                <div className="mt-3 max-h-32 overflow-y-auto space-y-1 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                                                    {importResult.data.results.skipped.slice(0, 10).map((item, i) => (
                                                                        <p key={i} className="text-xs text-zinc-500">
                                                                            {item.email || item.name}: {item.reason}
                                                                        </p>
                                                                    ))}
                                                                    {importResult.data.results.skipped.length > 10 && (
                                                                        <p className="text-xs text-zinc-400">
                                                                            ...and {importResult.data.results.skipped.length - 10} more
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </details>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Footer */}
                                        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    {step === "mapping" && (
                                                        <button
                                                            onClick={() => setStep("upload")}
                                                            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors"
                                                        >
                                                            ← Back
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleClose}
                                                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                                    >
                                                        {step === "results" ? "Close" : "Cancel"}
                                                    </button>

                                                    {step === "upload" && (
                                                        <button
                                                            onClick={handleAnalyze}
                                                            disabled={!file || isProcessing}
                                                            className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <SparklesIcon className="w-4 h-4" />
                                                            Analyze
                                                        </button>
                                                    )}

                                                    {step === "mapping" && (
                                                        <button
                                                            onClick={handleImport}
                                                            disabled={enabledMappingsCount === 0 || isProcessing}
                                                            className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Import {enabledMappingsCount} Columns
                                                        </button>
                                                    )}

                                                    {step === "results" && (
                                                        <button
                                                            onClick={resetState}
                                                            className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                                                        >
                                                            Import Another
                                                        </button>
                                                    )}
                                                </div>
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
    );
}
