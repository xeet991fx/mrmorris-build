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
  } = form;

  const [source, setSource] = useState("");
  const [status, setStatus] = useState("lead");

  return (
    <div className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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

      {/* Lead Source and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
