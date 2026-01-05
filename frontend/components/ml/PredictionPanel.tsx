"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from "lucide-react";

interface Prediction {
  _id: string;
  opportunityId: {
    _id: string;
    title: string;
    value: number;
    status: string;
  };
  closeProbability: number;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
  recommendedActions: string[];
  topPositiveFactors: string[];
  topNegativeFactors: string[];
  predictedAt: string;
}

interface PredictionPanelProps {
  workspaceId: string;
}

export default function PredictionPanel({ workspaceId }: PredictionPanelProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, [workspaceId, riskFilter]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const url =
        riskFilter === "all"
          ? `/api/workspaces/${workspaceId}/ml/predictions`
          : `/api/workspaces/${workspaceId}/ml/predictions?riskLevel=${riskFilter}`;

      const response = await fetch(url, { credentials: "include" });
      const result = await response.json();
      if (result.success) {
        setPredictions(result.data);
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "low":
        return <TrendingUp className="h-4 w-4" />;
      case "medium":
        return <Target className="h-4 w-4" />;
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Predictions</h3>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-600">No predictions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <Card
                key={prediction._id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPrediction?._id === prediction._id ? "ring-2 ring-purple-500" : ""
                }`}
                onClick={() => setSelectedPrediction(prediction)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{prediction.opportunityId?.title || "Unknown Deal"}</h4>
                        <p className="text-sm text-gray-600">
                          ${(prediction.opportunityId?.value || 0).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={`${getRiskColor(prediction.riskLevel)} flex items-center gap-1`}>
                        {getRiskIcon(prediction.riskLevel)}
                        {prediction.riskLevel}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Close Probability</span>
                        <span className="font-semibold">{prediction.closeProbability.toFixed(1)}%</span>
                      </div>
                      <Progress value={prediction.closeProbability} className="h-2" />
                    </div>

                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Confidence: {prediction.confidence.toFixed(1)}%</span>
                      <span>{new Date(prediction.predictedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPrediction && (
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Prediction Details</span>
                  <Badge className={getRiskColor(selectedPrediction.riskLevel)}>
                    {selectedPrediction.riskLevel} risk
                  </Badge>
                </CardTitle>
                <CardDescription>{selectedPrediction.opportunityId?.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Close Probability</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {selectedPrediction.closeProbability.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={selectedPrediction.closeProbability} className="h-3" />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Model Confidence: {selectedPrediction.confidence.toFixed(1)}%</span>
                  </div>
                </div>

                {selectedPrediction.topPositiveFactors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <TrendingUp className="h-4 w-4" />
                      Positive Factors
                    </div>
                    <ul className="space-y-1">
                      {selectedPrediction.topPositiveFactors.map((factor, i) => (
                        <li key={i} className="text-sm text-gray-700 pl-6 list-disc">
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPrediction.topNegativeFactors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                      <TrendingDown className="h-4 w-4" />
                      Negative Factors
                    </div>
                    <ul className="space-y-1">
                      {selectedPrediction.topNegativeFactors.map((factor, i) => (
                        <li key={i} className="text-sm text-gray-700 pl-6 list-disc">
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPrediction.riskFactors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Factors
                    </div>
                    <ul className="space-y-1">
                      {selectedPrediction.riskFactors.map((risk, i) => (
                        <li key={i} className="text-sm text-gray-700 pl-6 list-disc">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPrediction.recommendedActions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Lightbulb className="h-4 w-4" />
                      Recommended Actions
                    </div>
                    <ul className="space-y-2">
                      {selectedPrediction.recommendedActions.map((action, i) => (
                        <li key={i} className="text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button className="w-full" onClick={() => window.open(`/projects/${workspaceId}/opportunities/${selectedPrediction.opportunityId._id}`, '_blank')}>
                    View Opportunity
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
