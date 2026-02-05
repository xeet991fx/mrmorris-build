# Legacy and Archived Features

This directory contains documentation for features that have been **archived or deprecated** in Clianta. These features are no longer active in the application but their documentation is preserved for:

1. **Recovery purposes** - In case we need to restore functionality
2. **Historical reference** - Understanding past architectural decisions
3. **Data preservation** - Database models may still exist for data recovery

## Archived Features

### Agent Builder (Archived: February 4, 2026)

The Agent Builder was a feature that allowed users to create and manage custom AI agents through a web interface.

**Status:** ARCHIVED (Not active in application)

**Documentation:**
- [LEGACY_AGENT_BUILDER.md](./LEGACY_AGENT_BUILDER.md) - Feature overview and what was archived
- [AGENT_BUILDER_RECOVERY.md](./AGENT_BUILDER_RECOVERY.md) - Recovery procedures and database model information

**Database Status:**
The following Mongoose models are preserved in the database for recovery purposes but are **NOT active features**:
- Agent
- AgentExecution
- AgentTestRun
- AgentMemory
- AgentSession
- AgentPerformance
- AgentInsight
- AgentCopilotConversation

**Why Archived:**
- Feature complexity vs. usage
- Maintenance overhead
- Focus on core CRM functionality

## Important Notes

⚠️ **These features are NOT advertised or supported in current Clianta releases.**

⚠️ **Do not reference these features in main documentation or user-facing materials.**

✅ **This documentation exists solely for recovery and historical reference purposes.**

## Active Documentation

For current, active features, please refer to the main [documentation](../) directory.
