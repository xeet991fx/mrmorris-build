import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BuildingOfficeIcon, GlobeAltIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import TextInput from "@/components/forms/TextInput";
import Textarea from "@/components/forms/Textarea";
import SelectDropdown from "@/components/forms/SelectDropdown";
import RadioGroup from "@/components/forms/RadioGroup";
import { step1Schema, type Step1Input } from "@/lib/validations/project";

interface Step1Props {
  data?: any;
  onNext: (data: Step1Input["business"]) => void;
  onBack: () => void;
}

const STAGE_OPTIONS = [
  { value: "Idea", label: "Idea" },
  { value: "Pre-launch", label: "Pre-launch" },
  { value: "Launched but no revenue", label: "Launched but no revenue" },
  { value: "Generating revenue", label: "Generating revenue" },
  { value: "Scaling", label: "Scaling" },
];

export default function Step1BusinessOverview({ data, onNext, onBack }: Step1Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    mode: "onSubmit",
    defaultValues: {
      business: data || {},
    },
  });

  const onSubmit = (formData: Step1Input) => {
    console.log("✅ Step 1 form submitted successfully:", formData);
    onNext(formData.business);
  };

  const onError = (errors: any) => {
    console.error("❌ Step 1 validation errors:");
    if (errors.business) {
      Object.entries(errors.business).forEach(([field, error]: [string, any]) => {
        console.error(`  ❌ ${field}: ${error?.message || 'Unknown error'}`);
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Business Overview</h2>
        <p className="text-neutral-400">
          Let us start by understanding your business fundamentals
        </p>
      </div>

      {/* Validation Error Summary */}
      {Object.keys(errors.business || {}).length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm font-medium mb-2">
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
            {Object.entries(errors.business || {}).map(([field, error]: [string, any]) => (
              <li key={field}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      <FormField
        label="Business Name"
        icon={<BuildingOfficeIcon className="w-4 h-4" />}
        error={errors.business?.name?.message}
        required
      >
        <TextInput
          {...register("business.name")}
          placeholder="e.g., Acme Corporation"
          error={!!errors.business?.name}
        />
      </FormField>

      <FormField
        label="What does your business do?"
        error={errors.business?.description?.message}
        helpText="Provide a brief overview of your business"
        required
      >
        <Textarea
          {...register("business.description")}
          placeholder="Describe your business in 2-3 sentences..."
          rows={3}
          error={!!errors.business?.description}
        />
      </FormField>

      <FormField
        label="What product or service do you offer?"
        error={errors.business?.product?.message}
        required
      >
        <Textarea
          {...register("business.product")}
          placeholder="Describe your main product or service..."
          rows={3}
          error={!!errors.business?.product}
        />
      </FormField>

      <FormField
        label="What problem does it solve?"
        error={errors.business?.problem?.message}
        helpText="What pain point or need does your business address?"
        required
      >
        <Textarea
          {...register("business.problem")}
          placeholder="Describe the problem you are solving..."
          rows={3}
          error={!!errors.business?.problem}
        />
      </FormField>

      <FormField
        label="Who is your target audience?"
        error={errors.business?.audience?.message}
        helpText="Be specific about demographics, roles, or industries"
        required
      >
        <TextInput
          {...register("business.audience")}
          placeholder="e.g., Small business owners in the US, B2B SaaS companies"
          error={!!errors.business?.audience}
        />
      </FormField>

      <FormField
        label="Primary region or market"
        icon={<GlobeAltIcon className="w-4 h-4" />}
        error={errors.business?.region?.message}
        required
      >
        <TextInput
          {...register("business.region")}
          placeholder="e.g., United States, Global, Europe"
          error={!!errors.business?.region}
        />
      </FormField>

      <FormField
        label="What stage is your business in?"
        icon={<ChartBarIcon className="w-4 h-4" />}
        error={errors.business?.stage?.message}
        required
      >
        <Controller
          name="business.stage"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={STAGE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value}
              onChange={field.onChange}
              error={!!errors.business?.stage}
            />
          )}
        />
      </FormField>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled
          className="px-6 py-3 bg-neutral-800/50 border border-neutral-700/50 text-neutral-500 rounded-lg font-medium cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-[#9ACD32] hover:bg-[#8AB82E] text-neutral-900 font-semibold rounded-lg shadow-lg shadow-sm transition-all transform hover:scale-[1.02]"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
