"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeftIcon,
    RocketLaunchIcon,
    PaintBrushIcon,
    CursorArrowRaysIcon,
    ChartBarIcon,
    DocumentDuplicateIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/outline";

const SECTIONS = [
    { id: "quick-start", label: "Quick Start", icon: RocketLaunchIcon },
    { id: "sections", label: "Section Types", icon: DocumentDuplicateIcon },
    { id: "design", label: "Design & Theme", icon: PaintBrushIcon },
    { id: "publishing", label: "Publishing", icon: CursorArrowRaysIcon },
    { id: "tracking", label: "Analytics", icon: ChartBarIcon },
];

const SECTION_TYPES = [
    {
        type: "Hero",
        icon: "🎯",
        description: "Main banner with headline and call-to-action",
        fields: ["Heading", "Subheading", "Button Text", "Button Link"],
    },
    {
        type: "Features",
        icon: "✨",
        description: "Showcase product/service features in a grid",
        fields: ["Heading", "Features (icon, title, description)"],
    },
    {
        type: "Testimonials",
        icon: "💬",
        description: "Display customer reviews and ratings",
        fields: ["Heading", "Testimonials (name, quote, rating, company)"],
    },
    {
        type: "Pricing",
        icon: "💰",
        description: "Show pricing plans with features",
        fields: ["Heading", "Plans (name, price, features, button)"],
    },
    {
        type: "CTA",
        icon: "📣",
        description: "Conversion-focused section with prominent button",
        fields: ["Heading", "Content", "Button Text", "Button Link"],
    },
    {
        type: "Form",
        icon: "📝",
        description: "Embed lead capture forms",
        fields: ["Heading", "Form Selection"],
    },
    {
        type: "Content",
        icon: "📄",
        description: "Rich text/paragraph content",
        fields: ["Heading", "Content Text"],
    },
    {
        type: "Image",
        icon: "🖼️",
        description: "Full-width image display",
        fields: ["Image URL"],
    },
    {
        type: "Video",
        icon: "🎥",
        description: "Embed YouTube or Vimeo videos",
        fields: ["Video URL"],
    },
];

export default function LandingPageHelpPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const [activeSection, setActiveSection] = useState("quick-start");

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push(`/projects/${workspaceId}/pages`)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Landing Pages Guide
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Learn how to create beautiful landing pages
                                </p>
                            </div>
                        </div>
                        <Link
                            href={`/projects/${workspaceId}/pages/new`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create Page
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-24">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Contents
                            </h3>
                            <nav className="space-y-1">
                                {SECTIONS.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                activeSection === section.id
                                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {section.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="space-y-8">
                            {/* Quick Start */}
                            {activeSection === "quick-start" && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            🚀 Quick Start
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            Create your first landing page in 4 simple steps:
                                        </p>

                                        <div className="space-y-4">
                                            {[
                                                {
                                                    step: "1",
                                                    title: "Choose a Template",
                                                    description:
                                                        "Select from Blank, SaaS, Agency, or E-Commerce templates",
                                                },
                                                {
                                                    step: "2",
                                                    title: "Configure Details",
                                                    description:
                                                        "Enter page name, URL slug, and description",
                                                },
                                                {
                                                    step: "3",
                                                    title: "Add Sections",
                                                    description:
                                                        "Click section types to add them to your page",
                                                },
                                                {
                                                    step: "4",
                                                    title: "Publish",
                                                    description:
                                                        "Click Publish to make your page live",
                                                },
                                            ].map((item) => (
                                                <div
                                                    key={item.step}
                                                    className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                                        {item.step}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                            {item.title}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                            💡 Pro Tip
                                        </h3>
                                        <p className="text-blue-800 dark:text-blue-400">
                                            Start with a template and customize it to your needs. You can
                                            always add or remove sections later!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Section Types */}
                            {activeSection === "sections" && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            📦 Section Types
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            Build your landing page with these powerful sections:
                                        </p>
                                    </div>

                                    {SECTION_TYPES.map((section) => (
                                        <div
                                            key={section.type}
                                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="text-4xl">{section.icon}</div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                        {section.type}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                                                        {section.description}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {section.fields.map((field) => (
                                                            <span
                                                                key={field}
                                                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                                                            >
                                                                {field}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Design & Theme */}
                            {activeSection === "design" && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            🎨 Design & Theme
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            Customize your page's appearance in the Settings tab:
                                        </p>

                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                    Theme Options
                                                </h4>
                                                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span>
                                                            <strong>Light:</strong> White background with
                                                            dark text
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span>
                                                            <strong>Dark:</strong> Dark background with light
                                                            text
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span>
                                                            <strong>Custom:</strong> Set your own colors
                                                        </span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                    Color Customization
                                                </h4>
                                                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <li>
                                                        <strong>Primary Color:</strong> Buttons, CTAs,
                                                        highlights
                                                    </li>
                                                    <li>
                                                        <strong>Secondary Color:</strong> Accents, badges
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                    Available Fonts
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <div>• Inter (default)</div>
                                                    <div>• Roboto</div>
                                                    <div>• Open Sans</div>
                                                    <div>• Lato</div>
                                                    <div>• Poppins</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Publishing */}
                            {activeSection === "publishing" && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            🚀 Publishing Your Page
                                        </h2>

                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                    Save as Draft
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Click "Save" to save your changes without making the page
                                                    public. Perfect for testing and iterating.
                                                </p>
                                            </div>

                                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                                                    Publish Page
                                                </h4>
                                                <p className="text-sm text-green-800 dark:text-green-400 mb-3">
                                                    Click "Publish" to make your page publicly accessible. Your
                                                    page will be live at:
                                                </p>
                                                <code className="px-3 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-sm text-green-700 dark:text-green-400">
                                                    your-domain.com/p/your-slug
                                                </code>
                                            </div>

                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                                    Preview Page
                                                </h4>
                                                <p className="text-sm text-blue-800 dark:text-blue-400">
                                                    Click "Preview" to see exactly what your visitors will see
                                                    before publishing.
                                                </p>
                                            </div>

                                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                                                    Unpublish Page
                                                </h4>
                                                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                                    Click "Unpublish" to hide the page from public view while
                                                    keeping all your content saved.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Analytics & Tracking */}
                            {activeSection === "tracking" && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            📊 Analytics & Tracking
                                        </h2>

                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <span className="text-2xl">📈</span>
                                                    Built-in Analytics
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                    Track your page performance automatically:
                                                </p>
                                                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                    <li>• Page views</li>
                                                    <li>• Unique visitors</li>
                                                    <li>• Conversion rate</li>
                                                    <li>• Form submissions</li>
                                                </ul>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <span className="text-2xl">🔍</span>
                                                    Google Analytics
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    Add your GA4 Measurement ID in the Settings tab:
                                                </p>
                                                <code className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm">
                                                    G-XXXXXXXXXX
                                                </code>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <span className="text-2xl">📘</span>
                                                    Facebook Pixel
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    Add your Facebook Pixel ID (15-digit number) in the Settings
                                                    tab to track conversions.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                                        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
                                            🎯 SEO Settings
                                        </h3>
                                        <p className="text-purple-800 dark:text-purple-400 mb-3">
                                            Optimize for search engines in the SEO tab:
                                        </p>
                                        <ul className="space-y-1 text-sm text-purple-800 dark:text-purple-400">
                                            <li>• Page title (60 characters)</li>
                                            <li>• Meta description (160 characters)</li>
                                            <li>• Keywords (comma-separated)</li>
                                            <li>• OG image for social sharing</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
