/**
 * DataStewardshipAgent - Autonomous Data Quality & Job Change Detection
 * 
 * This agent periodically scans contacts and uses Apollo.io to detect job changes.
 * When a job change is detected, it:
 * 1. Marks the old contact as "Left Company"
 * 2. Creates a new contact at the new company
 * 3. Fires a "contact:job_changed" event for workflow triggers
 */

import { Types } from 'mongoose';
import BaseAgent from './BaseAgent';
import { AgentTask, AgentResult, AgentContext } from './types';
import Contact from '../../models/Contact';
import ApolloService from '../ApolloService';

interface JobChangeData {
    contactId: string;
    oldCompany: string;
    oldJobTitle: string;
    newCompany: string;
    newJobTitle: string;
    newEmail?: string;
}

interface ScanResult {
    scanned: number;
    jobChangesDetected: number;
    errors: number;
    changes: JobChangeData[];
}

export class DataStewardshipAgent extends BaseAgent {
    constructor() {
        super('data_stewardship', {
            settings: {
                scanBatchSize: 50,
                verificationIntervalDays: 30,
            },
            limits: {
                maxConcurrentTasks: 1,
                maxRetries: 3,
                timeoutMs: 300000, // 5 minutes for batch operations
            },
        });
    }

    canHandle(task: AgentTask): boolean {
        return task.type.startsWith('data_stewardship:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        switch (task.type) {
            case 'data_stewardship:scan_workspace':
                return this.scanWorkspaceContacts(task.context.workspaceId);
            case 'data_stewardship:verify_contact':
                return this.verifyContact(task.payload.contactId, task.context.workspaceId);
            case 'data_stewardship:process_job_change':
                return this.processJobChange(task.payload);
            default:
                return this.error(`Unknown task type: ${task.type}`);
        }
    }

    /**
     * Scan all contacts in a workspace for potential job changes
     */
    async scanWorkspaceContacts(workspaceId: string): Promise<AgentResult> {
        const result: ScanResult = {
            scanned: 0,
            jobChangesDetected: 0,
            errors: 0,
            changes: [],
        };

        try {
            // Find contacts that haven't been verified recently
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.settings.verificationIntervalDays);

            const contacts = await Contact.find({
                workspaceId: new Types.ObjectId(workspaceId),
                employmentStatus: { $ne: 'left_company' },
                $or: [
                    { lastVerifiedAt: { $lt: cutoffDate } },
                    { lastVerifiedAt: { $exists: false } },
                ],
            }).limit(this.config.settings.scanBatchSize);

            this.log(`Found ${contacts.length} contacts to verify in workspace ${workspaceId}`);

            for (const contact of contacts) {
                try {
                    const verification = await this.verifyContactEmployment(contact);
                    result.scanned++;

                    if (verification.jobChanged) {
                        result.jobChangesDetected++;
                        result.changes.push(verification.changeData!);

                        // Process the job change
                        await this.handleJobChange(contact, verification.changeData!);
                    } else {
                        // Update lastVerifiedAt
                        await Contact.findByIdAndUpdate(contact._id, {
                            lastVerifiedAt: new Date(),
                        });
                    }
                } catch (err: any) {
                    this.log(`Error verifying contact ${contact._id}: ${err.message}`);
                    result.errors++;
                }
            }

            return this.success(result, {
                data: {
                    message: `Scanned ${result.scanned} contacts, found ${result.jobChangesDetected} job changes`,
                    ...result,
                },
            });
        } catch (err: any) {
            return this.error(`Failed to scan workspace: ${err.message}`);
        }
    }

    /**
     * Verify a single contact's employment status using Apollo
     */
    async verifyContact(contactId: string, workspaceId: string): Promise<AgentResult> {
        try {
            const contact = await Contact.findOne({
                _id: new Types.ObjectId(contactId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!contact) {
                return this.error('Contact not found');
            }

            const verification = await this.verifyContactEmployment(contact);

            if (verification.jobChanged) {
                await this.handleJobChange(contact, verification.changeData!);
            } else {
                await Contact.findByIdAndUpdate(contact._id, {
                    lastVerifiedAt: new Date(),
                });
            }

            return this.success({
                verified: true,
                jobChanged: verification.jobChanged,
                changeData: verification.changeData,
            });
        } catch (err: any) {
            return this.error(`Failed to verify contact: ${err.message}`);
        }
    }

    /**
     * Verify contact employment with Apollo API
     */
    private async verifyContactEmployment(contact: any): Promise<{
        jobChanged: boolean;
        changeData?: JobChangeData;
    }> {
        // Skip if no identifying info
        if (!contact.email && !contact.linkedin && !contact.firstName) {
            return { jobChanged: false };
        }

        // Call Apollo to get current employment info
        const enrichResult = await ApolloService.enrichPerson({
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            linkedinUrl: contact.linkedin || contact.socialProfiles?.linkedin,
            organizationName: contact.company,
        });

        if (!enrichResult.success || !enrichResult.data) {
            return { jobChanged: false };
        }

        const apolloData = enrichResult.data;

        // Compare current company with stored company
        const currentCompany = apolloData.organization?.name || apolloData.company_name;
        const storedCompany = contact.company;

        // Detect job change - company name is different
        if (currentCompany && storedCompany &&
            currentCompany.toLowerCase() !== storedCompany.toLowerCase()) {
            return {
                jobChanged: true,
                changeData: {
                    contactId: contact._id.toString(),
                    oldCompany: storedCompany,
                    oldJobTitle: contact.jobTitle || '',
                    newCompany: currentCompany,
                    newJobTitle: apolloData.title || contact.jobTitle || '',
                    newEmail: apolloData.email,
                },
            };
        }

        return { jobChanged: false };
    }

    /**
     * Handle a detected job change
     */
    private async handleJobChange(oldContact: any, changeData: JobChangeData): Promise<void> {
        this.log(`Job change detected for ${oldContact.firstName} ${oldContact.lastName}`);
        this.log(`  Old: ${changeData.oldJobTitle} at ${changeData.oldCompany}`);
        this.log(`  New: ${changeData.newJobTitle} at ${changeData.newCompany}`);

        // 1. Mark old contact as "Left Company"
        await Contact.findByIdAndUpdate(oldContact._id, {
            employmentStatus: 'left_company',
            previousCompany: changeData.oldCompany,
            previousJobTitle: changeData.oldJobTitle,
            lastVerifiedAt: new Date(),
        });

        // 2. Create new contact at new company
        const newContact = new Contact({
            workspaceId: oldContact.workspaceId,
            userId: oldContact.userId,
            firstName: oldContact.firstName,
            lastName: oldContact.lastName,
            email: changeData.newEmail || oldContact.email,
            company: changeData.newCompany,
            jobTitle: changeData.newJobTitle,
            linkedin: oldContact.linkedin,
            phone: oldContact.phone,
            tags: [...(oldContact.tags || []), 'job-change'],
            source: 'Data Stewardship Agent',
            status: 'lead', // Warm lead - reached out before
            employmentStatus: 'active',
            lastVerifiedAt: new Date(),
            // Link to old contact
            notes: `Previously at ${changeData.oldCompany} as ${changeData.oldJobTitle}. See previous record.`,
        });

        const savedNewContact = await newContact.save() as typeof newContact;

        // 3. Link old contact to new contact
        await Contact.findByIdAndUpdate(oldContact._id, {
            linkedContactId: savedNewContact._id,
        });

        // 4. Emit job change event for workflow triggers
        this.emit('contact:job_changed', {
            oldContactId: oldContact._id.toString(),
            newContactId: (savedNewContact._id as any).toString(),
            workspaceId: oldContact.workspaceId.toString(),
            changeData,
        });

        this.log(`Created new contact ${savedNewContact._id} and linked to old ${oldContact._id}`);
    }

    /**
     * Process a job change (called from workflow or external trigger)
     */
    async processJobChange(payload: JobChangeData): Promise<AgentResult> {
        try {
            const contact = await Contact.findById(payload.contactId);
            if (!contact) {
                return this.error('Contact not found');
            }

            await this.handleJobChange(contact, payload);

            return this.success({
                processed: true,
                changeData: payload,
            });
        } catch (err: any) {
            return this.error(`Failed to process job change: ${err.message}`);
        }
    }
}

export default new DataStewardshipAgent();
