import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Predictive Score Model
 * Stores ML predictions for opportunities (deal close probability)
 */

export interface IFeatureImportance {
  featureName: string;
  importance: number; // 0-1
  value: any; // The actual value of this feature for this prediction
}

export interface IPredictiveScore extends Document {
  workspaceId: Types.ObjectId;
  opportunityId: Types.ObjectId;
  modelId: Types.ObjectId; // Which ML model generated this prediction

  // Prediction
  closeProbability: number; // 0-100, predicted chance of closing
  predictedValue?: number; // Predicted deal value
  predictedCloseDate?: Date; // Predicted close date
  confidence: number; // 0-100, model confidence in this prediction

  // Feature Importance (Explainability)
  featureImportances: IFeatureImportance[]; // Which features influenced this prediction
  topPositiveFactors: string[]; // Top 3 factors increasing close probability
  topNegativeFactors: string[]; // Top 3 factors decreasing close probability

  // Risk Assessment
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];

  // Recommendations
  recommendedActions: string[]; // AI-recommended next steps to increase close probability

  // Metadata
  predictedAt: Date;
  modelVersion: string; // Version of the model that made this prediction
  features: Map<string, any>; // Raw feature values used for prediction

  // Tracking
  isActual?: boolean; // Did the deal close?
  actualClosedAt?: Date;
  actualValue?: number;
  predictionAccuracy?: number; // 0-100, how accurate was the prediction (calculated post-close)

  createdAt: Date;
  updatedAt: Date;
}

const featureImportanceSchema = new Schema<IFeatureImportance>(
  {
    featureName: {
      type: String,
      required: true,
    },
    importance: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    value: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const predictiveScoreSchema = new Schema<IPredictiveScore>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity ID is required'],
      index: true,
    },
    modelId: {
      type: Schema.Types.ObjectId,
      ref: 'MLModel',
      required: [true, 'Model ID is required'],
      index: true,
    },

    // Prediction
    closeProbability: {
      type: Number,
      required: [true, 'Close probability is required'],
      min: 0,
      max: 100,
    },
    predictedValue: {
      type: Number,
      min: 0,
    },
    predictedCloseDate: {
      type: Date,
    },
    confidence: {
      type: Number,
      required: [true, 'Confidence is required'],
      min: 0,
      max: 100,
    },

    // Feature Importance
    featureImportances: {
      type: [featureImportanceSchema],
      default: [],
    },
    topPositiveFactors: {
      type: [String],
      default: [],
    },
    topNegativeFactors: {
      type: [String],
      default: [],
    },

    // Risk Assessment
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    riskFactors: {
      type: [String],
      default: [],
    },

    // Recommendations
    recommendedActions: {
      type: [String],
      default: [],
    },

    // Metadata
    predictedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    modelVersion: {
      type: String,
      required: true,
    },
    features: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },

    // Tracking
    isActual: {
      type: Boolean,
    },
    actualClosedAt: {
      type: Date,
    },
    actualValue: {
      type: Number,
    },
    predictionAccuracy: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
predictiveScoreSchema.index({ workspaceId: 1, opportunityId: 1, predictedAt: -1 });
predictiveScoreSchema.index({ workspaceId: 1, modelId: 1 });
predictiveScoreSchema.index({ workspaceId: 1, closeProbability: -1 }); // For sorting by probability
predictiveScoreSchema.index({ workspaceId: 1, riskLevel: 1 }); // For filtering by risk

// Method to calculate prediction accuracy after deal closes
predictiveScoreSchema.methods.calculateAccuracy = function (actualResult: 'won' | 'lost', actualValue?: number) {
  // Accuracy based on binary outcome (won/lost)
  const predicted = this.closeProbability > 50 ? 'won' : 'lost';
  const outcomeAccuracy = predicted === actualResult ? 100 : 0;

  // If we predicted value, calculate value accuracy
  let valueAccuracy = 100;
  if (this.predictedValue && actualValue) {
    const error = Math.abs(this.predictedValue - actualValue);
    const percentError = (error / actualValue) * 100;
    valueAccuracy = Math.max(0, 100 - percentError);
  }

  // Combined accuracy (weighted: 70% outcome, 30% value)
  this.predictionAccuracy = outcomeAccuracy * 0.7 + valueAccuracy * 0.3;
  this.isActual = true;
  this.actualClosedAt = new Date();
  this.actualValue = actualValue;
};

const PredictiveScore = mongoose.model<IPredictiveScore>('PredictiveScore', predictiveScoreSchema);

export default PredictiveScore;
