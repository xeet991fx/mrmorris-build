import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { createActivity } from '@/lib/api/activity';
import { Opportunity } from '@/lib/api/opportunity';
import toast from 'react-hot-toast';

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  opportunity: Opportunity;
  onSuccess?: () => void;
}

export default function LogCallModal({
  isOpen,
  onClose,
  workspaceId,
  opportunity,
  onSuccess,
}: LogCallModalProps) {
  const [formData, setFormData] = useState({
    direction: 'outbound' as 'inbound' | 'outbound',
    durationMinutes: '',
    durationSeconds: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const minutes = parseInt(formData.durationMinutes) || 0;
    const seconds = parseInt(formData.durationSeconds) || 0;
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds === 0) {
      toast.error('Please enter call duration');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createActivity(workspaceId, opportunity._id, {
        type: 'call',
        title: `${formData.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call - ${minutes}m ${seconds}s`,
        description: formData.description,
        direction: formData.direction,
        duration: totalSeconds,
      });

      if (response.success) {
        toast.success('Call logged successfully');
        onSuccess?.();
        handleClose();
      } else {
        toast.error(response.error || 'Failed to log call');
      }
    } catch (error) {
      toast.error('Failed to log call');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      direction: 'outbound',
      durationMinutes: '',
      durationSeconds: '',
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
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Log Call</h2>
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
                      Outgoing Call
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
                      Incoming Call
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.durationMinutes}
                          onChange={(e) =>
                            setFormData({ ...formData, durationMinutes: e.target.value })
                          }
                          placeholder="0"
                          min="0"
                          max="999"
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#84cc16]"
                        />
                        <span className="text-neutral-400 text-sm">min</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.durationSeconds}
                          onChange={(e) =>
                            setFormData({ ...formData, durationSeconds: e.target.value })
                          }
                          placeholder="0"
                          min="0"
                          max="59"
                          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#84cc16]"
                        />
                        <span className="text-neutral-400 text-sm">sec</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Duration Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 15, 30, 45, 60].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          durationMinutes: minutes.toString(),
                          durationSeconds: '0',
                        })
                      }
                      className="px-3 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded-md text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>

                {/* Call Notes */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Call Notes (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What was discussed? Any action items or next steps?"
                    rows={5}
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
                  disabled={
                    isSubmitting ||
                    (!formData.durationMinutes && !formData.durationSeconds)
                  }
                  className="px-4 py-2 bg-[#84cc16] text-black font-medium rounded-lg hover:bg-[#9ACD32] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Logging...' : 'Log Call'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
