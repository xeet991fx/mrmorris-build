import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { CreateContactInput, UpdateContactInput } from "@/lib/validations/contact";
import TextInput from "../forms/TextInput";
import Textarea from "../forms/Textarea";
import SelectDropdown from "../forms/SelectDropdown";

interface ContactFormProps {
  form: UseFormReturn<CreateContactInput> | UseFormReturn<UpdateContactInput>;
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
  { value: "inactive", label: "Inactive" },
];

export default function ContactForm({ form }: ContactFormProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const [source, setSource] = useState("");
  const [status, setStatus] = useState("lead");
  const [tagInput, setTagInput] = useState("");

  // Watch tags field
  const watchedTags = watch("tags" as any);
  const tags: string[] = Array.isArray(watchedTags) ? watchedTags : [];

  // Initialize from form values
  useEffect(() => {
    const formValues = form.getValues();
    if (formValues.source) setSource(formValues.source);
    if (formValues.status) setStatus(formValues.status);
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
    <div className="space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            First Name <span className="text-red-400">*</span>
          </label>
          <TextInput
            error={!!errors.firstName}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Last Name <span className="text-red-400">*</span>
          </label>
          <TextInput
            error={!!errors.lastName}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email and Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <TextInput
            type="email"
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>
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
      </div>

      {/* Company and Job Title */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Company
          </label>
          <TextInput
            error={!!errors.company}
            {...register("company")}
          />
          {errors.company && (
            <p className="mt-1 text-xs text-red-400">{errors.company.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Job Title
          </label>
          <TextInput
            error={!!errors.jobTitle}
            {...register("jobTitle")}
          />
          {errors.jobTitle && (
            <p className="mt-1 text-xs text-red-400">{errors.jobTitle.message}</p>
          )}
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Social Profiles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              LinkedIn
            </label>
            <TextInput
              type="url"
              placeholder="https://linkedin.com/in/..."
              error={!!errors.linkedin}
              {...register("linkedin")}
            />
            {errors.linkedin && (
              <p className="mt-1 text-xs text-red-400">{errors.linkedin.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Twitter
            </label>
            <TextInput
              type="url"
              placeholder="https://twitter.com/..."
              error={!!errors.twitter}
              {...register("twitter")}
            />
            {errors.twitter && (
              <p className="mt-1 text-xs text-red-400">{errors.twitter.message}</p>
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
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              State
            </label>
            <TextInput
              error={!!errors.address?.state}
              {...register("address.state")}
            />
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
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Zip Code
            </label>
            <TextInput
              error={!!errors.address?.zipCode}
              {...register("address.zipCode")}
            />
          </div>
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
              setValue("status" as any, value as "lead" | "prospect" | "customer" | "inactive");
            }}
            placeholder="Select status"
          />
          {errors.status && (
            <p className="mt-1 text-xs text-red-400">{errors.status.message}</p>
          )}
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
