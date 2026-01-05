"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, DollarSign, Users, Clock } from "lucide-react";

export default function LeadRecyclingPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const [statsRes, leadsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lead-recycling/workspace/${projectId}/statistics`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lead-recycling/workspace/${projectId}/leads?limit=50`, {
            credentials: "include",
          }),
        ]);

        const statsData = await statsRes.json();
        const leadsData = await leadsRes.json();

        setStats(statsData.statistics);
        setLeads(leadsData.leads);
      } catch (error) {
        console.error("Error fetching recycling data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleDetectDeadLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lead-recycling/workspace/${projectId}/detect`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const data = await res.json();
      alert(`Detected ${data.detected} dead leads!`);
      window.location.reload();
    } catch (error) {
      console.error("Error detecting leads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statusColors: any = {
    detected: "bg-yellow-100 text-yellow-800",
    in_recycling: "bg-blue-100 text-blue-800",
    re_engaged: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    exhausted: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lead Recycling</h1>
          <p className="text-muted-foreground">
            Automatically recover dead leads and maximize revenue
          </p>
        </div>
        <Button onClick={handleDetectDeadLeads}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Detect Dead Leads
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Recycled</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalRecycled || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Re-Engaged</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats?.reEngaged || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              {stats?.successRate?.toFixed(1) || 0}% success rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Revenue</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              ${stats?.estimatedRevenue?.toLocaleString() || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From recovered leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status Breakdown</CardDescription>
            <CardTitle className="text-3xl">{Object.keys(stats?.statusBreakdown || {}).length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>Leads by recycling status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats?.statusBreakdown || {}).map(([status, count]: any) => (
              <div key={status} className="border rounded-lg p-4">
                <Badge className={statusColors[status]}>{status.replace("_", " ")}</Badge>
                <p className="text-2xl font-bold mt-2">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leads in Recycling */}
      <Card>
        <CardHeader>
          <CardTitle>Leads in Recycling</CardTitle>
          <CardDescription>Active recycling campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leads.map((lead: any) => (
              <div
                key={lead._id}
                className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {lead.contactId?.firstName} {lead.contactId?.lastName}
                    </p>
                    <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.contactId?.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Detected: {new Date(lead.detectedAt).toLocaleDateString()}
                    </span>
                    <span>Attempts: {lead.currentAttempt}/{lead.maxAttempts}</span>
                    <span>Emails Sent: {lead.totalEmailsSent}</span>
                    {lead.totalOpens > 0 && <span>Opens: {lead.totalOpens}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
            ))}

            {leads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leads in recycling yet</p>
                <Button className="mt-4" onClick={handleDetectDeadLeads}>
                  Detect Dead Leads
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
