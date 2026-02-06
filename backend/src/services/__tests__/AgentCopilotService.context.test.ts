import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AgentCopilotService, { clearWorkspaceCache } from '../AgentCopilotService';
import EmailTemplate from '../../models/EmailTemplate';
import IntegrationCredential from '../../models/IntegrationCredential';
import CustomFieldDefinition from '../../models/CustomFieldDefinition';
import Contact from '../../models/Contact';
import mongoose from 'mongoose';

// Mock models
jest.mock('../../models/EmailTemplate');
jest.mock('../../models/IntegrationCredential');
jest.mock('../../models/CustomFieldDefinition');
jest.mock('../../models/Contact');

describe('AgentCopilotService - Workspace Context (Story 4.6)', () => {
  let service: AgentCopilotService;
  const workspaceId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    service = new AgentCopilotService();
    jest.clearAllMocks();
    clearWorkspaceCache(); // Clear cache before each test
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Task 1: Test _loadWorkspaceData includes tags
   */
  describe('_loadWorkspaceData with tags (Task 1)', () => {
    it('should load tags with contact counts sorted by popularity (Task 1.1-1.4)', async () => {
      // Mock templates
      (EmailTemplate.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { name: 'Outbound v2', description: 'Cold outreach' },
          { name: 'Follow-up 1', description: 'First follow-up' }
        ])
      });

      // Mock custom fields
      (CustomFieldDefinition.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { fieldKey: 'leadScore', fieldLabel: 'Lead Score', fieldType: 'string' },
          { fieldKey: 'leadSource', fieldLabel: 'Lead Source', fieldType: 'string' }
        ])
      });

      // Mock integrations
      (IntegrationCredential.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { type: 'gmail', name: 'Gmail' },
          { type: 'linkedin', name: 'LinkedIn' }
        ])
      });

      // Mock Contact.aggregate for tags (Task 1.2-1.3)
      (Contact.aggregate as jest.Mock).mockResolvedValue([
        { _id: 'SaaS', count: 234 },
        { _id: 'CEO', count: 128 },
        { _id: 'Replied', count: 89 },
        { _id: 'Interested', count: 52 }
      ]);

      // Access private method via type assertion (for testing)
      const loadWorkspaceData = (service as any)._loadWorkspaceData.bind(service);
      const result = await loadWorkspaceData(workspaceId);

      // Verify Contact.aggregate was called with correct pipeline
      expect(Contact.aggregate).toHaveBeenCalledWith([
        { $match: { workspace: new mongoose.Types.ObjectId(workspaceId) } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Verify tags are returned in correct format (Task 1.4)
      expect(result.tags).toEqual([
        { tag: 'SaaS', count: 234 },
        { tag: 'CEO', count: 128 },
        { tag: 'Replied', count: 89 },
        { tag: 'Interested', count: 52 }
      ]);

      // Verify existing fields still work
      expect(result.templates).toHaveLength(2);
      expect(result.customFields).toHaveLength(2);
      expect(result.integrations).toHaveLength(2);
    });

    it('should handle empty tags array gracefully (Task 1.6)', async () => {
      // Mock empty results
      (EmailTemplate.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (CustomFieldDefinition.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (IntegrationCredential.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      // Mock empty tags aggregation
      (Contact.aggregate as jest.Mock).mockResolvedValue([]);

      const loadWorkspaceData = (service as any)._loadWorkspaceData.bind(service);
      const result = await loadWorkspaceData(workspaceId);

      // Verify empty tags array is handled
      expect(result.tags).toEqual([]);
      expect(result.templates).toEqual([]);
      expect(result.customFields).toEqual([]);
      expect(result.integrations).toEqual([]);
    });

    it('should limit tags to top 20 by contact count (Task 1.3)', async () => {
      // Mock 25 tags (should be limited to 20)
      const mockTags = Array.from({ length: 25 }, (_, i) => ({
        _id: `Tag${i + 1}`,
        count: 1000 - i * 10 // Descending counts
      }));

      (EmailTemplate.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (CustomFieldDefinition.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (IntegrationCredential.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (Contact.aggregate as jest.Mock).mockResolvedValue(mockTags.slice(0, 20)); // MongoDB handles limit

      const loadWorkspaceData = (service as any)._loadWorkspaceData.bind(service);
      const result = await loadWorkspaceData(workspaceId);

      // Verify $limit: 20 is in aggregation pipeline
      expect(Contact.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $limit: 20 })
        ])
      );

      // Verify only 20 tags returned
      expect(result.tags).toHaveLength(20);
      expect(result.tags[0].tag).toBe('Tag1');
      expect(result.tags[0].count).toBe(1000);
    });
  });

  /**
   * Task 2 & Task 9: Test queryWorkspaceContext method for chat Q&A
   */
  describe('queryWorkspaceContext (Task 2)', () => {
    beforeEach(() => {
      // Mock workspace data for all query tests
      (EmailTemplate.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { name: 'Outbound v2', description: 'Cold outreach for SaaS companies' },
          { name: 'Follow-up 1', description: 'First follow-up after 5 days' },
          { name: 'Demo Request', description: 'Warm lead interested in demo' }
        ])
      });

      (CustomFieldDefinition.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { fieldKey: 'leadScore', fieldLabel: 'Lead Score', fieldType: 'string' },
          { fieldKey: 'leadSource', fieldLabel: 'Lead Source', fieldType: 'string' },
          { fieldKey: 'lastContactedDate', fieldLabel: 'Last Contacted Date', fieldType: 'date' }
        ])
      });

      (IntegrationCredential.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { type: 'gmail', name: 'Gmail' },
          { type: 'linkedin', name: 'LinkedIn' }
        ])
      });

      (Contact.aggregate as jest.Mock).mockResolvedValue([
        { _id: 'SaaS', count: 234 },
        { _id: 'CEO', count: 128 },
        { _id: 'Replied', count: 89 },
        { _id: 'Interested', count: 52 }
      ]);
    });

    it('should return template list when query contains "template" keyword (Task 2.2, Task 9.1, AC1)', async () => {
      const result = await service.queryWorkspaceContext(workspaceId, 'What email templates do I have?');

      expect(result.category).toBe('templates');
      expect(result.data).toHaveLength(3);
      expect(result.formattedText).toContain('You have 3 email templates');
      expect(result.formattedText).toContain('Outbound v2');
      expect(result.formattedText).toContain('Cold outreach for SaaS companies');
    });

    it('should return custom fields list when query contains "field" keyword (Task 2.2, Task 9.2, AC2)', async () => {
      const result = await service.queryWorkspaceContext(workspaceId, 'What custom fields can I use?');

      expect(result.category).toBe('custom_fields');
      expect(result.data).toHaveLength(3);
      expect(result.formattedText).toContain('Your workspace has these custom fields');
      expect(result.formattedText).toContain('leadScore (string)');
      expect(result.formattedText).toContain('Use them in instructions like: @contact.leadScore');
    });

    it('should return integration status when query contains "integration" keyword (Task 2.2, Task 9.3, AC3)', async () => {
      const result = await service.queryWorkspaceContext(workspaceId, 'What integrations are connected?');

      expect(result.category).toBe('integrations');
      expect(result.data).toHaveLength(2);
      expect(result.formattedText).toContain('Connected integrations');
      expect(result.formattedText).toContain('✅ Gmail');
      expect(result.formattedText).toContain('✅ LinkedIn');
    });

    it('should return popular tags when query contains "tag" keyword (Task 2.2, Task 9.4, AC4)', async () => {
      const result = await service.queryWorkspaceContext(workspaceId, 'What tags do I have?');

      expect(result.category).toBe('tags');
      expect(result.data).toHaveLength(4);
      expect(result.formattedText).toContain('Popular tags in your workspace');
      expect(result.formattedText).toContain('SaaS (234 contacts)');
      expect(result.formattedText).toContain('CEO (128 contacts)');
      expect(result.formattedText).toContain('Use in instructions: "Add tag \'Interested\' to contact"');
    });

    it('should return all categories for general query (Task 2.5)', async () => {
      const result = await service.queryWorkspaceContext(workspaceId, 'Show me my workspace setup');

      expect(result.category).toBe('all');
      expect(result.formattedText.toLowerCase()).toContain('templates');
      expect(result.formattedText.toLowerCase()).toContain('custom fields');
      expect(result.formattedText.toLowerCase()).toContain('integrations');
      expect(result.formattedText.toLowerCase()).toContain('tags');
    });

    it('should handle empty workspace gracefully (Task 9.5, AC6)', async () => {
      // Mock empty workspace
      (EmailTemplate.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (CustomFieldDefinition.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (IntegrationCredential.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (Contact.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await service.queryWorkspaceContext(workspaceId, 'What email templates do I have?');

      expect(result.category).toBe('templates');
      expect(result.data).toHaveLength(0);
      expect(result.formattedText).toContain("You don't have any email templates yet");
      expect(result.formattedText).toContain('Create one in Settings > Email Templates first');
    });
  });

  /**
   * Task 4: Test caching functionality
   */
  describe('workspace data caching (Task 4)', () => {
    it('should cache workspace data and use cache on second call (Task 4.3, Task 9.6)', async () => {
      const testWorkspaceId = new mongoose.Types.ObjectId().toString();

      // Setup mocks with spy functions we can track
      const templateFindSpy = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { name: 'Template 1', description: 'Test' }
        ])
      });

      const fieldFindSpy = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const integrationFindSpy = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const aggregateSpy = jest.fn().mockResolvedValue([]);

      (EmailTemplate.find as jest.Mock) = templateFindSpy;
      (CustomFieldDefinition.find as jest.Mock) = fieldFindSpy;
      (IntegrationCredential.find as jest.Mock) = integrationFindSpy;
      (Contact.aggregate as jest.Mock) = aggregateSpy;

      // First call - cache miss
      const loadWorkspaceData = (service as any)._loadWorkspaceData.bind(service);
      const result1 = await loadWorkspaceData(testWorkspaceId);

      expect(templateFindSpy).toHaveBeenCalledTimes(1);
      expect(fieldFindSpy).toHaveBeenCalledTimes(1);
      expect(integrationFindSpy).toHaveBeenCalledTimes(1);
      expect(aggregateSpy).toHaveBeenCalledTimes(1);

      // Second call - cache hit (no new DB queries)
      const result2 = await loadWorkspaceData(testWorkspaceId);

      // DB queries should NOT be called again (still 1 time each)
      expect(templateFindSpy).toHaveBeenCalledTimes(1);
      expect(fieldFindSpy).toHaveBeenCalledTimes(1);
      expect(integrationFindSpy).toHaveBeenCalledTimes(1);
      expect(aggregateSpy).toHaveBeenCalledTimes(1);

      // Results should be identical
      expect(result1).toEqual(result2);
    });

    it('should use different cache keys for different workspaces (Task 4.6)', async () => {
      const workspace1 = new mongoose.Types.ObjectId().toString();
      const workspace2 = new mongoose.Types.ObjectId().toString();

      const templateFindSpy = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      (EmailTemplate.find as jest.Mock) = templateFindSpy;
      (CustomFieldDefinition.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      (IntegrationCredential.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      (Contact.aggregate as jest.Mock) = jest.fn().mockResolvedValue([]);

      const loadWorkspaceData = (service as any)._loadWorkspaceData.bind(service);

      // Load workspace 1 (cache miss)
      await loadWorkspaceData(workspace1);
      expect(templateFindSpy).toHaveBeenCalledTimes(1);

      // Load workspace 2 (cache miss - different workspace)
      await loadWorkspaceData(workspace2);
      expect(templateFindSpy).toHaveBeenCalledTimes(2);

      // Load workspace 1 again (cache hit)
      await loadWorkspaceData(workspace1);
      expect(templateFindSpy).toHaveBeenCalledTimes(2); // Still 2

      // Load workspace 2 again (cache hit)
      await loadWorkspaceData(workspace2);
      expect(templateFindSpy).toHaveBeenCalledTimes(2); // Still 2
    });
  });
});
