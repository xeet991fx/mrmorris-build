"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight, TrendingUp, TrendingDown, Clock, AlertCircle, Users, Filter } from "lucide-react";

interface StageCounts {
  [key: string]: number;
}

interface StageMetrics {
  hours: number;
  days: number;
  count: number;
}

interface SLAMetrics {
  total: number;
  breached: number;
  atRisk: number;
  onTrack: number;
  breachRate: number;
}

interface FunnelMetrics {
  stageCounts: StageCounts;
  avgTimeInStage: { [key: string]: StageMetrics };
  conversions: Array<{ from: string; to: string; count: number }>;
  slaMetrics: { [key: string]: SLAMetrics };
}

const STAGE_LABELS: { [key: string]: string } = {
  subscriber: "Subscriber",
  lead: "Lead",
  mql: "MQL",
  sql: "SQL",
  sal: "SAL",
  opportunity: "Opportunity",
  customer: "Customer",
  evangelist: "Evangelist",
  churned: "Churned",
  disqualified: "Disqualified",
};

const STAGE_COLORS: { [key: string]: string } = {
  subscriber: "bg-gray-100 text-gray-800",
  lead: "bg-blue-100 text-blue-800",
  mql: "bg-purple-100 text-purple-800",
  sql: "bg-indigo-100 text-indigo-800",
  sal: "bg-cyan-100 text-cyan-800",
  opportunity: "bg-green-100 text-green-800",
  customer: "bg-emerald-100 text-emerald-800",
  evangelist: "bg-yellow-100 text-yellow-800",
  churned: "bg-red-100 text-red-800",
  disqualified: "bg-gray-100 text-gray-800",
};

// Funnel stages in order (excluding churned, disqualified, evangelist)
const FUNNEL_STAGES = ["subscriber", "lead", "mql", "sql", "sal", "opportunity", "customer"];

export default function FunnelPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/lifecycle-stages/workspace/${projectId}/funnel-metrics`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch funnel metrics");
        }

        const data = await response.json();
        setMetrics(data.metrics);
      } catch (err: any) {
        console.error("Error fetching funnel metrics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [projectId]);

  const calculateConversionRate = (fromStage: string, toStage: string): number => {
    if (!metrics) return 0;

    const fromCount = metrics.stageCounts[fromStage] || 0;
    const conversion = metrics.conversions.find(
      (c) => c.from === fromStage && c.to === toStage
    );

    if (fromCount === 0 || !conversion) return 0;

    return (conversion.count / fromCount) * 100;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              <p>Error loading funnel metrics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total contacts
  const totalContacts = Object.values(metrics.stageCounts).reduce((sum, count) => sum + count, 0);
  const funnelContacts = FUNNEL_STAGES.reduce(
    (sum, stage) => sum + (metrics.stageCounts[stage] || 0),
    0
  );

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <PageHeader
        icon={Filter}
        title="Lead Lifecycle Funnel"
        description="Track contacts through your sales funnel from subscriber to customer"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Contacts"
          value={totalContacts}
          description="All lifecycle stages"
          icon={Users}
          variant="primary"
        />

        <StatCard
          title="In Funnel"
          value={funnelContacts}
          description="Active in sales process"
          icon={TrendingUp}
          variant="info"
        />

        <StatCard
          title="Customers"
          value={metrics.stageCounts.customer || 0}
          description={
            funnelContacts > 0
              ? `${((metrics.stageCounts.customer || 0) / funnelContacts * 100).toFixed(1)}% conversion`
              : "0% conversion"
          }
          icon={Users}
          variant="success"
        />

        <StatCard
          title="SLA Breached"
          value={Object.values(metrics.slaMetrics).reduce((sum, m) => sum + m.breached, 0)}
          description="Requires immediate attention"
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Visual Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel Visualization</CardTitle>
          <CardDescription>Contact progression through lifecycle stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FUNNEL_STAGES.map((stage, index) => {
              const count = metrics.stageCounts[stage] || 0;
              const percentage = funnelContacts > 0 ? (count / funnelContacts) * 100 : 0;
              const nextStage = FUNNEL_STAGES[index + 1];
              const conversionRate = nextStage ? calculateConversionRate(stage, nextStage) : 0;
              const avgTime = metrics.avgTimeInStage[stage];
              const sla = metrics.slaMetrics[stage];

              return (
                <div key={stage}>
                  {/* Stage Bar */}
                  <div className="flex items-center gap-4">
                    <div className="w-32 flex-shrink-0">
                      <Badge className={STAGE_COLORS[stage]}>{STAGE_LABELS[stage]}</Badge>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          >
                            {count > 0 && (
                              <span className="px-3">
                                {count} ({percentage.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-48 text-sm text-muted-foreground">
                          {avgTime && (
                            <>
                              <Clock className="h-4 w-4" />
                              <span>{avgTime.days.toFixed(1)} days avg</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* SLA Status */}
                      {sla && sla.total > 0 && (
                        <div className="flex gap-2 text-xs ml-2">
                          {sla.onTrack > 0 && (
                            <Badge variant="outline" className="text-green-600">
                              {sla.onTrack} on track
                            </Badge>
                          )}
                          {sla.atRisk > 0 && (
                            <Badge variant="outline" className="text-yellow-600">
                              {sla.atRisk} at risk
                            </Badge>
                          )}
                          {sla.breached > 0 && (
                            <Badge variant="outline" className="text-red-600">
                              {sla.breached} breached
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `/projects/${projectId}/contacts?lifecycleStage=${stage}`,
                          "_blank"
                        )
                      }
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>

                  {/* Conversion Arrow */}
                  {nextStage && conversionRate > 0 && (
                    <div className="flex items-center gap-2 ml-36 mt-2 text-sm text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                      <span>{conversionRate.toFixed(1)}% convert to {STAGE_LABELS[nextStage]}</span>
                      {conversionRate > 50 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Other Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Other Stages</CardTitle>
          <CardDescription>Contacts outside the primary funnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["evangelist", "churned", "disqualified"].map((stage) => {
              const count = metrics.stageCounts[stage] || 0;

              return (
                <div
                  key={stage}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <Badge className={STAGE_COLORS[stage]}>{STAGE_LABELS[stage]}</Badge>
                    <p className="text-2xl font-bold mt-2">{count}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/projects/${projectId}/contacts?lifecycleStage=${stage}`,
                        "_blank"
                      )
                    }
                  >
                    View <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
