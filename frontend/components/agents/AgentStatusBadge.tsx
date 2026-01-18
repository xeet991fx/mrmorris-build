'use client';

import { Badge } from '@/components/ui/badge';
import { Play, Pause, Edit } from 'lucide-react';
import { AgentStatus, AGENT_STATUS_INFO } from '@/types/agent';
import { cn } from '@/lib/utils';

interface AgentStatusBadgeProps {
    status: AgentStatus;
    showIcon?: boolean;
    size?: 'sm' | 'default' | 'lg';
}

export function AgentStatusBadge({
    status,
    showIcon = true,
    size = 'default'
}: AgentStatusBadgeProps) {
    const statusInfo = AGENT_STATUS_INFO[status];

    const Icon = status === 'Draft' ? Edit : status === 'Live' ? Play : Pause;

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        default: 'text-sm px-2 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        default: 'h-3.5 w-3.5',
        lg: 'h-4 w-4'
    };

    const bgClasses = {
        Draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
        Live: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
        Paused: 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                'font-medium border',
                bgClasses[status],
                sizeClasses[size]
            )}
            data-testid={`status-badge-${status.toLowerCase()}`}
        >
            {showIcon && <Icon className={cn('mr-1', iconSizes[size])} />}
            {statusInfo.label}
        </Badge>
    );
}
