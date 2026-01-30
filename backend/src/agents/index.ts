/**
 * Agents Module - Main Export
 *
 * This module provides the LangGraph-based multi-agent CRM system.
 */

// Multi-agent coordination system (V2)
export { invokeAgentV2, agentGraphV2 } from "./supervisorV2";

// State management
export { AgentState, AgentStateType, createInitialState } from "./state";

// Tools and workers
export { contactTools } from "./tools";
export { contactAgentNode } from "./workers";

// Multi-agent coordination utilities
export { analyzeTaskComplexity } from "./complexityAnalyzer";
export { createExecutionPlan, optimizeExecutionPlan, getExecutionOrder } from "./executionPlanner";
export { executeMultiAgentPlan } from "./coordinator";
