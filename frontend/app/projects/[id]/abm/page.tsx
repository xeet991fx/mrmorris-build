"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Building2, Users, Target, TrendingUp, AlertCircle, Crown } from "lucide-react";

const ROLE_COLORS: any = {
  champion: "bg-yellow-100 text-yellow-800",
  decision_maker: "bg-purple-100 text-purple-800",
  economic_buyer: "bg-green-100 text-green-800",
  technical_buyer: "bg-blue-100 text-blue-800",
  influencer: "bg-indigo-100 text-indigo-800",
  user: "bg-gray-100 text-gray-800",
  blocker: "bg-red-100 text-red-800",
  gatekeeper: "bg-orange-100 text-orange-800",
};

export default function ABMPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [targetAccounts, setTargetAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        // In real implementation, fetch from your API
        setLoading(false);
      } catch (error) {
        console.error("Error fetching ABM data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

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

  // Mock data for demonstration
  const mockAccounts = [
    {
      company: "Acme Corporation",
      tier: "tier1",
      accountScore: 92,
      coverageScore: 75,
      dealValue: 150000,
      committee: [
        { name: "John Smith", role: "champion", influence: 90, sentiment: "positive" },
        { name: "Sarah Johnson", role: "decision_maker", influence: 95, sentiment: "positive" },
        { name: "Mike Chen", role: "technical_buyer", influence: 70, sentiment: "neutral" },
        { name: "Lisa Brown", role: "influencer", influence: 60, sentiment: "positive" },
      ],
    },
    {
      company: "TechStart Inc",
      tier: "tier2",
      accountScore: 78,
      coverageScore: 50,
      dealValue: 75000,
      committee: [
        { name: "David Lee", role: "decision_maker", influence: 85, sentiment: "neutral" },
        { name: "Emma Wilson", role: "user", influence: 40, sentiment: "positive" },
      ],
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <PageHeader
        icon={Building2}
        title="Account-Based Marketing (ABM)"
        description="Track buying committees and account hierarchies for enterprise deals"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Target Accounts"
          value={mockAccounts.length}
          description="Active enterprise accounts"
          icon={Building2}
          variant="primary"
        />

        <StatCard
          title="Tier 1 Accounts"
          value={mockAccounts.filter((a) => a.tier === "tier1").length}
          description="High-value targets"
          icon={Crown}
          variant="warning"
        />

        <StatCard
          title="Pipeline Value"
          value={`$${mockAccounts
            .reduce((sum, a) => sum + a.dealValue, 0)
            .toLocaleString()}`}
          description="Total opportunity value"
          icon={TrendingUp}
          variant="success"
        />

        <StatCard
          title="Avg. Coverage"
          value={`${Math.round(mockAccounts.reduce((sum, a) => sum + a.coverageScore, 0) / mockAccounts.length)}%`}
          description="Buying committee coverage"
          icon={Users}
          variant="info"
        />
      </div>

      {/* Target Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Target Accounts</CardTitle>
          <CardDescription>Enterprise accounts with buying committee tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockAccounts.map((account, index) => (
              <div key={index} className="border rounded-lg p-6">
                {/* Account Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold">{account.company}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={
                            account.tier === "tier1"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          {account.tier.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Account Score: {account.accountScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${account.dealValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Deal Value</p>
                  </div>
                </div>

                {/* Coverage Score */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Buying Committee Coverage</span>
                    <span className="font-semibold">{account.coverageScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        account.coverageScore >= 75
                          ? "bg-green-500"
                          : account.coverageScore >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${account.coverageScore}%` }}
                    />
                  </div>
                  {account.coverageScore < 75 && (
                    <p className="text-xs text-yellow-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Need to identify more key stakeholders
                    </p>
                  )}
                </div>

                {/* Committee Members */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Buying Committee ({account.committee.length} members)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {account.committee.map((member: any, idx: number) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={ROLE_COLORS[member.role]}>
                              {member.role.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Influence: {member.influence}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              member.sentiment === "positive"
                                ? "text-green-600"
                                : member.sentiment === "neutral"
                                ? "text-gray-600"
                                : "text-red-600"
                            }
                          >
                            {member.sentiment}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">
                    View Full Account
                  </Button>
                  <Button size="sm" variant="outline">
                    Add Committee Member
                  </Button>
                  <Button size="sm" variant="outline">
                    View Activity
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Roles Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Buying Committee Roles</CardTitle>
          <CardDescription>Understanding key decision-makers in B2B deals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <Badge className={ROLE_COLORS.champion}>Champion</Badge>
              <p className="text-sm mt-2 text-muted-foreground">
                Internal advocate who sells your solution within their organization
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge className={ROLE_COLORS.decision_maker}>Decision Maker</Badge>
              <p className="text-sm mt-2 text-muted-foreground">
                Final authority on the purchase decision
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge className={ROLE_COLORS.economic_buyer}>Economic Buyer</Badge>
              <p className="text-sm mt-2 text-muted-foreground">
                Controls the budget and signs the contract
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <Badge className={ROLE_COLORS.technical_buyer}>Technical Buyer</Badge>
              <p className="text-sm mt-2 text-muted-foreground">
                Evaluates technical fit and integration requirements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
