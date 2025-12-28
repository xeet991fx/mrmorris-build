"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    DocumentIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    DocumentTextIcon,
    PhotoIcon,
    DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface ContactFilesTabProps {
    workspaceId: string;
    contactId: string;
}

interface FileItem {
    _id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType?: string;
    uploadedBy?: {
        _id: string;
        name: string;
    };
    createdAt: string;
}

export default function ContactFilesTab({
    workspaceId,
    contactId,
}: ContactFilesTabProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchFiles();
    }, [workspaceId, contactId]);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            // Try to fetch files for this contact
            const response = await axiosInstance.get(
                `/workspaces/${workspaceId}/contacts/${contactId}/files`
            );
            if (response.data.success && response.data.data) {
                setFiles(response.data.data.files || []);
            }
        } catch (error) {
            // Endpoint may not exist yet
            console.log("Files endpoint not available yet");
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axiosInstance.post(
                `/workspaces/${workspaceId}/contacts/${contactId}/files`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (response.data.success && response.data.data) {
                setFiles([response.data.data.file, ...files]);
                toast.success("File uploaded successfully");
            }
        } catch (error) {
            toast.error("Failed to upload file");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDelete = async (fileId: string) => {
        try {
            await axiosInstance.delete(
                `/workspaces/${workspaceId}/contacts/${contactId}/files/${fileId}`
            );
            setFiles(files.filter((f) => f._id !== fileId));
            toast.success("File deleted");
        } catch (error) {
            toast.error("Failed to delete file");
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (mimeType?: string) => {
        if (!mimeType) return <DocumentIcon className="w-8 h-8" />;
        if (mimeType.startsWith("image/")) return <PhotoIcon className="w-8 h-8" />;
        if (mimeType.includes("pdf")) return <DocumentTextIcon className="w-8 h-8" />;
        if (mimeType.includes("sheet") || mimeType.includes("excel"))
            return <DocumentChartBarIcon className="w-8 h-8" />;
        return <DocumentIcon className="w-8 h-8" />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4">
            {/* Header with Upload Button */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Files</h3>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleUpload}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-background bg-black hover:bg-[#8BC22A] rounded-lg transition-colors cursor-pointer",
                            isUploading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        {isUploading ? "Uploading..." : "Upload File"}
                    </label>
                </div>
            </div>

            {/* Files Grid */}
            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <DocumentIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No files yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Upload files related to this contact
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <AnimatePresence>
                        {files.map((file) => (
                            <motion.div
                                key={file._id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 dark:hover:bg-accent/20 transition-colors group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {file.fileName}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatFileSize(file.fileSize)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(file.createdAt), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground hover:bg-muted rounded transition-colors"
                                    >
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                        Download
                                    </a>
                                    <button
                                        onClick={() => handleDelete(file._id)}
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
