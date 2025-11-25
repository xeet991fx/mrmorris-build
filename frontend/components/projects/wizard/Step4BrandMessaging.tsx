import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SparklesIcon,
  BriefcaseIcon,
  UserGroupIcon,
  LightBulbIcon,
  FaceSmileIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import RadioGroup from "@/components/forms/RadioGroup";
import Textarea from "@/components/forms/Textarea";
import { step4Schema, type Step4Input } from "@/lib/validations/workspace";

interface Step4Props {
  data?: any;
  onNext: (data: Step4Input["brand"]) => void;
  onBack: () => void;
}

const TONE_OPTIONS = [
  { value: "Professional", label: "Professional", icon: <BriefcaseIcon className="w-5 h-5" /> },
  { value: "Friendly", label: "Friendly", icon: <UserGroupIcon className="w-5 h-5" /> },
  { value: "Bold", label: "Bold", icon: <LightBulbIcon className="w-5 h-5" /> },
  { value: "Educational", label: "Educational", icon: <AcademicCapIcon className="w-5 h-5" /> },
  { value: "Fun / Quirky", label: "Fun / Quirky", icon: <FaceSmileIcon className="w-5 h-5" /> },
  { value: "Other", label: "Other", icon: <SparklesIcon className="w-5 h-5" /> },
];

export default function Step4BrandMessaging({ data, onNext, onBack }: Step4Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step4Input>({
    resolver: zodResolver(step4Schema),
    mode: "onTouched",
    defaultValues: {
      brand: data || {},
    },
  });

  const onSubmit = (formData: Step4Input) => {
    onNext(formData.brand);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Brand & Messaging</h2>
        <p className="text-neutral-400">
          Define your brand personality and communication style
        </p>
      </div>

      <FormField
        label="What brand tone resonates with your audience?"
        icon={<SparklesIcon className="w-4 h-4" />}
        error={errors.brand?.tone?.message}
        required
      >
        <Controller
          name="brand.tone"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={TONE_OPTIONS}
              value={field.value || ""}
              onChange={field.onChange}
              columns={2}
              error={!!errors.brand?.tone}
            />
          )}
        />
      </FormField>

      <FormField
        label="How do you want your brand to be perceived?"
        error={errors.brand?.perception?.message}
        helpText="Describe the emotions and associations you want people to have with your brand"
        required
      >
        <Textarea
          {...register("brand.perception")}
          placeholder="e.g., Trustworthy, innovative, customer-focused, cutting-edge..."
          rows={3}
          error={!!errors.brand?.perception}
        />
      </FormField>

      <FormField
        label="What makes your offering unique?"
        error={errors.brand?.unique_value?.message}
        helpText="What sets you apart from competitors?"
        required
      >
        <Textarea
          {...register("brand.unique_value")}
          placeholder="Describe your unique value proposition..."
          rows={3}
          error={!!errors.brand?.unique_value}
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
