import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * ML Model
 * Stores metadata and performance metrics for trained ML models
 */

export interface ITrainingMetrics {
  accuracy: number; // 0-100
  precision: number; // 0-100
  recall: number; // 0-100
  f1Score: number; // 0-100
  auc: number; // 0-1, Area Under ROC Curve
  confusionMatrix?: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
}

export interface IFeatureConfig {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'date';
  importance?: number; // Global feature importance (0-1)
  enabled: boolean; // Whether this feature is used in current model
}

export interface IMLModel extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId; // Who trained the model

  // Model Identification
  name: string;
  version: string; // e.g., "1.0.0", "2.1.0"
  modelType: 'close_probability' | 'deal_value' | 'churn_prediction' | 'lead_scoring';
  algorithm: 'logistic_regression' | 'random_forest' | 'neural_network' | 'gradient_boosting';

  // Training Data
  trainingDataSize: number; // Number of records used for training
  trainingStartDate: Date;
  trainingEndDate: Date;
  trainingDuration: number; // milliseconds

  // Features
  features: IFeatureConfig[]; // Features used in this model
  targetVariable: string; // What we're predicting (e.g., 'closeProbability')

  // Performance Metrics
  trainingMetrics: ITrainingMetrics;
  validationMetrics?: ITrainingMetrics; // Metrics on validation set
  testMetrics?: ITrainingMetrics; // Metrics on test set

  // Model Status
  status: 'training' | 'active' | 'deprecated' | 'failed';
  isDefault: boolean; // Is this the default model for this workspace?

  // Model Storage
  modelPath?: string; // Path to saved model file (if stored locally)
  modelData?: string; // Serialized model (Base64 encoded TensorFlow.js model)
  modelSize?: number; // Size in bytes

  // Retraining
  lastRetrainedAt?: Date;
  nextRetrainingAt?: Date;
  retrainingFrequency?: number; // days
  autoRetrain: boolean;

  // Usage Stats
  predictionCount: number; // Total predictions made
  averagePredictionTime?: number; // milliseconds
  lastPredictionAt?: Date;

  // Metadata
  description?: string;
  hyperparameters?: Map<string, any>; // Model-specific hyperparameters
  trainingConfig?: Map<string, any>; // Training configuration

  // Error Tracking
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };

  createdAt: Date;
  updatedAt: Date;

  // Methods
  recordPrediction(predictionTime: number): Promise<void>;
}

const trainingMetricsSchema = new Schema<ITrainingMetrics>(
  {
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    precision: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    recall: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    f1Score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    auc: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    confusionMatrix: {
      truePositive: { type: Number },
      trueNegative: { type: Number },
      falsePositive: { type: Number },
      falseNegative: { type: Number },
    },
  },
  { _id: false }
);

const featureConfigSchema = new Schema<IFeatureConfig>(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['numeric', 'categorical', 'boolean', 'date'],
      required: true,
    },
    importance: {
      type: Number,
      min: 0,
      max: 1,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const mlModelSchema = new Schema<IMLModel>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // Model Identification
    name: {
      type: String,
      required: [true, 'Model name is required'],
      trim: true,
      maxlength: [100, 'Model name must be less than 100 characters'],
    },
    version: {
      type: String,
      required: [true, 'Model version is required'],
      trim: true,
    },
    modelType: {
      type: String,
      enum: ['close_probability', 'deal_value', 'churn_prediction', 'lead_scoring'],
      required: [true, 'Model type is required'],
    },
    algorithm: {
      type: String,
      enum: ['logistic_regression', 'random_forest', 'neural_network', 'gradient_boosting'],
      required: [true, 'Algorithm is required'],
    },

    // Training Data
    trainingDataSize: {
      type: Number,
      required: [true, 'Training data size is required'],
      min: 0,
    },
    trainingStartDate: {
      type: Date,
      required: true,
    },
    trainingEndDate: {
      type: Date,
      required: true,
    },
    trainingDuration: {
      type: Number,
      required: true,
      min: 0,
    },

    // Features
    features: {
      type: [featureConfigSchema],
      required: [true, 'Features are required'],
      validate: {
        validator: (features: IFeatureConfig[]) => features.length > 0,
        message: 'At least one feature is required',
      },
    },
    targetVariable: {
      type: String,
      required: [true, 'Target variable is required'],
    },

    // Performance Metrics
    trainingMetrics: {
      type: trainingMetricsSchema,
      required: [true, 'Training metrics are required'],
    },
    validationMetrics: trainingMetricsSchema,
    testMetrics: trainingMetricsSchema,

    // Model Status
    status: {
      type: String,
      enum: ['training', 'active', 'deprecated', 'failed'],
      default: 'training',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },

    // Model Storage
    modelPath: String,
    modelData: String,
    modelSize: {
      type: Number,
      min: 0,
    },

    // Retraining
    lastRetrainedAt: Date,
    nextRetrainingAt: Date,
    retrainingFrequency: {
      type: Number,
      min: 1,
      default: 30, // 30 days
    },
    autoRetrain: {
      type: Boolean,
      default: false,
    },

    // Usage Stats
    predictionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averagePredictionTime: {
      type: Number,
      min: 0,
    },
    lastPredictionAt: Date,

    // Metadata
    description: {
      type: String,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
    hyperparameters: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },
    trainingConfig: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },

    // Error Tracking
    lastError: {
      message: String,
      timestamp: Date,
      stack: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
mlModelSchema.index({ workspaceId: 1, modelType: 1, status: 1 });
mlModelSchema.index({ workspaceId: 1, isDefault: 1 });
mlModelSchema.index({ workspaceId: 1, version: -1 });

// Ensure only one default model per workspace and model type
mlModelSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset other default models of the same type
    await mongoose.model('MLModel').updateMany(
      {
        workspaceId: this.workspaceId,
        modelType: this.modelType,
        _id: { $ne: this._id },
      },
      { isDefault: false }
    );
  }
  next();
});

// Method to increment prediction count
mlModelSchema.methods.recordPrediction = async function (predictionTime: number) {
  this.predictionCount += 1;
  this.lastPredictionAt = new Date();

  // Update average prediction time
  if (!this.averagePredictionTime) {
    this.averagePredictionTime = predictionTime;
  } else {
    this.averagePredictionTime = (this.averagePredictionTime * (this.predictionCount - 1) + predictionTime) / this.predictionCount;
  }

  await this.save();
};

const MLModel = mongoose.model<IMLModel>('MLModel', mlModelSchema);

export default MLModel;
