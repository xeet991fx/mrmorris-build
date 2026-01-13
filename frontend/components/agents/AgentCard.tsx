'use client';

import { motion } from 'framer-motion';
import { IAgent } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { CpuChipIcon, ClockIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: IAgent;
  workspaceId: string;
}

export function AgentCard({ agent, workspaceId }: AgentCardProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'Paused':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'Draft':
      default:
        return 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
      onClick={() => router.push(`/projects/${workspaceId}/agents/${agent._id}`)}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-700"
    >
      {/* Header with Icon and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
          <CpuChipIcon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <span className={cn(
          'px-2.5 py-1 text-[11px] font-semibold rounded-md border',
          getStatusColor(agent.status)
        )}>
          {agent.status}
        </span>
      </div>

      {/* Agent Info */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
          {agent.name}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {agent.goal}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <ClockIcon className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Created {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
}
