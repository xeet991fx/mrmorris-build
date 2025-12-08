/**
 * EnrichmentAgent - Contact Enrichment Agent
 * Wraps Apollo.io integration for automatic contact/company enrichment
 */

import { BaseAgent } from './BaseAgent';
import { AgentTask, AgentResult } from './types';
import { eventBus } from './EventBus';

interface EnrichmentTaskPayload {
    action: 'enrich_contact' | 'enrich_company' | 'bulk_enrich';
    contactId?: string;
    companyId?: string;
    contactIds?: string[];
    email?: string;
    domain?: string;
}

export class EnrichmentAgent extends BaseAgent {
    constructor() {
        super('enrichment', {
            settings: {
                provider: 'apollo',
                autoEnrich: true,
                enrichOnCreate: true,
            },
            limits: {
                maxConcurrentTasks: 5,
                maxRetries: 2,
                timeoutMs: 10000,
            }
        });
    }

    protected async onInitialize(): Promise<void> {
        this.log('Enrichment Agent initialized');

        // Subscribe to contact created events for auto-enrichment
        if (this.config.settings.enrichOnCreate) {
            eventBus.subscribe('contact:created', async (event) => {
                if (this.config.settings.autoEnrich) {
                    await this.handleAutoEnrich(event.payload);
                }
            });
        }
    }

    canHandle(task: AgentTask): boolean {
        return task.type === 'enrichment:task' ||
            task.type.startsWith('enrich') ||
            task.type.startsWith('enrichment:');
    }

    protected async executeTask(task: AgentTask): Promise<AgentResult> {
        const payload = task.payload as EnrichmentTaskPayload;

        switch (payload.action) {
            case 'enrich_contact':
                return this.enrichContact(payload, task.context.workspaceId);

            case 'enrich_company':
                return this.enrichCompany(payload, task.context.workspaceId);

            case 'bulk_enrich':
                return this.bulkEnrich(payload, task.context.workspaceId);

            default:
                return this.error(`Unknown enrichment action: ${payload.action}`);
        }
    }

    private async handleAutoEnrich(contactData: any): Promise<void> {
        if (!contactData.email) return;

        this.log(`Auto-enriching contact: ${contactData.email}`);

        // Would call Apollo API here
        // For now, just log the intent
    }

    private async enrichContact(
        payload: EnrichmentTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { contactId, email } = payload;

        if (!contactId && !email) {
            return this.error('Contact ID or email is required');
        }

        try {
            // Call Apollo API to enrich
            const enrichedData = await this.callApolloEnrich(email || '', 'contact');

            if (!enrichedData) {
                return this.success({
                    enriched: false,
                    message: 'No matching data found',
                });
            }

            // Publish enrichment complete event
            eventBus.publish({
                type: 'contact:updated',
                source: 'enrichment',
                workspaceId,
                payload: {
                    contactId,
                    enrichedFields: Object.keys(enrichedData),
                    source: 'apollo',
                },
            });

            return this.success({
                enriched: true,
                data: enrichedData,
                message: `Contact enriched with ${Object.keys(enrichedData).length} fields`,
            });

        } catch (error: any) {
            this.log('Enrichment error:', error.message);
            return this.error(`Enrichment failed: ${error.message}`);
        }
    }

    private async enrichCompany(
        payload: EnrichmentTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { companyId, domain } = payload;

        if (!companyId && !domain) {
            return this.error('Company ID or domain is required');
        }

        try {
            const enrichedData = await this.callApolloEnrich(domain || '', 'company');

            if (!enrichedData) {
                return this.success({
                    enriched: false,
                    message: 'No matching company data found',
                });
            }

            eventBus.publish({
                type: 'company:updated',
                source: 'enrichment',
                workspaceId,
                payload: {
                    companyId,
                    enrichedFields: Object.keys(enrichedData),
                    source: 'apollo',
                },
            });

            return this.success({
                enriched: true,
                data: enrichedData,
                message: `Company enriched with ${Object.keys(enrichedData).length} fields`,
            });

        } catch (error: any) {
            return this.error(`Company enrichment failed: ${error.message}`);
        }
    }

    private async bulkEnrich(
        payload: EnrichmentTaskPayload,
        workspaceId: string
    ): Promise<AgentResult> {
        const { contactIds } = payload;

        if (!contactIds || contactIds.length === 0) {
            return this.error('Contact IDs are required for bulk enrichment');
        }

        const results = {
            total: contactIds.length,
            enriched: 0,
            failed: 0,
            skipped: 0,
        };

        // Process in batches to respect rate limits
        const batchSize = 10;
        for (let i = 0; i < contactIds.length; i += batchSize) {
            const batch = contactIds.slice(i, i + batchSize);

            await Promise.all(batch.map(async (contactId) => {
                try {
                    const result = await this.enrichContact({
                        action: 'enrich_contact',
                        contactId
                    }, workspaceId);

                    if (result.success && result.data?.enriched) {
                        results.enriched++;
                    } else {
                        results.skipped++;
                    }
                } catch {
                    results.failed++;
                }
            }));

            // Rate limit delay between batches
            if (i + batchSize < contactIds.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return this.success({
            results,
            message: `Bulk enrichment complete: ${results.enriched} enriched, ${results.skipped} skipped, ${results.failed} failed`,
        });
    }

    private async callApolloEnrich(
        identifier: string,
        type: 'contact' | 'company'
    ): Promise<Record<string, any> | null> {
        // This would integrate with the existing Apollo service
        // For now, return mock data structure

        const apiKey = process.env.APOLLO_API_KEY;
        if (!apiKey) {
            throw new Error('Apollo API key not configured');
        }

        // Placeholder - would call actual Apollo API
        // The existing apollo.ts service should be used here
        this.log(`Would enrich ${type} with identifier: ${identifier}`);

        return null; // Return null when no data, return object when enriched
    }
}

export default EnrichmentAgent;
