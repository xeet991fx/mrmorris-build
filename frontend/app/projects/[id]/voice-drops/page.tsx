"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, DollarSign, Users, TrendingUp, Plus, Mic } from "lucide-react";

export default function VoiceDropsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const [campaignsRes, statsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/voice-drops/workspace/${projectId}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/voice-drops/workspace/${projectId}/statistics`, {
            credentials: "include",
          }),
        ]);

        const campaignsData = await campaignsRes.json();
        const statsData = await statsRes.json();

        setCampaigns(campaignsData.campaigns || []);
        setStats(statsData.statistics);
      } catch (error) {
        console.error("Error fetching voice drops:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

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
    scheduled: "bg-blue-100 text-blue-800",
    sending: "bg-yellow-100 text-yellow-800",
    delivered: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Voice Drop Campaigns</h1>
          <p className="text-muted-foreground">
            Ringless voicemail - bypass ringing, straight to voicemail
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalCampaigns || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Voice Drops Sent</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalDrops?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Delivery Rate</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats?.totalDrops > 0
                ? ((stats.totalDelivered / stats.totalDrops) * 100).toFixed(1)
                : 0}
              %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              {stats?.totalDelivered || 0} delivered
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cost</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              ${((stats?.totalCost || 0) / 100).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ~${((stats?.totalCost || 0) / stats?.totalDrops / 100 || 0).toFixed(3)} per drop
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Drop Campaigns</CardTitle>
          <CardDescription>All ringless voicemail campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign: any) => (
              <div
                key={campaign._id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        <span>{campaign.audioDuration}s message</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{campaign.totalRecipients} recipients</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">{campaign.delivered} delivered</span>
                      </div>
                      {campaign.listenRate !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Listen Rate: </span>
                          <span className="font-semibold">{campaign.listenRate.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ${(campaign.actualCost / 100).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Cost</p>
                    {campaign.scheduledAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    View Recipients
                  </Button>
                  {campaign.audioFileUrl && (
                    <Button size="sm" variant="outline">
                      <Mic className="h-4 w-4 mr-2" />
                      Listen
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {campaigns.length === 0 && (
              <div className="text-center py-12">
                <Phone className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No voice drop campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first ringless voicemail campaign to reach leads directly
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Voice Drop Campaign
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Voice Drops Work</CardTitle>
          <CardDescription>Ringless voicemail technology</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Record Message</h4>
              <p className="text-sm text-muted-foreground">
                Upload pre-recorded voicemail (30-90 seconds recommended)
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Select Recipients</h4>
              <p className="text-sm text-muted-foreground">
                Choose contacts from your list or upload phone numbers
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Deliver to Voicemail</h4>
              <p className="text-sm text-muted-foreground">
                Message goes straight to voicemail without ringing phone
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
