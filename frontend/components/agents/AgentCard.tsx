'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IAgent } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ClockIcon, BoltIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Copy, Trash2 } from 'lucide-react';
import { DuplicateAgentModal } from './DuplicateAgentModal';
import { DeleteAgentModal } from './DeleteAgentModal';
import { AgentStatusBadge } from './AgentStatusBadge';
import { AgentStatusControls } from './AgentStatusControls';

interface AgentCardProps {
  agent: IAgent;
  workspaceId: string;
  onDuplicate?: (newAgent: IAgent) => void;
  onStatusChange?: (updatedAgent: IAgent) => void;
  onDelete?: () => void;
}

export function AgentCard({ agent, workspaceId, onDuplicate, onStatusChange, onDelete }: AgentCardProps) {
  const router = useRouter();
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const triggerCount = agent.triggers?.length || 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on menu or its children
    const target = e.target as HTMLElement;
    if (target.closest('[data-menu-trigger]') || target.closest('[data-menu-content]') || target.closest('[data-status-controls]')) {
      return;
    }
    router.push(`/projects/${workspaceId}/agents/${agent._id}`);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDuplicateModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        onClick={handleCardClick}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 cursor-pointer hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1 flex-1 mr-2">
            {agent.name}
          </h3>
          <div className="flex items-center gap-2">
            {/* Story 1.9: Use AgentStatusBadge instead of inline styling */}
            <AgentStatusBadge status={agent.status} size="sm" />
            <div className="relative" ref={menuRef}>
              <button
                data-menu-trigger
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={handleMenuToggle}
                data-testid={`agent-menu-${agent._id}`}
              >
                <EllipsisVerticalIcon className="w-4 h-4 text-zinc-400" />
              </button>
              {showMenu && (
                <div
                  data-menu-content
                  className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg py-1"
                >
                  <button
                    onClick={handleDuplicateClick}
                    data-testid={`duplicate-agent-${agent._id}`}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    data-testid={`delete-agent-${agent._id}`}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
          {agent.goal}
        </p>

        {/* Story 1.9: Status Controls */}
        <div className="mb-4" data-status-controls onClick={(e) => e.stopPropagation()}>
          <AgentStatusControls
            agent={agent}
            workspaceId={workspaceId}
            onStatusChange={onStatusChange}
            variant="compact"
          />
        </div>

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

      {/* Duplicate Agent Modal */}
      <DuplicateAgentModal
        open={showDuplicateModal}
        onOpenChange={setShowDuplicateModal}
        agent={agent}
        workspaceId={workspaceId}
        onSuccess={onDuplicate}
      />

      {/* Delete Agent Modal */}
      <DeleteAgentModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        agent={agent}
        workspaceId={workspaceId}
        onSuccess={onDelete}
      />
    </>
  );
}
