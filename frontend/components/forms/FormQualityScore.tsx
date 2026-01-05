"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface QualityScoreProps {
  form: any;
  industry?: string;
  useCase?: string;
  onRefresh?: () => void;
}

interface QualityAnalysis {
  overall: number;
  breakdown: {
    [key: string]: {
      score: number;
      feedback: string;
    };
  };
  improvements: Array<{
    priority: "critical" | "high" | "medium" | "low";
    issue: string;
    suggestion: string;
    impact: string;
  }>;
  estimatedConversionRate: number;
  benchmark: "below_average" | "average" | "above_average" | "exceptional";
}

interface Recommendation {
  type: string;
  reason: string;
  expectedImpact: string;
  priority: "critical" | "high" | "medium" | "low";
  field?: any;
}

interface BestPractice {
  passed: boolean;
  rule: string;
  details: string;
}

export default function FormQualityScore({ form, industry, useCase, onRefresh }: QualityScoreProps) {
  const [analysis, setAnalysis] = useState<QualityAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [bestPractices, setBestPractices] = useState<BestPractice[]>([]);
  const [abTestSuggestions, setAbTestSuggestions] = useState<any[]>([]);
  const [accessibilityScore, setAccessibilityScore] = useState<any>(null);
  const [psychologyTips, setPsychologyTips] = useState<any[]>([]);
  const [industryComparison, setIndustryComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImprovements, setShowImprovements] = useState(true);
  const [activeTab, setActiveTab] = useState<"quality" | "abtests" | "accessibility" | "psychology">("quality");

  useEffect(() => {
    if (form) {
      analyzeForm();
    }
  }, [form]);

  const analyzeForm = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/full-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ form, industry, useCase }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis.qualityScore);
        setRecommendations(data.analysis.recommendations || []);
        setBestPractices(data.analysis.bestPractices || []);
        setAbTestSuggestions(data.analysis.abTestSuggestions || []);
        setAccessibilityScore(data.analysis.accessibilityScore || null);
        setPsychologyTips(data.analysis.psychologyTips || []);
        setIndustryComparison(data.analysis.industryComparison || null);
      }
    } catch (error) {
      console.error("Error analyzing form:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return "from-green-500 to-emerald-600";
    if (score >= 70) return "from-blue-500 to-indigo-600";
    if (score >= 50) return "from-yellow-500 to-orange-600";
    return "from-red-500 to-rose-600";
  };

  const getBenchmarkInfo = (benchmark: string) => {
    switch (benchmark) {
      case "exceptional":
        return { label: "Exceptional", color: "bg-purple-100 text-purple-800", emoji: "🏆" };
      case "above_average":
        return { label: "Above Average", color: "bg-green-100 text-green-800", emoji: "✨" };
      case "average":
        return { label: "Average", color: "bg-blue-100 text-blue-800", emoji: "👍" };
      case "below_average":
        return { label: "Below Average", color: "bg-yellow-100 text-yellow-800", emoji: "⚠️" };
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800", emoji: "❓" };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <Lightbulb className="h-4 w-4 text-yellow-600" />;
      case "low":
        return <Target className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "high":
        return "border-orange-200 bg-orange-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            <CardTitle>Analyzing form quality...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const benchmarkInfo = getBenchmarkInfo(analysis.benchmark);

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>Form Quality Score</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={analyzeForm}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-6xl font-bold ${getScoreColor(analysis.overall)}`}>
                {analysis.overall}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={benchmarkInfo.color}>
                  {benchmarkInfo.emoji} {benchmarkInfo.label}
                </Badge>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Estimated Conversion Rate</div>
              <div className={`text-4xl font-bold ${getScoreColor(analysis.overall)}`}>
                {(analysis.estimatedConversionRate * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Industry benchmark: 15-25%</div>
            </div>
          </div>

          <div className="relative">
            <Progress value={analysis.overall} className="h-3" />
            <div
              className={`absolute inset-0 bg-gradient-to-r ${getScoreGradient(
                analysis.overall
              )} h-3 rounded-full`}
              style={{ width: `${analysis.overall}%` }}
            />
          </div>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Score Breakdown
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                View Score Breakdown
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score Breakdown</CardTitle>
            <CardDescription>Detailed analysis of each quality factor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analysis.breakdown).map(([key, data]) => (
                <div key={key} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div className={`font-bold ${getScoreColor(data.score)}`}>{data.score}/100</div>
                  </div>
                  <Progress value={data.score} className="h-2 mb-2" />
                  <div className="text-sm text-muted-foreground">{data.feedback}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Improvements */}
      {analysis.improvements.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Recommended Improvements
                </CardTitle>
                <CardDescription>
                  {analysis.improvements.length} optimization{analysis.improvements.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImprovements(!showImprovements)}
              >
                {showImprovements ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>

          {showImprovements && (
            <CardContent>
              <div className="space-y-3">
                {analysis.improvements.map((improvement, idx) => (
                  <div key={idx} className={`border rounded-lg p-4 ${getPriorityColor(improvement.priority)}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getPriorityIcon(improvement.priority)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {improvement.priority}
                          </Badge>
                          <div className="font-semibold text-sm">{improvement.issue}</div>
                        </div>
                        <div className="text-sm mb-2">{improvement.suggestion}</div>
                        <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
                          <TrendingUp className="h-3 w-3" />
                          {improvement.impact}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Best Practices Checklist */}
      {bestPractices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Best Practices Checklist
            </CardTitle>
            <CardDescription>
              {bestPractices.filter((bp) => bp.passed).length}/{bestPractices.length} checks passed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bestPractices.map((practice, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${practice.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    }`}
                >
                  {practice.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium text-sm mb-1">{practice.rule}</div>
                    <div className="text-sm text-muted-foreground">{practice.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Smart Recommendations
            </CardTitle>
            <CardDescription>AI-powered suggestions to boost conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {rec.type.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {rec.priority}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mb-1">{rec.reason}</div>
                      <div className="text-xs text-muted-foreground">{rec.expectedImpact}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
