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
    <div className="space-y-5">
      {/* Pipeline Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5">
          Pipeline Name <span className="text-rose-500">*</span>
        </label>
        <TextInput
          placeholder="e.g., Sales Pipeline, Recruitment Pipeline"
          error={!!errors.name}
          {...(register as any)("name")}
        />
        {errors.name && (
          <p className="mt-1.5 text-xs text-rose-500">{errors.name.message as any}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5">
          Description
        </label>
        <Textarea
          placeholder="What is this pipeline for?"
          rows={2}
          error={!!errors.description}
          {...(register as any)("description")}
        />
        {errors.description && (
          <p className="mt-1.5 text-xs text-rose-500">{errors.description.message as any}</p>
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
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="isDefault"
          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
          {...(register as any)("isDefault")}
        />
        <label htmlFor="isDefault" className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
          Set as default pipeline
        </label>
      </div>

      {isEdit && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg">
          Note: To manage stages, use the stage management options after saving.
        </p>
      )}
    </div>
  );
}
