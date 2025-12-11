import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { CreateCompanyInput, UpdateCompanyInput } from "@/lib/validations/company";
import TextInput from "../forms/TextInput";
import Textarea from "../forms/Textarea";
import SelectDropdown from "../forms/SelectDropdown";

interface CompanyFormProps {
  form: UseFormReturn<CreateCompanyInput> | UseFormReturn<UpdateCompanyInput>;
}

const LEAD_SOURCES = [
  { value: "", label: "Select source" },
  { value: "Direct Contact", label: "Direct Contact" },
  { value: "Website", label: "Website" },
  { value: "Social Media", label: "Social Media" },
  { value: "Referral", label: "Referral" },
  { value: "Event", label: "Event" },
  { value: "Cold Outreach", label: "Cold Outreach" },
  { value: "Partner", label: "Partner" },
  { value: "Other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "churned", label: "Churned" },
];

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Select company size" },
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

export default function CompanyForm({ form }: CompanyFormProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const [source, setSource] = useState("");
  const [status, setStatus] = useState("lead");
  const [companySize, setCompanySize] = useState("");
  const [tagInput, setTagInput] = useState("");

  // Watch tags field
  const watchedTags = watch("tags" as any);
  const tags: string[] = Array.isArray(watchedTags) ? watchedTags : [];

  // Initialize from form values
  useEffect(() => {
    const formValues = form.getValues();
    if (formValues.source) setSource(formValues.source);
    if (formValues.status) setStatus(formValues.status);
    if (formValues.companySize) setCompanySize(formValues.companySize);
  }, [form]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue("tags" as any, [...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue("tags" as any, tags.filter((t: string) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-4">
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Company Name <span className="text-red-400">*</span>
        </label>
        <TextInput
          error={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Industry and Website */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Industry
          </label>
          <TextInput
            error={!!errors.industry}
            {...register("industry")}
          />
          {errors.industry && (
            <p className="mt-1 text-xs text-red-400">{errors.industry.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Website
          </label>
          <TextInput
            type="url"
            placeholder="https://example.com"
            error={!!errors.website}
            {...register("website")}
          />
          {errors.website && (
            <p className="mt-1 text-xs text-red-400">{errors.website.message}</p>
          )}
        </div>
      </div>

      {/* Phone and Company Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Phone
          </label>
          <TextInput
            type="tel"
            error={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Company Size
          </label>
          <SelectDropdown
            options={COMPANY_SIZE_OPTIONS}
            value={companySize}
            onChange={(value) => {
              setCompanySize(value);
              setValue("companySize" as any, value as any);
            }}
            placeholder="Select company size"
          />
          {errors.companySize && (
            <p className="mt-1 text-xs text-red-400">{errors.companySize.message}</p>
          )}
        </div>
      </div>

      {/* Annual Revenue and Employee Count */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Annual Revenue (USD)
          </label>
          <TextInput
            type="number"
            placeholder="0"
            error={!!errors.annualRevenue}
            {...register("annualRevenue", { valueAsNumber: true })}
          />
          {errors.annualRevenue && (
            <p className="mt-1 text-xs text-red-400">{errors.annualRevenue.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Employee Count
          </label>
          <TextInput
            type="number"
            placeholder="0"
            error={!!errors.employeeCount}
            {...register("employeeCount", { valueAsNumber: true })}
          />
          {errors.employeeCount && (
            <p className="mt-1 text-xs text-red-400">{errors.employeeCount.message}</p>
          )}
        </div>
      </div>

      {/* Social Media Links */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Social Media</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              LinkedIn URL
            </label>
            <TextInput
              type="url"
              placeholder="https://linkedin.com/company/..."
              error={!!errors.linkedinUrl}
              {...register("linkedinUrl")}
            />
            {errors.linkedinUrl && (
              <p className="mt-1 text-xs text-red-400">{errors.linkedinUrl.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Twitter URL
            </label>
            <TextInput
              type="url"
              placeholder="https://twitter.com/..."
              error={!!errors.twitterUrl}
              {...register("twitterUrl")}
            />
            {errors.twitterUrl && (
              <p className="mt-1 text-xs text-red-400">{errors.twitterUrl.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Facebook URL
            </label>
            <TextInput
              type="url"
              placeholder="https://facebook.com/..."
              error={!!errors.facebookUrl}
              {...register("facebookUrl")}
            />
            {errors.facebookUrl && (
              <p className="mt-1 text-xs text-red-400">{errors.facebookUrl.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Address</h3>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Street
          </label>
          <TextInput
            error={!!errors.address?.street}
            {...register("address.street")}
          />
          {errors.address?.street && (
            <p className="mt-1 text-xs text-red-400">{errors.address.street.message}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              City
            </label>
            <TextInput
              error={!!errors.address?.city}
              {...register("address.city")}
            />
            {errors.address?.city && (
              <p className="mt-1 text-xs text-red-400">{errors.address.city.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              State
            </label>
            <TextInput
              error={!!errors.address?.state}
              {...register("address.state")}
            />
            {errors.address?.state && (
              <p className="mt-1 text-xs text-red-400">{errors.address.state.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Country
            </label>
            <TextInput
              error={!!errors.address?.country}
              {...register("address.country")}
            />
            {errors.address?.country && (
              <p className="mt-1 text-xs text-red-400">{errors.address.country.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Zip Code
            </label>
            <TextInput
              error={!!errors.address?.zipCode}
              {...register("address.zipCode")}
            />
            {errors.address?.zipCode && (
              <p className="mt-1 text-xs text-red-400">{errors.address.zipCode.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Lead Source and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Lead Source
          </label>
          <SelectDropdown
            options={LEAD_SOURCES}
            value={source}
            onChange={(value) => {
              setSource(value);
              setValue("source" as any, value);
            }}
            placeholder="Select lead source"
          />
          {errors.source && (
            <p className="mt-1 text-xs text-red-400">{errors.source.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Status
          </label>
          <SelectDropdown
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setValue("status" as any, value as "lead" | "prospect" | "customer" | "churned");
            }}
            placeholder="Select status"
          />
          {errors.status && (
            <p className="mt-1 text-xs text-red-400">{errors.status.message}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-primary/70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <TextInput
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Notes
        </label>
        <Textarea
          rows={4}
          error={!!errors.notes}
          {...register("notes")}
        />
        {errors.notes && (
          <p className="mt-1 text-xs text-red-400">{errors.notes.message}</p>
        )}
      </div>
    </div>
  );
}
