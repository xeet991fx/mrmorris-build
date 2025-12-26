"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, RocketLaunchIcon, BriefcaseIcon, ShoppingCartIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { createLandingPage, PageSection } from "@/lib/api/landingPage";
import toast from "react-hot-toast";
import Link from "next/link";

// Pre-built templates
const TEMPLATES = [
    {
        id: "blank",
        name: "Blank Page",
        icon: DocumentTextIcon,
        description: "Start from scratch",
        sections: [],
    },
    {
        id: "saas",
        name: "SaaS Product",
        icon: RocketLaunchIcon,
        description: "Perfect for software products",
        sections: [
            {
                id: "hero_1",
                type: "hero" as const,
                order: 0,
                settings: {
                    alignment: "center" as const,
                    heading: "Transform Your Business with AI",
                    subheading: "The smartest CRM that works while you sleep",
                    buttonText: "Start Free Trial",
                    buttonLink: "#",
                },
            },
            {
                id: "features_1",
                type: "features" as const,
                order: 1,
                settings: {
                    layout: "grid" as const,
                    heading: "Everything You Need",
                    features: [
                        { icon: "⚡", title: "Lightning Fast", description: "Built for speed and performance" },
                        { icon: "🔒", title: "Secure", description: "Enterprise-grade security" },
                        { icon: "📱", title: "Mobile First", description: "Works perfectly on any device" },
                        { icon: "🤖", title: "AI Powered", description: "Smart automation built-in" },
                        { icon: "📊", title: "Analytics", description: "Deep insights and reports" },
                        { icon: "🔗", title: "Integrations", description: "Connect with 1000+ apps" },
                    ],
                },
            },
            {
                id: "pricing_1",
                type: "pricing" as const,
                order: 2,
                settings: {
                    layout: "grid" as const,
                    heading: "Simple, Transparent Pricing",
                    pricingPlans: [
                        {
                            name: "Starter",
                            price: "$29",
                            period: "/month",
                            features: ["Up to 10 users", "Basic features", "Email support", "5GB storage"],
                            buttonText: "Get Started",
                            buttonLink: "#",
                        },
                        {
                            name: "Professional",
                            price: "$79",
                            period: "/month",
                            features: ["Unlimited users", "All features", "Priority support", "100GB storage", "Advanced analytics"],
                            highlighted: true,
                            buttonText: "Start Free Trial",
                            buttonLink: "#",
                        },
                        {
                            name: "Enterprise",
                            price: "$199",
                            period: "/month",
                            features: ["Unlimited everything", "Custom features", "24/7 dedicated support", "Unlimited storage", "SLA guarantee"],
                            buttonText: "Contact Sales",
                            buttonLink: "#",
                        },
                    ],
                },
            },
            {
                id: "cta_1",
                type: "cta" as const,
                order: 3,
                settings: {
                    alignment: "center" as const,
                    heading: "Ready to Get Started?",
                    content: "Join thousands of teams already using our platform",
                    buttonText: "Start Your Free Trial",
                    buttonLink: "#",
                },
            },
        ],
    },
    {
        id: "agency",
        name: "Agency/Service",
        icon: BriefcaseIcon,
        description: "For agencies and consultants",
        sections: [
            {
                id: "hero_1",
                type: "hero" as const,
                order: 0,
                settings: {
                    alignment: "center" as const,
                    heading: "We Build Brands That Matter",
                    subheading: "Award-winning digital agency specializing in web design and branding",
                    buttonText: "View Our Work",
                    buttonLink: "#",
                },
            },
            {
                id: "content_1",
                type: "content" as const,
                order: 1,
                settings: {
                    alignment: "center" as const,
                    heading: "Our Approach",
                    content: "We combine strategy, design, and technology to create exceptional digital experiences that drive results.",
                },
            },
            {
                id: "testimonials_1",
                type: "testimonials" as const,
                order: 2,
                settings: {
                    layout: "grid" as const,
                    heading: "What Our Clients Say",
                    testimonials: [
                        {
                            name: "Sarah Johnson",
                            role: "CEO",
                            company: "TechCorp",
                            quote: "Working with this agency transformed our brand. Highly recommended!",
                            rating: 5,
                        },
                        {
                            name: "Mike Chen",
                            role: "Marketing Director",
                            company: "GrowthLab",
                            quote: "Outstanding work and exceptional customer service. A true partner.",
                            rating: 5,
                        },
                    ],
                },
            },
            {
                id: "cta_1",
                type: "cta" as const,
                order: 3,
                settings: {
                    alignment: "center" as const,
                    heading: "Let's Work Together",
                    content: "Ready to take your brand to the next level?",
                    buttonText: "Get In Touch",
                    buttonLink: "#",
                },
            },
        ],
    },
    {
        id: "ecommerce",
        name: "E-Commerce",
        icon: ShoppingCartIcon,
        description: "Product launch or store",
        sections: [
            {
                id: "hero_1",
                type: "hero" as const,
                order: 0,
                settings: {
                    alignment: "center" as const,
                    heading: "Premium Products, Delivered",
                    subheading: "Discover our curated collection of high-quality products",
                    buttonText: "Shop Now",
                    buttonLink: "#",
                },
            },
            {
                id: "features_1",
                type: "features" as const,
                order: 1,
                settings: {
                    layout: "grid" as const,
                    heading: "Why Shop With Us",
                    features: [
                        { icon: "🚚", title: "Free Shipping", description: "On orders over $50" },
                        { icon: "↩️", title: "Easy Returns", description: "30-day money back guarantee" },
                        { icon: "🔐", title: "Secure Checkout", description: "SSL encrypted payments" },
                    ],
                },
            },
            {
                id: "testimonials_1",
                type: "testimonials" as const,
                order: 2,
                settings: {
                    layout: "grid" as const,
                    heading: "Happy Customers",
                    testimonials: [
                        {
                            name: "Emily Davis",
                            quote: "Best purchase I've made this year. Quality is outstanding!",
                            rating: 5,
                        },
                    ],
                },
            },
            {
                id: "cta_1",
                type: "cta" as const,
                order: 3,
                settings: {
                    alignment: "center" as const,
                    heading: "Ready to Shop?",
                    content: "Browse our full catalog and find your perfect product",
                    buttonText: "View Collection",
                    buttonLink: "#",
                },
            },
        ],
    },
];

export default function NewLandingPagePage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [step, setStep] = useState<"template" | "details">("template");
    const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
    });

    const handleSlugGeneration = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        setFormData(prev => ({ ...prev, slug }));
    };

    const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
        setSelectedTemplate(template);
        setFormData({
            name: `My ${template.name}`,
            slug: `my-${template.id}-page`,
            description: template.description,
        });
        setStep("details");
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Please enter a page name");
            return;
        }

        if (!formData.slug.trim()) {
            toast.error("Please enter a slug");
            return;
        }

        if (!selectedTemplate) {
            toast.error("Please select a template");
            return;
        }

        setIsCreating(true);
        try {
            const response = await createLandingPage(workspaceId, {
                name: formData.name,
                slug: formData.slug,
                description: formData.description,
                status: "draft",
                sections: selectedTemplate.sections,
                seo: {
                    title: formData.name,
                    description: formData.description || formData.name,
                },
                settings: {
                    theme: "light",
                    primaryColor: "#3b82f6",
                    secondaryColor: "#10b981",
                    font: "Inter",
                },
                stats: {
                    views: 0,
                    uniqueVisitors: 0,
                    conversions: 0,
                    conversionRate: 0,
                },
            });

            if (response.success) {
                toast.success("Landing page created!");
                router.push(`/projects/${workspaceId}/pages/${response.data._id}/edit`);
            }
        } catch (error: any) {
            console.error("Error creating landing page:", error);
            toast.error(error.message || "Failed to create landing page");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <Link
                    href={`/projects/${workspaceId}/pages`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Landing Pages
                </Link>
                <h1 className="text-2xl font-bold text-foreground">Create Landing Page</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {step === "template" ? "Choose a template to get started" : "Customize your landing page details"}
                </p>
            </div>

            {step === "template" ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {TEMPLATES.map((template) => {
                        const Icon = template.icon;
                        return (
                            <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="p-6 rounded-lg border-2 border-border bg-card hover:border-primary transition-all text-left group"
                            >
                                <Icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">{template.name}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                                <div className="text-xs text-muted-foreground">
                                    {template.sections.length} section{template.sections.length !== 1 ? 's' : ''} included
                                </div>
                            </button>
                        );
                    })}
                </motion.div>
            ) : (
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreate}
                    className="space-y-6 p-6 rounded-lg border border-border bg-card"
                >
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <button
                            type="button"
                            onClick={() => setStep("template")}
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            ← Change Template
                        </button>
                        <span className="text-sm text-muted-foreground">
                            Using <strong className="text-foreground">{selectedTemplate?.name}</strong> template
                        </span>
                    </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Page Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            if (!formData.slug) {
                                handleSlugGeneration(e.target.value);
                            }
                        }}
                        placeholder="My Awesome Landing Page"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        URL Slug *
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">/p/</span>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="my-awesome-page"
                            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            pattern="[a-z0-9-]+"
                            required
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Lowercase letters, numbers, and hyphens only
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of this landing page"
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                    />
                </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isCreating ? "Creating..." : "Create & Start Building"}
                        </button>
                        <Link
                            href={`/projects/${workspaceId}/pages`}
                            className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors text-center"
                        >
                            Cancel
                        </Link>
                    </div>
                </motion.form>
            )}
        </div>
    );
}
