"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  GlobeAltIcon,
  UsersIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";

interface CompanyVisitor {
  _id: string;
  ipAddress: string;
  domain?: string;
  companyName?: string;
  firmographics: {
    industry?: string;
    sector?: string;
    employeeCount?: number;
    employeeRange?: string;
    estimatedAnnualRevenue?: number;
    revenueRange?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    description?: string;
  };
  engagement: {
    totalPageViews: number;
    totalTimeOnSite: number;
    averageSessionDuration: number;
    totalSessions: number;
    firstSeenAt: string;
    lastSeenAt: string;
  };
  isTargetAccount: boolean;
  targetAccountTier?: 'tier1' | 'tier2' | 'tier3';
  accountScore: number;
  convertedToContact: boolean;
  enrichedAt?: string;
}

interface Analytics {
  totalVisitors: number;
  identifiedVisitors: number;
  targetAccountVisitors: number;
  identificationRate: number;
  totalPageViews: number;
  averageScore: number;
  topIndustries: Array<{ industry: string; count: number }>;
  topSizes: Array<{ size: string; count: number }>;
}

export default function CompanyVisitorsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [visitors, setVisitors] = useState<CompanyVisitor[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTargetOnly, setFilterTargetOnly] = useState(false);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<CompanyVisitor | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [workspaceId, filterTargetOnly, minScore, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [visitorsRes, analyticsRes] = await Promise.all([
        axiosInstance.get(`/workspaces/${workspaceId}/company-visitors`, {
          params: {
            targetOnly: filterTargetOnly || undefined,
            minScore: minScore || undefined,
            search: searchQuery || undefined,
            limit: 50,
          },
        }),
        axiosInstance.get(`/workspaces/${workspaceId}/company-visitors/analytics`),
      ]);

      if (visitorsRes.data.success) {
        setVisitors(visitorsRes.data.data || []);
      }

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (error: any) {
      toast.error("Failed to fetch company visitors");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsTargetAccount = async (visitorId: string, tier: 'tier1' | 'tier2' | 'tier3') => {
    try {
      await axiosInstance.post(
        `/workspaces/${workspaceId}/company-visitors/${visitorId}/mark-target`,
        { tier }
      );
      toast.success("Marked as target account");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to mark as target account");
    }
  };

  const removeTargetAccount = async (visitorId: string) => {
    try {
      await axiosInstance.put(
        `/workspaces/${workspaceId}/company-visitors/${visitorId}`,
        { isTargetAccount: false, targetAccountTier: null }
      );
      toast.success("Removed from target accounts");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update visitor");
    }
  };

  const viewDetails = async (visitor: CompanyVisitor) => {
    try {
      const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/company-visitors/${visitor._id}`
      );
      if (response.data.success) {
        setSelectedVisitor(response.data.data);
        setShowDetailsModal(true);
      }
    } catch (error: any) {
      toast.error("Failed to load visitor details");
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'tier1': return 'bg-purple-100 text-purple-700';
      case 'tier2': return 'bg-blue-100 text-blue-700';
      case 'tier3': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading company visitors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
            Company Visitors
          </h1>
          <p className="text-gray-600 mt-1">
            Identify and track companies visiting your website via reverse IP lookup
          </p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Visitors</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analytics.totalVisitors}
                  </p>
                </div>
                <BuildingOfficeIcon className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.identifiedVisitors} identified ({analytics.identificationRate.toFixed(1)}%)
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Target Accounts</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">
                    {analytics.targetAccountVisitors}
                  </p>
                </div>
                <StarSolidIcon className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
              <p className="text-xs text-gray-500 mt-2">High-value prospects</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Page Views</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {analytics.totalPageViews.toLocaleString()}
                  </p>
                </div>
                <EyeIcon className="w-12 h-12 text-green-500 opacity-20" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Across all companies</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Account Score</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">
                    {analytics.averageScore}
                  </p>
                </div>
                <ChartBarIcon className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Out of 100</p>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies or domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterTargetOnly(!filterTargetOnly)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterTargetOnly
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <StarIcon className="w-5 h-5" />
                Target Accounts
              </button>

              <select
                value={minScore || ""}
                onChange={(e) => setMinScore(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Scores</option>
                <option value="70">Score ≥ 70</option>
                <option value="50">Score ≥ 50</option>
                <option value="30">Score ≥ 30</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visitors List */}
        {visitors.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No company visitors yet</h3>
            <p className="text-gray-600 mb-6">
              Company visitors will appear here once they start visiting your tracked websites
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engagement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitors.map((visitor) => (
                    <tr key={visitor._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {visitor.isTargetAccount && (
                            <StarSolidIcon className="w-5 h-5 text-purple-500" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {visitor.companyName || "Unknown Company"}
                            </div>
                            <div className="text-sm text-gray-500">{visitor.domain}</div>
                            {visitor.firmographics.location?.city && (
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <GlobeAltIcon className="w-3 h-3" />
                                {visitor.firmographics.location.city}, {visitor.firmographics.location.country}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {visitor.firmographics.industry || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {visitor.firmographics.employeeRange || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {visitor.firmographics.revenueRange}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {visitor.engagement.totalPageViews} views
                        </div>
                        <div className="text-xs text-gray-500">
                          {visitor.engagement.totalSessions} sessions
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-2xl font-bold ${getScoreColor(visitor.accountScore)}`}>
                          {visitor.accountScore}
                        </div>
                        {visitor.isTargetAccount && visitor.targetAccountTier && (
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${getTierColor(visitor.targetAccountTier)}`}>
                            {visitor.targetAccountTier.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(visitor.engagement.lastSeenAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewDetails(visitor)}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            View
                          </button>
                          {!visitor.isTargetAccount ? (
                            <button
                              onClick={() => markAsTargetAccount(visitor._id, 'tier2')}
                              className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <StarIcon className="w-4 h-4" />
                              Mark
                            </button>
                          ) : (
                            <button
                              onClick={() => removeTargetAccount(visitor._id)}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedVisitor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedVisitor.companyName || "Unknown Company"}
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-600 mt-1">{selectedVisitor.domain}</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Firmographics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Company Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Industry</p>
                      <p className="font-medium">{selectedVisitor.firmographics.industry || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Employees</p>
                      <p className="font-medium">{selectedVisitor.firmographics.employeeRange || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="font-medium">{selectedVisitor.firmographics.revenueRange || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">
                        {selectedVisitor.firmographics.location?.city || "-"}
                        {selectedVisitor.firmographics.location?.country && `, ${selectedVisitor.firmographics.location.country}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Engagement</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Page Views</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedVisitor.engagement.totalPageViews}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Sessions</p>
                      <p className="text-2xl font-bold text-green-600">{selectedVisitor.engagement.totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Session Duration</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatDuration(selectedVisitor.engagement.averageSessionDuration)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Time on Site</p>
                      <p className="text-xl font-bold text-purple-600">
                        {formatDuration(selectedVisitor.engagement.totalTimeOnSite)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedVisitor.firmographics.description && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700">{selectedVisitor.firmographics.description}</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
