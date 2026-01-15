'use client';

import { motion } from 'framer-motion';
import { IAgent } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ClockIcon, BoltIcon } from '@heroicons/react/24/outline';

interface AgentCardProps {
  agent: IAgent;
  workspaceId: string;
}

export function AgentCard({ agent, workspaceId }: AgentCardProps) {
  const router = useRouter();

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Paused':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
    }
  };

  const triggerCount = agent.triggers?.length || 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => router.push(`/projects/${workspaceId}/agents/${agent._id}`)}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 cursor-pointer hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
          {agent.name}
        </h3>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyles(agent.status)}`}>
          {agent.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
        {agent.goal}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <ClockIcon className="w-4 h-4" />
          <span className="text-xs">
            {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
          </span>
        </div>
        {triggerCount > 0 && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <BoltIcon className="w-4 h-4" />
            <span className="text-xs">{triggerCount} trigger{triggerCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}



