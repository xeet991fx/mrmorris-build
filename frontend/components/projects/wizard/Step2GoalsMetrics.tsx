import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChartBarIcon, CurrencyDollarIcon, ClockIcon } from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import RadioGroup from "@/components/forms/RadioGroup";
import NumberInput from "@/components/forms/NumberInput";
import { step2Schema, type Step2Input } from "@/lib/validations/project";

interface Step2Props {
  data?: any;
  onNext: (data: Step2Input["goals"]) => void;
  onBack: () => void;
}

const GOAL_OPTIONS = [
  { value: "Get early users / signups", label: "Get early users / signups" },
  { value: "Generate leads or demo calls", label: "Generate leads or demo calls" },
  { value: "Drive website traffic", label: "Drive website traffic" },
  { value: "Increase sales", label: "Increase sales" },
  { value: "Build brand awareness", label: "Build brand awareness" },
];

const TIMELINE_OPTIONS = [
  { value: "Within 2 weeks", label: "Within 2 weeks" },
  { value: "Within 1 month", label: "Within 1 month" },
  { value: "Long-term brand building", label: "Long-term brand building" },
];

export default function Step2GoalsMetrics({ data, onNext, onBack }: Step2Props) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step2Input>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      goals: data || {},
    },
  });

  const onSubmit = (formData: Step2Input) => {
    onNext(formData.goals);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Goals & Metrics</h2>
        <p className="text-neutral-400">
          Define your marketing objectives and budget
        </p>
      </div>

      <FormField
        label="What is your primary marketing goal?"
        icon={<ChartBarIcon className="w-4 h-4" />}
        error={errors.goals?.primary?.message}
        required
      >
        <Controller
          name="goals.primary"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={GOAL_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value || ""}
              onChange={field.onChange}
              error={!!errors.goals?.primary}
            />
          )}
        />
      </FormField>

      <FormField
        label="What is your monthly marketing budget?"
        icon={<CurrencyDollarIcon className="w-4 h-4" />}
        error={errors.goals?.budget?.message}
        helpText="This helps us tailor recommendations to your budget"
        required
      >
        <Controller
          name="goals.budget"
          control={control}
          render={({ field }) => (
            <NumberInput
              value={field.value || 0}
              onValueChange={field.onChange}
              placeholder="Enter your budget"
              quickSelects={[1000, 2500, 5000, 10000]}
              error={!!errors.goals?.budget}
            />
          )}
        />
      </FormField>

      <FormField
        label="What is your timeline for results?"
        icon={<ClockIcon className="w-4 h-4" />}
        error={errors.goals?.timeline?.message}
        required
      >
        <Controller
          name="goals.timeline"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={TIMELINE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value || ""}
              onChange={field.onChange}
              error={!!errors.goals?.timeline}
            />
          )}
        />
      </FormField>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 text-neutral-300 hover:text-white rounded-lg font-medium transition-all"
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
