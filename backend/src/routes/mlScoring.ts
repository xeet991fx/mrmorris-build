/**
 * ML Scoring Routes
 * API endpoints for predictive ML scoring
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { mlScoringService } from '../services/MLScoringService';
import MLModel from '../models/MLModel';
import PredictiveScore from '../models/PredictiveScore';
import Opportunity from '../models/Opportunity';

const router = express.Router();

/**
 * POST /api/workspaces/:id/ml/train
 * Train a new ML model
 */
router.post(
  '/workspaces/:id/ml/train',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId } = req.params;
      const {
        modelType = 'close_probability',
        algorithm = 'neural_network',
        epochs = 50,
        validationSplit = 0.2,
      } = req.body;

      console.log(`🤖 Starting ML model training for workspace ${workspaceId}...`);

      // Train model (async operation)
      const model = await mlScoringService.trainModel(
        workspaceId,
        req.user!._id.toString(),
        {
          modelType,
          algorithm,
          epochs,
          validationSplit,
        }
      );

      res.json({
        success: true,
        message: 'Model training completed',
        data: {
          modelId: model._id,
          version: model.version,
          status: model.status,
          trainingMetrics: model.trainingMetrics,
          trainingDuration: model.trainingDuration,
          trainingDataSize: model.trainingDataSize,
        },
      });
    } catch (error: any) {
      console.error('Error training ML model:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/workspaces/:id/ml/predict/:opportunityId
 * Make a prediction for an opportunity
 */
router.post(
  '/workspaces/:id/ml/predict/:opportunityId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { opportunityId } = req.params;
      const { modelId } = req.body;

      const prediction = await mlScoringService.predict(opportunityId, modelId);

      res.json({
        success: true,
        data: {
          closeProbability: prediction.closeProbability,
          confidence: prediction.confidence,
          riskLevel: prediction.riskLevel,
          riskFactors: prediction.riskFactors,
          recommendedActions: prediction.recommendedActions,
          topPositiveFactors: prediction.topPositiveFactors,
          topNegativeFactors: prediction.topNegativeFactors,
          predictedAt: prediction.predictedAt,
        },
      });
    } catch (error: any) {
      console.error('Error making prediction:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/workspaces/:id/ml/predict-batch
 * Make predictions for multiple opportunities
 */
router.post(
  '/workspaces/:id/ml/predict-batch',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { opportunityIds, modelId } = req.body;

      if (!Array.isArray(opportunityIds)) {
        return res.status(400).json({
          success: false,
          error: 'opportunityIds must be an array',
        });
      }

      const predictions = await mlScoringService.batchPredict(opportunityIds, modelId);

      res.json({
        success: true,
        data: predictions.map((p) => ({
          opportunityId: p.opportunityId,
          closeProbability: p.closeProbability,
          confidence: p.confidence,
          riskLevel: p.riskLevel,
        })),
        count: predictions.length,
      });
    } catch (error: any) {
      console.error('Error making batch predictions:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/workspaces/:id/ml/predict-all-open
 * Make predictions for all open opportunities in workspace
 */
router.post(
  '/workspaces/:id/ml/predict-all-open',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId } = req.params;
      const { modelId } = req.body;

      // Get all open opportunities
      const opportunities = await Opportunity.find({
        workspaceId,
        status: 'open',
      }).select('_id');

      const opportunityIds = opportunities.map((opp) => opp._id);

      console.log(`🎯 Predicting for ${opportunityIds.length} open opportunities...`);

      const predictions = await mlScoringService.batchPredict(opportunityIds, modelId);

      res.json({
        success: true,
        message: `Predictions generated for ${predictions.length} opportunities`,
        data: predictions.map((p) => ({
          opportunityId: p.opportunityId,
          closeProbability: p.closeProbability,
          riskLevel: p.riskLevel,
        })),
        count: predictions.length,
      });
    } catch (error: any) {
      console.error('Error predicting all open opportunities:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/workspaces/:id/ml/models
 * List all ML models for a workspace
 */
router.get(
  '/workspaces/:id/ml/models',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId } = req.params;
      const { status, modelType } = req.query;

      const query: any = { workspaceId };
      if (status) query.status = status;
      if (modelType) query.modelType = modelType;

      const models = await MLModel.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: models.map((m) => ({
          id: m._id,
          name: m.name,
          version: m.version,
          modelType: m.modelType,
          algorithm: m.algorithm,
          status: m.status,
          isDefault: m.isDefault,
          trainingMetrics: m.trainingMetrics,
          trainingDataSize: m.trainingDataSize,
          predictionCount: m.predictionCount,
          lastPredictionAt: m.lastPredictionAt,
          createdAt: m.createdAt,
        })),
        count: models.length,
      });
    } catch (error: any) {
      console.error('Error fetching ML models:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/workspaces/:id/ml/models/:modelId
 * Get details of a specific ML model
 */
router.get(
  '/workspaces/:id/ml/models/:modelId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { modelId } = req.params;

      const model = await MLModel.findById(modelId);

      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Model not found',
        });
      }

      res.json({
        success: true,
        data: {
          id: model._id,
          name: model.name,
          version: model.version,
          modelType: model.modelType,
          algorithm: model.algorithm,
          status: model.status,
          isDefault: model.isDefault,
          description: model.description,
          features: model.features,
          trainingMetrics: model.trainingMetrics,
          validationMetrics: model.validationMetrics,
          testMetrics: model.testMetrics,
          trainingDataSize: model.trainingDataSize,
          trainingDuration: model.trainingDuration,
          predictionCount: model.predictionCount,
          averagePredictionTime: model.averagePredictionTime,
          lastPredictionAt: model.lastPredictionAt,
          autoRetrain: model.autoRetrain,
          retrainingFrequency: model.retrainingFrequency,
          nextRetrainingAt: model.nextRetrainingAt,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('Error fetching ML model:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/workspaces/:id/ml/models/:modelId
 * Update ML model settings
 */
router.put(
  '/workspaces/:id/ml/models/:modelId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { modelId } = req.params;
      const { isDefault, status, autoRetrain, retrainingFrequency, description } = req.body;

      const model = await MLModel.findById(modelId);

      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Model not found',
        });
      }

      if (isDefault !== undefined) model.isDefault = isDefault;
      if (status !== undefined) model.status = status;
      if (autoRetrain !== undefined) model.autoRetrain = autoRetrain;
      if (retrainingFrequency !== undefined) model.retrainingFrequency = retrainingFrequency;
      if (description !== undefined) model.description = description;

      await model.save();

      res.json({
        success: true,
        message: 'Model updated successfully',
        data: model,
      });
    } catch (error: any) {
      console.error('Error updating ML model:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/workspaces/:id/ml/models/:modelId
 * Delete an ML model
 */
router.delete(
  '/workspaces/:id/ml/models/:modelId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { modelId } = req.params;

      const model = await MLModel.findById(modelId);

      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Model not found',
        });
      }

      if (model.isDefault) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete default model. Set another model as default first.',
        });
      }

      await MLModel.findByIdAndDelete(modelId);

      res.json({
        success: true,
        message: 'Model deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting ML model:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/workspaces/:id/ml/predictions/:opportunityId
 * Get prediction history for an opportunity
 */
router.get(
  '/workspaces/:id/ml/predictions/:opportunityId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { opportunityId } = req.params;

      const predictions = await PredictiveScore.find({ opportunityId })
        .sort({ predictedAt: -1 })
        .limit(20);

      res.json({
        success: true,
        data: predictions,
        count: predictions.length,
      });
    } catch (error: any) {
      console.error('Error fetching predictions:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/workspaces/:id/ml/predictions
 * Get all predictions for a workspace
 */
router.get(
  '/workspaces/:id/ml/predictions',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId } = req.params;
      const { riskLevel, limit = 50 } = req.query;

      const query: any = { workspaceId };
      if (riskLevel) query.riskLevel = riskLevel;

      const predictions = await PredictiveScore.find(query)
        .sort({ predictedAt: -1 })
        .limit(parseInt(limit as string))
        .populate('opportunityId', 'title value status');

      res.json({
        success: true,
        data: predictions,
        count: predictions.length,
      });
    } catch (error: any) {
      console.error('Error fetching predictions:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/workspaces/:id/ml/stats
 * Get ML scoring statistics for a workspace
 */
router.get(
  '/workspaces/:id/ml/stats',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId } = req.params;

      // Get model stats
      const models = await MLModel.find({ workspaceId, status: 'active' });
      const defaultModel = models.find((m) => m.isDefault);

      // Get prediction stats
      const totalPredictions = await PredictiveScore.countDocuments({ workspaceId });
      const highRiskCount = await PredictiveScore.countDocuments({
        workspaceId,
        riskLevel: 'high',
      });
      const mediumRiskCount = await PredictiveScore.countDocuments({
        workspaceId,
        riskLevel: 'medium',
      });
      const lowRiskCount = await PredictiveScore.countDocuments({
        workspaceId,
        riskLevel: 'low',
      });

      // Get recent predictions
      const recentPredictions = await PredictiveScore.find({ workspaceId })
        .sort({ predictedAt: -1 })
        .limit(5)
        .populate('opportunityId', 'title value');

      res.json({
        success: true,
        data: {
          models: {
            total: models.length,
            active: models.filter((m) => m.status === 'active').length,
            defaultModel: defaultModel
              ? {
                  id: defaultModel._id,
                  name: defaultModel.name,
                  version: defaultModel.version,
                  accuracy: defaultModel.trainingMetrics.accuracy,
                  auc: defaultModel.trainingMetrics.auc,
                }
              : null,
          },
          predictions: {
            total: totalPredictions,
            byRiskLevel: {
              high: highRiskCount,
              medium: mediumRiskCount,
              low: lowRiskCount,
            },
            recent: recentPredictions,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching ML stats:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
