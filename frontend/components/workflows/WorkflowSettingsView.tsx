import { useState, useEffect } from "react";
import { Workflow } from "@/lib/workflow/types";
import GoalSettingsPanel from "./GoalSettingsPanel";
import { toast } from "react-hot-toast";

interface WorkflowSettingsViewProps {
    workflow: Workflow;
    updateWorkflow: (workspaceId: string, workflowId: string, updates: Partial<Workflow>) => Promise<void>;
    workspaceId: string;
    workflowId: string;
}

export default function WorkflowSettingsView({
    workflow,
    updateWorkflow,
    workspaceId,
    workflowId
}: WorkflowSettingsViewProps) {
    const [name, setName] = useState(workflow.name);
    const [description, setDescription] = useState(workflow.description || "");
    const [allowReenrollment, setAllowReenrollment] = useState(workflow.allowReenrollment || false);
    const [isSaving, setIsSaving] = useState(false);

    // Update local state when workflow changes
    useEffect(() => {
        setName(workflow.name);
        setDescription(workflow.description || "");
        setAllowReenrollment(workflow.allowReenrollment || false);
    }, [workflow]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateWorkflow(workspaceId, workflowId, {
                name,
                description,
                allowReenrollment,
            });
            toast.success("Settings saved");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">General Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your workflow's basic configuration.</p>
            </div>

            <div className="grid gap-6 p-6 border rounded-xl bg-card text-card-foreground shadow-sm">
                <div className="grid gap-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Workflow Name
                    </label>
                    <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. New Lead Onboarding"
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Description
                    </label>
                    <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this workflow does..."
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="allow-reenrollment"
                        checked={allowReenrollment}
                        onChange={(e) => setAllowReenrollment(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="grid gap-1.5 leading-none">
                        <label
                            htmlFor="allow-reenrollment"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Allow Re-enrollment
                        </label>
                        <p className="text-sm text-muted-foreground">
                            If enabled, contacts can enter this workflow multiple times.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Goal Criteria</h2>
                <p className="text-sm text-muted-foreground">Define success criteria for this workflow.</p>
            </div>

            <GoalSettingsPanel // This component handles its own updates via the onChange prop calling updateWorkflow
                goals={(workflow.goalCriteria as any) || []}
                onChange={(goals) => {
                    updateWorkflow(workspaceId, workflowId, {
                        goalCriteria: goals as any,
                    });
                }}
                workflowSteps={workflow.steps.map((s) => ({
                    id: s.id,
                    name: s.name,
                }))}
            />
        </div>
    );
}
