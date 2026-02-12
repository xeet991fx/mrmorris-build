// ============================================
// WORKFLOW TEMPLATES
// Pre-built workflow configurations for quick setup
// ============================================

import { HandRaisedIcon, FireIcon, SparklesIcon, ArrowPathIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { WorkflowStep, StepType, TriggerType, ActionType } from './types';

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: 'lead-nurturing' | 'sales' | 'onboarding' | 'engagement';
    icon: any;
    color: string;
    triggerEntityType: 'contact' | 'deal';
    steps: Omit<WorkflowStep, 'id'>[];
}

// Helper to generate random ID
const genId = () => `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const workflowTemplates: WorkflowTemplate[] = [
    {
        id: 'welcome-new-contacts',
        name: 'Welcome New Contacts',
        description: 'Send a welcome email to new contacts, wait 1 day, then follow up with more info.',
        category: 'onboarding',
        icon: <HandRaisedIcon className="w-6 h-6" />,
        color: 'from-blue-500 to-cyan-500',
        triggerEntityType: 'contact',
        steps: [
            {
                name: 'Contact Created',
                type: 'trigger' as StepType,
                position: { x: 250, y: 50 },
                config: { triggerType: 'contact_created' as TriggerType },
                nextStepIds: ['step-2'],
            },
            {
                name: 'Send Welcome Email',
                type: 'action' as StepType,
                position: { x: 250, y: 180 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Welcome to {{company}}!',
                    emailBody: 'Hi {{firstName}},\n\nThank you for connecting with us! We\'re excited to have you.\n\nBest regards,\nThe Team',
                },
                nextStepIds: ['step-3'],
            },
            {
                name: 'Wait 1 Day',
                type: 'delay' as StepType,
                position: { x: 250, y: 310 },
                config: { delayValue: 1, delayUnit: 'days' },
                nextStepIds: ['step-4'],
            },
            {
                name: 'Send Follow-up',
                type: 'action' as StepType,
                position: { x: 250, y: 440 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Resources to help you get started',
                    emailBody: 'Hi {{firstName}},\n\nHere are some resources to help you get the most out of our service:\n\n• Getting Started Guide\n• FAQ\n• Support Portal\n\nLet us know if you have any questions!\n\nBest,\nThe Team',
                },
                nextStepIds: [],
            },
        ],
    },
    {
        id: 'nurture-cold-leads',
        name: 'Nurture Cold Leads',
        description: 'A 3-email sequence over 2 weeks to re-engage cold leads.',
        category: 'lead-nurturing',
        icon: <FireIcon className="w-6 h-6" />,
        color: 'from-orange-500 to-red-500',
        triggerEntityType: 'contact',
        steps: [
            {
                name: 'Tag Added: Cold Lead',
                type: 'trigger' as StepType,
                position: { x: 250, y: 50 },
                config: { triggerType: 'contact_updated' as TriggerType },
                nextStepIds: ['step-2'],
            },
            {
                name: 'Email 1: Reconnect',
                type: 'action' as StepType,
                position: { x: 250, y: 180 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'We miss you, {{firstName}}!',
                    emailBody: 'Hi {{firstName}},\n\nIt\'s been a while since we connected. Just checking in to see how things are going.\n\nWould you like to schedule a quick call?\n\nBest,\nThe Team',
                },
                nextStepIds: ['step-3'],
            },
            {
                name: 'Wait 5 Days',
                type: 'delay' as StepType,
                position: { x: 250, y: 310 },
                config: { delayValue: 5, delayUnit: 'days' },
                nextStepIds: ['step-4'],
            },
            {
                name: 'Email 2: Value Add',
                type: 'action' as StepType,
                position: { x: 250, y: 440 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Thought you might find this useful',
                    emailBody: 'Hi {{firstName}},\n\nI came across something I thought would be valuable for you:\n\n[Insert relevant resource or insight]\n\nLet me know if you\'d like to discuss!\n\nBest,\nThe Team',
                },
                nextStepIds: ['step-5'],
            },
            {
                name: 'Wait 7 Days',
                type: 'delay' as StepType,
                position: { x: 250, y: 570 },
                config: { delayValue: 7, delayUnit: 'days' },
                nextStepIds: ['step-6'],
            },
            {
                name: 'Email 3: Final Check',
                type: 'action' as StepType,
                position: { x: 250, y: 700 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Is this goodbye?',
                    emailBody: 'Hi {{firstName}},\n\nI wanted to reach out one last time. If you\'re no longer interested, no worries at all!\n\nBut if there\'s anything we can help with, just reply to this email.\n\nWishing you all the best,\nThe Team',
                },
                nextStepIds: [],
            },
        ],
    },
    {
        id: 'deal-won-followup',
        name: 'Deal Won Follow-up',
        description: 'Thank new customers and ask for referrals after a deal closes.',
        category: 'sales',
        icon: <SparklesIcon className="w-6 h-6" />,
        color: 'from-green-500 to-emerald-500',
        triggerEntityType: 'deal',
        steps: [
            {
                name: 'Deal Closed Won',
                type: 'trigger' as StepType,
                position: { x: 250, y: 50 },
                config: { triggerType: 'deal_stage_changed' as TriggerType },
                nextStepIds: ['step-2'],
            },
            {
                name: 'Send Thank You',
                type: 'action' as StepType,
                position: { x: 250, y: 180 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Thank you for your business!',
                    emailBody: 'Hi {{firstName}},\n\nThank you for choosing us! We\'re thrilled to have you as a customer.\n\nOur team is here to support you every step of the way.\n\nWelcome aboard!\n\nBest,\nThe Team',
                },
                nextStepIds: ['step-3'],
            },
            {
                name: 'Create Follow-up Task',
                type: 'action' as StepType,
                position: { x: 250, y: 310 },
                config: {
                    actionType: 'create_task' as ActionType,
                    taskTitle: 'Follow up with {{firstName}} - new customer',
                    taskDescription: 'Check in on onboarding progress and satisfaction',
                    taskDueInDays: 7,
                },
                nextStepIds: ['step-4'],
            },
            {
                name: 'Wait 14 Days',
                type: 'delay' as StepType,
                position: { x: 250, y: 440 },
                config: { delayValue: 14, delayUnit: 'days' },
                nextStepIds: ['step-5'],
            },
            {
                name: 'Ask for Referral',
                type: 'action' as StepType,
                position: { x: 250, y: 570 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Know anyone who could benefit?',
                    emailBody: 'Hi {{firstName}},\n\nI hope you\'re enjoying working with us!\n\nIf you know anyone who might benefit from our services, we\'d be grateful for a referral. We offer a referral bonus for successful introductions.\n\nThanks again for your business!\n\nBest,\nThe Team',
                },
                nextStepIds: [],
            },
        ],
    },
    {
        id: 're-engagement',
        name: 'Re-engagement Campaign',
        description: 'Win back contacts who have been inactive for 30+ days.',
        category: 'engagement',
        icon: <ArrowPathIcon className="w-6 h-6" />,
        color: 'from-purple-500 to-violet-500',
        triggerEntityType: 'contact',
        steps: [
            {
                name: 'Contact Inactive 30 Days',
                type: 'trigger' as StepType,
                position: { x: 250, y: 50 },
                config: { triggerType: 'contact_updated' as TriggerType },
                nextStepIds: ['step-2'],
            },
            {
                name: 'Tag as "At Risk"',
                type: 'action' as StepType,
                position: { x: 250, y: 180 },
                config: {
                    actionType: 'add_tag' as ActionType,
                    tagName: 'At Risk',
                },
                nextStepIds: ['step-3'],
            },
            {
                name: 'Send Re-engagement Email',
                type: 'action' as StepType,
                position: { x: 250, y: 310 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'We noticed you\'ve been away...',
                    emailBody: 'Hi {{firstName}},\n\nWe noticed it\'s been a while since we heard from you.\n\nIs there anything we can help with? We\'d love to reconnect.\n\nP.S. Here\'s a special offer just for you: [Insert offer]\n\nBest,\nThe Team',
                },
                nextStepIds: ['step-4'],
            },
            {
                name: 'Notify Sales Rep',
                type: 'action' as StepType,
                position: { x: 250, y: 440 },
                config: {
                    actionType: 'send_notification' as ActionType,
                    notificationMessage: 'At-risk contact {{firstName}} {{lastName}} sent re-engagement email',
                },
                nextStepIds: [],
            },
        ],
    },
    {
        id: 'meeting-noshow',
        name: 'Meeting No-Show Follow-up',
        description: 'Automatically follow up when a contact misses a meeting with branching based on response.',
        category: 'engagement',
        icon: <CalendarIcon className="w-6 h-6" />,
        color: 'from-amber-500 to-orange-500',
        triggerEntityType: 'contact',
        steps: [
            {
                name: 'Meeting No-Show',
                type: 'trigger' as StepType,
                position: { x: 250, y: 50 },
                config: { triggerType: 'contact_updated' as TriggerType },
                nextStepIds: ['step-2'],
            },
            {
                name: 'Add Tag: No-Show',
                type: 'action' as StepType,
                position: { x: 250, y: 180 },
                config: {
                    actionType: 'add_tag' as ActionType,
                    tagName: 'No-Show',
                },
                nextStepIds: ['step-3'],
            },
            {
                name: 'Send Apology & Reschedule',
                type: 'action' as StepType,
                position: { x: 250, y: 310 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'We missed you at today\'s meeting',
                    emailBody: 'Hi {{firstName}},\n\nI noticed we missed our meeting today. No worries - things come up!\n\nWould you like to reschedule? Here\'s my calendar link: [Insert calendar link]\n\nLooking forward to connecting,\nThe Team',
                },
                nextStepIds: ['step-4'],
            },
            {
                name: 'Wait 2 Days',
                type: 'delay' as StepType,
                position: { x: 250, y: 440 },
                config: { delayValue: 2, delayUnit: 'days' },
                nextStepIds: ['step-5'],
            },
            {
                name: 'Check: Email Opened?',
                type: 'condition' as StepType,
                position: { x: 250, y: 570 },
                config: {
                    conditions: [{
                        field: 'lastEmailOpened',
                        operator: 'is_not_empty',
                    }],
                },
                nextStepIds: ['step-6', 'step-7'],
            },
            {
                name: 'Email Opened - Create Task',
                type: 'action' as StepType,
                position: { x: 450, y: 700 },
                config: {
                    actionType: 'create_task' as ActionType,
                    taskTitle: 'Call {{firstName}} - engaged after no-show',
                    taskDescription: 'Contact opened reschedule email. Call to reconnect.',
                    taskDueInDays: 1,
                },
                nextStepIds: [],
            },
            {
                name: 'Not Opened - Send Final Reminder',
                type: 'action' as StepType,
                position: { x: 50, y: 700 },
                config: {
                    actionType: 'send_email' as ActionType,
                    emailSubject: 'Last chance to reschedule',
                    emailBody: 'Hi {{firstName}},\n\nI wanted to reach out one more time about rescheduling our meeting.\n\nIf you\'re still interested, reply to this email and we\'ll find a time that works.\n\nIf not, no problem - wishing you all the best!\n\nBest,\nThe Team',
                },
                nextStepIds: [],
            },
        ],
    },
];

// Helper function to instantiate a template with proper IDs
export function instantiateTemplate(template: WorkflowTemplate): {
    name: string;
    description: string;
    triggerEntityType: 'contact' | 'deal';
    steps: WorkflowStep[];
} {
    const idMap: Record<string, string> = {};

    // First pass: generate IDs
    template.steps.forEach((step, index) => {
        const oldId = `step-${index + 1}`;
        idMap[oldId] = genId();
    });

    // Second pass: create steps with new IDs
    const steps = template.steps.map((step, index) => {
        const oldId = `step-${index + 1}`;
        return {
            ...step,
            id: idMap[oldId],
            nextStepIds: step.nextStepIds.map(id => idMap[id] || id),
        } as WorkflowStep;
    });

    return {
        name: template.name,
        description: template.description,
        triggerEntityType: template.triggerEntityType,
        steps,
    };
}

// Clone template steps with new IDs
export function cloneTemplateSteps(templateId: string): WorkflowStep[] {
    const template = workflowTemplates.find(t => t.id === templateId);
    if (!template) return [];

    const result = instantiateTemplate(template);
    return result.steps;
}

export default workflowTemplates;
