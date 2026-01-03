import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IContactList extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;

  name: string;
  description?: string;

  // List type
  type: 'static' | 'dynamic';

  // For static lists: manually added contacts
  contacts?: Types.ObjectId[];

  // For dynamic lists: filter criteria
  filters?: {
    conditions: Array<{
      field: string; // e.g., 'status', 'leadScore.grade', 'tags', 'lastContactedAt'
      operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
      value: any;
    }>;
    logic: 'AND' | 'OR'; // How to combine conditions
  };

  // Cached count for dynamic lists (updated periodically)
  cachedCount?: number;
  lastCountUpdate?: Date;

  // Metadata
  color?: string; // For UI display
  icon?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ContactListSchema: Schema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['static', 'dynamic'],
      required: true,
      default: 'static',
    },
    contacts: [{
      type: Schema.Types.ObjectId,
      ref: 'Contact',
    }],
    filters: {
      conditions: [{
        field: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'not_exists'],
        },
        value: Schema.Types.Mixed,
      }],
      logic: {
        type: String,
        enum: ['AND', 'OR'],
        default: 'AND',
      },
    },
    cachedCount: Number,
    lastCountUpdate: Date,
    color: String,
    icon: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
ContactListSchema.index({ workspaceId: 1, type: 1 });
ContactListSchema.index({ workspaceId: 1, userId: 1 });

// Methods
ContactListSchema.methods.getContactCount = async function() {
  if (this.type === 'static') {
    return this.contacts?.length || 0;
  }

  // For dynamic lists, we need to execute the query
  // This will be implemented in the service layer
  return this.cachedCount || 0;
};

export default mongoose.model<IContactList>('ContactList', ContactListSchema);
