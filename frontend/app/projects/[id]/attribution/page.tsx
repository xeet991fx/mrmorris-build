"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Target, BarChart3 } from "lucide-react";

const ATTRIBUTION_MODELS = [
  { value: "linear", label: "Linear (Equal Credit)" },
  { value: "first_touch", label: "First Touch" },
  { value: "last_touch", label: "Last Touch" },
  { value: "time_decay", label: "Time Decay" },
  { value: "u_shaped", label: "U-Shaped (40/20/40)" },
  { value: "w_shaped", label: "W-Shaped (30/10/30/30)" },
];

const CHANNEL_COLORS: any = {
  organic_search: "bg-green-500",
  paid_search: "bg-blue-500",
  social: "bg-purple-500",
  email: "bg-yellow-500",
  direct: "bg-gray-500",
  referral: "bg-pink-500",
  display: "bg-orange-500",
  content: "bg-indigo-500",
};

export default function AttributionPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [model, setModel] = useState("linear");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/attribution/workspace/${projectId}/report?model=${model}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setReport(data.report);
      } catch (error) {
        console.error("Error fetching attribution report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [projectId, model]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const channelData = Object.entries(report?.channelRevenue || {})
    .map(([channel, revenue]) => ({
      channel,
      revenue: revenue as number,
      percentage: ((revenue as number) / report.totalRevenue) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Multi-Touch Attribution</h1>
          <p className="text-muted-foreground">
            Understand which channels drive revenue across the customer journey
          </p>
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTRIBUTION_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">
              ${report?.totalRevenue?.toLocaleString() || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From converted customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Conversions</CardDescription>
            <CardTitle className="text-3xl">{report?.totalConversions || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Customers with attribution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Conversion Value</CardDescription>
            <CardTitle className="text-3xl">
              ${report?.avgConversionValue?.toFixed(0) || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Revenue Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Channel ({ATTRIBUTION_MODELS.find(m => m.value === model)?.label})</CardTitle>
          <CardDescription>Attribution based on selected model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channelData.map(({ channel, revenue, percentage }) => (
              <div key={channel}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${CHANNEL_COLORS[channel] || "bg-gray-500"}`} />
                    <span className="font-medium capitalize">{channel.replace("_", " ")}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${CHANNEL_COLORS[channel] || "bg-gray-500"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}

            {channelData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attribution data available yet</p>
                <p className="text-sm mt-2">Conversions will appear here once customers are tracked</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attribution Model Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Attribution Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">🥇 First Touch</h4>
              <p className="text-muted-foreground">
                100% credit to the first channel that brought the visitor
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">🎯 Last Touch</h4>
              <p className="text-muted-foreground">
                100% credit to the final touchpoint before conversion
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">📊 Linear</h4>
              <p className="text-muted-foreground">
                Equal credit distributed across all touchpoints
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">⏰ Time Decay</h4>
              <p className="text-muted-foreground">
                More credit to recent touchpoints (7-day half-life)
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">U U-Shaped</h4>
              <p className="text-muted-foreground">
                40% first, 40% last, 20% distributed to middle touches
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">🔱 W-Shaped</h4>
              <p className="text-muted-foreground">
                30% first, 30% lead creation, 30% last, 10% distributed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
