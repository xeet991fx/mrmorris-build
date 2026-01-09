"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  SparklesIcon,
  StarIcon,
  ClockIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { TrendingUp, Users, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

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
      const queryParams = new URLSearchParams();
      if (selectedIndustry !== "all") queryParams.append("industry", selectedIndustry);
      if (selectedUseCase !== "all") queryParams.append("useCase", selectedUseCase);

      const [templatesRes, industriesRes, useCasesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates?${queryParams.toString()}`, { credentials: "include" }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/industries`, { credentials: "include" }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/use-cases`, { credentials: "include" }),
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/form-templates/${template.slug}/use`, {
        method: "POST",
        credentials: "include",
      });
      router.push(`/projects/${projectId}/forms/new?template=${template.slug}`);
    } catch (error) {
      console.error("Error using template:", error);
    }
  };

  const getBenchmarkColor = (benchmark: string) => {
    switch (benchmark) {
      case "exceptional": return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
      case "high": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
      case "average": return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
      default: return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
      case "moderate": return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
      case "advanced": return "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400";
      default: return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${projectId}/forms`)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Smart Templates</h1>
              <p className="text-sm text-zinc-500">Conversion-optimized forms</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Industry</label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-0 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Industries</option>
              {industries.map((industry) => (
                <option key={industry.value} value={industry.value}>{industry.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Use Case</label>
            <select
              value={selectedUseCase}
              onChange={(e) => setSelectedUseCase(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-0 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Use Cases</option>
              {useCases.map((useCase) => (
                <option key={useCase.value} value={useCase.value}>{useCase.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <LightBulbIcon className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No templates found</h3>
            <p className="text-sm text-zinc-500">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {templates.map((template) => (
              <motion.div
                key={template._id}
                variants={itemVariants}
                className={cn(
                  "rounded-2xl bg-white dark:bg-zinc-900 border overflow-hidden hover:shadow-lg transition-all cursor-pointer",
                  template.featured
                    ? "border-purple-300 dark:border-purple-700"
                    : "border-zinc-100 dark:border-zinc-800"
                )}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{template.name}</h3>
                        {template.featured && <StarIcon className="w-5 h-5 text-amber-500 fill-amber-500" />}
                      </div>
                      <p className="text-sm text-zinc-500 line-clamp-2">{template.description}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium uppercase", getBenchmarkColor(template.benchmark))}>
                      {template.benchmark}
                    </span>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getComplexityColor(template.complexity))}>
                      {template.complexity}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {template.fields.length} fields
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {(template.averageConversionRate * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-zinc-500">Conversion</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <ClockIcon className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{template.estimatedCompletionTime}s</p>
                      <p className="text-xs text-zinc-500">To Complete</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <Users className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{template.usageCount}</p>
                      <p className="text-xs text-zinc-500">Used</p>
                    </div>
                  </div>

                  {/* Strategy */}
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800 dark:text-blue-300 line-clamp-2">{template.strategy.goal}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUseTemplate(template); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                    >
                      Use Template
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTemplate(template); }}
                      className="px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                    >
                      View Tips
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Template Details Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{selectedTemplate.name}</h2>
                  <p className="text-sm text-zinc-500">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
                {/* When to Use */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <LightBulbIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">When to Use</h3>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedTemplate.strategy.whenToUse}</p>
                </div>

                {/* Conversion Tips */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Conversion Tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedTemplate.strategy.conversionTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Common Mistakes */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-rose-500" />
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Common Mistakes</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedTemplate.strategy.commonMistakes.map((mistake, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fields Preview */}
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Fields ({selectedTemplate.fields.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedTemplate.fields.map((field, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{field.label}</span>
                          <div className="flex gap-1">
                            {field.required && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">Required</span>
                            )}
                            <span className="px-1.5 py-0.5 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">{field.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => handleUseTemplate(selectedTemplate)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                >
                  Use This Template
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
