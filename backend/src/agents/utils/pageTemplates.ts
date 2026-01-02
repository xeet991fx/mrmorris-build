/**
 * Page Templates for AI Landing Page Generator
 *
 * Pre-designed, beautiful page templates that serve as starting points
 * for AI-generated landing pages.
 */

import { v4 as uuidv4 } from "uuid";

export interface PageTemplate {
    name: string;
    description: string;
    theme: "light" | "dark";
    primaryColor: string;
    secondaryColor: string;
    font: string;
    sections: Array<{
        type: "hero" | "features" | "testimonials" | "pricing" | "cta" | "form" | "content" | "image" | "video";
        settings: Record<string, any>;
    }>;
}

// Modern color palettes
const COLORS = {
    indigo: { primary: "#6366f1", secondary: "#818cf8" },
    emerald: { primary: "#10b981", secondary: "#34d399" },
    violet: { primary: "#8b5cf6", secondary: "#a78bfa" },
    rose: { primary: "#f43f5e", secondary: "#fb7185" },
    amber: { primary: "#f59e0b", secondary: "#fbbf24" },
    cyan: { primary: "#06b6d4", secondary: "#22d3ee" },
    slate: { primary: "#475569", secondary: "#64748b" },
};

/**
 * SaaS Product Launch Template
 * Best for: Software products, apps, tools
 */
export const saasTemplate: PageTemplate = {
    name: "SaaS Product Launch",
    description: "Perfect for software products and digital tools",
    theme: "light",
    primaryColor: COLORS.indigo.primary,
    secondaryColor: COLORS.indigo.secondary,
    font: "Inter",
    sections: [
        {
            type: "hero",
            settings: {
                heading: "Transform Your Workflow with AI",
                subheading: "The intelligent platform that helps teams work smarter, not harder. Save 10+ hours every week.",
                buttonText: "Start Free Trial",
                buttonLink: "#pricing",
                alignment: "center",
            },
        },
        {
            type: "features",
            settings: {
                heading: "Everything You Need to Succeed",
                features: [
                    {
                        icon: "⚡",
                        title: "Lightning Fast",
                        description: "Process tasks 10x faster with AI-powered automation that learns your preferences.",
                    },
                    {
                        icon: "🔒",
                        title: "Enterprise Security",
                        description: "Bank-grade encryption and SOC 2 compliance keeps your data safe and secure.",
                    },
                    {
                        icon: "🔗",
                        title: "Seamless Integrations",
                        description: "Connect with 500+ tools you already use including Slack, Salesforce, and HubSpot.",
                    },
                    {
                        icon: "📊",
                        title: "Advanced Analytics",
                        description: "Gain insights with real-time dashboards and custom reports.",
                    },
                    {
                        icon: "🤖",
                        title: "AI Assistant",
                        description: "Get intelligent suggestions and automate repetitive tasks effortlessly.",
                    },
                    {
                        icon: "💬",
                        title: "24/7 Support",
                        description: "Our dedicated team is always ready to help you succeed.",
                    },
                ],
            },
        },
        {
            type: "pricing",
            settings: {
                heading: "Simple, Transparent Pricing",
                pricingPlans: [
                    {
                        name: "Starter",
                        price: "$19",
                        period: "/month",
                        features: ["Up to 5 users", "10GB storage", "Basic analytics", "Email support"],
                        buttonText: "Get Started",
                        buttonLink: "#signup",
                        highlighted: false,
                    },
                    {
                        name: "Professional",
                        price: "$49",
                        period: "/month",
                        features: ["Up to 25 users", "100GB storage", "Advanced analytics", "Priority support", "API access"],
                        buttonText: "Start Free Trial",
                        buttonLink: "#signup",
                        highlighted: true,
                    },
                    {
                        name: "Enterprise",
                        price: "Custom",
                        period: "",
                        features: ["Unlimited users", "Unlimited storage", "Custom integrations", "Dedicated account manager", "SLA guarantee"],
                        buttonText: "Contact Sales",
                        buttonLink: "#contact",
                        highlighted: false,
                    },
                ],
            },
        },
        {
            type: "testimonials",
            settings: {
                heading: "Loved by 10,000+ Teams Worldwide",
                testimonials: [
                    {
                        name: "Sarah Chen",
                        role: "VP of Operations",
                        company: "TechFlow Inc.",
                        quote: "This tool has completely transformed how our team collaborates. We've seen a 40% increase in productivity.",
                        rating: 5,
                    },
                    {
                        name: "Michael Rodriguez",
                        role: "Founder & CEO",
                        company: "StartupHub",
                        quote: "The AI features are game-changing. It's like having an extra team member that never sleeps.",
                        rating: 5,
                    },
                    {
                        name: "Emily Johnson",
                        role: "Product Manager",
                        company: "GlobalCorp",
                        quote: "Best investment we've made this year. The ROI was visible within the first month.",
                        rating: 5,
                    },
                ],
            },
        },
        {
            type: "cta",
            settings: {
                heading: "Ready to Transform Your Business?",
                content: "Join thousands of teams already using our platform to work smarter.",
                buttonText: "Start Your Free Trial",
                buttonLink: "#signup",
                alignment: "center",
            },
        },
    ],
};

/**
 * Agency/Services Template
 * Best for: Marketing agencies, consulting firms, service businesses
 */
export const agencyTemplate: PageTemplate = {
    name: "Agency Services",
    description: "Perfect for agencies and service businesses",
    theme: "dark",
    primaryColor: COLORS.violet.primary,
    secondaryColor: COLORS.violet.secondary,
    font: "Poppins",
    sections: [
        {
            type: "hero",
            settings: {
                heading: "We Build Brands That Stand Out",
                subheading: "Award-winning creative agency helping ambitious brands make their mark in the digital world.",
                buttonText: "View Our Work",
                buttonLink: "#portfolio",
                alignment: "left",
            },
        },
        {
            type: "features",
            settings: {
                heading: "Our Services",
                features: [
                    {
                        icon: "🎨",
                        title: "Brand Strategy",
                        description: "Build a brand that resonates with your audience and stands the test of time.",
                    },
                    {
                        icon: "💻",
                        title: "Web Development",
                        description: "Beautiful, high-performance websites that convert visitors into customers.",
                    },
                    {
                        icon: "📱",
                        title: "Digital Marketing",
                        description: "Data-driven campaigns that deliver measurable results and ROI.",
                    },
                    {
                        icon: "🎬",
                        title: "Video Production",
                        description: "Compelling video content that tells your story and engages your audience.",
                    },
                ],
            },
        },
        {
            type: "content",
            settings: {
                heading: "Why Choose Us?",
                content: "With over 10 years of experience and 500+ successful projects, we've helped brands of all sizes achieve remarkable growth. Our team of experts combines creativity with data-driven strategies to deliver results that exceed expectations. From startups to Fortune 500 companies, we treat every project with the same dedication and passion.",
                alignment: "center",
            },
        },
        {
            type: "testimonials",
            settings: {
                heading: "What Our Clients Say",
                testimonials: [
                    {
                        name: "David Park",
                        role: "Marketing Director",
                        company: "Innovate Labs",
                        quote: "They took our brand to the next level. Their attention to detail and creative vision is unmatched.",
                        rating: 5,
                    },
                    {
                        name: "Lisa Thompson",
                        role: "CEO",
                        company: "GreenStart",
                        quote: "Working with this team was an absolute pleasure. They delivered beyond our expectations.",
                        rating: 5,
                    },
                ],
            },
        },
        {
            type: "cta",
            settings: {
                heading: "Let's Create Something Amazing",
                content: "Ready to take your brand to the next level? Let's talk about your project.",
                buttonText: "Schedule a Call",
                buttonLink: "#contact",
                alignment: "center",
            },
        },
    ],
};

/**
 * E-commerce Product Template
 * Best for: Product launches, physical products, D2C brands
 */
export const ecommerceTemplate: PageTemplate = {
    name: "E-commerce Product",
    description: "Perfect for product launches and D2C brands",
    theme: "light",
    primaryColor: COLORS.rose.primary,
    secondaryColor: COLORS.rose.secondary,
    font: "Outfit",
    sections: [
        {
            type: "hero",
            settings: {
                heading: "Introducing the Future of [Product]",
                subheading: "Experience premium quality designed for modern life. Free shipping on orders over $50.",
                buttonText: "Shop Now",
                buttonLink: "#products",
                alignment: "center",
            },
        },
        {
            type: "features",
            settings: {
                heading: "Why You'll Love It",
                features: [
                    {
                        icon: "✨",
                        title: "Premium Materials",
                        description: "Crafted with the finest sustainable materials for lasting quality.",
                    },
                    {
                        icon: "🌱",
                        title: "Eco-Friendly",
                        description: "100% recyclable packaging and carbon-neutral shipping.",
                    },
                    {
                        icon: "⭐",
                        title: "5-Star Rated",
                        description: "Over 10,000 happy customers and counting.",
                    },
                    {
                        icon: "🔄",
                        title: "Easy Returns",
                        description: "30-day hassle-free returns. No questions asked.",
                    },
                ],
            },
        },
        {
            type: "testimonials",
            settings: {
                heading: "What Customers Are Saying",
                testimonials: [
                    {
                        name: "Jessica M.",
                        quote: "Absolutely love it! The quality exceeded my expectations. Already ordered another one.",
                        rating: 5,
                    },
                    {
                        name: "Alex K.",
                        quote: "Perfect gift for anyone. Fast shipping and beautiful packaging.",
                        rating: 5,
                    },
                    {
                        name: "Maria L.",
                        quote: "Best purchase I've made this year. Worth every penny!",
                        rating: 5,
                    },
                ],
            },
        },
        {
            type: "cta",
            settings: {
                heading: "Limited Time Offer: 20% Off",
                content: "Use code WELCOME20 at checkout. Free shipping on orders over $50.",
                buttonText: "Claim Your Discount",
                buttonLink: "#shop",
                alignment: "center",
            },
        },
    ],
};

/**
 * Lead Generation Template
 * Best for: Lead magnets, webinars, email capture
 */
export const leadgenTemplate: PageTemplate = {
    name: "Lead Generation",
    description: "Perfect for lead magnets, webinars, and email capture",
    theme: "light",
    primaryColor: COLORS.emerald.primary,
    secondaryColor: COLORS.emerald.secondary,
    font: "Inter",
    sections: [
        {
            type: "hero",
            settings: {
                heading: "Free Guide: [Topic]",
                subheading: "Learn the proven strategies that top performers use to [benefit]. Download your free copy now.",
                buttonText: "Get Free Access",
                buttonLink: "#signup-form",
                alignment: "center",
            },
        },
        {
            type: "features",
            settings: {
                heading: "What You'll Learn",
                features: [
                    {
                        icon: "📚",
                        title: "Chapter 1",
                        description: "The foundation: Understanding the core principles that drive success.",
                    },
                    {
                        icon: "🎯",
                        title: "Chapter 2",
                        description: "Strategy: Step-by-step action plan you can implement today.",
                    },
                    {
                        icon: "📈",
                        title: "Chapter 3",
                        description: "Advanced tactics: Pro-level techniques used by industry leaders.",
                    },
                    {
                        icon: "🏆",
                        title: "Bonus",
                        description: "Templates and checklists to accelerate your results.",
                    },
                ],
            },
        },
        {
            type: "content",
            settings: {
                heading: "About the Author",
                content: "With over 15 years of experience and having helped 1000+ clients achieve their goals, I've distilled everything I know into this comprehensive guide. Whether you're just starting out or looking to level up, this guide will give you the roadmap you need to succeed.",
                alignment: "center",
            },
        },
        {
            type: "form",
            settings: {
                heading: "Get Your Free Guide",
                subheading: "Enter your details below and we'll send it straight to your inbox.",
                buttonText: "Send Me the Guide",
                fields: [
                    { name: "firstName", label: "First Name", type: "text", required: true, placeholder: "John" },
                    { name: "lastName", label: "Last Name", type: "text", required: false, placeholder: "Doe" },
                    { name: "email", label: "Email Address", type: "email", required: true, placeholder: "john@example.com" },
                    { name: "company", label: "Company", type: "text", required: false, placeholder: "Your Company" },
                ],
                successMessage: "Thanks! Check your inbox for the guide.",
                alignment: "center",
            },
        },
    ],
};

/**
 * App Download Template
 * Best for: Mobile apps, desktop software
 */
export const appTemplate: PageTemplate = {
    name: "App Download",
    description: "Perfect for mobile apps and software downloads",
    theme: "dark",
    primaryColor: COLORS.cyan.primary,
    secondaryColor: COLORS.cyan.secondary,
    font: "Inter",
    sections: [
        {
            type: "hero",
            settings: {
                heading: "Your Life, Simplified",
                subheading: "The #1 rated app for [category]. Available on iOS and Android. Free to download.",
                buttonText: "Download Now",
                buttonLink: "#download",
                alignment: "center",
            },
        },
        {
            type: "features",
            settings: {
                heading: "Powerful Features",
                features: [
                    {
                        icon: "🚀",
                        title: "Blazing Fast",
                        description: "Lightning-quick performance that keeps up with your busy life.",
                    },
                    {
                        icon: "🔔",
                        title: "Smart Notifications",
                        description: "Stay informed with intelligent alerts tailored to your preferences.",
                    },
                    {
                        icon: "🌙",
                        title: "Dark Mode",
                        description: "Easy on the eyes, day or night. Beautiful in any lighting.",
                    },
                    {
                        icon: "☁️",
                        title: "Cloud Sync",
                        description: "Access your data from any device, automatically synced.",
                    },
                ],
            },
        },
        {
            type: "testimonials",
            settings: {
                heading: "4.9★ on the App Store",
                testimonials: [
                    {
                        name: "Tech Review",
                        quote: "Best app of 2025. A must-have for anyone serious about productivity.",
                        rating: 5,
                    },
                    {
                        name: "AppWorld",
                        quote: "Beautifully designed and incredibly useful. Editor's Choice.",
                        rating: 5,
                    },
                ],
            },
        },
        {
            type: "cta",
            settings: {
                heading: "Download for Free",
                content: "Available on iOS, Android, macOS, and Windows. Free forever with optional premium features.",
                buttonText: "Get the App",
                buttonLink: "#download",
                alignment: "center",
            },
        },
    ],
};

/**
 * Coming Soon Template
 * Best for: Pre-launch, waitlist, early access
 */
export const comingSoonTemplate: PageTemplate = {
    name: "Coming Soon",
    description: "Perfect for pre-launch and waitlist pages",
    theme: "dark",
    primaryColor: COLORS.amber.primary,
    secondaryColor: COLORS.amber.secondary,
    font: "Outfit",
    sections: [
        {
            type: "hero",
            settings: {
                heading: "Something Amazing is Coming",
                subheading: "Be the first to know when we launch. Join the waitlist for early access and exclusive perks.",
                buttonText: "Join the Waitlist",
                buttonLink: "#signup-form",
                alignment: "center",
            },
        },
        {
            type: "features",
            settings: {
                heading: "What to Expect",
                features: [
                    {
                        icon: "🎁",
                        title: "Early Access",
                        description: "Be among the first to try our product before public launch.",
                    },
                    {
                        icon: "💰",
                        title: "Exclusive Discount",
                        description: "Waitlist members get 50% off for life.",
                    },
                    {
                        icon: "📧",
                        title: "Behind the Scenes",
                        description: "Exclusive updates and sneak peeks delivered to your inbox.",
                    },
                ],
            },
        },
        {
            type: "form",
            settings: {
                heading: "Join the Waitlist",
                subheading: "Be the first to get access when we launch.",
                buttonText: "Reserve My Spot",
                fields: [
                    { name: "firstName", label: "First Name", type: "text", required: true, placeholder: "Your name" },
                    { name: "email", label: "Email Address", type: "email", required: true, placeholder: "you@example.com" },
                ],
                successMessage: "You're on the list! We'll notify you when we launch.",
                alignment: "center",
            },
        },
    ],
};

// Template map for easy lookup
export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
    saas: saasTemplate,
    agency: agencyTemplate,
    ecommerce: ecommerceTemplate,
    leadgen: leadgenTemplate,
    app: appTemplate,
    coming_soon: comingSoonTemplate,
};

/**
 * Get a template by name with generated section IDs
 */
export function getTemplateWithIds(templateName: string): PageTemplate | null {
    const template = PAGE_TEMPLATES[templateName.toLowerCase()];
    if (!template) return null;

    return {
        ...template,
        sections: template.sections.map((section, index) => ({
            ...section,
            id: uuidv4(),
            order: index,
        })) as any,
    };
}

/**
 * Generate a slug from a page name
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50);
}

/**
 * List all available templates
 */
export function listTemplates(): Array<{ name: string; description: string }> {
    return Object.entries(PAGE_TEMPLATES).map(([key, template]) => ({
        key,
        name: template.name,
        description: template.description,
    }));
}
