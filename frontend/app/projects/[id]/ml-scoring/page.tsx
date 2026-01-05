"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Sparkles,
} from "lucide-react";
import PredictionPanel from "@/components/ml/PredictionPanel";

interface MLModel {
  id: string;
  name: string;
  version: string;
  modelType: string;
  algorithm: string;
  status: string;
  isDefault: boolean;
  trainingMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  trainingDataSize: number;
  predictionCount: number;
  lastPredictionAt?: string;
  createdAt: string;
}

interface MLStats {
  models: {
    total: number;
    active: number;
    defaultModel: {
      id: string;
      name: string;
      version: string;
      accuracy: number;
      auc: number;
    } | null;
  };
  predictions: {
    total: number;
    byRiskLevel: {
      high: number;
      medium: number;
      low: number;
    };
    recent: any[];
  };
}

export default function MLScoringPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [models, setModels] = useState<MLModel[]>([]);
  const [stats, setStats] = useState<MLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Training settings
  const [algorithm, setAlgorithm] = useState("neural_network");
  const [epochs, setEpochs] = useState(50);

  useEffect(() => {
    fetchModels();
    fetchStats();
  }, [workspaceId]);

  const fetchModels = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ml/models`, {
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setModels(result.data);
      }
    } catch (error) {
      console.error("Error fetching ML models:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ml/stats`, {
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching ML stats:", error);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ml/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          modelType: "close_probability",
          algorithm,
          epochs,
          validationSplit: 0.2,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchModels();
        fetchStats();
      }
    } catch (error) {
      console.error("Error training model:", error);
    } finally {
      setTraining(false);
    }
  };

  const handlePredictAll = async () => {
    setPredicting(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ml/predict-all-open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (result.success) {
        fetchStats();
      }
    } catch (error) {
      console.error("Error predicting all opportunities:", error);
    } finally {
      setPredicting(false);
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ml/models/${modelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isDefault: true }),
      });
      const result = await response.json();
      if (result.success) {
        fetchModels();
      }
    } catch (error) {
      console.error("Error setting default model:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasModels = models.length > 0;
  const defaultModel = models.find((m) => m.isDefault);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Predictive ML Scoring</h1>
            <p className="text-sm text-gray-600">AI-powered deal close probability predictions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasModels && (
            <Button variant="outline" onClick={handlePredictAll} disabled={predicting}>
              {predicting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Predict All Open Deals
            </Button>
          )}
        </div>
      </div>

      {!hasModels ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Brain className="h-16 w-16 mx-auto text-purple-600" />
              <h3 className="text-lg font-semibold">Train Your First ML Model</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Train a machine learning model on your historical deals to predict close probability for open
                opportunities.
              </p>

              <div className="max-w-sm mx-auto space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Algorithm</label>
                  <Select value={algorithm} onValueChange={setAlgorithm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neural_network">Neural Network (Recommended)</SelectItem>
                      <SelectItem value="logistic_regression">Logistic Regression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Training Epochs</label>
                  <Select value={epochs.toString()} onValueChange={(v) => setEpochs(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 epochs (Fast)</SelectItem>
                      <SelectItem value="50">50 epochs (Recommended)</SelectItem>
                      <SelectItem value="100">100 epochs (High Accuracy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleTrainModel} disabled={training} size="lg" className="w-full">
                  {training ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {training ? "Training Model..." : "Train Model"}
                </Button>
              </div>

              <Alert className="max-w-md mx-auto mt-6">
                <AlertDescription>
                  <strong>Requirements:</strong> You need at least 10 closed opportunities (won or lost) to train a
                  model.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {stats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Active Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.models.active}</div>
                      <p className="text-xs text-gray-600">of {stats.models.total} total</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.models.defaultModel?.accuracy.toFixed(1)}%
                      </div>
                      <p className="text-xs text-gray-600">AUC: {stats.models.defaultModel?.auc.toFixed(3)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.predictions.total}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-red-900">High Risk Deals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-700">{stats.predictions.byRiskLevel.high}</div>
                      <p className="text-xs text-red-600">require attention</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Low Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-700">{stats.predictions.byRiskLevel.low}</div>
                      <p className="text-xs text-green-600 mt-1">High close probability</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-yellow-600" />
                        Medium Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-yellow-700">{stats.predictions.byRiskLevel.medium}</div>
                      <p className="text-xs text-yellow-600 mt-1">Needs engagement</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        High Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-700">{stats.predictions.byRiskLevel.high}</div>
                      <p className="text-xs text-red-600 mt-1">Urgent action needed</p>
                    </CardContent>
                  </Card>
                </div>

                {stats.models.defaultModel && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Active Model Performance</CardTitle>
                      <CardDescription>
                        {stats.models.defaultModel.name} v{stats.models.defaultModel.version}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Accuracy</span>
                          <span className="font-medium">{stats.models.defaultModel.accuracy.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.models.defaultModel.accuracy} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>AUC-ROC Score</span>
                          <span className="font-medium">{stats.models.defaultModel.auc.toFixed(3)}</span>
                        </div>
                        <Progress value={stats.models.defaultModel.auc * 100} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your ML Models</h3>
              <Button onClick={handleTrainModel} disabled={training}>
                {training ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                Train New Model
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {models.map((model) => (
                <Card key={model.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {model.name}
                          {model.isDefault && <Badge>Default</Badge>}
                          <Badge variant={model.status === "active" ? "default" : "secondary"}>{model.status}</Badge>
                        </CardTitle>
                        <CardDescription>
                          Version {model.version} • {model.algorithm.replace("_", " ")} • Trained on{" "}
                          {model.trainingDataSize} records
                        </CardDescription>
                      </div>
                      {!model.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefaultModel(model.id)}>
                          Set as Default
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Accuracy</div>
                        <div className="text-lg font-semibold">{model.trainingMetrics.accuracy.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Precision</div>
                        <div className="text-lg font-semibold">{model.trainingMetrics.precision.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Recall</div>
                        <div className="text-lg font-semibold">{model.trainingMetrics.recall.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">F1 Score</div>
                        <div className="text-lg font-semibold">{model.trainingMetrics.f1Score.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">AUC</div>
                        <div className="text-lg font-semibold">{model.trainingMetrics.auc.toFixed(3)}</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between text-sm text-gray-600">
                      <span>Predictions: {model.predictionCount}</span>
                      <span>Created: {new Date(model.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <PredictionPanel workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
