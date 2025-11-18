import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MegaphoneIcon, WrenchScrewdriverIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import CheckboxGroup from "@/components/forms/CheckboxGroup";
import TagsInput from "@/components/forms/TagsInput";
import RadioGroup from "@/components/forms/RadioGroup";
import { step3Schema, type Step3Input } from "@/lib/validations/project";

interface Step3Props {
  data?: any;
  onNext: (data: Step3Input["channels"]) => void;
  onBack: () => void;
}

const CHANNEL_OPTIONS = [
  { value: "Google Ads", label: "Google Ads" },
  { value: "Facebook / Instagram Ads", label: "Facebook / Instagram Ads" },
  { value: "LinkedIn Ads", label: "LinkedIn Ads" },
  { value: "Twitter / X Ads", label: "Twitter / X Ads" },
  { value: "TikTok Ads", label: "TikTok Ads" },
  { value: "YouTube Ads", label: "YouTube Ads" },
  { value: "SEO (Organic Search)", label: "SEO (Organic Search)" },
  { value: "Content Marketing", label: "Content Marketing" },
  { value: "Email Marketing", label: "Email Marketing" },
  { value: "Influencer Marketing", label: "Influencer Marketing" },
  { value: "Affiliate Marketing", label: "Affiliate Marketing" },
  { value: "Community / Reddit", label: "Community / Reddit" },
];

const EXPERIENCE_OPTIONS = [
  { value: "Yes, but results were poor", label: "Yes, but results were poor" },
  { value: "Yes, some success", label: "Yes, some success" },
  { value: "No, starting fresh", label: "No, starting fresh" },
];

export default function Step3ChannelsSetup({ data, onNext, onBack }: Step3Props) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      channels: data || {},
    },
  });

  const onSubmit = (formData: Step3Input) => {
    onNext(formData.channels);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Marketing Channels</h2>
        <p className="text-neutral-400">
          Select your preferred marketing channels and existing tools
        </p>
      </div>

      <FormField
        label="Which marketing channels are you interested in?"
        icon={<MegaphoneIcon className="w-4 h-4" />}
        error={errors.channels?.preferred?.message}
        helpText="Select all that apply"
        required
      >
        <Controller
          name="channels.preferred"
          control={control}
          render={({ field }) => (
            <CheckboxGroup
              options={CHANNEL_OPTIONS}
              value={field.value || []}
              onChange={field.onChange}
              columns={2}
              error={!!errors.channels?.preferred}
            />
          )}
        />
      </FormField>

      <FormField
        label="What marketing tools do you currently use?"
        icon={<WrenchScrewdriverIcon className="w-4 h-4" />}
        helpText="e.g., Google Analytics, HubSpot, Mailchimp, etc. (optional)"
      >
        <Controller
          name="channels.tools"
          control={control}
          render={({ field }) => (
            <TagsInput
              value={field.value || []}
              onChange={field.onChange}
              placeholder="Type a tool name and press Enter"
            />
          )}
        />
      </FormField>

      <FormField
        label="Have you run marketing campaigns before?"
        icon={<AcademicCapIcon className="w-4 h-4" />}
        error={errors.channels?.past_experience?.message}
        required
      >
        <Controller
          name="channels.past_experience"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={EXPERIENCE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value || ""}
              onChange={field.onChange}
              error={!!errors.channels?.past_experience}
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
