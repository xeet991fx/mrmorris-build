import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ArrowsRightLeftIcon,
  PaperClipIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Activity, getActivities } from '@/lib/api/activity';
import { formatRelativeTime } from '@/lib/utils/opportunityUtils';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  workspaceId: string;
  opportunityId: string;
  onRefresh?: () => void;
}

export default function ActivityTimeline({
  workspaceId,
  opportunityId,
  onRefresh,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadActivities();
  }, [workspaceId, opportunityId, filter]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const response = await getActivities(
        workspaceId,
        opportunityId,
        filter !== 'all' ? { type: filter } : undefined
      );

      if (response.success) {
        setActivities(response.data.activities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'email':
        return <EnvelopeIcon className="w-5 h-5" />;
      case 'call':
        return <PhoneIcon className="w-5 h-5" />;
      case 'meeting':
        return <CalendarIcon className="w-5 h-5" />;
      case 'note':
        return <ChatBubbleLeftIcon className="w-5 h-5" />;
      case 'stage_change':
        return <ArrowsRightLeftIcon className="w-5 h-5" />;
      case 'file_upload':
        return <PaperClipIcon className="w-5 h-5" />;
      case 'task':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'ai_suggestion':
        return <SparklesIcon className="w-5 h-5" />;
      default:
        return <ChatBubbleLeftIcon className="w-5 h-5" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'email':
        return 'text-blue-500 bg-blue-500/10';
      case 'call':
        return 'text-green-500 bg-green-500/10';
      case 'meeting':
        return 'text-purple-500 bg-purple-500/10';
      case 'note':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'stage_change':
        return 'text-orange-500 bg-orange-500/10';
      case 'file_upload':
        return 'text-pink-500 bg-pink-500/10';
      case 'task':
        return 'text-teal-500 bg-teal-500/10';
      case 'ai_suggestion':
        return 'text-violet-500 bg-violet-500/10';
      default:
        return 'text-neutral-500 bg-neutral-500/10';
    }
  };

  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: { [key: string]: Activity[] } = {};

    activities.forEach((activity) => {
      const date = new Date(activity.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-700 pb-2 overflow-x-auto">
        {['all', 'email', 'call', 'meeting', 'note', 'stage_change'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              filter === type
                ? 'bg-[#84cc16] text-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            )}
          >
            {type === 'all' ? 'All' : type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No activities yet</p>
          <p className="text-xs mt-1">Log emails, calls, or meetings to track this deal</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-semibold text-neutral-400">{date}</div>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>

              {/* Activities for this date */}
              <div className="space-y-3 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
                <AnimatePresence>
                  {dateActivities.map((activity, index) => (
                    <motion.div
                      key={activity._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex gap-3 relative"
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10',
                          getActivityColor(activity.type)
                        )}
                      >
                        {getActivityIcon(activity.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 hover:bg-neutral-800 transition-colors">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white flex items-center gap-2">
                              {activity.title}
                              {activity.isAutoLogged && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
                                  Auto-logged
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {typeof activity.userId === 'object'
                                ? activity.userId.name
                                : 'Unknown User'}{' '}
                              • {formatRelativeTime(activity.createdAt)}
                            </p>
                          </div>

                          {/* Direction/Duration */}
                          {activity.direction && (
                            <span className="text-xs text-neutral-500 capitalize">
                              {activity.direction}
                            </span>
                          )}
                          {activity.duration && (
                            <span className="text-xs text-neutral-500">
                              {Math.floor(activity.duration / 60)}m {activity.duration % 60}s
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {activity.description && (
                          <p className="text-sm text-neutral-300 mt-2">{activity.description}</p>
                        )}

                        {/* Email Subject */}
                        {activity.emailSubject && (
                          <div className="mt-2 text-xs">
                            <span className="text-neutral-500">Subject: </span>
                            <span className="text-neutral-300">{activity.emailSubject}</span>
                          </div>
                        )}

                        {/* Stage Change */}
                        {activity.type === 'stage_change' && activity.metadata && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-neutral-700 text-neutral-300">
                              {activity.metadata.fromStage || 'Unknown'}
                            </span>
                            <ArrowsRightLeftIcon className="w-3 h-3 text-neutral-500" />
                            <span className="px-2 py-1 rounded bg-[#84cc16]/20 text-[#84cc16]">
                              {activity.metadata.toStage || 'Unknown'}
                            </span>
                          </div>
                        )}

                        {/* Task Status */}
                        {activity.type === 'task' && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            {activity.completed ? (
                              <span className="flex items-center gap-1 text-green-500">
                                <CheckCircleIcon className="w-4 h-4" />
                                Completed
                              </span>
                            ) : (
                              <span className="text-neutral-500">
                                Due: {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString() : 'No due date'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* AI Confidence */}
                        {activity.aiConfidence && (
                          <div className="mt-2 text-xs text-neutral-500">
                            AI Confidence: {activity.aiConfidence}%
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
