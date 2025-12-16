"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, Target, DollarSign, BarChart } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "react-hot-toast";

interface PipelineForecast {
    pipeline: number;
    committed: number;
    bestCase: number;
    closed: number;
    dealCount: number;
}

export default function ForecastPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const [loading, setLoading] = useState(true);
    const [forecast, setForecast] = useState<PipelineForecast | null>(null);

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(`/workspaces/${workspaceId}/forecast/pipeline`);
                if (response.data.success) {
                    setForecast(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching forecast:", error);
                // Use placeholder data
                setForecast({
                    pipeline: 0,
                    committed: 0,
                    bestCase: 0,
                    closed: 0,
                    dealCount: 0
                });
            } finally {
                setLoading(false);
            }
        };

        if (workspaceId) {
            fetchForecast();
        }
    }, [workspaceId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Forecast</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track pipeline, quotas, and sales predictions
                    </p>
                </div>
            </div>

            {/* Pipeline Summary */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : forecast ? (
                <>
                    {/* Forecast Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <BarChart className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Pipeline</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(forecast.pipeline)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{forecast.dealCount} deals</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <Target className="w-5 h-5 text-orange-600" />
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Best Case</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(forecast.bestCase)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">50%+ probability</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Committed</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(forecast.committed)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">80%+ probability</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <DollarSign className="w-5 h-5 text-purple-600" />
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Closed This Month</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(forecast.closed)}
                            </p>
                            <p className="text-xs text-green-500 mt-1">Won deals</p>
                        </div>
                    </div>

                    {/* Forecast Visualization */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Pipeline Breakdown
                        </h3>

                        {/* Simple bar visualization */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Pipeline Total</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(forecast.pipeline)}</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Best Case (50%+)</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(forecast.bestCase)}</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 rounded-full"
                                        style={{ width: `${forecast.pipeline > 0 ? (forecast.bestCase / forecast.pipeline * 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Committed (80%+)</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(forecast.committed)}</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${forecast.pipeline > 0 ? (forecast.committed / forecast.pipeline * 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Closed (Won)</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(forecast.closed)}</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{ width: `${forecast.pipeline > 0 ? (forecast.closed / forecast.pipeline * 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <TrendingUp size={48} className="text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No forecast data available</p>
                </div>
            )}
        </div>
    );
}
