/**
 * Lead Score Action Executor
 *
 * Updates lead scores as part of workflow automation.
 */

import leadScoringService from "../../leadScoring";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class LeadScoreActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { scoreEventType, scorePoints, scoreReason } = step.config;

        // Ensure entity is a contact (lead scoring only applies to contacts)
        if (enrollment.entityType !== "contact") {
            return this.skipped("Lead scoring only applies to contacts");
        }

        let result: any;

        if (scoreEventType) {
            // Use predefined event type
            result = await leadScoringService.updateLeadScore(
                enrollment.workspaceId,
                entity._id,
                scoreEventType
            );

            this.log(
                `📊 Lead score updated: ${scoreEventType} (${result.scoreChange > 0 ? "+" : ""}${result.scoreChange} points) → ${result.score} (Grade ${result.grade})`
            );
        } else if (scorePoints !== undefined) {
            // Manual point adjustment
            const currentScore = await leadScoringService.getLeadScore(
                enrollment.workspaceId,
                entity._id
            );

            const newScore = (currentScore?.score || 0) + scorePoints;

            await leadScoringService.setLeadScore(
                enrollment.workspaceId,
                entity._id,
                newScore,
                scoreReason || "Workflow adjustment"
            );

            result = {
                score: newScore,
                scoreChange: scorePoints,
                grade: this.calculateGrade(newScore),
            };

            this.log(
                `📊 Lead score adjusted: ${scorePoints > 0 ? "+" : ""}${scorePoints} points → ${result.score} (Grade ${result.grade})`
            );
        } else {
            return this.skipped("No score event type or points specified");
        }

        return this.success({
            scored: true,
            eventType: scoreEventType,
            score: result.score,
            grade: result.grade,
            scoreChange: result.scoreChange,
            gradeChange: result.gradeChange || false,
        });
    }

    private calculateGrade(score: number): string {
        if (score >= 80) return "A";
        if (score >= 60) return "B";
        if (score >= 40) return "C";
        if (score >= 20) return "D";
        return "F";
    }
}

export default new LeadScoreActionExecutor();
