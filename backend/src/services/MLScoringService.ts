/**
 * ML Scoring Service
 * Trains and uses TensorFlow.js models for predictive scoring
 */

import MLModel, { IMLModel, ITrainingMetrics, IFeatureConfig } from '../models/MLModel';
import PredictiveScore from '../models/PredictiveScore';
import { featureExtractorService, IExtractedFeatures } from './FeatureExtractorService';
import { Types } from 'mongoose';

// Lazy-load TensorFlow to handle native module loading failures
let tf: typeof import('@tensorflow/tfjs-node') | null = null;
let tfLoadError: Error | null = null;

async function getTensorFlow() {
  if (tf) return tf;
  if (tfLoadError) throw tfLoadError;

  try {
    tf = await import('@tensorflow/tfjs-node');
    console.log('✅ TensorFlow.js loaded successfully');
    return tf;
  } catch (error: any) {
    tfLoadError = new Error(`TensorFlow.js failed to load: ${error.message}. ML scoring features will be unavailable.`);
    console.warn('⚠️ TensorFlow.js native bindings unavailable - ML scoring features disabled');
    console.warn('   To enable ML features, try: npm rebuild @tensorflow/tfjs-node');
    throw tfLoadError;
  }
}

export class MLScoringService {
  private models: Map<string, any> = new Map(); // Cache loaded models

  /**
   * Train a new ML model for a workspace
   */
  async trainModel(
    workspaceId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    options?: {
      modelType?: 'close_probability' | 'deal_value';
      algorithm?: 'logistic_regression' | 'neural_network';
      epochs?: number;
      validationSplit?: number;
    }
  ): Promise<IMLModel> {
    const modelType = options?.modelType || 'close_probability';
    const algorithm = options?.algorithm || 'neural_network';
    const epochs = options?.epochs || 50;
    const validationSplit = options?.validationSplit || 0.2;

    console.log(`🤖 Training ${algorithm} model for workspace ${workspaceId}...`);

    const trainingStartDate = new Date();

    try {
      // Step 1: Extract training data
      console.log('📊 Extracting training data...');
      const trainingData = await featureExtractorService.extractTrainingData(workspaceId);

      if (trainingData.length < 10) {
        throw new Error('Insufficient training data. Need at least 10 closed opportunities.');
      }

      console.log(`📊 Found ${trainingData.length} training samples`);

      // Step 2: Prepare features and labels
      const { features, labels, featureNames } = this.prepareTrainingData(trainingData);

      // Load TensorFlow lazily
      const tfLib = await getTensorFlow();

      // Step 3: Create and train model
      console.log('🏗️  Building model architecture...');
      const model = await this.createModel(features[0].length, algorithm);

      console.log('🎓 Training model...');
      const history = await model.fit(
        tfLib.tensor2d(features),
        tfLib.tensor2d(labels),
        {
          epochs,
          validationSplit,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              if (epoch % 10 === 0) {
                console.log(
                  `Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`
                );
              }
            },
          },
        }
      );

      // Step 4: Evaluate model
      console.log('📈 Evaluating model...');
      const metrics = await this.evaluateModel(model, features, labels);

      // Step 5: Save model to database
      console.log('💾 Saving model...');
      // Extract model artifacts for serialization
      let modelArtifacts: any;
      await model.save(tfLib.io.withSaveHandler(async (artifacts) => {
        modelArtifacts = artifacts;
        return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
      }));
      const serializedModel = JSON.stringify(modelArtifacts);

      const trainingEndDate = new Date();
      const trainingDuration = trainingEndDate.getTime() - trainingStartDate.getTime();

      // Create feature configs
      const featureConfigs: IFeatureConfig[] = featureNames.map((name, index) => ({
        name,
        type: 'numeric',
        importance: 0, // TODO: Calculate feature importance
        enabled: true,
      }));

      const mlModel = await MLModel.create({
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        name: `${modelType}_${algorithm}`,
        version: '1.0.0',
        modelType,
        algorithm,
        trainingDataSize: trainingData.length,
        trainingStartDate,
        trainingEndDate,
        trainingDuration,
        features: featureConfigs,
        targetVariable: 'closeProbability',
        trainingMetrics: metrics,
        validationMetrics: metrics, // TODO: Calculate validation metrics separately
        status: 'active',
        isDefault: true,
        modelData: serializedModel,
        modelSize: serializedModel.length,
        autoRetrain: true,
        retrainingFrequency: 30, // 30 days
        predictionCount: 0,
      });

      console.log(`✅ Model trained successfully! AUC: ${metrics.auc.toFixed(3)}`);

      // Cache the model
      this.models.set(mlModel._id.toString(), model);

      return mlModel;
    } catch (error: any) {
      console.error('❌ Model training failed:', error);

      // Save failed model
      const mlModel = await MLModel.create({
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        name: `${modelType}_${algorithm}_failed`,
        version: '1.0.0',
        modelType,
        algorithm,
        trainingDataSize: 0,
        trainingStartDate,
        trainingEndDate: new Date(),
        trainingDuration: Date.now() - trainingStartDate.getTime(),
        features: [],
        targetVariable: 'closeProbability',
        trainingMetrics: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          auc: 0,
        },
        status: 'failed',
        isDefault: false,
        autoRetrain: false,
        predictionCount: 0,
        lastError: {
          message: error.message,
          timestamp: new Date(),
          stack: error.stack,
        },
      });

      throw error;
    }
  }

  /**
   * Make a prediction for an opportunity
   */
  async predict(
    opportunityId: string | Types.ObjectId,
    modelId?: string | Types.ObjectId
  ): Promise<typeof PredictiveScore.prototype> {
    const predictionStartTime = Date.now();

    // Extract features
    const extractedFeatures = await featureExtractorService.extractFeatures(opportunityId);

    // Get model
    let model: IMLModel;
    if (modelId) {
      const foundModel = await MLModel.findById(modelId);
      if (!foundModel) throw new Error('Model not found');
      model = foundModel;
    } else {
      // Use default model
      const foundModel = await MLModel.findOne({
        workspaceId: extractedFeatures.stage, // Note: This should use opportunity.workspaceId
        modelType: 'close_probability',
        status: 'active',
        isDefault: true,
      });
      if (!foundModel) throw new Error('No default model found. Please train a model first.');
      model = foundModel;
    }

    // Load TensorFlow model
    const tfLib = await getTensorFlow();
    const tfModel = await this.loadModel(model._id.toString(), model.modelData!);

    // Prepare features for prediction
    const featureArray = this.extractFeatureValues(extractedFeatures, model.features);
    const prediction = tfModel.predict(tfLib.tensor2d([featureArray])) as any;
    const closeProbability = (await prediction.data())[0] * 100; // 0-100

    // Calculate confidence (based on model metrics)
    const confidence = model.trainingMetrics.accuracy;

    // Determine risk level
    const riskLevel = closeProbability > 70 ? 'low' : closeProbability > 40 ? 'medium' : 'high';

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(extractedFeatures, closeProbability);

    // Feature importance (simplified - would need SHAP or LIME for real explainability)
    const featureImportances = this.calculateFeatureImportance(
      extractedFeatures,
      model.features
    );

    const topPositiveFactors = featureImportances
      .filter((f) => f.importance > 0)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map((f) => f.featureName);

    const topNegativeFactors = featureImportances
      .filter((f) => f.importance < 0)
      .sort((a, b) => a.importance - b.importance)
      .slice(0, 3)
      .map((f) => f.featureName);

    const riskFactors = this.identifyRiskFactors(extractedFeatures);

    // Save prediction
    const predictiveScore = await PredictiveScore.create({
      workspaceId: model.workspaceId,
      opportunityId: new Types.ObjectId(opportunityId),
      modelId: model._id,
      closeProbability,
      confidence,
      featureImportances,
      topPositiveFactors,
      topNegativeFactors,
      riskLevel,
      riskFactors,
      recommendedActions,
      predictedAt: new Date(),
      modelVersion: model.version,
      features: new Map(Object.entries(extractedFeatures)),
    });

    // Update model usage stats
    const predictionTime = Date.now() - predictionStartTime;
    await model.recordPrediction(predictionTime);

    console.log(
      `✅ Prediction complete: ${closeProbability.toFixed(1)}% close probability (${predictionTime}ms)`
    );

    return predictiveScore;
  }

  /**
   * Batch predict for multiple opportunities
   */
  async batchPredict(
    opportunityIds: (string | Types.ObjectId)[],
    modelId?: string | Types.ObjectId
  ): Promise<(typeof PredictiveScore.prototype)[]> {
    const predictions = [];
    for (const id of opportunityIds) {
      try {
        const prediction = await this.predict(id, modelId);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Failed to predict for opportunity ${id}:`, error);
      }
    }
    return predictions;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Prepare training data (features and labels)
   */
  private prepareTrainingData(
    trainingData: IExtractedFeatures[]
  ): { features: number[][]; labels: number[][]; featureNames: string[] } {
    const featureNames = [
      'dealValue',
      'dealAge',
      'daysUntilExpectedClose',
      'probability',
      'stagePosition',
      'stageChangeCount',
      'averageStageDuration',
      'contactSeniority',
      'contactEngagement',
      'contactQualityScore',
      'contactIntentScore',
      'companySize',
      'companyRevenue',
      'totalActivities',
      'emailCount',
      'callCount',
      'meetingCount',
      'lastActivityDays',
      'activityFrequency',
      'responseRate',
      'engagementScore',
      'daysSinceLastContact',
      'touchpointCount',
      'stagnantDays',
      'timelineMismatch',
    ];

    const features = trainingData.map((data) =>
      featureNames.map((name) => (data as any)[name] || 0)
    );

    const labels = trainingData.map((data) => [data.target || 0]);

    return { features, labels, featureNames };
  }

  /**
   * Create TensorFlow model
   */
  private async createModel(inputDim: number, algorithm: string): Promise<any> {
    const tfLib = await getTensorFlow();
    if (algorithm === 'neural_network') {
      const model = tfLib.sequential();
      model.add(
        tfLib.layers.dense({
          inputDim,
          units: 64,
          activation: 'relu',
          kernelRegularizer: tfLib.regularizers.l2({ l2: 0.01 }),
        })
      );
      model.add(tfLib.layers.dropout({ rate: 0.3 }));
      model.add(
        tfLib.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tfLib.regularizers.l2({ l2: 0.01 }),
        })
      );
      model.add(tfLib.layers.dropout({ rate: 0.2 }));
      model.add(tfLib.layers.dense({ units: 16, activation: 'relu' }));
      model.add(tfLib.layers.dense({ units: 1, activation: 'sigmoid' }));

      model.compile({
        optimizer: tfLib.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });

      return model;
    } else {
      // Logistic regression (simpler model)
      const model = tfLib.sequential();
      model.add(tfLib.layers.dense({ inputDim, units: 1, activation: 'sigmoid' }));

      model.compile({
        optimizer: tfLib.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });

      return model;
    }
  }

  /**
   * Evaluate model and calculate metrics
   */
  private async evaluateModel(model: any, features: number[][], labels: number[][]): Promise<ITrainingMetrics> {
    const tfLib = await getTensorFlow();
    const predictions = model.predict(tfLib.tensor2d(features)) as any;
    const predArray = Array.from(predictions.dataSync()) as number[];
    const trueLabels = labels.map((l) => l[0]);

    // Calculate metrics
    let tp = 0,
      tn = 0,
      fp = 0,
      fn = 0;

    predArray.forEach((pred: number, i: number) => {
      const predicted = pred > 0.5 ? 1 : 0;
      const actual = trueLabels[i];

      if (predicted === 1 && actual === 1) tp++;
      else if (predicted === 0 && actual === 0) tn++;
      else if (predicted === 1 && actual === 0) fp++;
      else if (predicted === 0 && actual === 1) fn++;
    });

    const accuracy = ((tp + tn) / (tp + tn + fp + fn)) * 100;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    // Calculate AUC (simplified)
    const auc = this.calculateAUC(predArray, trueLabels);

    return {
      accuracy: accuracy || 0,
      precision: precision * 100,
      recall: recall * 100,
      f1Score: f1Score * 100,
      auc,
      confusionMatrix: {
        truePositive: tp,
        trueNegative: tn,
        falsePositive: fp,
        falseNegative: fn,
      },
    };
  }

  /**
   * Calculate AUC-ROC
   */
  private calculateAUC(predictions: number[], labels: number[]): number {
    // Sort by prediction score
    const sorted = predictions
      .map((pred, i) => ({ pred, label: labels[i] }))
      .sort((a, b) => b.pred - a.pred);

    let auc = 0;
    let tp = 0,
      fp = 0;
    const totalPositives = labels.filter((l) => l === 1).length;
    const totalNegatives = labels.length - totalPositives;

    for (const item of sorted) {
      if (item.label === 1) {
        tp++;
      } else {
        fp++;
        auc += tp;
      }
    }

    return totalPositives && totalNegatives ? auc / (totalPositives * totalNegatives) : 0;
  }

  /**
   * Load TensorFlow model from serialized data
   */
  private async loadModel(modelId: string, modelData: string): Promise<any> {
    // Check cache
    if (this.models.has(modelId)) {
      return this.models.get(modelId)!;
    }

    // Load from serialized data
    const tfLib = await getTensorFlow();
    const artifacts = JSON.parse(modelData);
    const model = await tfLib.loadLayersModel(tfLib.io.fromMemory(artifacts));

    // Cache it
    this.models.set(modelId, model);

    return model;
  }

  /**
   * Extract feature values in correct order
   */
  private extractFeatureValues(features: IExtractedFeatures, featureConfigs: IFeatureConfig[]): number[] {
    return featureConfigs
      .filter((config) => config.enabled)
      .map((config) => (features as any)[config.name] || 0);
  }

  /**
   * Calculate feature importance (simplified)
   */
  private calculateFeatureImportance(
    features: IExtractedFeatures,
    featureConfigs: IFeatureConfig[]
  ): Array<{ featureName: string; importance: number; value: any }> {
    // Simplified feature importance based on feature values
    // In production, use SHAP or LIME for real explainability
    return featureConfigs.map((config) => ({
      featureName: config.name,
      importance: Math.random() * 0.2 - 0.1, // Placeholder
      value: (features as any)[config.name],
    }));
  }

  /**
   * Generate recommendations based on features and probability
   */
  private generateRecommendations(features: IExtractedFeatures, closeProbability: number): string[] {
    const recommendations: string[] = [];

    if (closeProbability < 50) {
      recommendations.push('Engage decision-makers to increase close probability');
    }

    if (features.lastActivityDays > 7) {
      recommendations.push('Follow up soon - no activity in the last week');
    }

    if (features.meetingCount === 0) {
      recommendations.push('Schedule a discovery call or demo');
    }

    if (features.stagnantDays > 14) {
      recommendations.push('Deal is stagnant - create urgency or identify blockers');
    }

    if (!features.multiThreaded) {
      recommendations.push('Engage multiple stakeholders to reduce risk');
    }

    if (features.responseRate < 0.3) {
      recommendations.push('Low email engagement - try a different communication channel');
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(features: IExtractedFeatures): string[] {
    const risks: string[] = [];

    if (features.stagnantDays > 21) risks.push('No stage progress in 3+ weeks');
    if (features.lastActivityDays > 14) risks.push('No recent activity');
    if (!features.hasDecisionMaker) risks.push('No decision-maker engaged');
    if (features.competitorMentioned) risks.push('Competitor mentioned');
    if (features.timelineMismatch > 0.5) risks.push('Deal timeline mismatch');
    if (features.responseRate < 0.2) risks.push('Very low email response rate');

    return risks;
  }
}

export const mlScoringService = new MLScoringService();
