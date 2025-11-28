import { z } from "zod";

// Create custom field schema
export const createCustomFieldSchema = z
  .object({
    entityType: z.enum(["contact", "company"], {
      errorMap: () => ({ message: "Entity type must be contact or company" }),
    }),
    fieldLabel: z
      .string()
      .min(1, "Field label is required")
      .max(100, "Field label must be less than 100 characters")
      .trim(),
    fieldType: z.enum(["text", "number", "select"], {
      errorMap: () => ({ message: "Field type must be text, number, or select" }),
    }),
    selectOptions: z
      .array(z.string().trim())
      .min(1, "At least one option is required for select fields")
      .max(50, "Maximum 50 options allowed")
      .optional(),
    isRequired: z.boolean().default(false),
    defaultValue: z.any().optional(),
    order: z.number().int().min(0, "Order must be a positive number").optional(),
  })
  .refine(
    (data) => {
      // If fieldType is select, selectOptions must be provided
      if (data.fieldType === "select") {
        return data.selectOptions && data.selectOptions.length > 0;
      }
      return true;
    },
    {
      message: "Select type fields must have at least one option",
      path: ["selectOptions"],
    }
  );

// Update custom field schema - all fields optional except those that shouldn't change
export const updateCustomFieldSchema = z
  .object({
    fieldLabel: z
      .string()
      .min(1, "Field label is required")
      .max(100, "Field label must be less than 100 characters")
      .trim()
      .optional(),
    selectOptions: z
      .array(z.string().trim())
      .min(1, "At least one option is required for select fields")
      .max(50, "Maximum 50 options allowed")
      .optional(),
    isRequired: z.boolean().optional(),
    order: z.number().int().min(0, "Order must be a positive number").optional(),
    isActive: z.boolean().optional(),
  })
  .optional();

// Validation for custom field values
export const validateCustomFieldValue = (
  value: any,
  fieldType: "text" | "number" | "select",
  selectOptions?: string[],
  isRequired?: boolean
): { valid: boolean; error?: string } => {
  // Check required
  if (isRequired && (value === null || value === undefined || value === "")) {
    return { valid: false, error: "This field is required" };
  }

  // If not required and empty, it's valid
  if (!isRequired && (value === null || value === undefined || value === "")) {
    return { valid: true };
  }

  // Type-specific validation
  switch (fieldType) {
    case "number":
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: "Must be a valid number" };
      }
      break;

    case "select":
      if (selectOptions && !selectOptions.includes(value)) {
        return { valid: false, error: "Invalid selection. Must be one of the available options" };
      }
      break;

    case "text":
      if (typeof value !== "string") {
        return { valid: false, error: "Must be text" };
      }
      if (value.length > 500) {
        return { valid: false, error: "Text too long (max 500 characters)" };
      }
      break;
  }

  return { valid: true };
};

// Type exports for TypeScript
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
