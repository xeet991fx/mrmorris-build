import { forwardRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value: File[];
  onChange: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  maxFiles?: number;
  error?: boolean;
}

const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      value,
      onChange,
      accept = {
        "application/pdf": [".pdf"],
        "application/msword": [".doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          [".docx"],
        "text/plain": [".txt"],
      },
      maxSize = 10 * 1024 * 1024, // 10MB
      maxFiles = 5,
      error,
    },
    ref
  ) => {
    const onDrop = useCallback(
      (acceptedFiles: File[]) => {
        const newFiles = [...value, ...acceptedFiles];
        if (maxFiles && newFiles.length > maxFiles) {
          onChange(newFiles.slice(0, maxFiles));
        } else {
          onChange(newFiles);
        }
      },
      [value, onChange, maxFiles]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept,
      maxSize,
      maxFiles: maxFiles ? maxFiles - value.length : undefined,
    });

    const handleRemove = (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
      <div ref={ref} className="space-y-3">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-100 bg-neutral-800/30",
            isDragActive
              ? "border-white/500 bg-white/500/10"
              : error
              ? "border-red-500/50 hover:border-red-500/70"
              : "border-neutral-700/50 hover:border-white/500/50",
            maxFiles && value.length >= maxFiles && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <CloudArrowUpIcon className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
            {isDragActive ? (
              <p className="text-white/400 font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-white font-medium mb-1">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-neutral-500">
                  PDF, DOC, DOCX, TXT (max {formatFileSize(maxSize)})
                </p>
                {maxFiles && (
                  <p className="text-xs text-neutral-600 mt-1">
                    Up to {maxFiles} files ({value.length}/{maxFiles} used)
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Uploaded Files List */}
        <AnimatePresence>
          {value.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {value.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg group hover:border-white/500/30 transition-all duration-100"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-white/500/20 rounded-lg flex items-center justify-center">
                    <DocumentIcon className="w-5 h-5 text-white/400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-all duration-100 opacity-0 group-hover:opacity-100"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
