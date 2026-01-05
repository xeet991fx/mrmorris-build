"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Clock,
  Users,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Star,
  Sparkles,
  Target,
} from "lucide-react";

interface FormTemplate {
  _id: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  useCase: string;
  averageConversionRate: number;
  benchmark: "low" | "average" | "high" | "exceptional";
  complexity: "simple" | "moderate" | "advanced";
  estimatedCompletionTime: number;
  recommendedFor: string[];
  fields: any[];
  strategy: {
    goal: string;
    whenToUse: string;
    conversionTips: string[];
    commonMistakes: string[];
  };
  rating: number;
  usageCount: number;
  featured: boolean;
  tags: string[];
}

interface Industry {
  value: string;
  label: string;
  description: string;
}

interface UseCase {
  value: string;
  label: string;
  description: string;
}

export default function FormTemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedUseCase, setSelectedUseCase] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedIndustry, selectedUseCase]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (selectedIndustry !== "all") params.append("industry", selectedIndustry);
      if (selectedUseCase !== "all") params.append("useCase", selectedUseCase);

      const [templatesRes, industriesRes, useCasesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates?${params.toString()}`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/industries`, {
          credentials: "include",
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/use-cases`, {
          credentials: "include",
        }),
      ]);

      const templatesData = await templatesRes.json();
      const industriesData = await industriesRes.json();
      const useCasesData = await useCasesRes.json();

      setTemplates(templatesData.templates || []);
      setIndustries(industriesData.industries || []);
      setUseCases(useCasesData.useCases || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: FormTemplate) => {
    try {
      // Track usage
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/${template.slug}/use`, {
        method: "POST",
        credentials: "include",
      });

      // Navigate to form creator with template data
      router.push(
        `/projects/${projectId}/forms/new?template=${template.slug}`
      );
    } catch (error) {
      console.error("Error using template:", error);
    }
  };

  const getBenchmarkColor = (benchmark: string) => {
    switch (benchmark) {
      case "exceptional":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "high":
        return "bg-green-100 text-green-800 border-green-200";
      case "average":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple":
        return "bg-emerald-100 text-emerald-800";
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Smart Form Templates</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Conversion-optimized forms based on industry best practices. Built by analyzing 10,000+ high-converting forms.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Industry</label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label} - {industry.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Use Case</label>
              <Select value={selectedUseCase} onValueChange={setSelectedUseCase}>
                <SelectTrigger>
                  <SelectValue placeholder="All Use Cases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Use Cases</SelectItem>
                  {useCases.map((useCase) => (
                    <SelectItem key={useCase.value} value={useCase.value}>
                      {useCase.label} - {useCase.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card
            key={template._id}
            className={`hover:shadow-lg transition-all cursor-pointer ${
              template.featured ? "border-2 border-purple-300" : ""
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2 flex items-center gap-2">
                    {template.name}
                    {template.featured && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                  </CardTitle>
                  <CardDescription className="text-sm">{template.description}</CardDescription>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={getBenchmarkColor(template.benchmark)}>
                  {template.benchmark.toUpperCase()}
                </Badge>
                <Badge className={getComplexityColor(template.complexity)}>{template.complexity}</Badge>
                <Badge variant="outline">{template.fields.length} fields</Badge>
              </div>
            </CardHeader>

            <CardContent>
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {(template.averageConversionRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Conversion</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{template.estimatedCompletionTime}s</div>
                  <div className="text-xs text-muted-foreground">To Complete</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{template.usageCount}</div>
                  <div className="text-xs text-muted-foreground">Times Used</div>
                </div>
              </div>

              {/* Strategy Goal */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-blue-900 mb-1">Strategy</div>
                    <div className="text-sm text-blue-800">{template.strategy.goal}</div>
                  </div>
                </div>
              </div>

              {/* Recommended For */}
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Recommended For:</div>
                <div className="flex flex-wrap gap-1">
                  {template.recommendedFor.map((rec, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {rec}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Button className="w-full" onClick={() => handleUseTemplate(template)}>
                Use This Template
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTemplate(template);
                }}
              >
                View Best Practices & Tips
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="p-12 text-center">
          <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground">Try adjusting your filters</p>
        </Card>
      )}

      {/* Template Details Modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTemplate(null)}
        >
          <Card
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{selectedTemplate.name}</CardTitle>
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* When to Use */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  When to Use This Template
                </h3>
                <p className="text-muted-foreground">{selectedTemplate.strategy.whenToUse}</p>
              </div>

              {/* Conversion Tips */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Conversion Optimization Tips
                </h3>
                <ul className="space-y-2">
                  {selectedTemplate.strategy.conversionTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Mistakes */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-500" />
                  Common Mistakes to Avoid
                </h3>
                <ul className="space-y-2">
                  {selectedTemplate.strategy.commonMistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold mt-0.5 flex-shrink-0">✗</span>
                      <span className="text-sm">{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Form Fields Preview */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Form Fields ({selectedTemplate.fields.length})</h3>
                <div className="space-y-2">
                  {selectedTemplate.fields.map((field, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm">{field.label}</div>
                        <div className="flex items-center gap-2">
                          {field.required && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                      </div>
                      {field.helpText && (
                        <div className="text-xs text-muted-foreground italic">{field.helpText}</div>
                      )}
                      {field.qualificationWeight && field.qualificationWeight > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          Qualification Weight: {field.qualificationWeight}/100
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <Button className="w-full" size="lg" onClick={() => handleUseTemplate(selectedTemplate)}>
                Use This Template
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
