"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    EyeIcon,
    Cog6ToothIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { getLandingPage, updateLandingPage, LandingPage, PageSection } from "@/lib/api/landingPage";
import { getForms, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

const SECTION_TYPES = [
    { type: 'hero' as const, label: 'Hero', icon: '🎯', description: 'Main banner with heading and CTA' },
    { type: 'features' as const, label: 'Features', icon: '✨', description: 'Feature grid or list' },
    { type: 'testimonials' as const, label: 'Testimonials', icon: '💬', description: 'Customer reviews' },
    { type: 'pricing' as const, label: 'Pricing', icon: '💰', description: 'Pricing plans' },
    { type: 'cta' as const, label: 'Call to Action', icon: '📣', description: 'Conversion section' },
    { type: 'form' as const, label: 'Form', icon: '📝', description: 'Lead capture form' },
    { type: 'content' as const, label: 'Content', icon: '📄', description: 'Rich text content' },
    { type: 'image' as const, label: 'Image', icon: '🖼️', description: 'Image section' },
    { type: 'video' as const, label: 'Video', icon: '🎥', description: 'Video embed' },
];

export default function EditLandingPagePage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const pageId = params.pageId as string;

    const [page, setPage] = useState<LandingPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'seo'>('builder');
    const [editingSection, setEditingSection] = useState<PageSection | null>(null);
    const [availableForms, setAvailableForms] = useState<Form[]>([]);

    useEffect(() => {
        loadPage();
        loadForms();
    }, [workspaceId, pageId]);

    const loadPage = async () => {
        setIsLoading(true);
        try {
            const response = await getLandingPage(workspaceId, pageId);
            if (response.success) {
                setPage(response.data);
            }
        } catch (error) {
            console.error("Error loading page:", error);
            toast.error("Failed to load landing page");
        } finally {
            setIsLoading(false);
        }
    };

    const loadForms = async () => {
        try {
            const response = await getForms(workspaceId, 'published');
            if (response.success) {
                setAvailableForms(response.data);
            }
        } catch (error) {
            console.error("Error loading forms:", error);
        }
    };

    const handleSave = async () => {
        if (!page) return;

        setIsSaving(true);
        try {
            await updateLandingPage(workspaceId, pageId, page);
            toast.success("Landing page saved!");
        } catch (error: any) {
            console.error("Error saving page:", error);
            toast.error(error.message || "Failed to save page");
        } finally {
            setIsSaving(false);
        }
    };

    const addSection = (type: PageSection['type']) => {
        if (!page) return;

        const newSection: PageSection = {
            id: `section_${Date.now()}`,
            type,
            order: page.sections.length,
            settings: getDefaultSettings(type),
        };

        setPage({
            ...page,
            sections: [...page.sections, newSection],
        });
    };

    const getDefaultSettings = (type: PageSection['type']) => {
        switch (type) {
            case 'hero':
                return {
                    layout: 'single' as const,
                    alignment: 'center' as const,
                    heading: 'Welcome to Our Product',
                    subheading: 'Transform your business with our solution',
                    buttonText: 'Get Started',
                    buttonLink: '#',
                };
            case 'features':
                return {
                    layout: 'grid' as const,
                    heading: 'Our Features',
                    features: [
                        { icon: '⚡', title: 'Fast', description: 'Lightning-fast performance' },
                        { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security' },
                        { icon: '📱', title: 'Responsive', description: 'Works on all devices' },
                    ],
                };
            case 'testimonials':
                return {
                    layout: 'grid' as const,
                    heading: 'What Our Customers Say',
                    testimonials: [
                        {
                            name: 'John Doe',
                            role: 'CEO',
                            company: 'Acme Inc',
                            quote: 'This product changed our business!',
                            rating: 5,
                        },
                    ],
                };
            case 'pricing':
                return {
                    layout: 'grid' as const,
                    heading: 'Simple Pricing',
                    pricingPlans: [
                        {
                            name: 'Starter',
                            price: '$29',
                            period: '/month',
                            features: ['Feature 1', 'Feature 2', 'Feature 3'],
                            buttonText: 'Get Started',
                            buttonLink: '#',
                        },
                    ],
                };
            case 'cta':
                return {
                    alignment: 'center' as const,
                    heading: 'Ready to Get Started?',
                    content: 'Join thousands of satisfied customers today',
                    buttonText: 'Sign Up Now',
                    buttonLink: '#',
                };
            case 'content':
                return {
                    alignment: 'left' as const,
                    heading: 'About Us',
                    content: 'Your content here...',
                };
            case 'form':
                return {
                    alignment: 'center' as const,
                    heading: 'Get in Touch',
                    formId: '', // Will be selected in the editor
                };
            case 'image':
                return {
                    imageUrl: '',
                    alt: 'Section image',
                };
            case 'video':
                return {
                    videoUrl: '',
                };
            default:
                return {};
        }
    };

    const updateSection = (id: string, updates: Partial<PageSection>) => {
        if (!page) return;

        setPage({
            ...page,
            sections: page.sections.map(s =>
                s.id === id ? { ...s, ...updates } : s
            ),
        });
    };

    const deleteSection = (id: string) => {
        if (!page) return;
        if (!confirm("Delete this section?")) return;

        setPage({
            ...page,
            sections: page.sections.filter(s => s.id !== id),
        });
    };

    const moveSection = (id: string, direction: 'up' | 'down') => {
        if (!page) return;

        const index = page.sections.findIndex(s => s.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === page.sections.length - 1) return;

        const newSections = [...page.sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

        setPage({
            ...page,
            sections: newSections.map((s, i) => ({ ...s, order: i })),
        });
    };

    const toggleStatus = async () => {
        if (!page) return;

        const newStatus = page.status === 'published' ? 'draft' : 'published';
        setPage({ ...page, status: newStatus });

        try {
            await updateLandingPage(workspaceId, pageId, { status: newStatus });
            toast.success(`Page ${newStatus === 'published' ? 'published' : 'unpublished'}!`);
        } catch (error) {
            toast.error("Failed to update status");
            setPage({ ...page, status: page.status });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground">Landing page not found</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/projects/${workspaceId}/pages`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">{page.name}</h1>
                        <p className="text-xs text-muted-foreground">/p/{page.slug}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border capitalize",
                        page.status === 'published'
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    )}>
                        {page.status}
                    </span>

                    {page.status === 'published' && (
                        <a
                            href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/p/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors text-sm"
                        >
                            <EyeIcon className="w-4 h-4" />
                            Preview
                        </a>
                    )}

                    <button
                        onClick={toggleStatus}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            page.status === 'published'
                                ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                                : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        )}
                    >
                        {page.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border bg-card px-6">
                <div className="flex gap-6">
                    {[
                        { id: 'builder', label: 'Builder' },
                        { id: 'settings', label: 'Settings' },
                        { id: 'seo', label: 'SEO' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === tab.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'builder' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Add Section */}
                        <div className="p-4 rounded-lg border border-dashed border-border bg-card">
                            <h3 className="text-sm font-medium text-foreground mb-3">Add Section</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {SECTION_TYPES.map(type => (
                                    <button
                                        key={type.type}
                                        onClick={() => addSection(type.type)}
                                        className="p-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-left"
                                    >
                                        <div className="text-2xl mb-1">{type.icon}</div>
                                        <div className="text-sm font-medium text-foreground">{type.label}</div>
                                        <div className="text-xs text-muted-foreground">{type.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sections */}
                        <div className="space-y-4">
                            {page.sections.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                                    <DocumentTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No sections yet. Add your first section above.
                                    </p>
                                </div>
                            ) : (
                                page.sections.map((section, index) => (
                                    <motion.div
                                        key={section.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-lg border border-border bg-card"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">
                                                    {SECTION_TYPES.find(t => t.type === section.type)?.icon}
                                                </span>
                                                <div>
                                                    <h4 className="text-sm font-medium text-foreground capitalize">
                                                        {section.type}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {section.settings.heading || 'No heading set'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => moveSection(section.id, 'up')}
                                                    disabled={index === 0}
                                                    className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-30"
                                                    title="Move up"
                                                >
                                                    <ArrowUpIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => moveSection(section.id, 'down')}
                                                    disabled={index === page.sections.length - 1}
                                                    className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-30"
                                                    title="Move down"
                                                >
                                                    <ArrowDownIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingSection(section)}
                                                    className="p-2 hover:bg-muted rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Cog6ToothIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteSection(section.id)}
                                                    className="p-2 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Section Preview */}
                                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                                            {section.settings.heading && (
                                                <p className="font-medium text-foreground">{section.settings.heading}</p>
                                            )}
                                            {section.settings.subheading && (
                                                <p className="text-xs mt-1">{section.settings.subheading}</p>
                                            )}
                                            {section.settings.content && (
                                                <p className="text-xs mt-2">{section.settings.content}</p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">Design Settings</h3>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
                                <select
                                    value={page.settings.theme}
                                    onChange={(e) => setPage({
                                        ...page,
                                        settings: { ...page.settings, theme: e.target.value as any }
                                    })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                >
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Primary Color</label>
                                <input
                                    type="color"
                                    value={page.settings.primaryColor}
                                    onChange={(e) => setPage({
                                        ...page,
                                        settings: { ...page.settings, primaryColor: e.target.value }
                                    })}
                                    className="w-full h-10 rounded border border-border"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Secondary Color</label>
                                <input
                                    type="color"
                                    value={page.settings.secondaryColor}
                                    onChange={(e) => setPage({
                                        ...page,
                                        settings: { ...page.settings, secondaryColor: e.target.value }
                                    })}
                                    className="w-full h-10 rounded border border-border"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Font Family</label>
                                <select
                                    value={page.settings.font}
                                    onChange={(e) => setPage({
                                        ...page,
                                        settings: { ...page.settings, font: e.target.value }
                                    })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                >
                                    <option value="Inter">Inter</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Open Sans">Open Sans</option>
                                    <option value="Lato">Lato</option>
                                    <option value="Poppins">Poppins</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">Tracking</h3>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Google Analytics ID
                                </label>
                                <input
                                    type="text"
                                    value={page.settings.googleAnalyticsId || ''}
                                    onChange={(e) => setPage({
                                        ...page,
                                        settings: { ...page.settings, googleAnalyticsId: e.target.value }
                                    })}
                                    placeholder="G-XXXXXXXXXX"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Facebook Pixel ID
                                </label>
                                <input
                                    type="text"
                                    value={page.settings.facebookPixelId || ''}
                                    onChange={(e) => setPage({
                                        ...page,
                                        settings: { ...page.settings, facebookPixelId: e.target.value }
                                    })}
                                    placeholder="123456789012345"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'seo' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                            <h3 className="text-lg font-semibold text-foreground">SEO Settings</h3>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Page Title *
                                </label>
                                <input
                                    type="text"
                                    value={page.seo.title}
                                    onChange={(e) => setPage({
                                        ...page,
                                        seo: { ...page.seo, title: e.target.value }
                                    })}
                                    placeholder="My Awesome Landing Page"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {page.seo.title.length} / 60 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Meta Description *
                                </label>
                                <textarea
                                    value={page.seo.description}
                                    onChange={(e) => setPage({
                                        ...page,
                                        seo: { ...page.seo, description: e.target.value }
                                    })}
                                    placeholder="A brief description of your landing page"
                                    rows={3}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {page.seo.description.length} / 160 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Keywords
                                </label>
                                <input
                                    type="text"
                                    value={page.seo.keywords?.join(', ') || ''}
                                    onChange={(e) => setPage({
                                        ...page,
                                        seo: { ...page.seo, keywords: e.target.value.split(',').map(k => k.trim()) }
                                    })}
                                    placeholder="keyword1, keyword2, keyword3"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Separate keywords with commas
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    OG Image URL
                                </label>
                                <input
                                    type="url"
                                    value={page.seo.ogImage || ''}
                                    onChange={(e) => setPage({
                                        ...page,
                                        seo: { ...page.seo, ogImage: e.target.value }
                                    })}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section Editor Modal */}
            <AnimatePresence>
                {editingSection && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[80vh] overflow-auto"
                        >
                            <div className="p-6 border-b border-border">
                                <h3 className="text-lg font-semibold text-foreground capitalize">
                                    Edit {editingSection.type} Section
                                </h3>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Common fields */}
                                {editingSection.type !== 'image' && editingSection.type !== 'video' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Heading
                                            </label>
                                            <input
                                                type="text"
                                                value={editingSection.settings.heading || ''}
                                                onChange={(e) => setEditingSection({
                                                    ...editingSection,
                                                    settings: { ...editingSection.settings, heading: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                            />
                                        </div>

                                        {(editingSection.type === 'hero' || editingSection.type === 'cta') && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Subheading
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingSection.settings.subheading || ''}
                                                        onChange={(e) => setEditingSection({
                                                            ...editingSection,
                                                            settings: { ...editingSection.settings, subheading: e.target.value }
                                                        })}
                                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Button Text
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingSection.settings.buttonText || ''}
                                                        onChange={(e) => setEditingSection({
                                                            ...editingSection,
                                                            settings: { ...editingSection.settings, buttonText: e.target.value }
                                                        })}
                                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        Button Link
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingSection.settings.buttonLink || ''}
                                                        onChange={(e) => setEditingSection({
                                                            ...editingSection,
                                                            settings: { ...editingSection.settings, buttonLink: e.target.value }
                                                        })}
                                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {editingSection.type === 'content' && (
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Content
                                                </label>
                                                <textarea
                                                    value={editingSection.settings.content || ''}
                                                    onChange={(e) => setEditingSection({
                                                        ...editingSection,
                                                        settings: { ...editingSection.settings, content: e.target.value }
                                                    })}
                                                    rows={6}
                                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {editingSection.type === 'image' && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Image URL
                                        </label>
                                        <input
                                            type="url"
                                            value={editingSection.settings.imageUrl || ''}
                                            onChange={(e) => setEditingSection({
                                                ...editingSection,
                                                settings: { ...editingSection.settings, imageUrl: e.target.value }
                                            })}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                        />
                                    </div>
                                )}

                                {editingSection.type === 'video' && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Video URL (YouTube/Vimeo)
                                        </label>
                                        <input
                                            type="url"
                                            value={editingSection.settings.videoUrl || ''}
                                            onChange={(e) => setEditingSection({
                                                ...editingSection,
                                                settings: { ...editingSection.settings, videoUrl: e.target.value }
                                            })}
                                            placeholder="https://youtube.com/watch?v=..."
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                        />
                                    </div>
                                )}

                                {editingSection.type === 'form' && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Select Form
                                        </label>
                                        <select
                                            value={editingSection.settings.formId || ''}
                                            onChange={(e) => setEditingSection({
                                                ...editingSection,
                                                settings: { ...editingSection.settings, formId: e.target.value }
                                            })}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                        >
                                            <option value="">Select a form...</option>
                                            {availableForms.map((form) => (
                                                <option key={form._id} value={form._id}>
                                                    {form.name} ({form.stats.submissions} submissions)
                                                </option>
                                            ))}
                                        </select>
                                        {availableForms.length === 0 && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                No published forms available. <Link href={`/projects/${workspaceId}/forms/new`} className="text-primary hover:underline">Create one first</Link>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-border flex gap-3">
                                <button
                                    onClick={() => {
                                        updateSection(editingSection.id, editingSection);
                                        setEditingSection(null);
                                    }}
                                    className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingSection(null)}
                                    className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
