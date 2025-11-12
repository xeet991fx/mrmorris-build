import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cog6ToothIcon, DocumentIcon, BuildingOffice2Icon, BoltIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import FormField from "@/components/forms/FormField";
import RadioGroup from "@/components/forms/RadioGroup";
import FileUpload from "@/components/forms/FileUpload";
import { step7Schema, type Step7Input } from "@/lib/validations/project";

interface Step7Props {
  data?: any;
  onComplete: (data: Step7Input["advanced"]) => void;
  onBack: () => void;
  isLoading: boolean;
}

const BUSINESS_TYPE_OPTIONS = [
  { value: "B2B", label: "B2B (Business to Business)" },
  { value: "B2C", label: "B2C (Business to Consumer)" },
  { value: "Both", label: "Both B2B and B2C" },
];

const AUTOMATION_OPTIONS = [
  {
    value: "Fully automated",
    label: "Fully automated",
    description: "Let MrMorris handle everything automatically",
  },
  {
    value: "Notify before changes",
    label: "Notify before changes",
    description: "Get notified before major actions are taken",
  },
  {
    value: "Ask every time",
    label: "Ask every time",
    description: "Require approval for all marketing actions",
  },
];

export default function Step7Advanced({ data, onComplete, onBack, isLoading }: Step7Props) {
  const [files, setFiles] = useState<File[]>([]);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step7Input>({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      advanced: data || {},
    },
  });

  const onSubmit = async (formData: Step7Input) => {
    // In a real app, you would upload files here
    // For now, we'll just store file names
    const fileNames = files.map((f) => f.name);
    onComplete({
      ...formData.advanced,
      uploads: fileNames,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Advanced Settings</h2>
        <p className="text-slate-400">
          Fine-tune your marketing automation preferences
        </p>
      </div>

      <FormField
        label="Upload additional documents (optional)"
        icon={<DocumentIcon className="w-4 h-4" />}
        helpText="Brand guidelines, marketing materials, competitor analysis, etc."
      >
        <FileUpload value={files} onChange={setFiles} maxFiles={5} />
      </FormField>

      <FormField
        label="What type of business model do you have?"
        icon={<BuildingOffice2Icon className="w-4 h-4" />}
        error={errors.advanced?.business_type?.message}
        required
      >
        <Controller
          name="advanced.business_type"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={BUSINESS_TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={field.value || ""}
              onChange={field.onChange}
              error={!!errors.advanced?.business_type}
            />
          )}
        />
      </FormField>

      <FormField
        label="How much automation do you want?"
        icon={<BoltIcon className="w-4 h-4" />}
        error={errors.advanced?.automation_level?.message}
        helpText="You can always change this later in settings"
        required
      >
        <Controller
          name="advanced.automation_level"
          control={control}
          render={({ field }) => (
            <RadioGroup
              options={AUTOMATION_OPTIONS}
              value={field.value || ""}
              onChange={field.onChange}
              error={!!errors.advanced?.automation_level}
            />
          )}
        />
      </FormField>

      {/* Success Message */}
      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              You are Almost Done!
            </h3>
            <p className="text-sm text-slate-300">
              Click Complete Setup to finish onboarding. MrMorris will analyze
              your information and start creating your personalized marketing
              strategy.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 hover:text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-green-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <>
              <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircleIcon className="inline-block w-5 h-5 mr-2" />
              Complete Setup
            </>
          )}
        </button>
      </div>
    </form>
  );
}
