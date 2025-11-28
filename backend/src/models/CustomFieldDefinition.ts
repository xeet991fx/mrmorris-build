import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICustomFieldDefinition extends Document {
  workspaceId: Types.ObjectId;
  entityType: "contact" | "company";
  fieldKey: string;
  fieldLabel: string;
  fieldType: "text" | "number" | "select";
  selectOptions?: string[];
  isRequired: boolean;
  defaultValue?: any;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldDefinitionSchema = new Schema<ICustomFieldDefinition>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Workspace ID is required"],
      index: true,
    },
    entityType: {
      type: String,
      enum: ["contact", "company"],
      required: [true, "Entity type is required"],
      index: true,
    },
    fieldKey: {
      type: String,
      required: [true, "Field key is required"],
      trim: true,
      lowercase: true,
      match: [
        /^custom_[a-z0-9_]+$/,
        "Field key must start with 'custom_' and contain only lowercase letters, numbers, and underscores",
      ],
      maxlength: [50, "Field key must be less than 50 characters"],
    },
    fieldLabel: {
      type: String,
      required: [true, "Field label is required"],
      trim: true,
      minlength: [1, "Field label must be at least 1 character"],
      maxlength: [100, "Field label must be less than 100 characters"],
    },
    fieldType: {
      type: String,
      enum: ["text", "number", "select"],
      required: [true, "Field type is required"],
    },
    selectOptions: {
      type: [String],
      validate: {
        validator: function (this: ICustomFieldDefinition, v: string[]) {
          // If field type is select, options must be provided and non-empty
          if (this.fieldType === "select") {
            return v && v.length > 0 && v.length <= 50;
          }
          return true;
        },
        message: "Select type fields must have 1-50 options",
      },
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Order must be a positive number"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one fieldKey per workspace per entity type
customFieldDefinitionSchema.index({ workspaceId: 1, entityType: 1, fieldKey: 1 }, { unique: true });

// Performance index for queries
customFieldDefinitionSchema.index({ workspaceId: 1, isActive: 1, order: 1 });

const CustomFieldDefinition = mongoose.model<ICustomFieldDefinition>(
  "CustomFieldDefinition",
  customFieldDefinitionSchema
);

export default CustomFieldDefinition;
