import mongoose, { Types } from "mongoose";
import Workflow, { IWorkflow, IWorkflowStep, IWorkflowCondition } from "../models/Workflow";
import WorkflowEnrollment, { IWorkflowEnrollment } from "../models/WorkflowEnrollment";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import Company from "../models/Company";
import Activity from "../models/Activity";
import emailService from "./email";

// ============================================
// WORKFLOW SERVICE
// ============================================

class WorkflowService {
    // ==========================================
    // ENROLLMENT
    // ==========================================

    /**
     * Check if an entity should be enrolled in active workflows and enroll them
     */
    async checkAndEnroll(
        eventType: string,
        entity: any,
        workspaceId: string
    ): Promise<void> {
        try {
            // Map event types to trigger types
            const triggerTypeMap: Record<string, string> = {
                "contact:created": "contact_created",
                "contact:updated": "contact_updated",
                "deal:created": "deal_created",
                "deal:stage_changed": "deal_stage_changed",
            };

            const triggerType = triggerTypeMap[eventType];
            if (!triggerType) return;

            // Determine entity type
            let entityType: "contact" | "deal" | "company" = "contact";
            if (eventType.startsWith("deal:")) {
                entityType = "deal";
            } else if (eventType.startsWith("company:")) {
                entityType = "company";
            }

            // Find active workflows with matching trigger
            const workflows = await Workflow.find({
                workspaceId,
                status: "active",
                triggerEntityType: entityType,
                "steps.config.triggerType": triggerType,
            });

            for (const workflow of workflows) {
                // Check enrollment criteria
                if (workflow.enrollmentCriteria?.conditions?.length) {
                    const matches = this.checkConditions(
                        entity,
                        workflow.enrollmentCriteria.conditions,
                        workflow.enrollmentCriteria.matchAll !== false
                    );
                    if (!matches) continue;
                }

                // Check if already enrolled (if re-enrollment not allowed)
                if (!workflow.allowReenrollment) {
                    const existing = await WorkflowEnrollment.findOne({
                        workflowId: workflow._id,
                        entityId: entity._id,
                        status: { $in: ["active", "paused"] },
                    });
                    if (existing) continue;
                }

                // Enroll the entity
                await this.enrollEntity(workflow, entity._id, entityType, workspaceId);
            }
        } catch (error) {
            console.error("WorkflowService.checkAndEnroll error:", error);
        }
    }

    /**
     * Enroll an entity in a workflow
     */
    async enrollEntity(
        workflow: IWorkflow,
        entityId: Types.ObjectId | string,
        entityType: "contact" | "deal" | "company",
        workspaceId: string,
        enrolledBy?: Types.ObjectId | string,
        source: "automatic" | "manual" | "api" = "automatic"
    ): Promise<IWorkflowEnrollment> {
        // Get trigger step and find first action step
        const triggerStep = workflow.steps.find((s) => s.type === "trigger");
        const firstStepId = triggerStep?.nextStepIds[0] || undefined;

        // Create enrollment
        const enrollment = await WorkflowEnrollment.create({
            workflowId: workflow._id,
            workspaceId,
            entityType,
            entityId,
            status: "active",
            currentStepId: firstStepId,
            nextExecutionTime: new Date(), // Execute immediately
            enrolledBy: enrolledBy ? new Types.ObjectId(enrolledBy as string) : undefined,
            enrollmentSource: source,
            stepsExecuted: triggerStep
                ? [
                    {
                        stepId: triggerStep.id,
                        stepName: triggerStep.name,
                        stepType: "trigger",
                        startedAt: new Date(),
                        completedAt: new Date(),
                        status: "completed",
                        result: { source },
                    },
                ]
                : [],
        });

        // Update workflow stats
        await Workflow.findByIdAndUpdate(workflow._id, {
            $inc: {
                "stats.totalEnrolled": 1,
                "stats.currentlyActive": 1,
            },
        });

        console.log(
            `✅ Enrolled ${entityType} ${entityId} in workflow "${workflow.name}"`
        );

        return enrollment;
    }

    // ==========================================
    // EXECUTION
    // ==========================================

    /**
     * Execute the next step for an enrollment
     */
    async executeNextStep(enrollment: IWorkflowEnrollment): Promise<void> {
        try {
            const workflow = await Workflow.findById(enrollment.workflowId);
            if (!workflow || workflow.status !== "active") {
                enrollment.status = "paused";
                await enrollment.save();
                return;
            }

            if (!enrollment.currentStepId) {
                // No more steps, mark as completed
                await this.completeEnrollment(enrollment, "completed");
                return;
            }

            const step = workflow.steps.find((s) => s.id === enrollment.currentStepId);
            if (!step) {
                // Step not found, mark as failed
                enrollment.lastError = "Step not found";
                enrollment.status = "failed";
                await enrollment.save();
                return;
            }

            // Add step execution record
            const execution = {
                stepId: step.id,
                stepName: step.name,
                stepType: step.type,
                startedAt: new Date(),
                status: "running" as const,
            };
            enrollment.stepsExecuted.push(execution);
            await enrollment.save();

            // Execute based on step type
            let result: any = null;
            let nextStepId: string | undefined = step.nextStepIds[0] || undefined;

            try {
                switch (step.type) {
                    case "action":
                        result = await this.executeAction(step, enrollment);
                        break;

                    case "delay":
                        // Schedule next execution
                        const delayMs = this.calculateDelayMs(step);
                        enrollment.currentStepId = nextStepId;
                        enrollment.nextExecutionTime = new Date(Date.now() + delayMs);

                        // Update step execution
                        const delayExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
                        delayExec.status = "completed";
                        delayExec.completedAt = new Date();
                        delayExec.result = { delayMs };

                        await enrollment.save();
                        console.log(
                            `⏰ Workflow "${workflow.name}" - Waiting ${delayMs}ms for ${enrollment.entityId}`
                        );
                        return;

                    case "condition":
                        // Evaluate condition and route to appropriate branch
                        const entity = await this.getEntity(
                            enrollment.entityType,
                            enrollment.entityId
                        );
                        if (entity) {
                            const conditionResult = this.evaluateStepCondition(step, entity);
                            result = { conditionResult, field: step.config.conditions?.[0]?.field };

                            // Route based on condition result
                            // step.nextStepIds[0] = Yes path, step.nextStepIds[1] = No path
                            if (conditionResult && step.nextStepIds[0]) {
                                nextStepId = step.nextStepIds[0];
                                console.log(`🔀 Condition TRUE → taking Yes branch`);
                            } else if (!conditionResult && step.nextStepIds[1]) {
                                nextStepId = step.nextStepIds[1];
                                console.log(`🔀 Condition FALSE → taking No branch`);
                            } else {
                                nextStepId = step.nextStepIds[0] || undefined;
                            }
                        }
                        break;
                }

                // Update step as completed
                const stepExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
                stepExec.status = "completed";
                stepExec.completedAt = new Date();
                stepExec.result = result;

                // Move to next step
                enrollment.currentStepId = nextStepId;
                enrollment.nextExecutionTime = nextStepId ? new Date() : undefined;

                if (!nextStepId) {
                    await this.completeEnrollment(enrollment, "completed");
                } else {
                    await enrollment.save();

                    // Immediately execute next step if it's an action
                    const nextStep = workflow.steps.find((s) => s.id === nextStepId);
                    if (nextStep && nextStep.type !== "delay") {
                        await this.executeNextStep(enrollment);
                    }
                }
            } catch (error: any) {
                // Mark step as failed
                const failedExec = enrollment.stepsExecuted[enrollment.stepsExecuted.length - 1];
                failedExec.status = "failed";
                failedExec.completedAt = new Date();
                failedExec.error = error.message;

                enrollment.lastError = error.message;
                enrollment.errorCount += 1;

                // Retry logic - fail after 3 attempts
                if (enrollment.errorCount >= 3) {
                    enrollment.status = "failed";
                    await Workflow.findByIdAndUpdate(workflow._id, {
                        $inc: {
                            "stats.currentlyActive": -1,
                            "stats.failed": 1,
                        },
                    });
                } else {
                    // Schedule retry in 5 minutes
                    enrollment.nextExecutionTime = new Date(Date.now() + 5 * 60 * 1000);
                }

                await enrollment.save();
                console.error(
                    `❌ Workflow step failed for ${enrollment.entityId}:`,
                    error.message
                );
            }
        } catch (error) {
            console.error("WorkflowService.executeNextStep error:", error);
        }
    }

    /**
     * Execute an action step
     */
    async executeAction(
        step: IWorkflowStep,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { actionType } = step.config;

        // Get the entity
        const entity = await this.getEntity(
            enrollment.entityType,
            enrollment.entityId
        );
        if (!entity) {
            throw new Error("Entity not found");
        }

        console.log(
            `⚡ Executing action "${actionType}" for ${enrollment.entityType} ${enrollment.entityId}`
        );

        switch (actionType) {
            case "send_email":
                return await this.executeEmailAction(step, entity, enrollment);

            case "update_field":
                return await this.executeUpdateFieldAction(step, entity, enrollment);

            case "create_task":
                return await this.executeCreateTaskAction(step, entity, enrollment);

            case "add_tag":
                return await this.executeAddTagAction(step, entity, enrollment);

            case "remove_tag":
                return await this.executeRemoveTagAction(step, entity, enrollment);

            case "send_notification":
                return await this.executeNotificationAction(step, entity, enrollment);

            default:
                console.log(`⚠️ Unknown action type: ${actionType}`);
                return { skipped: true, reason: "Unknown action type" };
        }
    }

    // ==========================================
    // ACTION EXECUTORS
    // ==========================================

    async executeEmailAction(
        step: IWorkflowStep,
        entity: any,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { emailSubject, emailBody } = step.config;

        if (!entity.email) {
            return { skipped: true, reason: "No email address" };
        }

        // Replace placeholders in subject and body
        const subject = this.replacePlaceholders(emailSubject || "", entity);
        const body = this.replacePlaceholders(emailBody || "", entity);

        // Send the email using EmailService
        const result = await emailService.sendWorkflowEmail(
            entity.email,
            emailSubject || "Automated Message",
            emailBody || "",
            {
                firstName: entity.firstName,
                lastName: entity.lastName,
                name: entity.name || `${entity.firstName || ""} ${entity.lastName || ""}`.trim(),
                email: entity.email,
                phone: entity.phone,
                company: entity.company,
                status: entity.status,
                source: entity.source,
            }
        );

        if (!result.success) {
            console.error(`❌ Failed to send workflow email: ${result.error}`);
            return { sent: false, error: result.error };
        }

        console.log(`📧 Workflow email sent to ${entity.email}: "${subject}"`);

        // Log activity
        await Activity.create({
            workspaceId: enrollment.workspaceId,
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "automation",
            title: "Workflow: Email Sent",
            description: `Automated email sent: "${subject}"`,
            metadata: {
                workflowId: enrollment.workflowId,
                stepId: step.id,
                emailSubject: subject,
                messageId: result.messageId,
            },
        });

        return { sent: true, to: entity.email, subject, messageId: result.messageId };
    }

    async executeUpdateFieldAction(
        step: IWorkflowStep,
        entity: any,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { fieldName, fieldValue } = step.config;

        if (!fieldName) {
            return { skipped: true, reason: "No field specified" };
        }

        const oldValue = entity[fieldName];

        // Update the entity
        const Model = this.getEntityModel(enrollment.entityType);
        await Model.findByIdAndUpdate(entity._id, { [fieldName]: fieldValue });

        // Log activity
        await Activity.create({
            workspaceId: enrollment.workspaceId,
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "automation",
            title: "Workflow: Field Updated",
            description: `Changed ${fieldName} from "${oldValue}" to "${fieldValue}"`,
            metadata: {
                workflowId: enrollment.workflowId,
                stepId: step.id,
                field: fieldName,
                oldValue,
                newValue: fieldValue,
            },
        });

        console.log(
            `✏️ Updated ${fieldName} from "${oldValue}" to "${fieldValue}"`
        );

        return { updated: true, field: fieldName, oldValue, newValue: fieldValue };
    }

    async executeCreateTaskAction(
        step: IWorkflowStep,
        entity: any,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { taskTitle, taskDescription, taskDueInDays } = step.config;

        // Create activity as a task
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (taskDueInDays || 0));

        await Activity.create({
            workspaceId: enrollment.workspaceId,
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "task",
            title: this.replacePlaceholders(taskTitle || "Follow up", entity),
            description: this.replacePlaceholders(taskDescription || "", entity),
            dueAt: dueDate,
            metadata: {
                workflowId: enrollment.workflowId,
                stepId: step.id,
                automated: true,
            },
        });

        console.log(`📋 Created task: "${taskTitle}"`);

        return { created: true, title: taskTitle, dueDate };
    }

    async executeAddTagAction(
        step: IWorkflowStep,
        entity: any,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { tagName } = step.config;

        if (!tagName) {
            return { skipped: true, reason: "No tag specified" };
        }

        // Add tag to entity
        const Model = this.getEntityModel(enrollment.entityType);
        await Model.findByIdAndUpdate(entity._id, {
            $addToSet: { tags: tagName },
        });

        console.log(`🏷️ Added tag: "${tagName}"`);

        return { added: true, tag: tagName };
    }

    async executeRemoveTagAction(
        step: IWorkflowStep,
        entity: any,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { tagName } = step.config;

        if (!tagName) {
            return { skipped: true, reason: "No tag specified" };
        }

        // Remove tag from entity
        const Model = this.getEntityModel(enrollment.entityType);
        await Model.findByIdAndUpdate(entity._id, {
            $pull: { tags: tagName },
        });

        console.log(`🏷️ Removed tag: "${tagName}"`);

        return { removed: true, tag: tagName };
    }

    async executeNotificationAction(
        step: IWorkflowStep,
        entity: any,
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        const { notificationMessage } = step.config;

        const message = this.replacePlaceholders(notificationMessage || "", entity);

        // TODO: Integrate with notification system
        console.log(`🔔 Notification: ${message}`);

        return { notified: true, message };
    }

    // ==========================================
    // CONDITION EVALUATION
    // ==========================================

    evaluateStepCondition(step: IWorkflowStep, entity: any): boolean {
        const condition = step.config.conditions?.[0];
        if (!condition) return true;

        const value = entity[condition.field];

        switch (condition.operator) {
            case "equals":
                return value === condition.value;
            case "not_equals":
                return value !== condition.value;
            case "contains":
                return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
            case "not_contains":
                return !String(value).toLowerCase().includes(String(condition.value).toLowerCase());
            case "greater_than":
                return Number(value) > Number(condition.value);
            case "less_than":
                return Number(value) < Number(condition.value);
            case "is_empty":
                return value === undefined || value === null || value === "";
            case "is_not_empty":
                return value !== undefined && value !== null && value !== "";
            default:
                return false;
        }
    }

    // ==========================================
    // COMPLETION
    // ==========================================

    async completeEnrollment(
        enrollment: IWorkflowEnrollment,
        status: "completed" | "goal_met"
    ): Promise<void> {
        enrollment.status = status;
        enrollment.completedAt = new Date();
        enrollment.currentStepId = undefined;
        enrollment.nextExecutionTime = undefined;
        await enrollment.save();

        // Update workflow stats
        const statsUpdate: any = {
            $inc: { "stats.currentlyActive": -1 },
        };

        if (status === "completed") {
            statsUpdate.$inc["stats.completed"] = 1;
        } else if (status === "goal_met") {
            statsUpdate.$inc["stats.goalsMet"] = 1;
        }

        await Workflow.findByIdAndUpdate(enrollment.workflowId, statsUpdate);

        console.log(
            `✅ Enrollment ${enrollment._id} completed with status: ${status}`
        );
    }

    // ==========================================
    // HELPERS
    // ==========================================

    checkConditions(
        entity: any,
        conditions: IWorkflowCondition[],
        matchAll: boolean
    ): boolean {
        const results = conditions.map((condition) => {
            const value = entity[condition.field];

            switch (condition.operator) {
                case "equals":
                    return value === condition.value;
                case "not_equals":
                    return value !== condition.value;
                case "contains":
                    return String(value).includes(String(condition.value));
                case "not_contains":
                    return !String(value).includes(String(condition.value));
                case "greater_than":
                    return Number(value) > Number(condition.value);
                case "less_than":
                    return Number(value) < Number(condition.value);
                case "is_empty":
                    return value === undefined || value === null || value === "";
                case "is_not_empty":
                    return value !== undefined && value !== null && value !== "";
                case "is_true":
                    return value === true;
                case "is_false":
                    return value === false;
                default:
                    return false;
            }
        });

        return matchAll
            ? results.every((r) => r)
            : results.some((r) => r);
    }

    calculateDelayMs(step: IWorkflowStep): number {
        const { delayValue, delayUnit } = step.config;
        const value = delayValue || 1;

        const multipliers: Record<string, number> = {
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
            weeks: 7 * 24 * 60 * 60 * 1000,
        };

        return value * (multipliers[delayUnit || "days"] || multipliers.days);
    }

    async getEntity(
        entityType: "contact" | "deal" | "company",
        entityId: Types.ObjectId | string
    ): Promise<any> {
        const Model = this.getEntityModel(entityType);
        return Model.findById(entityId);
    }

    getEntityModel(entityType: "contact" | "deal" | "company"): any {
        switch (entityType) {
            case "contact":
                return Contact;
            case "deal":
                return Opportunity;
            case "company":
                return Company;
            default:
                return Contact;
        }
    }

    replacePlaceholders(text: string, entity: any): string {
        return text.replace(/\{\{(\w+)\}\}/g, (match, field) => {
            return entity[field] || match;
        });
    }

    // ==========================================
    // SCHEDULED PROCESSING
    // ==========================================

    /**
     * Process all enrollments ready for execution
     * This should be called by a cron job or scheduled task
     */
    async processReadyEnrollments(): Promise<void> {
        try {
            const enrollments = await WorkflowEnrollment.find({
                status: "active",
                nextExecutionTime: { $lte: new Date() },
            });

            console.log(`🔄 Processing ${enrollments.length} ready enrollments...`);

            for (const enrollment of enrollments) {
                await this.executeNextStep(enrollment);
            }
        } catch (error) {
            console.error("WorkflowService.processReadyEnrollments error:", error);
        }
    }
}

// Export singleton instance
export const workflowService = new WorkflowService();
export default workflowService;
