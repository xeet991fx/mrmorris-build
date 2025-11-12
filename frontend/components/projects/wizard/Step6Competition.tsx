import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FireIcon, StarIcon } from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import TagsInput from "@/components/forms/TagsInput";
import { step6Schema, type Step6Input } from "@/lib/validations/project";

interface Step6Props {
  data?: any;
  onNext: (data: Step6Input["competition"]) => void;
  onBack: () => void;
}

export default function Step6Competition({ data, onNext, onBack }: Step6Props) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step6Input>({
    resolver: zodResolver(step6Schema),
    defaultValues: {
      competition: data || {},
    },
  });

  const onSubmit = (formData: Step6Input) => {
    onNext(formData.competition);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Competition & Inspiration</h2>
        <p className="text-slate-400">
          Help us understand your competitive landscape
        </p>
      </div>

      <FormField
        label="Who are your main competitors?"
        icon={<FireIcon className="w-4 h-4" />}
        helpText="Add competitor names or websites (optional)"
      >
        <Controller
          name="competition.competitors"
          control={control}
          render={({ field }) => (
            <TagsInput
              value={field.value || []}
              onChange={field.onChange}
              placeholder="e.g., Competitor Inc., competitor.com"
            />
          )}
        />
      </FormField>

      <FormField
        label="Which brands inspire you?"
        icon={<StarIcon className="w-4 h-4" />}
        helpText="Brands you admire for their marketing or positioning (optional)"
      >
        <Controller
          name="competition.inspiration"
          control={control}
          render={({ field }) => (
            <TagsInput
              value={field.value || []}
              onChange={field.onChange}
              placeholder="e.g., Apple, Nike, Tesla"
            />
          )}
        />
      </FormField>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
        <p className="text-sm text-slate-400">
          💡 <strong className="text-white">Tip:</strong> Understanding your
          competition and inspirations helps us create more effective marketing
          strategies that differentiate your brand.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 hover:text-white rounded-lg font-medium transition-all"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/25 transition-all transform hover:scale-[1.02]"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
