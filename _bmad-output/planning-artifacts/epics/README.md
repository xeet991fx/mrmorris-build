# Epic Breakdown - mrmorris-build (Clianta AI Agent Builder)

This directory contains the complete epic and story breakdown for the mrmorris-build project, decomposed from the PRD and Architecture requirements into implementable stories.

## Overview

The epics have been broken down into separate files for easier navigation and ingestion. Each epic file contains:
- Epic description and user outcome
- Complete user stories with acceptance criteria
- Technical requirements for implementation
- Coverage of functional requirements (FRs)

## Epic List

### [Epic 1: Manual Agent Building](./epic-01-manual-agent-building.md)
Users can create, edit, and manage sales automation agents manually to automate their workflows.

**User Outcome:** Users can define agents with goals, triggers, and instructions without AI assistance.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11

**Stories:** 11 stories covering agent creation, triggers, instructions, restrictions, memory, approvals, editing, duplication, status management, deletion, and listing.

**Implementation Notes:** Agent data models (Agent, AgentConfiguration), backend API routes under `/api/workspaces/:workspaceId/agents`, frontend agent builder UI with form-based configuration, workspace isolation enforced on all queries.

---

### [Epic 2: Safe Agent Testing](./epic-02-safe-agent-testing.md)
Users can validate agents work correctly before going live using Test Mode (dry run).

**User Outcome:** Users can preview exactly what their agent will do without executing real actions.

**FRs Covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41

**Stories:** 7 stories covering test mode, test target selection, step-by-step preview, validation, execution estimates, performance, and test vs live comparison.

**Implementation Notes:** TestModeService (dry-run simulator), step-by-step execution preview UI in right panel, validation engine, contact/deal selector for testing, execution time and AI credit cost estimation.

---

### [Epic 3: Live Agent Execution](./epic-03-live-agent-execution.md)
Users can run agents to automate sales workflows and track execution results in real-time.

**User Outcome:** Users can execute agents automatically and monitor their sales automation activity.

**FRs Covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR34, FR81, FR82, FR83, FR87

**Stories:** 15 stories covering instruction parsing, manual triggers, scheduled triggers, event-based triggers, multi-step workflows, conditional logic, and all 8 core actions (Send Email, LinkedIn Invitation, Web Search, Create Task, Add/Remove Tag, Update Field, Enrich Contact, Wait/Handoff), execution history, logs, and dashboard.

**Implementation Notes:** Agent execution engine with InstructionParserService (Gemini 2.5 Pro + LangChain), BullMQ job scheduling for triggers, 8 core actions implementation, AgentExecution model for logging, Socket.io for real-time status updates, execution dashboard UI.

---

### [Epic 4: AI-Powered Agent Building](./epic-04-ai-powered-agent-building.md)
Users build agents 10x faster with AI Copilot assistance and smart suggestions.

**User Outcome:** Users get intelligent help building agents through conversational AI and predictive suggestions.

**FRs Covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22

**Stories:** Stories covering AI Copilot chat, instruction generation, error analysis, auto-complete, next-step prediction, workspace context, and smart suggestions.

**Implementation Notes:** AgentCopilotService (Gemini 2.5 Pro with streaming via SSE), SmartSuggestionService, AgentCopilotConversation model (7-day TTL), in-builder chat UI, auto-complete and next-step prediction components, workspace context injection.

---

### [Epic 5: External Integrations](./epic-05-external-integrations.md)
Agents can connect to external services (Gmail, LinkedIn, Slack, Apollo.io, Google Calendar, Google Sheets) to perform real actions.

**User Outcome:** Users can automate workflows that interact with external tools their team already uses.

**FRs Covered:** FR42, FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53

**Stories:** Stories covering OAuth authentication, token management, Gmail, LinkedIn, Apollo.io, Slack, Google Calendar, Google Sheets, internal CRM data access, rate limiting, and integration health monitoring.

**Implementation Notes:** OAuth 2.0 flows for each integration, extend existing IntegrationCredential model, rate limiting per integration with circuit breakers, token auto-refresh with 99.9% success rate, integration health monitoring dashboard, quota usage tracking.

---

### [Epic 6: Agent Templates & Quick Start](./epic-06-agent-templates-quick-start.md)
Users can start from pre-built templates for common sales workflows instead of building from scratch.

**User Outcome:** Users can create proven agents instantly and customize them for their needs.

**FRs Covered:** FR64, FR65, FR66, FR67, FR68

**Stories:** Stories covering template library, template browsing, template installation, customization, and template sharing.

**Implementation Notes:** AgentTemplate model, template library UI with browse/search, 10 pre-built templates (Big 4 Outbound Campaign, Deal Stage Progression, Cold Lead Re-engagement, etc.), template installation and customization flow, template sharing within workspace.

---

### [Epic 7: Production Governance & Safety](./epic-07-production-governance-safety.md)
Users have controls, monitoring, and security for safe agent operations at scale.

**User Outcome:** Users can run agents safely with credit tracking, rate limits, permissions, and audit trails.

**FRs Covered:** FR54, FR55, FR56, FR57, FR58, FR59, FR60, FR61, FR62, FR63, FR72, FR73, FR74, FR75, FR76, FR77, FR78, FR79, FR80, FR84, FR85, FR86, FR88, FR89

**Stories:** Stories covering workspace isolation, RBAC (roles & permissions), AI credit system, circuit breakers, rate limiting, security (prompt injection defense), audit logging, credit tracking, and compliance.

**Implementation Notes:** AI credit system (AgentCredit model), circuit breakers (100 executions/day/agent), rate limiting middleware (10 executions/min/agent), RBAC enforcement on all API endpoints, workspace isolation validation in CI/CD, prompt injection defense (system prompt isolation + tool whitelisting), audit logging, credit consumption tracking UI.

---

## File Structure

```
epics/
├── README.md (this file)
├── epic-01-manual-agent-building.md
├── epic-02-safe-agent-testing.md
├── epic-03-live-agent-execution.md
├── epic-04-ai-powered-agent-building.md
├── epic-05-external-integrations.md
├── epic-06-agent-templates-quick-start.md
└── epic-07-production-governance-safety.md
```

## How to Use These Epics

1. **For Development Planning:** Each epic can be implemented independently or in sequence. Epic 1 provides the foundation, Epic 2 enables testing, Epic 3 enables execution, and subsequent epics add advanced features.

2. **For Story Breakdown:** Each story within an epic is sized for single developer completion and includes complete acceptance criteria and technical requirements.

3. **For Sprint Planning:** Stories can be pulled into sprints based on priority. The recommended sequence is Epic 1 → Epic 2 → Epic 3 → Epic 5 → Epic 4 → Epic 6 → Epic 7.

4. **For AI Agent Context:** When working with AI agents (like Claude Code), provide the specific epic file relevant to the work being done to ensure focused context without overwhelming the agent with the entire 55K+ token epic document.

## Epic Dependencies

- **Epic 1** (Manual Agent Building) - No dependencies, foundational
- **Epic 2** (Safe Agent Testing) - Depends on Epic 1
- **Epic 3** (Live Agent Execution) - Depends on Epic 1, enhanced by Epic 2
- **Epic 4** (AI-Powered Agent Building) - Depends on Epic 1, can run parallel to Epic 3
- **Epic 5** (External Integrations) - Depends on Epic 3 (needs execution engine)
- **Epic 6** (Agent Templates) - Depends on Epic 1, enhanced by Epic 4
- **Epic 7** (Production Governance) - Depends on Epic 3, can be implemented incrementally

## Total Story Count

- Epic 1: 11 stories
- Epic 2: 7 stories
- Epic 3: 15 stories
- Epic 4: ~11 stories
- Epic 5: ~12 stories
- Epic 6: ~5 stories
- Epic 7: ~15 stories

**Total: ~76 stories**

## Next Steps

1. Review each epic file for implementation details
2. Prioritize epics based on business value and dependencies
3. Break epics into sprint-sized chunks
4. Begin implementation with Epic 1: Manual Agent Building
