import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { createActivity } from '@/lib/api/activity';
import { Opportunity } from '@/lib/api/opportunity';
import toast from 'react-hot-toast';

interface LogEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  opportunity: Opportunity;
  onSuccess?: () => void;
}

export default function LogEmailModal({
  isOpen,
  onClose,
  workspaceId,
  opportunity,
  onSuccess,
}: LogEmailModalProps) {
  const [formData, setFormData] = useState({
    direction: 'outbound' as 'inbound' | 'outbound',
    emailSubject: '',
    emailBody: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.emailSubject.trim()) {
      toast.error('Email subject is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createActivity(workspaceId, opportunity._id, {
        type: 'email',
        title: `${formData.direction === 'inbound' ? 'Received' : 'Sent'} email: ${formData.emailSubject}`,
        description: formData.description,
        direction: formData.direction,
        emailSubject: formData.emailSubject,
        emailBody: formData.emailBody,
      });

      if (response.success) {
        toast.success('Email logged successfully');
        onSuccess?.();
        handleClose();
      } else {
        toast.error(response.error || 'Failed to log email');
      }
    } catch (error) {
      toast.error('Failed to log email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      direction: 'outbound',
      emailSubject: '',
      emailBody: '',
      description: '',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <EnvelopeIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Log Email</h2>
                    <p className="text-sm text-neutral-400">{opportunity.title}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Direction */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Direction
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'outbound' })}
                      className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                        formData.direction === 'outbound'
                          ? 'border-[#84cc16] bg-[#84cc16]/10 text-[#84cc16]'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      Sent Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'inbound' })}
                      className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                        formData.direction === 'inbound'
                          ? 'border-[#84cc16] bg-[#84cc16]/10 text-[#84cc16]'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      Received Email
                    </button>
                  </div>
                </div>

                {/* Email Subject */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.emailSubject}
                    onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                    placeholder="Re: Product demo follow-up"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#84cc16]"
                    required
                  />
                </div>

                {/* Email Body */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Email Body (optional)
                  </label>
                  <textarea
                    value={formData.emailBody}
                    onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                    placeholder="Paste email content here for AI analysis..."
                    rows={6}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#84cc16] resize-none"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Optional: Store email content for AI sentiment analysis
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add any additional notes or context..."
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#84cc16] resize-none"
                  />
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.emailSubject.trim()}
                  className="px-4 py-2 bg-[#84cc16] text-black font-medium rounded-lg hover:bg-[#9ACD32] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Logging...' : 'Log Email'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
