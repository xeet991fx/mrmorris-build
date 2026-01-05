import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, CheckCircleIcon, UserIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";

interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface MergeContactsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  primaryContact: Contact;
  duplicateContact: Contact;
  onMergeComplete: () => void;
}

export default function MergeContactsDialog({
  isOpen,
  onClose,
  workspaceId,
  primaryContact,
  duplicateContact,
  onMergeComplete,
}: MergeContactsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'primary' | 'duplicate'>>({});

  const fields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'company', label: 'Company' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'source', label: 'Source' },
    { key: 'status', label: 'Status' },
  ];

  const handleFieldSelection = (field: string, source: 'primary' | 'duplicate') => {
    setFieldSelections(prev => ({
      ...prev,
      [field]: source,
    }));
  };

  const handleMerge = async () => {
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/contacts/${primaryContact.id}/merge`,
        {
          duplicateId: duplicateContact.id,
          fieldSelections,
        }
      );

      if (response.data.success) {
        toast.success('Contacts merged successfully!');
        onMergeComplete();
        onClose();
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to merge contacts';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoMerge = async () => {
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/contacts/${primaryContact.id}/merge`,
        {
          duplicateId: duplicateContact.id,
          // No fieldSelections - use default merge strategy
        }
      );

      if (response.data.success) {
        toast.success('Contacts merged automatically!');
        onMergeComplete();
        onClose();
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to merge contacts';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldValue = (contact: Contact, field: string): string => {
    return (contact as any)[field] || '—';
  };

  return (
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-gray-900">
                        Merge Contacts
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 mt-1">
                        Select which values to keep for each field
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Primary Contact</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      This contact will be kept. Created{' '}
                      {new Date(primaryContact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <XMarkIcon className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-900">Duplicate Contact</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      This contact will be deleted. Created{' '}
                      {new Date(duplicateContact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Field Comparison */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <div className="bg-gray-50 px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                    <div className="font-medium text-gray-700">Field</div>
                    <div className="font-medium text-blue-700">Primary Value</div>
                    <div className="font-medium text-red-700">Duplicate Value</div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {fields.map((field) => {
                      const primaryValue = getFieldValue(primaryContact, field.key);
                      const duplicateValue = getFieldValue(duplicateContact, field.key);
                      const isDifferent = primaryValue !== duplicateValue;
                      const selected = fieldSelections[field.key];

                      return (
                        <div
                          key={field.key}
                          className={`grid grid-cols-3 gap-4 px-4 py-3 ${
                            isDifferent ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700">
                              {field.label}
                            </span>
                            {isDifferent && (
                              <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                                Different
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleFieldSelection(field.key, 'primary')}
                            className={`text-left px-3 py-2 rounded-lg transition-all ${
                              selected === 'primary' || (!selected && primaryValue !== '—')
                                ? 'bg-blue-100 border-2 border-blue-500'
                                : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-sm text-gray-900">{primaryValue}</span>
                          </button>

                          <button
                            onClick={() => handleFieldSelection(field.key, 'duplicate')}
                            className={`text-left px-3 py-2 rounded-lg transition-all ${
                              selected === 'duplicate'
                                ? 'bg-red-100 border-2 border-red-500'
                                : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-sm text-gray-900">{duplicateValue}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleAutoMerge}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Auto-Merge (Smart)
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleMerge}
                      disabled={isSubmitting}
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Merging...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          Merge Contacts
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
