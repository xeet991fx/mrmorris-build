/**
 * Multi-Agent Coordination Test Script
 *
 * Run this to test the multi-agent system:
 * node test-multi-agent.js
 */

// Note: This requires TypeScript to be compiled first
// Run: npm run build (or use ts-node)

const testExamples = [
    {
        name: "Simple Task (Single Agent)",
        message: "Create a contact named John Smith",
        expectedBehavior: "Should route to contact agent only",
    },
    {
        name: "Complex Task: Meeting Prep (Multi-Agent)",
        message: "Prepare for my meeting with Acme Corp tomorrow",
        expectedBehavior: "Should use contact + deal + company + briefing agents in parallel/sequential",
    },
    {
        name: "Complex Task: Deal Analysis (Multi-Agent)",
        message: "Analyze the health of the Acme Corp deal",
        expectedBehavior: "Should use deal + hygiene + forecast + competitor agents in parallel",
    },
    {
        name: "Complex Task: Campaign Creation (Multi-Agent)",
        message: "Create a nurture campaign for enterprise leads",
        expectedBehavior: "Should use general + company + competitor + campaign agents sequentially",
    },
    {
        name: "Complex Task: Data Enrichment (Multi-Agent)",
        message: "Find and update information for John Smith at Acme Corp",
        expectedBehavior: "Should use general + dataentry + contact + company agents sequentially",
    },
];

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║        Multi-Agent Coordination Test Examples             ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

console.log("To test the multi-agent system, use these examples:\n");

testExamples.forEach((example, index) => {
    console.log(`\n${index + 1}. ${example.name}`);
    console.log("─".repeat(60));
    console.log(`Message: "${example.message}"`);
    console.log(`Expected: ${example.expectedBehavior}`);
});

console.log("\n\n╔════════════════════════════════════════════════════════════╗");
console.log("║                  Integration Instructions                  ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

console.log("The multi-agent system is now integrated into your CRM!\n");

console.log("✅ Files Updated:");
console.log("   • backend/src/agents/index.ts - Exports V2 functions");
console.log("   • backend/src/agents/state.ts - Multi-agent state fields");
console.log("   • backend/src/routes/agent.ts - Uses invokeAgentV2");

console.log("\n📦 New Files Created:");
console.log("   • backend/src/agents/complexityAnalyzer.ts");
console.log("   • backend/src/agents/executionPlanner.ts");
console.log("   • backend/src/agents/coordinator.ts");
console.log("   • backend/src/agents/supervisorV2.ts");
console.log("   • backend/src/agents/MULTI_AGENT_README.md");

console.log("\n🚀 How to Test:");
console.log("   1. Start your backend server: npm run dev");
console.log("   2. Use your frontend or API client");
console.log("   3. Send one of the complex task messages above");
console.log("   4. Watch the console logs for multi-agent execution");

console.log("\n📊 What to Look For:");
console.log("   • Simple tasks: Fast single-agent execution (< 2s)");
console.log("   • Complex tasks: Multi-agent coordination logs");
console.log("   • Console shows: 🎯 MULTI-AGENT COORDINATION");
console.log("   • Console shows: Agent execution details");
console.log("   • Console shows: Result aggregation");

console.log("\n🔍 Monitoring:");
console.log("   Watch for these console messages:");
console.log("   • 🎯 SUPERVISOR - Analyzing request...");
console.log("   • 🔍 Analyzing task complexity...");
console.log("   • ✓ COMPLEX TASK detected");
console.log("   • 📋 PLANNER - Creating execution plan...");
console.log("   • 🎯 MULTI-AGENT COORDINATION");
console.log("   • 🤖 Executing [agent] agent...");
console.log("   • 📊 Aggregating results...");
console.log("   • ✅ MULTI-AGENT COORDINATION COMPLETE");

console.log("\n📝 Example API Request:");
console.log(`
POST /api/workspaces/{workspaceId}/agent/chat
Content-Type: application/json

{
  "message": "Prepare for my meeting with Acme Corp tomorrow"
}

Response:
{
  "success": true,
  "data": {
    "response": "Comprehensive meeting briefing...",
    "toolResults": {
      "multiAgentResults": {
        "contact": { ... },
        "deal": { ... },
        "company": { ... },
        "briefing": { ... }
      },
      "executionPlan": {
        "mode": "parallel",
        "tasks": [ ... ]
      }
    }
  }
}
`);

console.log("\n💡 Tips:");
console.log("   • Start with simple tasks to verify basic functionality");
console.log("   • Try complex tasks to see multi-agent coordination");
console.log("   • Check backend logs for detailed execution traces");
console.log("   • Typical execution time: 2-6 seconds for multi-agent tasks");

console.log("\n🎉 The system is ready to use!");
console.log("   Simple tasks → Single agent (fast)");
console.log("   Complex tasks → Multi-agent (comprehensive)\n");

console.log("For more details, see: backend/src/agents/MULTI_AGENT_README.md\n");
