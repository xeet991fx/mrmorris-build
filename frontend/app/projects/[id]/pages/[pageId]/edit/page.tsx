"use client";

import React, { useEffect, useState, useCallback } from "react";
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
    RocketLaunchIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
    CurrencyDollarIcon,
    MegaphoneIcon,
    ClipboardDocumentListIcon,
    DocumentIcon,
    PhotoIcon,
    VideoCameraIcon,
    BoltIcon,
    ShieldCheckIcon,
    DevicePhoneMobileIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    GlobeAltIcon,
    PaintBrushIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { getLandingPage, updateLandingPage, LandingPage, PageSection } from "@/lib/api/landingPage";
import { getForms, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

const SECTION_TYPES = [
    { type: 'hero' as const, label: 'Hero', icon: RocketLaunchIcon, description: 'Main banner with heading and CTA' },
    { type: 'features' as const, label: 'Features', icon: SparklesIcon, description: 'Feature grid or list' },
    { type: 'testimonials' as const, label: 'Testimonials', icon: ChatBubbleLeftRightIcon, description: 'Customer reviews' },
    { type: 'pricing' as const, label: 'Pricing', icon: CurrencyDollarIcon, description: 'Pricing plans' },
    { type: 'cta' as const, label: 'Call to Action', icon: MegaphoneIcon, description: 'Conversion section' },
    { type: 'form' as const, label: 'Form', icon: ClipboardDocumentListIcon, description: 'Lead capture form' },
    { type: 'content' as const, label: 'Content', icon: DocumentIcon, description: 'Rich text content' },
    { type: 'image' as const, label: 'Image', icon: PhotoIcon, description: 'Image section' },
    { type: 'video' as const, label: 'Video', icon: VideoCameraIcon, description: 'Video embed' },
];

// Status Badge matching Sequences style
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
        draft: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400", label: "Draft" },
        published: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Published" },
    };
    const c = config[status] || config.draft;
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", c.bg, c.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
            {c.label}
        </span>
    );
}

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
    const [hasChanges, setHasChanges] = useState(false);
    const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);

    const loadPage = useCallback(async () => {
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
    }, [workspaceId, pageId]);

    const loadForms = useCallback(async () => {
        try {
            const response = await getForms(workspaceId, 'published');
            if (response.success) {
                setAvailableForms(response.data);
            }
        } catch (error) {
            console.error("Error loading forms:", error);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadPage();
        loadForms();
    }, [loadPage, loadForms]);

    const handleSave = async () => {
        if (!page) return;

        setIsSaving(true);
        try {
            await updateLandingPage(workspaceId, pageId, page);
            toast.success("Landing page saved!");
            setHasChanges(false);
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
        setHasChanges(true);
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
                        { icon: 'bolt', title: 'Fast', description: 'Lightning-fast performance' },
                        { icon: 'shield', title: 'Secure', description: 'Enterprise-grade security' },
                        { icon: 'device', title: 'Responsive', description: 'Works on all devices' },
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
                    formId: '',
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
        setHasChanges(true);
    };

    const deleteSection = (id: string) => {
        if (!page) return;
        setDeleteSectionId(id);
    };

    const confirmDeleteSection = () => {
        if (!page || !deleteSectionId) return;
        setPage({
            ...page,
            sections: page.sections.filter(s => s.id !== deleteSectionId),
        });
        setHasChanges(true);
        setDeleteSectionId(null);
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
        setHasChanges(true);
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
                <ArrowPathIcon className="w-8 h-8 animate-spin text-zinc-400" />
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

    const tabs = [
        { id: 'builder' as const, label: 'Builder', count: page.sections.length },
        { id: 'settings' as const, label: 'Settings' },
        { id: 'seo' as const, label: 'SEO' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Top Navigation Bar — Sequences style */}
            <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/projects/${workspaceId}/pages`)}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                        </button>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-sm text-zinc-500">Pages</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <input
                            value={page.name}
                            onChange={(e) => { setPage({ ...page, name: e.target.value }); setHasChanges(true); }}
                            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 min-w-[120px]"
                            placeholder="Page name..."
                        />
                        <StatusBadge status={page.status} />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Publish Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-zinc-500 font-medium">
                                {page.status === 'published' ? 'Published' : 'Publish page'}
                            </span>
                            <button
                                onClick={toggleStatus}
                                className={cn(
                                    "relative w-10 h-5 rounded-full transition-colors",
                                    page.status === 'published' ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"
                                )}
                            >
                                <span className={cn(
                                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                    page.status === 'published' ? "left-5.5 translate-x-0.5" : "left-0.5"
                                )} />
                            </button>
                        </label>

                        {/* Preview */}
                        {page.status === 'published' && (
                            <a
                                href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/p/${page.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all shadow-sm"
                            >
                                <EyeIcon className="w-4 h-4" />
                                Preview
                            </a>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-0 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                                activeTab === tab.id
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                                    activeTab === tab.id
                                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex">
                {/* Left Content */}
                <div className="flex-1 max-w-3xl mx-auto py-8 px-6">
                    {activeTab === 'builder' && (
                        <div>
                            {/* Add Section */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Add Section</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {SECTION_TYPES.map(type => (
                                        <button
                                            key={type.type}
                                            onClick={() => addSection(type.type)}
                                            className="group p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left shadow-sm hover:shadow"
                                        >
                                            <type.icon className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors mb-1" />
                                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{type.label}</div>
                                            <div className="text-xs text-zinc-500">{type.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="space-y-0">
                                {page.sections.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                            <DocumentTextIcon className="w-8 h-8 text-zinc-400" />
                                        </div>
                                        <p className="text-zinc-500 mb-4">No sections yet. Start building your page above.</p>
                                    </div>
                                ) : (
                                    page.sections.map((section, index) => (
                                        <div key={section.id}>
                                            {/* Connector line between sections */}
                                            {index > 0 && (
                                                <div className="flex justify-center py-2">
                                                    <div className="w-0.5 h-4 bg-zinc-200 dark:bg-zinc-700" />
                                                </div>
                                            )}

                                            {/* Section Card */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm relative"
                                            >
                                                {/* Section Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                                            {(() => {
                                                                const SectionIcon = SECTION_TYPES.find(t => t.type === section.type)?.icon;
                                                                return SectionIcon ? <SectionIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" /> : null;
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                                                                {section.type}
                                                            </span>
                                                            <span className="ml-2 text-xs text-zinc-400">
                                                                Section {index + 1}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => moveSection(section.id, 'up')}
                                                            disabled={index === 0}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                                                            title="Move up"
                                                        >
                                                            <ArrowUpIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveSection(section.id, 'down')}
                                                            disabled={index === page.sections.length - 1}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                                                            title="Move down"
                                                        >
                                                            <ArrowDownIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingSection(section)}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Edit"
                                                        >
                                                            <Cog6ToothIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteSection(section.id)}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Section Preview */}
                                                <div className="text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-lg">
                                                    {section.settings.heading && (
                                                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{section.settings.heading}</p>
                                                    )}
                                                    {section.settings.subheading && (
                                                        <p className="text-xs mt-1">{section.settings.subheading}</p>
                                                    )}
                                                    {section.settings.content && (
                                                        <p className="text-xs mt-2">{section.settings.content}</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Floating Save Button */}
                            {hasChanges && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
                                >
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>Save changes</>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Design Settings</h2>
                                <p className="text-sm text-zinc-500 mt-0.5">Configure the look and feel of your page</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Theme</label>
                                    <select
                                        value={page.settings.theme}
                                        onChange={(e) => { setPage({ ...page, settings: { ...page.settings, theme: e.target.value as any } }); setHasChanges(true); }}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Primary Color</label>
                                        <input
                                            type="color"
                                            value={page.settings.primaryColor}
                                            onChange={(e) => { setPage({ ...page, settings: { ...page.settings, primaryColor: e.target.value } }); setHasChanges(true); }}
                                            className="w-full h-10 rounded border border-zinc-200 dark:border-zinc-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Secondary Color</label>
                                        <input
                                            type="color"
                                            value={page.settings.secondaryColor}
                                            onChange={(e) => { setPage({ ...page, settings: { ...page.settings, secondaryColor: e.target.value } }); setHasChanges(true); }}
                                            className="w-full h-10 rounded border border-zinc-200 dark:border-zinc-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Font Family</label>
                                    <select
                                        value={page.settings.font}
                                        onChange={(e) => { setPage({ ...page, settings: { ...page.settings, font: e.target.value } }); setHasChanges(true); }}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                    >
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Open Sans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                        <option value="Poppins">Poppins</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Tracking</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Google Analytics ID</label>
                                        <input
                                            type="text"
                                            value={page.settings.googleAnalyticsId || ''}
                                            onChange={(e) => { setPage({ ...page, settings: { ...page.settings, googleAnalyticsId: e.target.value } }); setHasChanges(true); }}
                                            placeholder="G-XXXXXXXXXX"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Facebook Pixel ID</label>
                                        <input
                                            type="text"
                                            value={page.settings.facebookPixelId || ''}
                                            onChange={(e) => { setPage({ ...page, settings: { ...page.settings, facebookPixelId: e.target.value } }); setHasChanges(true); }}
                                            placeholder="123456789012345"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Floating Save */}
                            {hasChanges && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
                                >
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>Save changes</>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {activeTab === 'seo' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">SEO Settings</h2>
                                <p className="text-sm text-zinc-500 mt-0.5">Optimize your page for search engines</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Page Title</label>
                                    <input
                                        type="text"
                                        value={page.seo.title}
                                        onChange={(e) => { setPage({ ...page, seo: { ...page.seo, title: e.target.value } }); setHasChanges(true); }}
                                        placeholder="My Awesome Landing Page"
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                        required
                                    />
                                    <p className="text-xs text-zinc-400 mt-1">{page.seo.title.length} / 60 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Meta Description</label>
                                    <textarea
                                        value={page.seo.description}
                                        onChange={(e) => { setPage({ ...page, seo: { ...page.seo, description: e.target.value } }); setHasChanges(true); }}
                                        placeholder="A brief description of your landing page"
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm resize-none"
                                        required
                                    />
                                    <p className="text-xs text-zinc-400 mt-1">{page.seo.description.length} / 160 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Keywords</label>
                                    <input
                                        type="text"
                                        value={page.seo.keywords?.join(', ') || ''}
                                        onChange={(e) => { setPage({ ...page, seo: { ...page.seo, keywords: e.target.value.split(',').map(k => k.trim()) } }); setHasChanges(true); }}
                                        placeholder="keyword1, keyword2, keyword3"
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                    />
                                    <p className="text-xs text-zinc-400 mt-1">Separate keywords with commas</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">OG Image URL</label>
                                    <input
                                        type="url"
                                        value={page.seo.ogImage || ''}
                                        onChange={(e) => { setPage({ ...page, seo: { ...page.seo, ogImage: e.target.value } }); setHasChanges(true); }}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Floating Save */}
                            {hasChanges && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
                                >
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>Save changes</>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Settings Panel (always visible on desktop) */}
                <div className="hidden lg:block w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 min-h-[calc(100vh-108px)] sticky top-[108px]">
                    <div className="p-5 space-y-6">
                        {/* Page Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <DocumentTextIcon className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{page.name || "Untitled Page"}</span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                {page.description || "A landing page for capturing leads and driving conversions."}
                            </p>
                        </div>

                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Page URL */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Page URL</h4>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <GlobeAltIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">/p/{page.slug}</span>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Quick Stats */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Stats</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Sections</span>
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{page.sections.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Views</span>
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{page.stats?.views || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Conversions</span>
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{page.stats?.conversions || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                        {/* Design */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Design</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Theme</span>
                                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 capitalize">{page.settings.theme}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Font</span>
                                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{page.settings.font}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Colors</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: page.settings.primaryColor }} />
                                        <div className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: page.settings.secondaryColor }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Editor Modal */}
            <AnimatePresence>
                {editingSection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingSection(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl mx-4"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                                    Edit {editingSection.type} Section
                                </h3>
                            </div>

                            <div className="flex-1 overflow-auto p-5 space-y-4">
                                {/* Common fields */}
                                {editingSection.type !== 'image' && editingSection.type !== 'video' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                                                Heading
                                            </label>
                                            <input
                                                type="text"
                                                value={editingSection.settings.heading || ''}
                                                onChange={(e) => setEditingSection({
                                                    ...editingSection,
                                                    settings: { ...editingSection.settings, heading: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                            />
                                        </div>

                                        {(editingSection.type === 'hero' || editingSection.type === 'cta') && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                                                        Subheading
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingSection.settings.subheading || ''}
                                                        onChange={(e) => setEditingSection({
                                                            ...editingSection,
                                                            settings: { ...editingSection.settings, subheading: e.target.value }
                                                        })}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                                                        Button Text
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingSection.settings.buttonText || ''}
                                                        onChange={(e) => setEditingSection({
                                                            ...editingSection,
                                                            settings: { ...editingSection.settings, buttonText: e.target.value }
                                                        })}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                                                        Button Link
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingSection.settings.buttonLink || ''}
                                                        onChange={(e) => setEditingSection({
                                                            ...editingSection,
                                                            settings: { ...editingSection.settings, buttonLink: e.target.value }
                                                        })}
                                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {editingSection.type === 'content' && (
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                                                    Content
                                                </label>
                                                <textarea
                                                    value={editingSection.settings.content || ''}
                                                    onChange={(e) => setEditingSection({
                                                        ...editingSection,
                                                        settings: { ...editingSection.settings, content: e.target.value }
                                                    })}
                                                    rows={6}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm resize-none"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {editingSection.type === 'image' && (
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
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
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                        />
                                    </div>
                                )}

                                {editingSection.type === 'video' && (
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
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
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                        />
                                    </div>
                                )}

                                {editingSection.type === 'form' && (
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                                            Select Form
                                        </label>
                                        <select
                                            value={editingSection.settings.formId || ''}
                                            onChange={(e) => setEditingSection({
                                                ...editingSection,
                                                settings: { ...editingSection.settings, formId: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                                        >
                                            <option value="">Select a form...</option>
                                            {availableForms.map((form) => (
                                                <option key={form._id} value={form._id}>
                                                    {form.name} ({form.stats.submissions} submissions)
                                                </option>
                                            ))}
                                        </select>
                                        {availableForms.length === 0 && (
                                            <p className="text-xs text-zinc-400 mt-2">
                                                No published forms available. <Link href={`/projects/${workspaceId}/forms/new`} className="text-orange-500 hover:underline">Create one first</Link>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                                <button
                                    onClick={() => setEditingSection(null)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        updateSection(editingSection.id, editingSection);
                                        setEditingSection(null);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Section Confirmation Modal */}
            <AnimatePresence>
                {deleteSectionId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteSectionId(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4"
                        >
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Delete Section</h3>
                            <p className="text-sm text-zinc-500 mb-6">Remove this section from your page? This cannot be undone.</p>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setDeleteSectionId(null)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteSection}
                                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
