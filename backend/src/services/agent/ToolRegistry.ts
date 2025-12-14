import { BaseCRMTool } from "./tools/base/BaseTool";

// Contact Tools
import { SearchContactsTool } from "./tools/contacts/SearchContactsTool";
import { CreateContactTool } from "./tools/contacts/CreateContactTool";
import { UpdateContactTool } from "./tools/contacts/UpdateContactTool";
import { GetContactTool } from "./tools/contacts/GetContactTool";
import { DeleteContactTool } from "./tools/contacts/DeleteContactTool";
import { BulkImportContactsTool } from "./tools/contacts/BulkImportContactsTool";
import { EnrichContactTool } from "./tools/contacts/EnrichContactTool";
import { ScoreContactTool } from "./tools/contacts/ScoreContactTool";


// Company Tools
import { SearchCompaniesTool } from "./tools/companies/SearchCompaniesTool";
import { CreateCompanyTool } from "./tools/companies/CreateCompanyTool";
import { UpdateCompanyTool } from "./tools/companies/UpdateCompanyTool";
import { GetCompanyTool } from "./tools/companies/GetCompanyTool";
import { DeleteCompanyTool } from "./tools/companies/DeleteCompanyTool";
import { EnrichCompanyTool } from "./tools/companies/EnrichCompanyTool";

// Opportunity Tools
import { SearchOpportunitiesTool } from "./tools/opportunities/SearchOpportunitiesTool";
import { CreateOpportunityTool } from "./tools/opportunities/CreateOpportunityTool";
import { UpdateOpportunityTool } from "./tools/opportunities/UpdateOpportunityTool";
import { MoveOpportunityStageTool } from "./tools/opportunities/MoveOpportunityStageTool";
import { GetHotDealsTool } from "./tools/opportunities/GetHotDealsTool";
import { GetClosingSoonTool } from "./tools/opportunities/GetClosingSoonTool";
import { CalculateDealScoreTool } from "./tools/opportunities/CalculateDealScoreTool";
import { GetOpportunityTool } from "./tools/opportunities/GetOpportunityTool";
import { DeleteOpportunityTool } from "./tools/opportunities/DeleteOpportunityTool";
import { WinLoseOpportunityTool } from "./tools/opportunities/WinLoseOpportunityTool";

// Pipeline Tools
import { ListPipelinesTool } from "./tools/pipelines/ListPipelinesTool";
import { GetPipelineStatsTool } from "./tools/pipelines/GetPipelineStatsTool";
import { CreatePipelineTool } from "./tools/pipelines/CreatePipelineTool";

// Sequence Tools
import { ListSequencesTool } from "./tools/sequences/ListSequencesTool";
import { CreateSequenceTool } from "./tools/sequences/CreateSequenceTool";
import { EnrollInSequenceTool } from "./tools/sequences/EnrollInSequenceTool";
import { PauseSequenceEnrollmentTool } from "./tools/sequences/PauseSequenceEnrollmentTool";
import { GetSequenceStatsTool } from "./tools/sequences/GetSequenceStatsTool";

// Campaign Tools
import { ListCampaignsTool } from "./tools/campaigns/ListCampaignsTool";
import { GetCampaignTool } from "./tools/campaigns/GetCampaignTool";
import { CreateCampaignTool } from "./tools/campaigns/CreateCampaignTool";
import { UpdateCampaignTool } from "./tools/campaigns/UpdateCampaignTool";
import { StartCampaignTool } from "./tools/campaigns/StartCampaignTool";
import { PauseCampaignTool } from "./tools/campaigns/PauseCampaignTool";

// Workflow Tools
import { ListWorkflowsTool } from "./tools/workflows/ListWorkflowsTool";

// Analytics Tools
import { GetDashboardMetricsTool } from "./tools/analytics/GetDashboardMetricsTool";
import { GetPipelineAnalyticsTool } from "./tools/analytics/GetPipelineAnalyticsTool";
import { GetContactEngagementTool } from "./tools/analytics/GetContactEngagementTool";
import { GetCampaignPerformanceTool } from "./tools/analytics/GetCampaignPerformanceTool";
import { GenerateReportTool } from "./tools/analytics/GenerateReportTool";

// Activity Tools
import { LogActivityTool } from "./tools/activities/LogActivityTool";
import { GetActivitiesTool } from "./tools/activities/GetActivitiesTool";
import { GetUpcomingTasksTool } from "./tools/activities/GetUpcomingTasksTool";

// Email Tools
import { SendEmailTool } from "./tools/email/SendEmailTool";

// Web Search & Business Intelligence Tools
import { WebSearchTool } from "./tools/web-search/WebSearchTool";
import { AnalyzeBusinessTool } from "./tools/web-search/AnalyzeBusinessTool";
import { CreateAutomationTool } from "./tools/web-search/CreateAutomationTool";

export class ToolRegistry {
  private tools: Map<string, BaseCRMTool>;

  constructor(
    private workspaceId: string,
    private userId: string
  ) {
    this.tools = new Map();
    this.registerTools();
  }

  private registerTools() {
    // Contact Tools
    this.register(new SearchContactsTool(this.workspaceId, this.userId));
    this.register(new CreateContactTool(this.workspaceId, this.userId));
    this.register(new UpdateContactTool(this.workspaceId, this.userId));
    this.register(new GetContactTool(this.workspaceId, this.userId));
    this.register(new DeleteContactTool(this.workspaceId, this.userId));
    this.register(new BulkImportContactsTool(this.workspaceId, this.userId));
    this.register(new EnrichContactTool(this.workspaceId, this.userId));
    this.register(new ScoreContactTool(this.workspaceId, this.userId));

    // Company Tools
    this.register(new SearchCompaniesTool(this.workspaceId, this.userId));
    this.register(new CreateCompanyTool(this.workspaceId, this.userId));
    this.register(new UpdateCompanyTool(this.workspaceId, this.userId));
    this.register(new GetCompanyTool(this.workspaceId, this.userId));
    this.register(new DeleteCompanyTool(this.workspaceId, this.userId));
    this.register(new EnrichCompanyTool(this.workspaceId, this.userId));

    // Opportunity Tools
    this.register(new SearchOpportunitiesTool(this.workspaceId, this.userId));
    this.register(new CreateOpportunityTool(this.workspaceId, this.userId));
    this.register(new UpdateOpportunityTool(this.workspaceId, this.userId));
    this.register(new MoveOpportunityStageTool(this.workspaceId, this.userId));
    this.register(new GetHotDealsTool(this.workspaceId, this.userId));
    this.register(new GetClosingSoonTool(this.workspaceId, this.userId));
    this.register(new CalculateDealScoreTool(this.workspaceId, this.userId));
    this.register(new GetOpportunityTool(this.workspaceId, this.userId));
    this.register(new DeleteOpportunityTool(this.workspaceId, this.userId));
    this.register(new WinLoseOpportunityTool(this.workspaceId, this.userId));

    // Pipeline Tools
    this.register(new ListPipelinesTool(this.workspaceId, this.userId));
    this.register(new GetPipelineStatsTool(this.workspaceId, this.userId));
    this.register(new CreatePipelineTool(this.workspaceId, this.userId));

    // Sequence Tools
    this.register(new ListSequencesTool(this.workspaceId, this.userId));
    this.register(new CreateSequenceTool(this.workspaceId, this.userId));
    this.register(new EnrollInSequenceTool(this.workspaceId, this.userId));
    this.register(new PauseSequenceEnrollmentTool(this.workspaceId, this.userId));
    this.register(new GetSequenceStatsTool(this.workspaceId, this.userId));

    // Campaign Tools
    this.register(new ListCampaignsTool(this.workspaceId, this.userId));
    this.register(new GetCampaignTool(this.workspaceId, this.userId));
    this.register(new CreateCampaignTool(this.workspaceId, this.userId));
    this.register(new UpdateCampaignTool(this.workspaceId, this.userId));
    this.register(new StartCampaignTool(this.workspaceId, this.userId));
    this.register(new PauseCampaignTool(this.workspaceId, this.userId));

    // Workflow Tools
    this.register(new ListWorkflowsTool(this.workspaceId, this.userId));

    // Analytics Tools
    this.register(new GetDashboardMetricsTool(this.workspaceId, this.userId));
    this.register(new GetPipelineAnalyticsTool(this.workspaceId, this.userId));
    this.register(new GetContactEngagementTool(this.workspaceId, this.userId));
    this.register(new GetCampaignPerformanceTool(this.workspaceId, this.userId));
    this.register(new GenerateReportTool(this.workspaceId, this.userId));

    // Activity Tools
    this.register(new LogActivityTool(this.workspaceId, this.userId));
    this.register(new GetActivitiesTool(this.workspaceId, this.userId));
    this.register(new GetUpcomingTasksTool(this.workspaceId, this.userId));

    // Email Tools
    this.register(new SendEmailTool(this.workspaceId, this.userId));

    // Web Search & Business Intelligence Tools
    try {
      this.register(new WebSearchTool(this.workspaceId, this.userId));
    } catch (error) {
      console.warn("WebSearchTool not available:", error);
    }
    this.register(new AnalyzeBusinessTool(this.workspaceId, this.userId));
    this.register(new CreateAutomationTool(this.workspaceId, this.userId));
  }

  private register(tool: BaseCRMTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): BaseCRMTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): BaseCRMTool[] {
    return Array.from(this.tools.values());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getToolCount(): number {
    return this.tools.size;
  }
}
