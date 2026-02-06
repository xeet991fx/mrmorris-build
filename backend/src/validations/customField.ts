import { z } from "zod";

// Field type enum
export const fieldTypeEnum = z.enum([
  "text",
  "number",
  "select",
  "date",
  "multiselect",
  "currency",
  "person",
  "relation",
]);

export type FieldType = z.infer<typeof fieldTypeEnum>;

// Entity type enum (now includes deal)
export const entityTypeEnum = z.enum(["contact", "company", "deal"]);

// Relation configuration schema
const relationConfigSchema = z.object({
  targetEntity: entityTypeEnum,
  displayFormat: z.enum(["name", "badge", "avatar"]).default("name"),
  allowMultiple: z.boolean().default(false),
});

// Currency configuration schema
const currencyConfigSchema = z.object({
  defaultCurrency: z.string().length(3, "Currency code must be 3 characters (ISO 4217)").default("USD"),
  showSymbol: z.boolean().default(true),
});

// Create custom field schema
export const createCustomFieldSchema = z
  .object({
    entityType: entityTypeEnum,
    fieldLabel: z
      .string()
      .min(1, "Field label is required")
      .max(100, "Field label must be less than 100 characters")
      .trim(),
    fieldType: fieldTypeEnum,
    selectOptions: z
      .array(z.string().trim())
      .min(1, "At least one option is required for select fields")
      .max(50, "Maximum 50 options allowed")
      .optional(),
    isRequired: z.boolean().default(false),
    defaultValue: z.any().optional(),
    order: z.number().int().min(0, "Order must be a positive number").optional(),
    // New configurations
    relationConfig: relationConfigSchema.optional(),
    currencyConfig: currencyConfigSchema.optional(),
  })
  .refine(
    (data) => {
      // If fieldType is select or multiselect, selectOptions must be provided
      if (data.fieldType === "select" || data.fieldType === "multiselect") {
        return data.selectOptions && data.selectOptions.length > 0;
      }
      return true;
    },
    {
      message: "Select/Multiselect type fields must have at least one option",
      path: ["selectOptions"],
    }
  )
  .refine(
    (data) => {
      // If fieldType is relation, relationConfig must be provided
      if (data.fieldType === "relation") {
        return data.relationConfig && data.relationConfig.targetEntity;
      }
      return true;
    },
    {
      message: "Relation type fields must specify a target entity",
      path: ["relationConfig"],
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
    relationConfig: relationConfigSchema.optional(),
    currencyConfig: currencyConfigSchema.optional(),
  })
  .optional();

// Validation for custom field values
export const validateCustomFieldValue = (
  value: any,
  fieldType: FieldType,
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
    case "currency":
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

    case "multiselect":
      if (!Array.isArray(value)) {
        return { valid: false, error: "Must be an array of selections" };
      }
      if (selectOptions && !value.every((v: string) => selectOptions.includes(v))) {
        return { valid: false, error: "Invalid selection. All values must be from available options" };
      }
      break;

    case "date":
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: "Must be a valid date" };
      }
      break;

    case "relation":
      // Value should be ObjectId string or array of ObjectId strings
      if (Array.isArray(value)) {
        if (!value.every((v: string) => typeof v === "string" && v.length === 24)) {
          return { valid: false, error: "Invalid relation reference(s)" };
        }
      } else if (typeof value !== "string" || value.length !== 24) {
        return { valid: false, error: "Invalid relation reference" };
      }
      break;

    case "person":
      // Value should be ObjectId string (User reference)
      if (typeof value !== "string" || value.length !== 24) {
        return { valid: false, error: "Invalid person reference" };
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
