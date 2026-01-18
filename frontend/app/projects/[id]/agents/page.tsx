'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
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
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Agents
              </h1>
              {agents.length > 0 && (
                <span className="px-2.5 py-1 text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  {agents.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Add Agent</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          {agents.length === 0 ? (
            <AgentsEmptyState onCreateClick={() => setIsModalOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <AgentCard
                    agent={agent}
                    workspaceId={workspaceId}
                    onDuplicate={(newAgent) => {
                      // Add new agent to list and refresh
                      setAgents((prev) => [newAgent, ...prev]);
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workspaceId={workspaceId}
      />
    </>
  );
}


