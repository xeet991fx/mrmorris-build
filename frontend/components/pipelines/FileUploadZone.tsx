import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PaperClipIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { uploadAttachment, getAttachments, deleteAttachment, Attachment } from '@/lib/api/attachment';
import toast from 'react-hot-toast';

interface FileUploadZoneProps {
  workspaceId: string;
  opportunityId: string;
}

export default function FileUploadZone({ workspaceId, opportunityId }: FileUploadZoneProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Load attachments
  const loadAttachments = useCallback(async () => {
    const response = await getAttachments(workspaceId, opportunityId);
    if (response.success) {
      setAttachments(response.data.attachments);
    }
  }, [workspaceId, opportunityId]);

  // Load on mount
  useState(() => {
    loadAttachments();
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        // Validate file size (25MB limit)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 25MB)`);
          continue;
        }

        const response = await uploadAttachment(workspaceId, opportunityId, file);

        if (response.success) {
          toast.success(`${file.name} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      // Reload attachments
      await loadAttachments();
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    const response = await deleteAttachment(workspaceId, attachmentId);

    if (response.success) {
      toast.success('File deleted');
      setAttachments(attachments.filter((a) => a._id !== attachmentId));
    } else {
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8" />;
    }
    return <DocumentIcon className="w-8 h-8" />;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-[#84cc16] bg-[#84cc16]/10'
            : 'border-neutral-700 hover:border-neutral-600'
        }`}
      >
        <ArrowUpTrayIcon className="w-12 h-12 mx-auto mb-3 text-neutral-500" />
        <p className="text-sm text-neutral-300 mb-1">
          {isDragging ? 'Drop files here' : 'Drag and drop files here'}
        </p>
        <p className="text-xs text-neutral-500 mb-3">or</p>
        <label className="inline-block px-4 py-2 bg-[#84cc16] text-black font-medium rounded-lg cursor-pointer hover:bg-black transition-colors">
          Choose Files
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading}
          />
        </label>
        <p className="text-xs text-neutral-500 mt-3">Max file size: 25MB</p>
      </div>

      {/* Uploading Status */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Uploading...
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
            <PaperClipIcon className="w-4 h-4" />
            Attachments ({attachments.length})
          </h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <motion.div
                key={attachment._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-3 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-800/50 transition-colors"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 text-neutral-500">
                  {getFileIcon(attachment.fileType)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(attachment.fileSize)} •{' '}
                    {new Date(attachment.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${
                      attachment.fileUrl
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-neutral-300 hover:text-white transition-colors"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(attachment._id, attachment.fileName)}
                    className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
