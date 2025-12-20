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
                status: "active",
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
                message: `Created and activated workflow "${workflow.name}" with 3 steps: Trigger → Wait ${delayDays || 1} day(s) → Send Email`,
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
                status: "active",
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
                message: `Created and activated workflow "${workflow.name}" with 3 steps: Deal Created → Wait → Create Task`,
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
            const { workflowName, stepName, newDelay, newUnit } = args;

            const workflowRegex = createSafeRegex(workflowName);
            const workflow = await Workflow.findOne({ workspaceId, name: workflowRegex });

            if (!workflow) {
                return { success: false, error: `Workflow "${workflowName}" not found` };
            }

            // Find delay step by name or just the first delay step
            const stepRegex = stepName ? createSafeRegex(stepName) : null;
            const delayStep = workflow.steps.find((s: any) =>
                s.type === "delay" && (!stepRegex || stepRegex.test(s.name))
            );

            if (!delayStep) {
                return { success: false, error: `No delay step found in workflow "${workflow.name}"` };
            }

            // Update delay configuration
            delayStep.config.delayValue = newDelay || delayStep.config.delayValue;
            delayStep.config.delayUnit = newUnit || delayStep.config.delayUnit;
            delayStep.name = `Wait ${delayStep.config.delayValue} ${delayStep.config.delayUnit}`;

            await workflow.save();

            return {
                success: true,
                message: `Updated delay to ${delayStep.config.delayValue} ${delayStep.config.delayUnit} in workflow "${workflow.name}"`,
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

        const systemPrompt = `You are a CRM Workflow Automation Agent. Create, edit, and manage automated workflows.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Tools:
1. create_welcome_workflow - Args: { name, emailSubject?, delayDays? }
2. create_follow_up_workflow - Args: { name, taskTitle?, delayDays? }
3. add_email_step - Args: { workflowName, subject, body, delayDays? }
4. update_delay - Args: { workflowName, newDelay, newUnit }
5. activate_workflow - Args: { workflowName }
6. pause_workflow - Args: { workflowName }
7. delete_workflow - Args: { workflowName }
8. list_workflows - Args: { status? }
9. enroll_contact - Args: { contactName, workflowName }
10. get_workflow_details - Args: { workflowName }
11. bulk_delete_workflows - Bulk delete. Args: { status?, olderThanDays? }

Examples:
- "delete all paused workflows" → {"tool": "bulk_delete_workflows", "args": {"status": "paused"}}
- "delete workflows older than 90 days" → {"tool": "bulk_delete_workflows", "args": {"olderThanDays": 90}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Workflow AI Response:", responseText);

        const toolCall = parseToolCall(responseText, "WorkflowAgent");

        if (toolCall) {
            console.log(`🔧 Executing workflow tool: ${toolCall.tool}`);

            const result = await executeWorkflowTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Workflow tool result:", result);

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

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
                toolResults: { [toolCall.tool]: result },
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
