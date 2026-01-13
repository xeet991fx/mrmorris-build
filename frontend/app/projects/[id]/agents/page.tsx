'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { PlusIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { CreateAgentModal } from '@/components/agents/CreateAgentModal';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentsEmptyState } from '@/components/agents/AgentsEmptyState';
import { IAgent } from '@/types/agent';
import { toast } from 'sonner';
import { listAgents } from '@/lib/api/agents';

export default function AgentsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [agents, setAgents] = useState<IAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [workspaceId]);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await listAgents(workspaceId);
      if (response.success) {
        setAgents(response.agents);
      }
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading agents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header Section */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CpuChipIcon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  Agents
                </h1>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Automate your sales workflows with intelligent agents
              </p>
            </div>
            {agents.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <PlusIcon className="w-4 h-4" strokeWidth={2} />
                Create Agent
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          {agents.length === 0 ? (
            <AgentsEmptyState onCreateClick={() => setIsModalOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <AgentCard agent={agent} workspaceId={workspaceId} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}
