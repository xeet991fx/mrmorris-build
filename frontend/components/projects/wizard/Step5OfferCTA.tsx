import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TagIcon, MegaphoneIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import RadioGroup from "@/components/forms/RadioGroup";
import TextInput from "@/components/forms/TextInput";
import { step5Schema, type Step5Input } from "@/lib/validations/project";

interface Step5Props {
  data?: any;
  onNext: (data: Step5Input["offer"]) => void;
  onBack: () => void;
}

const OFFER_OPTIONS = [
  { value: "Free trial", label: "Free trial" },
  { value: "Free demo", label: "Free demo" },
  { value: "Free resource / lead magnet", label: "Free resource / lead magnet" },
  { value: "Direct purchase only", label: "Direct purchase only" },
];

const TRACKING_OPTIONS = [
  { value: "true", label: "Yes, I have tracking set up" },
  { value: "false", label: "No, not yet" },
];

export default function Step5OfferCTA({ data, onNext, onBack }: Step5Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step5Input>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      offer: data || {},
    },
  });

  const onSubmit = (formData: Step5Input) => {
    onNext(formData.offer);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Offer & Call-to-Action</h2>
        <p className="text-slate-400">
          Define your primary offer and conversion strategy
        </p>
      </div>

      <FormField
        label="What is your primary offer?"
        icon={<TagIcon className="w-4 h-4" />}
        error={errors.offer?.offer_type?.message}
        required
      >
        <Controller
          name="offer.offer_type"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={OFFER_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value || ""}
              onChange={field.onChange}
              error={!!errors.offer?.offer_type}
            />
          )}
        />
      </FormField>

      <FormField
        label="What is your main call-to-action?"
        icon={<MegaphoneIcon className="w-4 h-4" />}
        error={errors.offer?.cta?.message}
        helpText="e.g., 'Start Free Trial', 'Book a Demo', 'Download Now'"
        required
      >
        <TextInput
          {...register("offer.cta")}
          placeholder="Enter your call-to-action"
          error={!!errors.offer?.cta}
        />
      </FormField>

      <FormField
        label="Do you have conversion tracking set up?"
        icon={<ChartBarIcon className="w-4 h-4" />}
        error={errors.offer?.tracking_setup?.message}
        helpText="e.g., Google Analytics, Facebook Pixel, etc."
        required
      >
        <Controller
          name="offer.tracking_setup"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={TRACKING_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value === undefined ? "" : (field.value ? "true" : "false")}
              onChange={(value) => field.onChange(value === "true")}
              error={!!errors.offer?.tracking_setup}
            />
          )}
        />
      </FormField>

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
