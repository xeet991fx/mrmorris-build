// ============================================
// CAMPAIGN TEMPLATES
// Pre-built campaign configurations for quick setup
// ============================================

import { CampaignStep } from "@/lib/api/campaign";

export type TemplateIconType = 'snowflake' | 'handshake' | 'newspaper' | 'ticket' | 'sparkles';

export interface CampaignTemplate {
    id: string;
    name: string;
    description: string;
    category: 'outreach' | 'follow-up' | 'nurture' | 'announcement';
    icon: TemplateIconType;
    steps: Omit<CampaignStep, 'id'>[];
    dailyLimit: number;
}

export const campaignTemplates: CampaignTemplate[] = [
    {
        id: 'cold-outreach',
        name: 'Cold Outreach',
        description: '3-step sequence for reaching new prospects',
        category: 'outreach',
        icon: 'snowflake',
        dailyLimit: 50,
        steps: [
            {
                type: 'email',
                subject: 'Quick question, {{firstName}}',
                body: `Hi {{firstName}},

I came across {{company}} and was impressed by what you're building.

I'm reaching out because we help companies like yours [specific benefit]. Would you be open to a quick chat this week?

Best,
[Your Name]`,
                delayDays: 0,
                delayHours: 0,
            },
            {
                type: 'email',
                subject: 'Re: Quick question, {{firstName}}',
                body: `Hi {{firstName}},

Just following up on my previous email. I know you're busy, so I'll keep this short.

[One sentence value prop with specific result/metric]

Would 15 minutes work for you this week?

Best,
[Your Name]`,
                delayDays: 3,
                delayHours: 0,
            },
            {
                type: 'email',
                subject: 'Last try, {{firstName}}',
                body: `Hi {{firstName}},

I don't want to be a pest, so this will be my last email.

If you're interested in [benefit], just reply and we can set up a time to talk.

If not, no worries at all. I wish you and {{company}} continued success!

Best,
[Your Name]`,
                delayDays: 5,
                delayHours: 0,
            },
        ],
    },
    {
        id: 'warm-follow-up',
        name: 'Warm Follow-up',
        description: 'Follow up after meeting or demo',
        category: 'follow-up',
        icon: 'handshake',
        dailyLimit: 100,
        steps: [
            {
                type: 'email',
                subject: 'Great chatting with you, {{firstName}}',
                body: `Hi {{firstName}},

It was great speaking with you today! As promised, here's the information we discussed:

• [Key point 1]
• [Key point 2]
• [Link to resource]

Let me know if you have any questions. Looking forward to next steps!

Best,
[Your Name]`,
                delayDays: 0,
                delayHours: 0,
            },
            {
                type: 'email',
                subject: 'Checking in, {{firstName}}',
                body: `Hi {{firstName}},

Hope you had a chance to review the information I sent over.

Do you have any questions I can help answer? Happy to jump on a quick call if that's easier.

Best,
[Your Name]`,
                delayDays: 3,
                delayHours: 0,
            },
        ],
    },
    {
        id: 'newsletter-blast',
        name: 'Newsletter',
        description: 'Single email announcement to your list',
        category: 'announcement',
        icon: 'newspaper',
        dailyLimit: 200,
        steps: [
            {
                type: 'email',
                subject: '[Newsletter] Your Weekly Update',
                body: `Hi {{firstName}},

Here's what's new this week:

📌 **Headline 1**
Brief description of the news or update.

📌 **Headline 2**
Brief description of the news or update.

📌 **Headline 3**
Brief description of the news or update.

That's all for this week. See you next time!

Best,
[Your Name]`,
                delayDays: 0,
                delayHours: 0,
            },
        ],
    },
    {
        id: 'event-invitation',
        name: 'Event Invitation',
        description: 'Invite contacts to an event with reminder',
        category: 'announcement',
        icon: 'ticket',
        dailyLimit: 100,
        steps: [
            {
                type: 'email',
                subject: 'You\'re invited: [Event Name]',
                body: `Hi {{firstName}},

You're invited to [Event Name]!

📅 **Date:** [Date]
🕐 **Time:** [Time]
📍 **Location:** [Location/Link]

[Brief description of what attendees will learn/experience]

Reserve your spot: [Link]

Hope to see you there!

Best,
[Your Name]`,
                delayDays: 0,
                delayHours: 0,
            },
            {
                type: 'email',
                subject: 'Reminder: [Event Name] is tomorrow',
                body: `Hi {{firstName}},

Just a friendly reminder that [Event Name] is tomorrow!

📅 **Date:** [Date]
🕐 **Time:** [Time]
📍 **Location:** [Location/Link]

If you haven't registered yet, there's still time: [Link]

See you there!

Best,
[Your Name]`,
                delayDays: 6,
                delayHours: 0,
            },
        ],
    },
    {
        id: 're-engagement',
        name: 'Re-engagement',
        description: 'Win back inactive contacts',
        category: 'nurture',
        icon: 'sparkles',
        dailyLimit: 50,
        steps: [
            {
                type: 'email',
                subject: 'We miss you, {{firstName}}!',
                body: `Hi {{firstName}},

It's been a while since we connected, and I wanted to check in.

A lot has changed since we last spoke – [mention recent update, feature, or news].

Would you be interested in catching up? I'd love to hear what you're working on.

Best,
[Your Name]`,
                delayDays: 0,
                delayHours: 0,
            },
            {
                type: 'email',
                subject: 'Quick question for you, {{firstName}}',
                body: `Hi {{firstName}},

I wanted to follow up and see if there's anything we can help you with.

Is there a particular challenge you're facing right now? We might have some new solutions that could help.

Just reply to this email and let me know!

Best,
[Your Name]`,
                delayDays: 5,
                delayHours: 0,
            },
        ],
    },
];

// Get template by ID
export function getCampaignTemplate(id: string): CampaignTemplate | undefined {
    return campaignTemplates.find(t => t.id === id);
}

// Get templates by category
export function getCampaignTemplatesByCategory(category: CampaignTemplate['category']): CampaignTemplate[] {
    return campaignTemplates.filter(t => t.category === category);
}
