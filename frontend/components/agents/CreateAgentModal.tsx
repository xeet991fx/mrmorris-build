'use client';

import { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createAgent } from '@/lib/api/agents';
import {
  createAgentSchema,
  CreateAgentFormData,
} from '@/lib/validations/agentValidation';

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function CreateAgentModal({
  open,
  onOpenChange,
  workspaceId,
}: CreateAgentModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<CreateAgentFormData>({
    resolver: zodResolver(createAgentSchema),
  });

  const nameValue = watch('name') || '';
  const goalValue = watch('goal') || '';

  const onSubmit = async (data: CreateAgentFormData) => {
    try {
      setIsLoading(true);
      const response = await createAgent(workspaceId, data);

      if (response.success) {
        toast.success('Agent created successfully!');
        reset();
        onOpenChange(false);
        router.push(`/projects/${workspaceId}/agents/${response.agent._id}`);
      }
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast.error(
        error.response?.data?.error || 'Failed to create agent. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      Create New Agent
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Set up a new automation agent for your sales team. You can configure triggers and actions after creation.
                  </p>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                      {/* Agent Name */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Agent Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder="e.g., Lead Follow-up Agent"
                          {...register('name')}
                          autoFocus
                          disabled={isLoading}
                          className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:border-transparent disabled:opacity-50"
                        />
                        <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                          {errors.name ? (
                            <span className="text-red-500">{errors.name.message}</span>
                          ) : (
                            <span>The name of your agent</span>
                          )}
                          <span className={nameValue.length > 100 ? 'text-red-500' : ''}>
                            {nameValue.length}/100
                          </span>
                        </div>
                      </div>

                      {/* Agent Goal */}
                      <div>
                        <label htmlFor="goal" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Agent Goal <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="goal"
                          placeholder="e.g., Automatically follow up with leads who haven't responded in 3 days"
                          {...register('goal')}
                          rows={4}
                          disabled={isLoading}
                          className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:border-transparent disabled:opacity-50 resize-none"
                        />
                        <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                          {errors.goal ? (
                            <span className="text-red-500">{errors.goal.message}</span>
                          ) : (
                            <span>What should this agent accomplish?</span>
                          )}
                          <span className={goalValue.length > 500 ? 'text-red-500' : ''}>
                            {goalValue.length}/500
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || nameValue.length > 100 || goalValue.length > 500}
                        className="px-5 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isLoading ? 'Creating...' : 'Create Agent'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

