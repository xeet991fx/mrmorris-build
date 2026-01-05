/**
 * Field Mapping Model
 *
 * Stores custom field mappings between CRM and Salesforce objects
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export type ObjectType = 'contact' | 'account' | 'opportunity' | 'task' | 'event';
export type MappingType = 'standard' | 'custom';

export interface IFieldMap {
    crmField: string; // Field name in CRM (e.g., 'firstName')
    salesforceField: string; // Field API name in Salesforce (e.g., 'FirstName')
    type: MappingType;
    dataType?: string; // string, number, boolean, date, etc.
    isRequired?: boolean;
    defaultValue?: any;
    transformFunction?: string; // Optional transformation logic
}

export interface IFieldMapping extends Document {
    workspaceId: Types.ObjectId;
    integrationId: Types.ObjectId;

    // Object type this mapping applies to
    objectType: ObjectType;

    // Field mappings
    mappings: IFieldMap[];

    // Default mappings (read-only, system-generated)
    useDefaultMappings: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const FieldMapSchema = new Schema<IFieldMap>({
    crmField: {
        type: String,
        required: true,
    },
    salesforceField: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['standard', 'custom'],
        default: 'standard',
    },
    dataType: String,
    isRequired: Boolean,
    defaultValue: Schema.Types.Mixed,
    transformFunction: String,
}, { _id: false });

const FieldMappingSchema = new Schema<IFieldMapping>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true,
        },
        integrationId: {
            type: Schema.Types.ObjectId,
            ref: 'SalesforceIntegration',
            required: true,
        },

        // Object type
        objectType: {
            type: String,
            enum: ['contact', 'account', 'opportunity', 'task', 'event'],
            required: true,
        },

        // Field mappings
        mappings: [FieldMapSchema],

        // Use defaults
        useDefaultMappings: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
FieldMappingSchema.index({ workspaceId: 1, objectType: 1 }, { unique: true });
FieldMappingSchema.index({ integrationId: 1 });

// Static method to get default mappings
FieldMappingSchema.statics.getDefaultMappings = function(objectType: ObjectType): IFieldMap[] {
    const defaults: { [key in ObjectType]: IFieldMap[] } = {
        contact: [
            { crmField: 'firstName', salesforceField: 'FirstName', type: 'standard', dataType: 'string' },
            { crmField: 'lastName', salesforceField: 'LastName', type: 'standard', dataType: 'string' },
            { crmField: 'email', salesforceField: 'Email', type: 'standard', dataType: 'string', isRequired: true },
            { crmField: 'phone', salesforceField: 'Phone', type: 'standard', dataType: 'string' },
            { crmField: 'company', salesforceField: 'Company', type: 'standard', dataType: 'string' },
            { crmField: 'jobTitle', salesforceField: 'Title', type: 'standard', dataType: 'string' },
            { crmField: 'status', salesforceField: 'Status__c', type: 'custom', dataType: 'string' },
            { crmField: 'source', salesforceField: 'LeadSource', type: 'standard', dataType: 'string' },
        ],
        account: [
            { crmField: 'name', salesforceField: 'Name', type: 'standard', dataType: 'string', isRequired: true },
            { crmField: 'website', salesforceField: 'Website', type: 'standard', dataType: 'string' },
            { crmField: 'industry', salesforceField: 'Industry', type: 'standard', dataType: 'string' },
            { crmField: 'employeeCount', salesforceField: 'NumberOfEmployees', type: 'standard', dataType: 'number' },
            { crmField: 'revenue', salesforceField: 'AnnualRevenue', type: 'standard', dataType: 'number' },
            { crmField: 'phone', salesforceField: 'Phone', type: 'standard', dataType: 'string' },
            { crmField: 'address', salesforceField: 'BillingStreet', type: 'standard', dataType: 'string' },
            { crmField: 'city', salesforceField: 'BillingCity', type: 'standard', dataType: 'string' },
            { crmField: 'state', salesforceField: 'BillingState', type: 'standard', dataType: 'string' },
            { crmField: 'country', salesforceField: 'BillingCountry', type: 'standard', dataType: 'string' },
        ],
        opportunity: [
            { crmField: 'name', salesforceField: 'Name', type: 'standard', dataType: 'string', isRequired: true },
            { crmField: 'amount', salesforceField: 'Amount', type: 'standard', dataType: 'number' },
            { crmField: 'stage', salesforceField: 'StageName', type: 'standard', dataType: 'string', isRequired: true },
            { crmField: 'closeDate', salesforceField: 'CloseDate', type: 'standard', dataType: 'date', isRequired: true },
            { crmField: 'probability', salesforceField: 'Probability', type: 'standard', dataType: 'number' },
            { crmField: 'description', salesforceField: 'Description', type: 'standard', dataType: 'string' },
            { crmField: 'type', salesforceField: 'Type', type: 'standard', dataType: 'string' },
            { crmField: 'source', salesforceField: 'LeadSource', type: 'standard', dataType: 'string' },
        ],
        task: [
            { crmField: 'title', salesforceField: 'Subject', type: 'standard', dataType: 'string', isRequired: true },
            { crmField: 'description', salesforceField: 'Description', type: 'standard', dataType: 'string' },
            { crmField: 'dueDate', salesforceField: 'ActivityDate', type: 'standard', dataType: 'date' },
            { crmField: 'priority', salesforceField: 'Priority', type: 'standard', dataType: 'string' },
            { crmField: 'status', salesforceField: 'Status', type: 'standard', dataType: 'string' },
        ],
        event: [
            { crmField: 'title', salesforceField: 'Subject', type: 'standard', dataType: 'string', isRequired: true },
            { crmField: 'startDate', salesforceField: 'StartDateTime', type: 'standard', dataType: 'datetime', isRequired: true },
            { crmField: 'endDate', salesforceField: 'EndDateTime', type: 'standard', dataType: 'datetime', isRequired: true },
            { crmField: 'location', salesforceField: 'Location', type: 'standard', dataType: 'string' },
            { crmField: 'description', salesforceField: 'Description', type: 'standard', dataType: 'string' },
        ],
    };

    return defaults[objectType] || [];
};

const FieldMapping = mongoose.model<IFieldMapping>('FieldMapping', FieldMappingSchema);

export default FieldMapping;
