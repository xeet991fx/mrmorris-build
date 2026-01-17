import { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TextInput from "@/components/forms/TextInput";
import Textarea from "@/components/forms/Textarea";
import SelectDropdown from "@/components/forms/SelectDropdown";
import NumberInput from "@/components/forms/NumberInput";
import TagsInput from "@/components/forms/TagsInput";
import SearchableMultiSelect from "@/components/forms/SearchableMultiSelect";
import { usePipelineStore } from "@/store/usePipelineStore";
import { useFormDataCache } from "@/store/useFormDataCache";

// Generic form values that cover both create and update
interface OpportunityFormValues extends FieldValues {
  pipelineId?: string;
  stageId?: string;
  title: string;
  value: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  companyId?: string;
  description?: string;
  source?: string;
  status?: string;
  lostReason?: string;
  assignedTo?: string;
  associatedContacts?: string[];
  tags?: string[];
  priority?: string;
}

interface OpportunityFormProps {
  form: UseFormReturn<OpportunityFormValues>;
  isEdit?: boolean;
  workspaceId?: string;
}

export default function OpportunityForm({ form, isEdit = false, workspaceId: propWorkspaceId }: OpportunityFormProps) {
  const params = useParams();
  const workspaceId = propWorkspaceId || (params?.id as string);

  const { register, formState: { errors }, setValue, watch } = form;
  const { pipelines, currentPipeline } = usePipelineStore();

  // Use cached form data
  const {
    teamMembers,
    contacts,
    companies,
    isLoadingTeam,
    isLoadingContacts,
    isLoadingCompanies,
    fetchAllFormData,
  } = useFormDataCache();

  const formValues = watch();
  const selectedPipelineId = formValues.pipelineId;
  const selectedStageId = formValues.stageId;
  const selectedStatus = formValues.status;
  const selectedPriority = formValues.priority;
  const selectedTags = formValues.tags;
  const selectedAssignedTo = formValues.assignedTo;
  const selectedAssociatedContacts = formValues.associatedContacts || [];
  const selectedCompanyId = formValues.companyId;

  const [availableStages, setAvailableStages] = useState<{ _id: string; name: string }[]>([]);

  // Update available stages when pipeline changes
  useEffect(() => {
    const pipelineId = selectedPipelineId || currentPipeline?._id;
    if (pipelineId) {
      const pipeline = pipelines.find((p) => p._id === pipelineId);
      if (pipeline) {
        setAvailableStages(
          pipeline.stages.map((s) => ({ _id: s._id, name: s.name }))
        );
      }
    }
  }, [selectedPipelineId, currentPipeline, pipelines]);

  // Fetch all form data on mount (uses cache)
  useEffect(() => {
    if (workspaceId) {
      fetchAllFormData(workspaceId);
    }
  }, [workspaceId, fetchAllFormData]);

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
    { value: "abandoned", label: "Abandoned" },
  ];

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline & Stage Selection */}
      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Pipeline <span className="text-red-400">*</span>
            </label>
            <SelectDropdown
              options={pipelines.map((p) => ({ value: p._id, label: p.name }))}
              value={selectedPipelineId || ""}
              onChange={(value) => setValue("pipelineId", value)}
              error={!!errors.pipelineId}
            />
            {errors.pipelineId && (
              <p className="mt-1 text-xs text-red-400">{errors.pipelineId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Stage <span className="text-red-400">*</span>
            </label>
            <SelectDropdown
              options={availableStages.map((s) => ({ value: s._id, label: s.name }))}
              value={selectedStageId || ""}
              onChange={(value) => setValue("stageId", value)}
              error={!!errors.stageId}
            />
            {errors.stageId && (
              <p className="mt-1 text-xs text-red-400">{errors.stageId.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <TextInput
          placeholder="e.g., ABC Corp - Enterprise Deal"
          error={!!errors.title}
          {...register("title")}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
        )}
      </div>

      {/* Deal Owner (Required) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Deal Owner <span className="text-red-400">*</span>
        </label>
        <SelectDropdown
          options={teamMembers}
          value={selectedAssignedTo || ""}
          onChange={(value) => setValue("assignedTo", value)}
          placeholder={isLoadingTeam ? "Loading..." : "Select deal owner"}
          error={!!errors.assignedTo}
        />
        {errors.assignedTo && (
          <p className="mt-1 text-xs text-red-400">{errors.assignedTo.message}</p>
        )}
      </div>

      {/* Value & Currency */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Value <span className="text-red-400">*</span>
          </label>
          <NumberInput
            placeholder="50000"
            error={!!errors.value}
            {...register("value", { valueAsNumber: true })}
          />
          {errors.value && (
            <p className="mt-1 text-xs text-red-400">{errors.value.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Currency
          </label>
          <TextInput
            placeholder="USD"
            defaultValue="USD"
            maxLength={3}
            {...register("currency")}
          />
        </div>
      </div>

      {/* Associated Contacts (Multi-select) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Associated Contacts
        </label>
        <SearchableMultiSelect
          options={contacts}
          value={selectedAssociatedContacts}
          onChange={(value) => setValue("associatedContacts", value)}
          placeholder={isLoadingContacts ? "Loading..." : "Search and select contacts..."}
          isLoading={isLoadingContacts}
        />
      </div>

      {/* Associated Company (Single-select) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Associated Company
        </label>
        <SelectDropdown
          options={[{ value: "", label: "No company" }, ...companies]}
          value={selectedCompanyId || ""}
          onChange={(value) => setValue("companyId", value)}
          placeholder={isLoadingCompanies ? "Loading..." : "Select a company"}
        />
      </div>

      {/* Probability & Expected Close Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Win Probability (%)
          </label>
          <NumberInput
            placeholder="50"
            min={0}
            max={100}
            error={!!errors.probability}
            {...register("probability", { valueAsNumber: true })}
          />
          {errors.probability && (
            <p className="mt-1 text-xs text-red-400">{errors.probability.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Expected Close Date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("expectedCloseDate")}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Description
        </label>
        <Textarea
          placeholder="Add details about this opportunity..."
          rows={3}
          error={!!errors.description}
          {...register("description")}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
        )}
      </div>

      {/* Source, Status, Priority */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Source
          </label>
          <TextInput
            placeholder="e.g., Inbound, Referral"
            error={!!errors.source}
            {...register("source")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Status
          </label>
          <SelectDropdown
            options={statusOptions}
            value={selectedStatus || "open"}
            onChange={(value) => setValue("status", value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Priority
          </label>
          <SelectDropdown
            options={priorityOptions}
            value={selectedPriority || "low"}
            onChange={(value) => setValue("priority", value)}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Tags
        </label>
        <TagsInput
          value={selectedTags || []}
          onChange={(tags) => setValue("tags", tags)}
          placeholder="Add tags..."
        />
      </div>

      {/* Lost Reason (only shown if status is "lost") */}
      {selectedStatus === "lost" && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Lost Reason
          </label>
          <Textarea
            placeholder="Why was this opportunity lost?"
            rows={2}
            error={!!errors.lostReason}
            {...register("lostReason")}
          />
        </div>
      )}
    </div>
  );
}
