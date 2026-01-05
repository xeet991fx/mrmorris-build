"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, TrendingUp, Plus, BarChart3 } from "lucide-react";

export default function LeadMagnetsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [magnets, setMagnets] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const [magnetsRes, analyticsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lead-magnets/workspace/${projectId}?status=published`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lead-magnets/workspace/${projectId}/analytics`, {
            credentials: "include",
          }),
        ]);

        const magnetsData = await magnetsRes.json();
        const analyticsData = await analyticsRes.json();

        setMagnets(magnetsData.magnets || []);
        setAnalytics(analyticsData.analytics);
      } catch (error) {
        console.error("Error fetching lead magnets:", error);
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

  const typeColors: any = {
    ebook: "bg-blue-100 text-blue-800",
    whitepaper: "bg-purple-100 text-purple-800",
    template: "bg-green-100 text-green-800",
    guide: "bg-indigo-100 text-indigo-800",
    case_study: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lead Magnets Library</h1>
          <p className="text-muted-foreground">
            Gated content that drives 70% of B2B leads
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead Magnet
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Lead Magnets</CardDescription>
            <CardTitle className="text-3xl">{analytics?.total || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Published content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-3xl">{analytics?.totalViews?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Downloads</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {analytics?.totalDownloads?.toLocaleString() || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              Leads generated
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-3xl">
              {analytics?.overallConversionRate?.toFixed(1) || 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Views to downloads</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Magnets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {magnets.map((magnet: any) => (
          <Card key={magnet._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              {magnet.coverImageUrl && (
                <img
                  src={magnet.coverImageUrl}
                  alt={magnet.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Badge className={typeColors[magnet.type] || "bg-gray-100 text-gray-800"}>
                    {magnet.type}
                  </Badge>
                  <CardTitle className="mt-2 text-lg">{magnet.title}</CardTitle>
                </div>
                {magnet.isGated && (
                  <Badge variant="outline" className="text-orange-600">
                    Gated
                  </Badge>
                )}
              </div>
              <CardDescription className="line-clamp-2">{magnet.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">Views</span>
                  </div>
                  <p className="text-lg font-semibold">{magnet.views}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Downloads</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600">{magnet.downloads}</p>
                </div>
              </div>

              {/* Conversion Rate Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="font-semibold">{magnet.conversionRate?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.min(magnet.conversionRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {magnets.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No lead magnets yet</h3>
            <p className="text-muted-foreground mb-4">
              Start creating gated content to generate more leads
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Lead Magnet
            </Button>
          </div>
        )}
      </div>

      {/* Performance by Type */}
      {analytics?.byType && analytics.byType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Content Type</CardTitle>
            <CardDescription>See which types convert best</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.byType.map((item: any) => (
                <div key={item._id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={typeColors[item._id]}>{item._id}</Badge>
                      <span className="text-sm text-muted-foreground">({item.count} items)</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.avgConversionRate?.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {item.totalDownloads} downloads
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${item.avgConversionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
