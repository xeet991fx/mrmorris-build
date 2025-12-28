// @ts-nocheck
import { UseFormReturn } from "react-hook-form";
import TextInput from "@/components/forms/TextInput";
import Textarea from "@/components/forms/Textarea";
import { CreatePipelineInput, UpdatePipelineInput } from "@/lib/validations/pipeline";
import StageManager from "./StageManager";

interface PipelineFormProps {
  form: UseFormReturn<CreatePipelineInput> | UseFormReturn<UpdatePipelineInput>;
  isEdit?: boolean;
}

export default function PipelineForm({ form, isEdit = false }: PipelineFormProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const formValues = watch();
  const stages = (formValues as any)?.stages || [];

  return (
    <div className="space-y-4">
      {/* Pipeline Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Pipeline Name <span className="text-red-400">*</span>
        </label>
        <TextInput
          placeholder="e.g., Sales Pipeline, Recruitment Pipeline"
          error={!!errors.name}
          {...(register as any)("name")}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-400">{errors.name.message as any}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Description
        </label>
        <Textarea
          placeholder="What is this pipeline for?"
          rows={2}
          error={!!errors.description}
          {...(register as any)("description")}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-400">{errors.description.message as any}</p>
        )}
      </div>

      {/* Stages - Only for create/full edit */}
      {!isEdit && (
        <StageManager
          stages={stages}
          onChange={(newStages) => (setValue as any)("stages", newStages)}
          errors={(errors as any).stages}
        />
      )}

      {/* Is Default */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-black focus:ring-2 focus:ring-primary focus:ring-offset-0"
          {...(register as any)("isDefault")}
        />
        <label htmlFor="isDefault" className="text-sm text-foreground cursor-pointer">
          Set as default pipeline
        </label>
      </div>

      {isEdit && (
        <p className="text-xs text-neutral-400">
          Note: To manage stages, use the stage management options after saving.
        </p>
      )}
    </div>
  );
}
