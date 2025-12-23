/**
 * Dashboard API Routes
 * 
 * Provides real-time dashboard data aggregation and AI briefing generation.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import Task from "../models/Task";
import CalendarEvent from "../models/CalendarEvent";
import EmailMessage from "../models/EmailMessage";
import Pipeline from "../models/Pipeline";
import Campaign from "../models/Campaign";
import Workflow from "../models/Workflow";
import Ticket from "../models/Ticket";
import { Types } from "mongoose";

const router = Router();

/**
 * GET /api/workspaces/:workspaceId/dashboard/briefing
 * 
 * Get real-time daily briefing data from all workspace sources
 */
router.get(
    "/:workspaceId/dashboard/briefing",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();
            const workspaceObjId = new Types.ObjectId(workspaceId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            // Fetch all data in parallel
            const [
                contacts,
                opportunities,
                todayMeetings,
                pendingTasks,
                unreadEmails,
                pipelines,
                campaigns,
                openTickets,
                recentOpportunities,
            ] = await Promise.all([
                // Total contacts
                Contact.countDocuments({ workspaceId: workspaceObjId }),
                // All opportunities
                Opportunity.find({ workspaceId: workspaceObjId }).lean(),
                // Today's meetings
                CalendarEvent.find({
                    workspaceId: workspaceObjId,
                    startTime: { $gte: today, $lt: tomorrow },
                }).sort({ startTime: 1 }).limit(10).lean(),
                // Pending tasks due today or overdue
                Task.find({
                    workspaceId: workspaceObjId,
                    status: { $ne: 'completed' },
                    $or: [
                        { dueDate: { $lte: tomorrow } },
                        { dueDate: null }
                    ]
                }).sort({ dueDate: 1 }).limit(10).lean(),
                // Unread emails
                EmailMessage.countDocuments({
                    workspaceId: workspaceObjId,
                    'metadata.isRead': { $ne: true }
                }),
                // Pipelines
                Pipeline.find({ workspaceId: workspaceObjId }).lean(),
                // Active campaigns
                Campaign.find({
                    workspaceId: workspaceObjId,
                    status: { $in: ['active', 'running'] }
                }).lean(),
                // Open tickets
                Ticket.find({
                    workspaceId: workspaceObjId,
                    status: { $in: ['open', 'in_progress'] }
                }).lean(),
                // Deals updated in last 7 days
                Opportunity.find({
                    workspaceId: workspaceObjId,
                    updatedAt: { $gte: weekAgo }
                }).lean(),
            ]);

            // Calculate pipeline metrics
            const totalPipelineValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
            const openDeals = opportunities.filter(o => o.status === 'open' || !o.status);
            const wonDeals = opportunities.filter(o => o.status === 'won');
            const lostDeals = opportunities.filter(o => o.status === 'lost');

            // Identify stale deals (no activity in 7+ days)
            const staleDeals = opportunities.filter(o => {
                const lastUpdate = new Date(o.updatedAt);
                return (today.getTime() - lastUpdate.getTime()) > 7 * 24 * 60 * 60 * 1000 &&
                    o.status !== 'won' && o.status !== 'lost';
            });

            // Identify high-value deals at risk
            const dealsAtRisk = staleDeals.filter(d => (d.value || 0) > 10000);

            // Build priorities
            const priorities: any[] = [];

            // Add meeting priorities
            todayMeetings.slice(0, 2).forEach(meeting => {
                priorities.push({
                    title: meeting.title || 'Meeting',
                    type: 'meeting',
                    urgency: 'high',
                    description: `${meeting.attendees?.length || 0} attendees`,
                    time: new Date(meeting.startTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                });
            });

            // Add email priority if there are unread emails
            if (unreadEmails > 0) {
                priorities.push({
                    title: `${unreadEmails} unread email${unreadEmails > 1 ? 's' : ''} pending`,
                    type: 'email',
                    urgency: unreadEmails > 10 ? 'high' : 'medium',
                    description: 'Inbox replies awaiting response',
                });
            }

            // Add deal at risk priority
            if (dealsAtRisk.length > 0) {
                const totalAtRisk = dealsAtRisk.reduce((sum, d) => sum + (d.value || 0), 0);
                priorities.push({
                    title: `${dealsAtRisk.length} deal${dealsAtRisk.length > 1 ? 's' : ''} at risk`,
                    type: 'deal',
                    urgency: 'high',
                    description: `$${(totalAtRisk / 1000).toFixed(0)}K pipeline - no activity in 7+ days`,
                });
            }

            // Add task priorities
            const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
            if (overdueTasks.length > 0) {
                priorities.push({
                    title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
                    type: 'task',
                    urgency: 'high',
                    description: 'Tasks past due date',
                });
            }

            // Add open tickets
            if (openTickets.length > 0) {
                const urgentTickets = openTickets.filter(t => t.priority === 'urgent' || t.priority === 'high');
                if (urgentTickets.length > 0) {
                    priorities.push({
                        title: `${urgentTickets.length} urgent ticket${urgentTickets.length > 1 ? 's' : ''}`,
                        type: 'task',
                        urgency: 'high',
                        description: 'Support tickets requiring attention',
                    });
                }
            }

            // Build metrics
            const metrics = [
                {
                    label: 'Pipeline Value',
                    value: totalPipelineValue >= 1000000
                        ? `$${(totalPipelineValue / 1000000).toFixed(1)}M`
                        : `$${(totalPipelineValue / 1000).toFixed(0)}K`,
                    change: recentOpportunities.length,
                    changeLabel: 'deals updated this week',
                },
                {
                    label: 'Open Deals',
                    value: openDeals.length,
                    change: wonDeals.length,
                    changeLabel: 'won this month',
                },
                {
                    label: 'Meetings Today',
                    value: todayMeetings.length,
                },
                {
                    label: 'Tasks Due',
                    value: pendingTasks.length,
                    change: overdueTasks.length > 0 ? -overdueTasks.length : undefined,
                    changeLabel: overdueTasks.length > 0 ? 'overdue' : undefined,
                },
            ];

            // Build alerts
            const alerts: any[] = [];

            if (staleDeals.length > 0) {
                alerts.push({
                    type: 'warning',
                    message: `${staleDeals.length} deal${staleDeals.length > 1 ? 's have' : ' has'} been inactive for 7+ days`,
                });
            }

            if (openTickets.length > 5) {
                alerts.push({
                    type: 'warning',
                    message: `${openTickets.length} support tickets are currently open`,
                });
            }

            if (wonDeals.length > 0) {
                const recentWins = wonDeals.filter(d => {
                    const closeDate = new Date(d.updatedAt);
                    return closeDate >= weekAgo;
                });
                if (recentWins.length > 0) {
                    const wonValue = recentWins.reduce((sum, d) => sum + (d.value || 0), 0);
                    alerts.push({
                        type: 'success',
                        message: `${recentWins.length} deal${recentWins.length > 1 ? 's' : ''} won this week ($${(wonValue / 1000).toFixed(0)}K)`,
                    });
                }
            }

            if (campaigns.length > 0) {
                alerts.push({
                    type: 'info',
                    message: `${campaigns.length} active campaign${campaigns.length > 1 ? 's' : ''} running`,
                });
            }

            // Build suggested actions
            const suggestedActions: any[] = [];

            if (staleDeals.length > 0) {
                suggestedActions.push({
                    action: 'Follow up with stale deals',
                    reason: `Prevent potential loss of $${(staleDeals.reduce((s, d) => s + (d.value || 0), 0) / 1000).toFixed(0)}K pipeline`,
                });
            }

            if (todayMeetings.length > 0) {
                const nextMeeting = todayMeetings[0];
                const meetingTime = new Date(nextMeeting.startTime);
                const hoursUntil = Math.round((meetingTime.getTime() - Date.now()) / (1000 * 60 * 60));
                if (hoursUntil > 0 && hoursUntil <= 4) {
                    suggestedActions.push({
                        action: `Prepare for "${nextMeeting.title}"`,
                        reason: `Meeting in ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`,
                    });
                }
            }

            if (unreadEmails > 5) {
                suggestedActions.push({
                    action: 'Clear inbox backlog',
                    reason: `${unreadEmails} emails awaiting response`,
                });
            }

            if (overdueTasks.length > 0) {
                suggestedActions.push({
                    action: 'Complete overdue tasks',
                    reason: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past due date`,
                });
            }

            // Generate greeting
            const hour = new Date().getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
            else if (hour >= 17) greeting = 'Good evening';

            // Generate summary
            const summaryParts = [];
            if (todayMeetings.length > 0) {
                summaryParts.push(`${todayMeetings.length} meeting${todayMeetings.length > 1 ? 's' : ''} today`);
            }
            if (unreadEmails > 0) {
                summaryParts.push(`${unreadEmails} email${unreadEmails > 1 ? 's' : ''} awaiting response`);
            }
            if (dealsAtRisk.length > 0) {
                summaryParts.push(`${dealsAtRisk.length} deal${dealsAtRisk.length > 1 ? 's' : ''} that need attention`);
            }
            if (openTickets.length > 0) {
                summaryParts.push(`${openTickets.length} open ticket${openTickets.length > 1 ? 's' : ''}`);
            }

            let summary = 'All caught up! No urgent items requiring attention.';
            if (summaryParts.length > 0) {
                summary = `You have ${summaryParts.join(', ')}.`;
                if (priorities.length > 0) {
                    summary += ` Your top priority is ${priorities[0].title.toLowerCase()}.`;
                }
            }

            res.json({
                success: true,
                data: {
                    greeting: `${greeting}, ${req.user?.name?.split(' ')[0] || 'there'}!`,
                    summary,
                    priorities: priorities.slice(0, 5),
                    metrics,
                    alerts: alerts.slice(0, 4),
                    suggestedActions: suggestedActions.slice(0, 3),
                    // Raw counts for debugging/stats
                    stats: {
                        contacts,
                        opportunities: opportunities.length,
                        todayMeetings: todayMeetings.length,
                        pendingTasks: pendingTasks.length,
                        unreadEmails,
                        openTickets: openTickets.length,
                        staleDeals: staleDeals.length,
                    },
                },
            });
        } catch (error: any) {
            console.error("Error fetching dashboard briefing:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch dashboard briefing",
            });
        }
    }
);

export default router;
