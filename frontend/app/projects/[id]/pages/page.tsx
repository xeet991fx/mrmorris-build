"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    ChartBarIcon,
    GlobeAltIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Globe, Eye, Users, TrendingUp } from "lucide-react";
import { getLandingPages, deleteLandingPage, LandingPage } from "@/lib/api/landingPage";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LandingPagesListPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [pages, setPages] = useState<LandingPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

    const loadPages = async () => {
        setIsLoading(true);
        try {
            const response = await getLandingPages(
                workspaceId,
                selectedStatus === 'all' ? undefined : selectedStatus
            );
            if (response.success) {
                setPages(response.data);
            }
        } catch (error) {
            console.error("Error loading pages:", error);
            toast.error("Failed to load landing pages");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPages();
    }, [workspaceId, selectedStatus]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this landing page? This cannot be undone.")) return;

        try {
            await deleteLandingPage(workspaceId, id);
            toast.success("Landing page deleted");
            loadPages();
        } catch (error) {
            console.error("Error deleting page:", error);
            toast.error("Failed to delete page");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'draft': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'archived': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const filteredPages = selectedStatus === 'all' ? pages : pages.filter(p => p.status === selectedStatus);

    // Calculate stats
    const totalViews = pages.reduce((sum, p) => sum + (p.stats?.views || 0), 0);
    const totalVisitors = pages.reduce((sum, p) => sum + (p.stats?.uniqueVisitors || 0), 0);
    const avgConversionRate = pages.length > 0
        ? pages.reduce((sum, p) => sum + (p.stats?.conversionRate || 0), 0) / pages.length
        : 0;

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <PageHeader
                icon={Globe}
                title="Landing Pages"
                description="Create beautiful landing pages to convert visitors into leads"
            >
                <div className="flex gap-2">
                    <Link href={`/projects/${workspaceId}/pages/help`}>
                        <Button variant="outline" size="icon" title="View Guide">
                            <QuestionMarkCircleIcon className="w-5 h-5" />
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadPages}
                        disabled={isLoading}
                        title="Refresh"
                    >
                        <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
                    </Button>
                    <Link href={`/projects/${workspaceId}/pages/new`}>
                        <Button className="gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Create Page
                        </Button>
                    </Link>
                </div>
            </PageHeader>

            {/* Stats */}
            {pages.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Pages"
                        value={pages.length}
                        description={`${pages.filter(p => p.status === 'published').length} published`}
                        icon={Globe}
                        variant="primary"
                    />
                    <StatCard
                        title="Total Views"
                        value={totalViews.toLocaleString()}
                        description="Across all pages"
                        icon={Eye}
                        variant="info"
                    />
                    <StatCard
                        title="Unique Visitors"
                        value={totalVisitors.toLocaleString()}
                        description="Total visitors"
                        icon={Users}
                        variant="success"
                    />
                    <StatCard
                        title="Avg. Conversion"
                        value={`${avgConversionRate.toFixed(1)}%`}
                        description="Visitors to conversions"
                        icon={TrendingUp}
                        variant="warning"
                    />
                </div>
            )}

            {/* Status Filter */}
            <div className="flex gap-3 flex-wrap items-center">
                <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
                {(['all', 'published', 'draft', 'archived'] as const).map(status => {
                    const count = status === 'all' ? pages.length : pages.filter(p => p.status === status).length;
                    const isActive = selectedStatus === status;

                    return (
                        <Button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "capitalize gap-2 transition-all",
                                !isActive && "hover:border-primary"
                            )}
                        >
                            {status}
                            <Badge
                                variant={isActive ? "secondary" : "outline"}
                                className="ml-1 px-1.5 py-0 min-w-[20px] justify-center"
                            >
                                {count}
                            </Badge>
                        </Button>
                    );
                })}
            </div>

            {/* Pages Grid */}
            {isLoading ? (
                <Card className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <ArrowPathIcon className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-muted-foreground">Loading landing pages...</p>
                    </div>
                </Card>
            ) : filteredPages.length === 0 ? (
                <Card className="border-2 border-dashed">
                    <EmptyState
                        icon={GlobeAltIcon}
                        title={selectedStatus === 'all' ? 'No landing pages yet' : `No ${selectedStatus} pages`}
                        description={
                            selectedStatus === 'all'
                                ? 'Create your first landing page to start converting visitors into leads'
                                : 'Create a new page to see it here'
                        }
                        action={{
                            label: 'Create Your First Page',
                            onClick: () => router.push(`/projects/${workspaceId}/pages/new`)
                        }}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPages.map((page, index) => (
                        <motion.div
                            key={page._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="group relative hover:border-primary/50 overflow-hidden h-full flex flex-col">
                                {/* Status Badge */}
                                <div className="absolute top-4 right-4 z-10">
                                    <Badge
                                        variant={page.status === 'published' ? 'success' : page.status === 'draft' ? 'warning' : 'secondary'}
                                        className="capitalize shadow-sm"
                                    >
                                        {page.status === 'published' && <CheckCircleIcon className="w-3 h-3 inline mr-1" />}
                                        {page.status}
                                    </Badge>
                                </div>

                                <Link href={`/projects/${workspaceId}/pages/${page._id}/edit`} className="block p-6 flex-1">
                                    {/* Header */}
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-foreground line-clamp-1 mb-1 pr-20">
                                            {page.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <GlobeAltIcon className="w-3 h-3" />
                                            /{page.slug}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors">
                                            <Eye className="w-4 h-4 text-info mx-auto mb-1" />
                                            <p className="text-xs text-muted-foreground">Views</p>
                                            <p className="text-lg font-bold text-foreground">{page.stats.views.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors">
                                            <Users className="w-4 h-4 text-success mx-auto mb-1" />
                                            <p className="text-xs text-muted-foreground">Visitors</p>
                                            <p className="text-lg font-bold text-foreground">{page.stats.uniqueVisitors.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors">
                                            <TrendingUp className="w-4 h-4 text-warning mx-auto mb-1" />
                                            <p className="text-xs text-muted-foreground">Rate</p>
                                            <p className="text-lg font-bold text-foreground">
                                                {page.stats.conversionRate.toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="font-normal">
                                            {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                </Link>

                                {/* Actions */}
                                <div className="border-t bg-muted/30 px-4 py-3 flex gap-2">
                                    <Link href={`/projects/${workspaceId}/pages/${page._id}/edit`} className="flex-1">
                                        <Button size="sm" className="w-full gap-1.5">
                                            <PencilIcon className="w-4 h-4" />
                                            Edit
                                        </Button>
                                    </Link>
                                    {page.status === 'published' && (
                                        <a
                                            href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/p/${page.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button size="sm" variant="outline" title="View Live">
                                                <EyeIcon className="w-4 h-4" />
                                            </Button>
                                        </a>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(page._id)}
                                        title="Delete"
                                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
