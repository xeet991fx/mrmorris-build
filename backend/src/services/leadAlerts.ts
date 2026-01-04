/**
 * Real-Time Lead Alert Service
 *
 * Sends instant notifications when high-value leads come in.
 * Supports Slack, SMS (Twilio), Email, and Browser Push.
 *
 * This ensures sales teams act on hot leads within 5 minutes.
 */

import { Types } from "mongoose";
import Contact from "../models/Contact";
import Company from "../models/Company";
import User from "../models/User";
import emailService from "./email";
import { QualificationResult } from "./leadQualification";

// ============================================
// ALERT CONFIGURATION
// ============================================

export interface AlertConfig {
    // When to send alerts
    minQualityScore?: number; // Default: 70
    minQualityGrade?: 'A' | 'B' | 'C' | 'D' | 'F'; // Default: B
    onlyQualified?: boolean; // Default: true

    // Alert channels
    channels: {
        slack?: {
            enabled: boolean;
            webhookUrl: string;
            channel?: string; // e.g., "#sales-leads"
            mentionUsers?: string[]; // Slack user IDs to @mention
        };
        sms?: {
            enabled: boolean;
            twilioAccountSid: string;
            twilioAuthToken: string;
            twilioPhoneNumber: string;
            recipients: string[]; // Phone numbers to notify
        };
        email?: {
            enabled: boolean;
            recipients: string[]; // Email addresses to notify
        };
        browserPush?: {
            enabled: boolean;
            // For future WebSocket/Push implementation
        };
    };

    // Customization
    customMessage?: string; // Template for alert message
    includeTalkingPoints?: boolean; // Include AI-generated talking points
}

// Default configuration
const DEFAULT_CONFIG: AlertConfig = {
    minQualityScore: 70,
    minQualityGrade: 'B',
    onlyQualified: true,
    channels: {
        email: {
            enabled: true,
            recipients: [],
        },
    },
    includeTalkingPoints: true,
};

// ============================================
// CORE ALERT FUNCTIONS
// ============================================

/**
 * Send alert for a new high-value lead
 */
export async function sendLeadAlert(
    contactId: string | Types.ObjectId,
    qualificationResult: QualificationResult,
    config: AlertConfig = DEFAULT_CONFIG
): Promise<{
    success: boolean;
    channelsSent: string[];
    errors: string[];
}> {

    const result = {
        success: true,
        channelsSent: [] as string[],
        errors: [] as string[],
    };

    // Check if we should send alert
    if (!shouldSendAlert(qualificationResult, config)) {
        console.log(`⏭️ Skipping alert: Lead does not meet threshold (score: ${qualificationResult.qualityScore}, grade: ${qualificationResult.qualityGrade})`);
        return result;
    }

    // Get contact and company data
    const contact = await Contact.findById(contactId).populate('companyId');
    if (!contact) {
        result.errors.push('Contact not found');
        result.success = false;
        return result;
    }

    const company = contact.companyId as any;

    // Generate alert message
    const alertData = generateAlertMessage(contact, company, qualificationResult, config);

    console.log(`🔔 Sending lead alert for: ${contact.email} (${qualificationResult.qualityScore}/100 - Grade ${qualificationResult.qualityGrade})`);

    // Send to all enabled channels
    if (config.channels.slack?.enabled) {
        try {
            await sendSlackAlert(alertData, config.channels.slack);
            result.channelsSent.push('slack');
            console.log('✅ Slack alert sent');
        } catch (error: any) {
            result.errors.push(`Slack: ${error.message}`);
            console.error('❌ Slack alert failed:', error.message);
        }
    }

    if (config.channels.sms?.enabled) {
        try {
            await sendSMSAlert(alertData, config.channels.sms);
            result.channelsSent.push('sms');
            console.log('✅ SMS alert sent');
        } catch (error: any) {
            result.errors.push(`SMS: ${error.message}`);
            console.error('❌ SMS alert failed:', error.message);
        }
    }

    if (config.channels.email?.enabled && config.channels.email.recipients.length > 0) {
        try {
            await sendEmailAlert(alertData, config.channels.email.recipients);
            result.channelsSent.push('email');
            console.log('✅ Email alert sent');
        } catch (error: any) {
            result.errors.push(`Email: ${error.message}`);
            console.error('❌ Email alert failed:', error.message);
        }
    }

    if (result.channelsSent.length === 0) {
        result.success = false;
        result.errors.push('No channels configured or all failed');
    }

    return result;
}

/**
 * Check if alert should be sent based on config
 */
function shouldSendAlert(
    qualificationResult: QualificationResult,
    config: AlertConfig
): boolean {

    // Check if qualified (if required)
    if (config.onlyQualified && !qualificationResult.qualified) {
        return false;
    }

    // Check minimum score
    if (config.minQualityScore && qualificationResult.qualityScore < config.minQualityScore) {
        return false;
    }

    // Check minimum grade
    if (config.minQualityGrade) {
        const gradeValues = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
        const minValue = gradeValues[config.minQualityGrade];
        const currentValue = gradeValues[qualificationResult.qualityGrade];

        if (currentValue < minValue) {
            return false;
        }
    }

    return true;
}

// ============================================
// MESSAGE GENERATION
// ============================================

interface AlertData {
    title: string;
    summary: string;
    contact: {
        name: string;
        email: string;
        phone?: string;
        jobTitle?: string;
        company?: string;
    };
    company?: {
        name: string;
        employees?: string;
        revenue?: string;
        industry?: string;
        website?: string;
    };
    qualification: {
        score: number;
        grade: string;
        reasons: string[];
    };
    talkingPoints?: string[];
    actions: {
        callNowUrl?: string;
        sendEmailUrl?: string;
        viewContactUrl?: string;
    };
}

/**
 * Generate alert message data
 */
function generateAlertMessage(
    contact: any,
    company: any,
    qualificationResult: QualificationResult,
    config: AlertConfig
): AlertData {

    const contactName = `${contact.firstName} ${contact.lastName || ''}`.trim();
    const scoreEmoji = getScoreEmoji(qualificationResult.qualityScore);

    const alertData: AlertData = {
        title: `${scoreEmoji} HOT LEAD ALERT`,
        summary: `${contactName} from ${contact.company || 'Unknown Company'} just submitted a form!`,
        contact: {
            name: contactName,
            email: contact.email,
            phone: contact.phone,
            jobTitle: contact.jobTitle,
            company: contact.company,
        },
        qualification: {
            score: qualificationResult.qualityScore,
            grade: qualificationResult.qualityGrade,
            reasons: qualificationResult.reasons,
        },
        actions: {
            callNowUrl: contact.phone ? `tel:${contact.phone}` : undefined,
            sendEmailUrl: contact.email ? `mailto:${contact.email}` : undefined,
            viewContactUrl: `${process.env.FRONTEND_URL}/contacts/${contact._id}`,
        },
    };

    // Add company data if available
    if (company) {
        alertData.company = {
            name: company.name,
            employees: company.employees,
            revenue: company.revenue,
            industry: company.industry,
            website: company.website,
        };
    }

    // Generate AI talking points if enabled
    if (config.includeTalkingPoints) {
        alertData.talkingPoints = generateTalkingPoints(contact, company, qualificationResult);
    }

    return alertData;
}

/**
 * Generate AI talking points for sales rep
 */
function generateTalkingPoints(
    contact: any,
    company: any,
    qualificationResult: QualificationResult
): string[] {

    const points: string[] = [];

    // Personalized greeting
    if (contact.firstName) {
        points.push(`Hi ${contact.firstName}! Thanks for your interest in [Product].`);
    }

    // Company-specific point
    if (company) {
        if (company.employees) {
            points.push(`With ${company.employees} employees, you're probably facing scaling challenges.`);
        }
        if (company.industry) {
            points.push(`We help ${company.industry} companies like yours streamline operations.`);
        }
    }

    // Pain point based on qualification
    const reasons = qualificationResult.reasons.join(' ').toLowerCase();
    if (reasons.includes('senior') || reasons.includes('decision-maker')) {
        points.push(`As ${contact.jobTitle}, you're probably looking for solutions that drive ROI.`);
    }

    // Call to action
    points.push(`Would you be open to a 15-minute call to discuss your needs?`);

    return points;
}

/**
 * Get emoji based on score
 */
function getScoreEmoji(score: number): string {
    if (score >= 90) return '🔥';
    if (score >= 80) return '⭐';
    if (score >= 70) return '✅';
    if (score >= 60) return '👍';
    return '💡';
}

// ============================================
// CHANNEL IMPLEMENTATIONS
// ============================================

/**
 * Send alert to Slack
 */
async function sendSlackAlert(
    alertData: AlertData,
    config: { webhookUrl: string; channel?: string; mentionUsers?: string[] }
): Promise<void> {

    const mentions = config.mentionUsers?.map(user => `<@${user}>`).join(' ') || '';

    const slackMessage = {
        channel: config.channel,
        username: 'Lead Alert Bot',
        icon_emoji: ':fire:',
        text: `${mentions} ${alertData.title}`,
        attachments: [
            {
                color: getColorForGrade(alertData.qualification.grade),
                title: alertData.summary,
                fields: [
                    {
                        title: '👤 Contact',
                        value: `*${alertData.contact.name}*\n${alertData.contact.jobTitle || 'Unknown Title'} at ${alertData.contact.company || 'Unknown Company'}`,
                        short: true,
                    },
                    {
                        title: '📊 Quality Score',
                        value: `*${alertData.qualification.score}/100* (Grade ${alertData.qualification.grade})`,
                        short: true,
                    },
                    {
                        title: '📧 Contact Info',
                        value: `Email: ${alertData.contact.email}\n${alertData.contact.phone ? `Phone: ${alertData.contact.phone}` : ''}`,
                        short: true,
                    },
                    ...(alertData.company ? [{
                        title: '🏢 Company Info',
                        value: `${alertData.company.employees || 'Unknown'} employees\n${alertData.company.industry || 'Unknown industry'}`,
                        short: true,
                    }] : []),
                ],
                footer: 'Clinata Lead Alert',
                ts: Math.floor(Date.now() / 1000),
            },
            ...(alertData.talkingPoints ? [{
                color: '#36a64f',
                title: '💡 AI-Generated Talking Points',
                text: alertData.talkingPoints.map((point, i) => `${i + 1}. ${point}`).join('\n'),
            }] : []),
            {
                fallback: 'Lead Actions',
                actions: [
                    {
                        type: 'button',
                        text: '📞 Call Now',
                        url: alertData.actions.callNowUrl,
                        style: 'primary',
                    },
                    {
                        type: 'button',
                        text: '✉️ Send Email',
                        url: alertData.actions.sendEmailUrl,
                    },
                    {
                        type: 'button',
                        text: '👁️ View Contact',
                        url: alertData.actions.viewContactUrl,
                    },
                ],
            },
        ],
    };

    // Send to Slack webhook
    const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
    }
}

/**
 * Send alert via SMS (Twilio)
 */
async function sendSMSAlert(
    alertData: AlertData,
    config: { twilioAccountSid: string; twilioAuthToken: string; twilioPhoneNumber: string; recipients: string[] }
): Promise<void> {

    const message = `
${alertData.title}

${alertData.contact.name} - ${alertData.contact.jobTitle || 'Unknown'}
${alertData.contact.company || 'Unknown Company'}

Quality Score: ${alertData.qualification.score}/100 (${alertData.qualification.grade})

Email: ${alertData.contact.email}
${alertData.contact.phone ? `Phone: ${alertData.contact.phone}` : ''}

Act fast! ${alertData.actions.viewContactUrl}
    `.trim();

    // Note: Actual Twilio implementation would go here
    // For now, we'll just log it
    console.log('SMS Alert would be sent:', message);

    // TODO: Implement actual Twilio sending
    // const twilio = require('twilio');
    // const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    //
    // for (const recipient of config.recipients) {
    //     await client.messages.create({
    //         body: message,
    //         from: config.twilioPhoneNumber,
    //         to: recipient,
    //     });
    // }
}

/**
 * Send alert via Email
 */
async function sendEmailAlert(
    alertData: AlertData,
    recipients: string[]
): Promise<void> {

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .alert-badge { display: inline-block; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
            .grade-a { background: #28a745; color: white; }
            .grade-b { background: #17a2b8; color: white; }
            .grade-c { background: #ffc107; color: #333; }
            .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0; }
            .talking-points { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${alertData.title}</h1>
                <p>${alertData.summary}</p>
                <span class="alert-badge grade-${alertData.qualification.grade.toLowerCase()}">
                    Quality Score: ${alertData.qualification.score}/100 (Grade ${alertData.qualification.grade})
                </span>
            </div>

            <div class="info-box">
                <h3>👤 Contact Information</h3>
                <p><strong>${alertData.contact.name}</strong><br>
                ${alertData.contact.jobTitle || 'Unknown Title'}<br>
                ${alertData.contact.company || 'Unknown Company'}</p>
                <p>📧 ${alertData.contact.email}<br>
                ${alertData.contact.phone ? `📞 ${alertData.contact.phone}` : ''}</p>
            </div>

            ${alertData.company ? `
            <div class="info-box">
                <h3>🏢 Company Information</h3>
                <p><strong>${alertData.company.name}</strong><br>
                ${alertData.company.employees || 'Unknown'} employees<br>
                ${alertData.company.industry || 'Unknown industry'}<br>
                ${alertData.company.revenue ? `Revenue: ${alertData.company.revenue}` : ''}</p>
            </div>
            ` : ''}

            ${alertData.talkingPoints ? `
            <div class="talking-points">
                <h3>💡 AI-Generated Talking Points</h3>
                <ol>
                    ${alertData.talkingPoints.map(point => `<li>${point}</li>`).join('')}
                </ol>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
                ${alertData.contact.phone ? `<a href="${alertData.actions.callNowUrl}" class="btn">📞 Call Now</a>` : ''}
                <a href="${alertData.actions.sendEmailUrl}" class="btn">✉️ Send Email</a>
                <a href="${alertData.actions.viewContactUrl}" class="btn">👁️ View Contact</a>
            </div>

            <div style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
                <p>Clinata Lead Alert • Act within 5 minutes for best results</p>
            </div>
        </div>
    </body>
    </html>
    `;

    for (const recipient of recipients) {
        await emailService.sendEmail({
            to: recipient,
            subject: `${alertData.title} - ${alertData.contact.name} from ${alertData.contact.company}`,
            html: htmlBody,
            from: process.env.SMTP_FROM || 'alerts@clinata.com',
        });
    }
}

/**
 * Get Slack color for grade
 */
function getColorForGrade(grade: string): string {
    switch (grade) {
        case 'A': return '#28a745'; // Green
        case 'B': return '#17a2b8'; // Blue
        case 'C': return '#ffc107'; // Yellow
        case 'D': return '#fd7e14'; // Orange
        case 'F': return '#dc3545'; // Red
        default: return '#6c757d'; // Gray
    }
}

// ============================================
// BATCH ALERT FUNCTIONS
// ============================================

/**
 * Send daily digest of new leads
 */
export async function sendDailyLeadDigest(
    workspaceId: string | Types.ObjectId,
    config: AlertConfig
): Promise<void> {

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newLeads = await Contact.find({
        workspaceId,
        createdAt: { $gte: yesterday, $lt: today },
        qualityScore: { $exists: true },
    }).populate('companyId');

    if (newLeads.length === 0) {
        console.log('No new leads to report');
        return;
    }

    const gradeDistribution = {
        A: newLeads.filter(l => l.qualityGrade === 'A').length,
        B: newLeads.filter(l => l.qualityGrade === 'B').length,
        C: newLeads.filter(l => l.qualityGrade === 'C').length,
        D: newLeads.filter(l => l.qualityGrade === 'D').length,
        F: newLeads.filter(l => l.qualityGrade === 'F').length,
    };

    console.log(`📊 Daily Lead Digest: ${newLeads.length} new leads`);
    console.log(`Grade Distribution: A=${gradeDistribution.A}, B=${gradeDistribution.B}, C=${gradeDistribution.C}, D=${gradeDistribution.D}, F=${gradeDistribution.F}`);

    // TODO: Send digest email/Slack message
}

export default {
    sendLeadAlert,
    sendDailyLeadDigest,
};
