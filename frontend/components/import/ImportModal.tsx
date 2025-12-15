"use client";

import { useState, useCallback, useRef } from "react";
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
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    importContacts,
    importCompanies,
    previewContacts,
    previewCompanies,
    ImportResponse,
    PreviewResponse,
    ColumnMapping,
    AvailableField,
} from "@/lib/api/import";

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

    // Step 1: Analyze file with AI
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

                // Initialize mappings from AI suggestions
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

    // Step 2: Import with user-confirmed mappings
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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground">
                                Import {type === "contacts" ? "Contacts" : "Companies"}
                            </h2>
                            {step === "mapping" && (
                                <span className="text-xs bg-[#9ACD32]/20 text-[#9ACD32] px-2 py-0.5 rounded-full">
                                    AI Analyzed
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">
                        {/* Step: Upload */}
                        {step === "upload" && (
                            <div className="space-y-4">
                                {/* Drag & Drop Zone */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                                            ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                            : file
                                                ? "border-[#9ACD32]/50 bg-[#9ACD32]/5"
                                                : "border-border hover:border-[#9ACD32]/50 hover:bg-muted/30"
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls,.pdf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    {file ? (
                                        <div className="space-y-2">
                                            <FileIcon className="w-12 h-12 mx-auto text-[#9ACD32]" />
                                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                                className="text-xs text-red-400 hover:text-red-300 underline"
                                            >
                                                Remove file
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                                            <p className="text-sm font-medium text-foreground">
                                                Drag & drop your file here
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                or click to browse
                                            </p>
                                            <p className="text-xs text-muted-foreground/70">
                                                Supports CSV, Excel (.xlsx, .xls), and PDF files
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-start gap-2">
                                    <SparklesIcon className="w-4 h-4 text-[#9ACD32] flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">AI-Powered:</span>{" "}
                                        Our AI will analyze your file and suggest column mappings. You can review and adjust before importing.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step: Analyzing */}
                        {step === "analyzing" && (
                            <div className="py-8 text-center space-y-4">
                                <div className="relative w-16 h-16 mx-auto">
                                    <div className="w-16 h-16 border-3 border-[#9ACD32] border-t-transparent rounded-full animate-spin" />
                                    <SparklesIcon className="w-6 h-6 text-[#9ACD32] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-sm font-medium text-foreground">AI is analyzing your file...</p>
                                <p className="text-xs text-muted-foreground">
                                    Detecting columns and mapping them to {type === "contacts" ? "contact" : "company"} fields
                                </p>
                            </div>
                        )}

                        {/* Step: Mapping */}
                        {step === "mapping" && previewData && (
                            <div className="space-y-4">
                                {/* File Summary */}
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{previewData.filename}</p>
                                        <p className="text-xs text-muted-foreground">{previewData.totalRows} rows found</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-[#9ACD32]">{enabledMappingsCount} columns selected</p>
                                        <p className="text-xs text-muted-foreground">for import</p>
                                    </div>
                                </div>

                                {/* Warnings */}
                                {previewData.warnings && previewData.warnings.length > 0 && (
                                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                                        <p className="text-xs font-medium text-yellow-500 mb-1">Warnings:</p>
                                        {previewData.warnings.map((warning, i) => (
                                            <p key={i} className="text-xs text-muted-foreground">{warning}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Column Mappings */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Column Mappings</p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Toggle columns to include/exclude and select which field they map to
                                    </p>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {mappings.map((mapping) => (
                                            <div
                                                key={mapping.sourceColumn}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${mapping.enabled
                                                        ? "bg-[#9ACD32]/5 border-[#9ACD32]/30"
                                                        : "bg-muted/30 border-border opacity-60"
                                                    }`}
                                            >
                                                {/* Toggle */}
                                                <input
                                                    type="checkbox"
                                                    checked={mapping.enabled}
                                                    onChange={() => toggleColumn(mapping.sourceColumn)}
                                                    className="w-4 h-4 rounded border-border bg-input text-[#9ACD32] focus:ring-[#9ACD32]"
                                                />

                                                {/* Source Column */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {mapping.sourceColumn}
                                                    </p>
                                                    {mapping.sample && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            e.g. "{mapping.sample}"
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Arrow */}
                                                <span className="text-muted-foreground">→</span>

                                                {/* Target Field Dropdown */}
                                                <div className="relative min-w-[160px]">
                                                    <select
                                                        value={mapping.targetField}
                                                        onChange={(e) => updateMapping(mapping.sourceColumn, e.target.value)}
                                                        disabled={!mapping.enabled}
                                                        className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-[#9ACD32]/50"
                                                    >
                                                        <option value="_skip">Do not import</option>
                                                        {availableFields
                                                            .filter((f) => f.key !== "_skip")
                                                            .map((field) => (
                                                                <option key={field.key} value={field.key}>
                                                                    {field.label} {field.required && "*"}
                                                                </option>
                                                            ))}
                                                    </select>
                                                    <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="flex items-center gap-2 pt-2 border-t border-border">
                                    <input
                                        type="checkbox"
                                        id="skipDuplicates"
                                        checked={skipDuplicates}
                                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                                        className="w-4 h-4 rounded border-border bg-input text-[#9ACD32] focus:ring-[#9ACD32]"
                                    />
                                    <label htmlFor="skipDuplicates" className="text-sm text-muted-foreground">
                                        Skip duplicate {type === "contacts" ? "emails" : "company names"}
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Step: Importing */}
                        {step === "importing" && (
                            <div className="py-8 text-center space-y-4">
                                <div className="w-12 h-12 border-3 border-[#9ACD32] border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-sm font-medium text-foreground">Importing {type}...</p>
                                <p className="text-xs text-muted-foreground">
                                    This may take a moment for large files
                                </p>
                            </div>
                        )}

                        {/* Step: Results */}
                        {step === "results" && importResult && (
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className={`p-4 rounded-lg border ${importResult.success && importResult.data?.summary.imported
                                        ? "bg-green-500/10 border-green-500/30"
                                        : importResult.success
                                            ? "bg-yellow-500/10 border-yellow-500/30"
                                            : "bg-red-500/10 border-red-500/30"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {importResult.success && importResult.data?.summary.imported ? (
                                            <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
                                        ) : importResult.success ? (
                                            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                                        ) : (
                                            <XCircleIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className="font-medium text-foreground">{importResult.message}</p>
                                            {importResult.error && (
                                                <p className="text-sm text-red-400">{importResult.error}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                {importResult.data?.summary && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-green-500/10 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-green-500">
                                                {importResult.data.summary.imported}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Imported</p>
                                        </div>
                                        <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-yellow-500">
                                                {importResult.data.summary.skipped}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Skipped</p>
                                        </div>
                                        <div className="p-3 bg-red-500/10 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-red-500">
                                                {importResult.data.summary.errors}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Errors</p>
                                        </div>
                                    </div>
                                )}

                                {/* Skipped Details */}
                                {importResult.data?.results.skipped && importResult.data.results.skipped.length > 0 && (
                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                            View skipped records ({importResult.data.results.skipped.length})
                                        </summary>
                                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/30 rounded">
                                            {importResult.data.results.skipped.slice(0, 10).map((item, i) => (
                                                <p key={i} className="text-muted-foreground">
                                                    {item.email || item.name}: {item.reason}
                                                </p>
                                            ))}
                                            {importResult.data.results.skipped.length > 10 && (
                                                <p className="text-muted-foreground/70">
                                                    ...and {importResult.data.results.skipped.length - 10} more
                                                </p>
                                            )}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0">
                        <div>
                            {step === "mapping" && (
                                <button
                                    onClick={() => setStep("upload")}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    ← Back to upload
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {step === "results" ? "Close" : "Cancel"}
                            </button>

                            {step === "upload" && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!file || isProcessing}
                                    className="px-4 py-2 bg-[#9ACD32] text-background font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    Analyze with AI
                                </button>
                            )}

                            {step === "mapping" && (
                                <button
                                    onClick={handleImport}
                                    disabled={enabledMappingsCount === 0 || isProcessing}
                                    className="px-4 py-2 bg-[#9ACD32] text-background font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Import {enabledMappingsCount} Columns
                                </button>
                            )}

                            {step === "results" && (
                                <button
                                    onClick={resetState}
                                    className="px-4 py-2 bg-[#9ACD32] text-background font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all"
                                >
                                    Import Another File
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
