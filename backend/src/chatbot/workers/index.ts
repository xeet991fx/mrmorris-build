/**
 * Worker Agents Index
 * 
 * Exports all worker agent nodes for use in the supervisor graph.
 */

// Contact management
export { contactAgentNode } from "./contactAgent";

// Email drafting and templates
export { emailAgentNode } from "./emailAgent";

// Deal/Opportunity management
export { dealAgentNode } from "./dealAgent";

// Workflow automation
export { workflowAgentNode } from "./workflowAgent";

// Task management
export { taskAgentNode } from "./taskAgent";

// Company/Account management
export { companyAgentNode } from "./companyAgent";

// Email campaigns
export { campaignAgentNode } from "./campaignAgent";

// Pipeline management and analytics
export { pipelineAgentNode } from "./pipelineAgent";

// Support tickets
export { ticketAgentNode } from "./ticketAgent";

// Email sequences
export { sequenceAgentNode } from "./sequenceAgent";

// Lead scoring
export { leadScoreAgentNode } from "./leadScoreAgent";

// Reports and analytics
export { reportsAgentNode } from "./reportsAgent";

// ============================================
// NEW AI AGENTS - Sales Automation Suite
// ============================================

// Pipeline hygiene - stale deals, stage suggestions
export { hygieneAgentNode } from "./hygieneAgent";

// Meeting preparation - briefings, talking points
export { briefingAgentNode } from "./briefingAgent";

// Revenue forecasting - predictions, trends, risks
export { forecastAgentNode } from "./forecastAgent";

// Call transcription - summaries, BANT extraction
export { transcriptionAgentNode } from "./transcriptionAgent";

// Proposal generation - documents, pricing
export { proposalAgentNode } from "./proposalAgent";

// Competitive intelligence - battlecards, mentions
export { competitorAgentNode } from "./competitorAgent";

// Data entry automation - deduplication, parsing
export { dataEntryAgentNode } from "./dataEntryAgent";

// Scheduling coordination - calendar, meetings
export { schedulingAgentNode } from "./schedulingAgent";

// General questions and web search
export { generalAgentNode } from "./generalAgent";

// Landing page creation and management
export { landingPageAgentNode } from "./landingPageAgent";

// ============================================
// DYNAMIC AGENT - Self-Healing Fallback
// ============================================

// Dynamic agent - handles ANY request by discovering tools on-the-fly
export { dynamicAgentNode } from "./dynamicAgent";
