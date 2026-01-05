"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, DollarSign, TrendingUp, Copy, Check } from "lucide-react";

export default function ReferralsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const [statsRes, leaderboardRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/referrals/workspace/${projectId}/statistics`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/referrals/workspace/${projectId}/leaderboard?limit=10`, {
            credentials: "include",
          }),
        ]);

        const statsData = await statsRes.json();
        const leaderboardData = await leaderboardRes.json();

        setStats(statsData.statistics);
        setLeaderboard(leaderboardData.leaderboard);
      } catch (error) {
        console.error("Error fetching referral data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const copyReferralLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-muted-foreground">
          Turn your customers into brand ambassadors - referred leads close 4x faster
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Referrals</CardDescription>
            <CardTitle className="text-3xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversions</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats?.conversions || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              {stats?.conversionRate?.toFixed(1) || 0}% conversion rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              ${stats?.totalRevenue?.toLocaleString() || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Deal Value</CardDescription>
            <CardTitle className="text-3xl">
              ${stats?.conversions > 0 ? Math.round(stats.totalRevenue / stats.conversions).toLocaleString() : 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Per converted referral</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>Top Referrers</CardTitle>
          </div>
          <CardDescription>Customers who bring the most value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaderboard.map((item: any, index: number) => (
              <div
                key={item._id}
                className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-800"
                        : index === 1
                        ? "bg-gray-100 text-gray-800"
                        : index === 2
                        ? "bg-orange-100 text-orange-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {item.referrer?.firstName} {item.referrer?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.referrer?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-lg">{item.totalReferrals}</p>
                    <p className="text-muted-foreground">Referrals</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg text-green-600">{item.conversions}</p>
                    <p className="text-muted-foreground">Conversions</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg text-blue-600">
                      ${item.totalRevenue?.toLocaleString() || 0}
                    </p>
                    <p className="text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet</p>
                <p className="text-sm mt-2">Start your referral program to see top performers here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How the Referral Program Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Customer Shares Link</h4>
              <p className="text-sm text-muted-foreground">
                Each customer gets a unique referral link and code
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Friend Signs Up</h4>
              <p className="text-sm text-muted-foreground">
                Referred person creates account and gets 10% off
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Both Get Rewarded</h4>
              <p className="text-sm text-muted-foreground">
                Referrer earns reward when friend converts to customer
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      {stats?.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Referral Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.breakdown.map((item: any) => (
                <div key={item._id} className="border rounded-lg p-4">
                  <Badge variant="outline">{item._id}</Badge>
                  <p className="text-2xl font-bold mt-2">{item.count}</p>
                  <p className="text-xs text-muted-foreground">
                    ${item.totalValue?.toLocaleString() || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
