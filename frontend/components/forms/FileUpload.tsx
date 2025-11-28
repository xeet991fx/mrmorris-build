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
            "p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-100 bg-muted/30",
            isDragActive
              ? "border-[#9ACD32] bg-[#9ACD32]/10"
              : error
              ? "border-red-500/50 hover:border-red-500/70"
              : "border-border hover:border-border",
            maxFiles && value.length >= maxFiles && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <CloudArrowUpIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            {isDragActive ? (
              <p className="text-foreground font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-foreground font-medium mb-1">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, DOC, DOCX, TXT (max {formatFileSize(maxSize)})
                </p>
                {maxFiles && (
                  <p className="text-xs text-muted-foreground mt-1">
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
                  className="flex items-center gap-3 p-3 bg-input border border-border rounded-lg group hover:border-border transition-all duration-100"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <DocumentIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all duration-100 opacity-0 group-hover:opacity-100"
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
