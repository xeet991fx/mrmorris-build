'use client';

import { motion } from 'framer-motion';
import { PlusIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface AgentsEmptyStateProps {
  onCreateClick: () => void;
}

export function AgentsEmptyState({ onCreateClick }: AgentsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
          <CpuChipIcon className="w-10 h-10 text-white" strokeWidth={2} />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg animate-bounce">
          <SparklesIcon className="w-4 h-4 text-yellow-900" strokeWidth={2} />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          No agents yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Create your first automation agent to start automating your sales workflows.
          Agents can handle tasks like following up with leads, sending emails, and more.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
        >
          <PlusIcon className="w-5 h-5" strokeWidth={2} />
          Create Your First Agent
        </motion.button>
      </motion.div>
    </div>
  );
}
