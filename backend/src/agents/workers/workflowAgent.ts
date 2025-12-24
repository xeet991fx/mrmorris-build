/**
 * Workflow Worker Agent
 * 
 * Handles workflow automation: create workflows with steps, enroll contacts, manage automations.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Workflow from "../../models/Workflow";
import WorkflowEnrollment from "../../models/WorkflowEnrollment";
import Contact from "../../models/Contact";
import { v4 as uuidv4 } from "uuid";
import { createSafeRegex } from "../utils/escapeRegex";
import { parseToolCall } from "../utils/parseToolCall";

/**
 * Execute workflow tools
 */
async function executeWorkflowTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_welcome_workflow": {
            // Create a complete welcome workflow with trigger, delay, and email steps
            const { name, emailSubject, emailBody, delayDays } = args;

            const triggerId = uuidv4();
            const delayId = uuidv4();
            const emailId = uuidv4();

            const workflow = await Workflow.create({
                workspaceId,
                userId,
                name: name || "Welcome New Leads",
                description: "Automatically welcome new contacts with a delayed email",
                triggerEntityType: "contact",
                status: "draft",
                steps: [
                    {
                        id: triggerId,
                        type: "trigger",
                        name: "When Contact Created",
                        config: { triggerType: "contact_created" },
                        position: { x: 0, y: 0 },
                        nextStepIds: [delayId],
                    },
                    {
                        id: delayId,
                        type: "delay",
                        name: `Wait ${delayDays || 1} day(s)`,
                        config: {
                            delayType: "duration",
                            delayValue: delayDays || 1,
                            delayUnit: "days",
                        },
                        position: { x: 0, y: 100 },
                        nextStepIds: [emailId],
                    },
                    {
                        id: emailId,
                        type: "action",
                        name: "Send Welcome Email",
                        config: {
                            actionType: "send_email",
                            emailSubject: emailSubject || "Welcome to our company!",
                            emailBody: emailBody || "Hi {{firstName}},\n\nThank you for connecting with us!\n\nBest regards",
                        },
                        position: { x: 0, y: 200 },
                        nextStepIds: [],
                    },
                ],
            });

            return {
                success: true,
                workflowId: workflow._id.toString(),
                message: `Created workflow "${workflow.name}" as DRAFT with 3 steps: Trigger → Wait ${delayDays || 1} day(s) → Send Email. Activate it when ready.`,
            };
        }

        case "create_follow_up_workflow": {
            // Create a follow-up workflow for deals
            const { name, taskTitle, delayDays } = args;

            const triggerId = uuidv4();
            const delayId = uuidv4();
            const taskId = uuidv4();

            const workflow = await Workflow.create({
                workspaceId,
                userId,
                name: name || "Deal Follow-Up",
                description: "Create follow-up tasks for new deals",
                triggerEntityType: "deal",
                status: "draft",
                steps: [
                    {
                        id: triggerId,
                        type: "trigger",
                        name: "When Deal Created",
                        config: { triggerType: "deal_created" },
                        position: { x: 0, y: 0 },
                        nextStepIds: [delayId],
                    },
                    {
                        id: delayId,
                        type: "delay",
                        name: `Wait ${delayDays || 3} day(s)`,
                        config: {
                            delayType: "duration",
                            delayValue: delayDays || 3,
                            delayUnit: "days",
                        },
                        position: { x: 0, y: 100 },
                        nextStepIds: [taskId],
                    },
                    {
                        id: taskId,
                        type: "action",
                        name: "Create Follow-Up Task",
                        config: {
                            actionType: "create_task",
                            taskTitle: taskTitle || "Follow up on deal",
                            taskDescription: "Review deal progress and reach out to contact",
                            taskDueInDays: 1,
                        },
                        position: { x: 0, y: 200 },
                        nextStepIds: [],
                    },
                ],
            });

            return {
                success: true,
                workflowId: workflow._id.toString(),
                message: `Created workflow "${workflow.name}" as DRAFT with 3 steps: Deal Created → Wait → Create Task. Use activate_workflow to activate it.`,
            };
        }

        case "create_custom_workflow": {
            // Dynamic workflow creation - allows ANY number and type of steps
            const { name, description, triggerType, triggerEntityType, steps } = args;

            if (!steps || !Array.isArray(steps) || steps.length === 0) {
                return { success: false, error: "Steps array is required and must not be empty" };
            }

            // Build workflow steps with IDs and connections
            const workflowSteps: any[] = [];
            const stepIds: string[] = [];

            // Create all step IDs first
            for (let i = 0; i < steps.length; i++) {
                stepIds.push(uuidv4());
            }

            // Build each step
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const stepId = stepIds[i];
                const nextStepIds = i < steps.length - 1 ? [stepIds[i + 1]] : [];

                let workflowStep: any = {
                    id: stepId,
                    type: step.type,
                    name: step.name,
                    position: { x: 0, y: i * 100 },
                    nextStepIds: nextStepIds,
                };

                // Add config based on step type
                if (step.type === "trigger") {
                    workflowStep.config = {
                        triggerType: step.triggerType || triggerType || "contact_created",
                    };
                } else if (step.type === "delay") {
                    workflowStep.config = {
                        delayType: "duration",
                        delayValue: step.delayValue || 1,
                        delayUnit: step.delayUnit || "days",
                    };
                } else if (step.type === "action") {
                    if (step.actionType === "send_email") {
                        workflowStep.config = {
                            actionType: "send_email",
                            emailSubject: step.emailSubject || "Email from workflow",
                            emailBody: step.emailBody || "Hi {{firstName}},\n\nThis is an automated message.\n\nBest regards",
                        };
                    } else if (step.actionType === "create_task") {
                        workflowStep.config = {
                            actionType: "create_task",
                            taskTitle: step.taskTitle || "Follow up",
                            taskDescription: step.taskDescription || "Complete this task",
                            taskDueInDays: step.taskDueInDays || 1,
                        };
                    } else {
                        workflowStep.config = {
                            actionType: step.actionType,
                            ...step.config,
                        };
                    }
                } else if (step.type === "condition") {
                    workflowStep.config = {
                        conditionType: step.conditionType || "field_equals",
                        field: step.field,
                        operator: step.operator || "equals",
                        value: step.value,
                    };
                    // Conditions can have multiple next steps (if/else branches)
                    if (step.nextStepIds) {
                        workflowStep.nextStepIds = step.nextStepIds;
                    }
                }

                workflowSteps.push(workflowStep);
            }

            const workflow = await Workflow.create({
                workspaceId,
                userId,
                name: name || "Custom Workflow",
                description: description || "Automated workflow",
                triggerEntityType: triggerEntityType || "contact",
                status: "draft",
                steps: workflowSteps,
            });

            return {
                success: true,
                workflowId: workflow._id.toString(),
                message: `Created custom workflow "${workflow.name}" as DRAFT with ${workflowSteps.length} steps. Use activate_workflow to activate it.`,
                stepCount: workflowSteps.length,
            };
        }

        case "add_email_step": {
            const { workflowName, subject, body, delayDays } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOne({ workspaceId, name: workflowRegex });

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            const lastStep = workflow.steps[workflow.steps.length - 1];
            const newStepId = uuidv4();

            // Add delay if specified
            if (delayDays && delayDays > 0) {
                const delayId = uuidv4();
                workflow.steps.push({
                    id: delayId,
                    type: "delay",
                    name: `Wait ${delayDays} day(s)`,
                    config: { delayType: "duration", delayValue: delayDays, delayUnit: "days" },
                    position: { x: 0, y: (workflow.steps.length) * 100 },
                    nextStepIds: [newStepId],
                } as any);
                if (lastStep) lastStep.nextStepIds = [delayId];
            } else if (lastStep) {
                lastStep.nextStepIds = [newStepId];
            }

            workflow.steps.push({
                id: newStepId,
                type: "action",
                name: "Send Email",
                config: {
                    actionType: "send_email",
                    emailSubject: subject || "Following up",
                    emailBody: body || "Hi,\n\nJust wanted to follow up.\n\nBest regards",
                },
                position: { x: 0, y: (workflow.steps.length) * 100 },
                nextStepIds: [],
            } as any);

            await workflow.save();

            return {
                success: true,
                message: `Added email step to workflow "${workflow.name}". Now has ${workflow.steps.length} steps.`,
            };
        }

        case "activate_workflow": {
            const { workflowName } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOneAndUpdate(
                { workspaceId, name: workflowRegex },
                { status: "active", lastActivatedAt: new Date() },
                { new: true }
            );

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            return {
                success: true,
                message: `Workflow "${workflow.name}" is now active! It has ${workflow.steps.length} steps.`,
            };
        }

        case "list_workflows": {
            const { status } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;

            const workflows = await Workflow.find(filter)
                .select("name description status steps")
                .limit(20)
                .lean();

            return {
                success: true,
                count: workflows.length,
                workflows: workflows.map((w: any) => ({
                    id: w._id.toString(),
                    name: w.name,
                    status: w.status,
                    stepCount: w.steps?.length || 0,
                })),
            };
        }

        case "enroll_contact": {
            const { contactName, workflowName } = args;

            const searchRegex = createSafeRegex(contactName);
            const contact = await Contact.findOne({
                workspaceId,
                $or: [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }],
            });

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOne({ workspaceId, name: workflowRegex, status: "active" });

            if (!workflow) {
                return { success: false, error: `Active workflow "${workflowName}" not found` };
            }

            const existing = await WorkflowEnrollment.findOne({
                workflowId: workflow._id,
                contactId: contact._id,
                status: { $in: ["active", "paused"] },
            });

            if (existing) {
                return { success: false, error: `${contact.firstName} is already enrolled` };
            }

            await WorkflowEnrollment.create({
                workspaceId,
                workflowId: workflow._id,
                contactId: contact._id,
                status: "active",
                currentStepIndex: 0,
                enrolledAt: new Date(),
            });

            return {
                success: true,
                message: `${contact.firstName} ${contact.lastName} enrolled in "${workflow.name}"`,
            };
        }

        case "update_delay": {
            const { workflowName, stepName, stepIndex, newDelay, newUnit } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOne({ workspaceId, name: workflowRegex });

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            let delayStep = null;

            // Method 1: Find by step index (e.g., "2nd delay" = stepIndex: 2)
            if (stepIndex !== undefined && stepIndex !== null) {
                const delaySteps = workflow.steps.filter((s: any) => s.type === "delay");
                if (stepIndex > 0 && stepIndex <= delaySteps.length) {
                    delayStep = delaySteps[stepIndex - 1]; // Convert to 0-based index
                } else {
                    return { success: false, error: `Workflow "${workflow.name}" only has ${delaySteps.length} delay step(s), cannot access delay #${stepIndex}` };
                }
            }
            // Method 2: Find by step name
            else if (stepName) {
                const stepRegex = createSafeRegex(stepName);
                delayStep = workflow.steps.find((s: any) =>
                    s.type === "delay" && stepRegex.test(s.name)
                );
            }
            // Method 3: Find the first delay step
            else {
                delayStep = workflow.steps.find((s: any) => s.type === "delay");
            }

            if (!delayStep) {
                return { success: false, error: `No matching delay step found in workflow "${workflow.name}"` };
            }

            // Update delay configuration
            delayStep.config.delayValue = newDelay || delayStep.config.delayValue;
            delayStep.config.delayUnit = newUnit || delayStep.config.delayUnit;
            delayStep.name = `Wait ${delayStep.config.delayValue} ${delayStep.config.delayUnit}`;

            await workflow.save();

            const which = stepIndex ? `delay #${stepIndex}` : (stepName ? `"${stepName}"` : "delay");
            return {
                success: true,
                message: `Updated ${which} to ${delayStep.config.delayValue} ${delayStep.config.delayUnit} in workflow "${workflow.name}"`,
            };
        }

        case "pause_workflow": {
            const { workflowName } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOneAndUpdate(
                { workspaceId, name: workflowRegex },
                { status: "paused" },
                { new: true }
            );

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            return {
                success: true,
                message: `Workflow "${workflow.name}" has been paused`,
            };
        }

        case "delete_workflow": {
            const { workflowName } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOneAndDelete({ workspaceId, name: workflowRegex });

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            // Also delete any enrollments
            await WorkflowEnrollment.deleteMany({ workflowId: workflow._id });

            return {
                success: true,
                message: `Deleted workflow "${workflow.name}" and all its enrollments`,
            };
        }

        case "get_workflow_details": {
            const { workflowName } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOne({ workspaceId, name: workflowRegex });

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            const steps = workflow.steps.map((s: any, i: number) => {
                let desc = `${i + 1}. ${s.name} (${s.type})`;
                if (s.type === "delay" && s.config) {
                    desc += ` - ${s.config.delayValue} ${s.config.delayUnit}`;
                }
                if (s.type === "action" && s.config?.actionType) {
                    desc += ` - ${s.config.actionType}`;
                }
                return desc;
            });

            return {
                success: true,
                workflow: {
                    id: workflow._id.toString(),
                    name: workflow.name,
                    status: workflow.status,
                    stepCount: workflow.steps.length,
                    steps: steps,
                },
            };
        }

        case "bulk_delete_workflows": {
            const { status, olderThanDays } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (olderThanDays) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                filter.createdAt = { $lt: cutoffDate };
            }

            // Safety: require at least one filter
            if (!status && !olderThanDays) {
                return { success: false, error: "Please specify status or olderThanDays to bulk delete" };
            }

            // Get workflow IDs to delete enrollments
            const workflows = await Workflow.find(filter).select("_id").lean();
            const workflowIds = workflows.map((w: any) => w._id);

            // Delete enrollments first
            await WorkflowEnrollment.deleteMany({ workflowId: { $in: workflowIds } });

            // Delete workflows
            const result = await Workflow.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} workflow(s) and their enrollments 🗑️`,
                deletedCount: result.deletedCount,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Workflow Agent Node
 */
export async function workflowAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("⚡ Workflow Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // PHASE 1: AUTONOMOUS ANALYSIS - Gather context from CRM
        console.log("🧠 Phase 1: Analyzing CRM context...");

        // Get existing workflows to understand patterns and avoid duplication
        const existingWorkflows = await Workflow.find({ workspaceId: state.workspaceId })
            .select("name description steps status createdAt")
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(10)
            .lean();

        // Helper function for time ago
        const getTimeAgo = (date: any): string => {
            if (!date) return "unknown";
            const now = new Date();
            const diffMs = now.getTime() - new Date(date).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            if (diffMins < 1) return "just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return `${Math.floor(diffDays / 7)}w ago`;
        };

        const workflowContext = existingWorkflows.length > 0
            ? `EXISTING WORKFLOWS IN CRM (sorted NEWEST first):\n${existingWorkflows.map((w: any, index: number) => {
                const timeAgo = getTimeAgo(w.createdAt);
                const isNewest = index === 0 ? " 🆕 LATEST/NEWEST/MOST RECENT" : "";
                return `${index + 1}. "${w.name}" (${w.status}) - ${w.steps?.length || 0} steps - Created ${timeAgo}${isNewest}\n   Description: ${w.description || 'None'}`;
            }).join('\n')}`
            : "No existing workflows found. This will be the first workflow.";

        // Get sample contacts to understand the data structure
        const sampleContacts = await Contact.find({ workspaceId: state.workspaceId })
            .select("firstName lastName email company tags")
            .limit(3)
            .lean();

        const contactContext = sampleContacts.length > 0
            ? `SAMPLE CONTACTS (for personalization):\n${sampleContacts.map((c: any) =>
                `• ${c.firstName} ${c.lastName} (${c.email}) at ${c.company || 'Unknown'}`
            ).join('\n')}`
            : "No contacts found yet.";

        console.log("✓ Context gathered. Moving to reasoning phase...");

        // PHASE 2: INTELLIGENT REASONING - Let AI think before acting
        const systemPrompt = `You are an ELITE CRM Workflow Automation Specialist powered by Gemini 2.5 Pro.

🎯 AUTONOMOUS MODE: You have access to REAL CRM data and will make INTELLIGENT, DATA-DRIVEN decisions.

📊 CURRENT CRM CONTEXT:
${workflowContext}

${contactContext}

USER REQUEST: "${userRequest}"

🧠 YOUR AUTONOMOUS PROCESS:

STEP 1: CRITICAL INTENT ANALYSIS
🚨 FIRST, determine: Is this CREATE, MODIFY, DELETE, or LIST request?

DELETE SIGNALS (use delete tools, NOT create!):
- "delete", "remove", "get rid of"
- "delete the latest workflow" → DELETE_WORKFLOW tool (find NEWEST workflow marked with 🆕)
- "remove the workflow" → DELETE_WORKFLOW tool
- CRITICAL: Look at workflow list above - #1 is ALWAYS the newest/latest!

MODIFY SIGNALS (use update tools, NOT create):
- "change", "update", "modify", "edit", "adjust", "fix"
- "change the 2nd delay to 10 days" → UPDATE_DELAY tool
- "update the email in step 3" → UPDATE existing workflow
- "make the delay longer" → UPDATE_DELAY tool

CREATE SIGNALS (use create tools):
- "create", "build", "make a new", "design"
- "create a workflow for cold leads" → CREATE new workflow
- "build a nurture sequence" → CREATE new workflow

LIST SIGNALS (use list tool):
- "show", "list", "what workflows", "which workflows"

🎯 IF DELETING:
1. Which workflow? Look at EXISTING WORKFLOWS above
2. "latest/newest/most recent" = #1 in the list (marked with 🆕)
3. Use: {"tool": "delete_workflow", "args": {"workflowName": "exact name from list"}}

🎯 IF MODIFYING:
1. Which workflow? (exact name from EXISTING WORKFLOWS above)
2. What to change? (delay timing, email content, step order?)
3. Use correct tool: update_delay, add_email_step, etc.

🎯 IF CREATING:
1. What's the purpose/goal?
2. Design the optimal flow
3. Use create_custom_workflow

STEP 2: DEEP CONTEXT ANALYSIS
- What is the user REALLY trying to achieve? (business outcome, not just task)
- Look at existing workflows - any patterns? Duplicates? Gaps?
- If modifying: Understand the CURRENT state before changing
- What's the best timing strategy based on the type of workflow?
- What personalization can we add based on the contact data?

STEP 3: INTELLIGENT DESIGN/MODIFICATION
- Don't just create a generic template - design something SPECIFIC and SMART
- Use REAL contact data structure (firstName, lastName, email, company) in email templates
- Consider the customer journey - what sequence makes sense?
- Think about timing: Too fast = annoying, Too slow = they forget
- Add value in EVERY step - no filler content

STEP 3: CONTEXTUAL SUGGESTIONS
- If similar workflows exist, improve on them (don't duplicate)
- Suggest specific email subjects based on the workflow purpose
- Create task descriptions that are actionable, not vague
- Use delays that match business reality (not just "wait 1 day")

🎨 CREATIVE INTELLIGENCE:
You are NOT a template machine. You are an automation expert who:
- Designs workflows that feel natural and helpful
- Writes email copy that's engaging, not robotic
- Creates tasks that are specific and actionable
- Times interactions strategically

💡 EXAMPLE OF AUTONOMOUS THINKING:

BAD (Placeholder/Generic):
- Email: "Welcome to our company!"
- Task: "Follow up"
- Delay: "Wait 1 day"

GOOD (Intelligent/Contextual):
- Email: "Welcome aboard, {{firstName}}! Here's what to expect in your first week"
- Task: "Schedule discovery call with {{firstName}} {{lastName}} at {{company}} - discuss their goals for Q1"
- Delay: "Wait 3 business days (optimal for B2B follow-up without being pushy)"

🔧 AVAILABLE TOOLS:

1. **create_custom_workflow** - THE POWER TOOL 🚀
   Use this for ANY custom workflow request. You can create workflows with ANY number of steps!
   Args: {
     name: string,
     description: string,
     triggerType: "contact_created" | "deal_created" | "deal_stage_changed" | "manual",
     triggerEntityType: "contact" | "deal" | "company",
     steps: [
       {
         type: "trigger" | "delay" | "action" | "condition",
         name: string,
         // For trigger steps:
         triggerType?: string,
         // For delay steps:
         delayValue?: number,
         delayUnit?: "minutes" | "hours" | "days" | "weeks",
         // For action steps:
         actionType?: "send_email" | "create_task" | "update_field" | "webhook",
         emailSubject?: string,
         emailBody?: string,
         taskTitle?: string,
         taskDescription?: string,
         taskDueInDays?: number,
         // For condition steps:
         conditionType?: string,
         field?: string,
         operator?: string,
         value?: string
       }
     ]
   }

   EXAMPLES OF SOPHISTICATED WORKFLOWS:

   a) 7-Day Nurture Campaign:
   {
     "tool": "create_custom_workflow",
     "args": {
       "name": "7-Day Lead Nurture Campaign",
       "description": "Multi-touch nurture sequence for new leads",
       "triggerType": "contact_created",
       "triggerEntityType": "contact",
       "steps": [
         { "type": "trigger", "name": "When New Contact Added", "triggerType": "contact_created" },
         { "type": "action", "name": "Send Welcome Email", "actionType": "send_email",
           "emailSubject": "Welcome! Here's what to expect",
           "emailBody": "Hi {{firstName}},\\n\\nWelcome to our community!\\n\\nBest regards" },
         { "type": "delay", "name": "Wait 2 Days", "delayValue": 2, "delayUnit": "days" },
         { "type": "action", "name": "Send Value Proposition", "actionType": "send_email",
           "emailSubject": "How we can help you succeed",
           "emailBody": "Hi {{firstName}},\\n\\nHere's how we help companies like yours...\\n\\nBest regards" },
         { "type": "delay", "name": "Wait 3 Days", "delayValue": 3, "delayUnit": "days" },
         { "type": "action", "name": "Send Case Study", "actionType": "send_email",
           "emailSubject": "See how {{companyName}} achieved 300% ROI",
           "emailBody": "Hi {{firstName}},\\n\\nCheck out this success story...\\n\\nBest regards" },
         { "type": "delay", "name": "Wait 2 Days", "delayValue": 2, "delayUnit": "days" },
         { "type": "action", "name": "Create Follow-Up Task", "actionType": "create_task",
           "taskTitle": "Call {{firstName}} to schedule demo",
           "taskDescription": "Lead has been nurtured for 7 days, time to reach out!",
           "taskDueInDays": 1 }
       ]
     }
   }

   b) Deal Stage Progression with Tasks:
   {
     "tool": "create_custom_workflow",
     "args": {
       "name": "Deal Stage Automation",
       "description": "Automatically create tasks when deal moves to new stage",
       "triggerType": "deal_stage_changed",
       "triggerEntityType": "deal",
       "steps": [
         { "type": "trigger", "name": "When Deal Stage Changes", "triggerType": "deal_stage_changed" },
         { "type": "action", "name": "Create Qualification Task", "actionType": "create_task",
           "taskTitle": "Qualify the deal and assess budget", "taskDueInDays": 1 },
         { "type": "delay", "name": "Wait 3 Days", "delayValue": 3, "delayUnit": "days" },
         { "type": "action", "name": "Send Check-In Email", "actionType": "send_email",
           "emailSubject": "Checking in on your decision timeline",
           "emailBody": "Hi {{firstName}},\\n\\nJust wanted to check if you need any additional information...\\n\\nBest regards" },
         { "type": "delay", "name": "Wait 1 Week", "delayValue": 1, "delayUnit": "weeks" },
         { "type": "action", "name": "Create Follow-Up Task", "actionType": "create_task",
           "taskTitle": "Follow up on deal - assess next steps", "taskDueInDays": 0 }
       ]
     }
   }

2. create_welcome_workflow - Quick 3-step template: { name, emailSubject?, delayDays? }
3. create_follow_up_workflow - Quick 3-step template: { name, taskTitle?, delayDays? }
4. add_email_step - Add step to existing workflow: { workflowName, subject, body, delayDays? }
5. **update_delay** - Change delay timing in existing workflow: { workflowName, stepIndex?, stepName?, newDelay, newUnit }
   - stepIndex: Which delay to update? (1 = first delay, 2 = second delay, etc.)
   - stepName: Or find by name like "Wait 2 Days"
   - If neither provided, updates first delay
   Example: "change 2nd delay to 10 days" → {"workflowName": "Cold Lead Re-Engagement", "stepIndex": 2, "newDelay": 10, "newUnit": "days"}
6. activate_workflow - { workflowName }
7. pause_workflow - { workflowName }
8. delete_workflow - { workflowName }
9. list_workflows - { status? }
10. enroll_contact - { contactName, workflowName }
11. get_workflow_details - { workflowName }
12. bulk_delete_workflows - { status?, olderThanDays? }

💡 CRITICAL DECISION FRAMEWORK:

🚨 MODIFICATION REQUESTS (user wants to change existing workflow):
- "change delay to X days" → use update_delay tool (NOT create_custom_workflow!)
- "add an email step" → use add_email_step tool
- "pause the workflow" → use pause_workflow tool
- RULE: If workflow exists and user wants to modify it, use UPDATE tools!

🆕 CREATION REQUESTS (user wants new workflow):
- "create a workflow" → use create_custom_workflow (for custom) or templates (for simple)
- "build a sequence" → use create_custom_workflow
- RULE: Only create new workflows when user explicitly asks for NEW one!

CRITICAL EXAMPLES - LEARN THESE:

❌ WRONG - Confusing DELETE with CREATE:
User: "delete the latest workflow"
AI: Creates a NEW workflow called "Lost Deal Win-Back..." → DEAD WRONG!

✅ CORRECT - DELETE:
User: "delete the latest workflow"
AI Analysis: DELETE request. Latest = #1 in list (marked 🆕) = "Lost Deal Win-Back Sequence"
JSON: {"tool": "delete_workflow", "args": {"workflowName": "Lost Deal Win-Back Sequence"}}

---

❌ WRONG - Confusing UPDATE with CREATE:
User: "change the 2nd delay to 10 days"
AI: Creates a whole new workflow → WRONG!

✅ CORRECT - UPDATE:
User: "change the 2nd delay to 10 days"
JSON: {"tool": "update_delay", "args": {"workflowName": "Cold Lead Re-Engagement", "stepIndex": 2, "newDelay": 10, "newUnit": "days"}}

---

FOR NEW WORKFLOWS:
- Simple 3-step → Use templates (create_welcome_workflow, create_follow_up_workflow)
- Custom/Complex → Use create_custom_workflow with thoughtful step design
- Multi-touch → Design 5-10 step workflows with varied actions
- Nurture → Mix emails, delays, and tasks strategically

🎯 BEST PRACTICES:
- Lead nurture: 3-7 touches over 1-2 weeks
- Deal follow-up: Check in every 3-5 days
- Re-engagement: Start with value, not sales pitch
- Tasks: Create them BEFORE critical deadlines
- Email spacing: 2-4 days between touches

🧩 CONTEXTUAL INTELLIGENCE:

When user says "change the 2nd delay" without specifying which workflow:
1. Look at the EXISTING WORKFLOWS list above
2. Infer from context (most recently created/mentioned workflow)
3. If ambiguous, state your assumption in ANALYSIS

When user says "change 2nd step" or "change 2nd delay":
- Parse the NUMBER: "2nd" = stepIndex: 2, "3rd" = stepIndex: 3
- Parse the OLD value if given: "change 7 days to 10 days" means you're looking for a 7-day delay
- Use update_delay with stepIndex parameter

📝 RESPONSE FORMAT (CRITICAL):

You MUST respond in this EXACT format:

ANALYSIS:
[Your deep thinking about the request - CREATE or MODIFY? Which workflow? What specific change?]

WORKFLOW DESIGN (only for CREATE requests):
[Explain your workflow strategy - number of steps, timing, personalization, etc.]

JSON:
{"tool": "tool_name_here", "args": {...}}

CRITICAL RULES:
- For MODIFY requests: Use UPDATE tools (update_delay, add_email_step, etc.)
- For CREATE requests: Use CREATE tools (create_custom_workflow, etc.)
- Think first, act correctly!`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Workflow AI Response (first 500 chars):", responseText.substring(0, 500));

        // Extract AI's reasoning/analysis (the part before JSON)
        const analysisMatch = responseText.match(/ANALYSIS:(.*?)(?=WORKFLOW DESIGN:|JSON:|$)/s);
        const designMatch = responseText.match(/WORKFLOW DESIGN:(.*?)(?=JSON:|$)/s);

        const aiAnalysis = analysisMatch ? analysisMatch[1].trim() : "";
        const aiDesign = designMatch ? designMatch[1].trim() : "";

        console.log("🧠 AI Analysis:", aiAnalysis.substring(0, 200));
        console.log("🎨 AI Design Thinking:", aiDesign.substring(0, 200));

        // Extract JSON tool call
        const toolCall = parseToolCall(responseText, "WorkflowAgent");

        if (toolCall) {
            console.log(`🔧 Executing workflow tool: ${toolCall.tool}`);
            console.log(`📋 Workflow will have ${toolCall.args?.steps?.length || 0} steps`);

            const result = await executeWorkflowTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Workflow tool result:", result);

            // Build comprehensive response with AI's thinking + result
            let friendlyResponse = "";

            // NOTE: AI analysis is stored in toolResults for debugging, but NOT shown to users
            // The internal thinking should remain hidden - users only see the result

            // Add result
            if (result.success) {
                friendlyResponse += `## ✅ Workflow Created!\n\n${result.message}`;

                // If it was a custom workflow, show the step breakdown
                if (toolCall.tool === "create_custom_workflow" && result.stepCount) {
                    const steps = toolCall.args.steps;
                    friendlyResponse += "\n\n**Step Breakdown:**\n";
                    steps.forEach((step: any, i: number) => {
                        friendlyResponse += `${i + 1}. **${step.name}** (${step.type})`;
                        if (step.type === "delay") {
                            friendlyResponse += ` - ${step.delayValue} ${step.delayUnit}`;
                        }
                        if (step.type === "action" && step.emailSubject) {
                            friendlyResponse += ` - "${step.emailSubject}"`;
                        }
                        friendlyResponse += "\n";
                    });
                }
            } else {
                friendlyResponse += `❌ Error: ${result.error}`;
            }

            if (toolCall.tool === "list_workflows" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No workflows found. Try: 'Create a welcome workflow for new leads'";
                } else {
                    friendlyResponse = `Found ${result.count} workflow(s):\n${result.workflows.map((w: any) => `• ${w.name} (${w.status}) - ${w.stepCount} steps`).join("\n")}`;
                }
            }

            if (toolCall.tool === "get_workflow_details" && result.success) {
                const w = result.workflow;
                friendlyResponse = `📋 **${w.name}** (${w.status})\n\nSteps:\n${w.steps.join("\n")}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: {
                    [toolCall.tool]: result,
                    aiAnalysis: { analysis: aiAnalysis, design: aiDesign }
                },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can create automated workflows! Try:\n• 'Create a welcome email workflow for new leads'\n• 'Create a follow-up workflow for new deals'\n• 'List all workflows'")],
            finalResponse: "I can create automated workflows! Try:\n• 'Create a welcome email workflow for new leads'\n• 'Create a follow-up workflow for new deals'\n• 'List all workflows'",
        };

    } catch (error: any) {
        console.error("❌ Workflow Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error. Please try again.",
        };
    }
}
