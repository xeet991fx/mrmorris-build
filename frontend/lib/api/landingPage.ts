/**
 * Landing Page API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface PageSection {
    id: string;
    type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'cta' | 'form' | 'content' | 'image' | 'video';
    order: number;
    settings: {
        layout?: 'single' | 'two-column' | 'three-column' | 'grid';
        alignment?: 'left' | 'center' | 'right';
        spacing?: 'tight' | 'normal' | 'relaxed';
        heading?: string;
        subheading?: string;
        content?: string;
        buttonText?: string;
        buttonLink?: string;
        imageUrl?: string;
        videoUrl?: string;
        formId?: string;
        features?: Array<{
            icon?: string;
            title: string;
            description: string;
        }>;
        testimonials?: Array<{
            name: string;
            role?: string;
            company?: string;
            avatar?: string;
            quote: string;
            rating?: number;
        }>;
        pricingPlans?: Array<{
            name: string;
            price: string;
            period?: string;
            features: string[];
            highlighted?: boolean;
            buttonText?: string;
            buttonLink?: string;
        }>;
        backgroundColor?: string;
        textColor?: string;
        backgroundImage?: string;
    };
}

export interface LandingPage {
    _id: string;
    workspaceId: string;
    userId: string;
    name: string;
    slug: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';
    sections: PageSection[];
    seo: {
        title: string;
        description: string;
        keywords?: string[];
        ogImage?: string;
        favicon?: string;
    };
    settings: {
        theme: 'light' | 'dark' | 'custom';
        primaryColor: string;
        secondaryColor: string;
        font: string;
        googleAnalyticsId?: string;
        facebookPixelId?: string;
        customCss?: string;
        customJs?: string;
        headerCode?: string;
        footerCode?: string;
    };
    stats: {
        views: number;
        uniqueVisitors: number;
        conversions: number;
        conversionRate: number;
        lastViewedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export async function getLandingPages(
    workspaceId: string,
    status?: string
): Promise<{ success: boolean; data: LandingPage[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/landing-pages?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!response.ok) throw new Error("Failed to fetch landing pages");
    return response.json();
}

export async function getLandingPage(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; data: LandingPage }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/landing-pages/${id}`,
        {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!response.ok) throw new Error("Failed to fetch landing page");
    return response.json();
}

export async function createLandingPage(
    workspaceId: string,
    data: Partial<LandingPage>
): Promise<{ success: boolean; data: LandingPage; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/landing-pages`,
        {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) throw new Error("Failed to create landing page");
    return response.json();
}

export async function updateLandingPage(
    workspaceId: string,
    id: string,
    data: Partial<LandingPage>
): Promise<{ success: boolean; data: LandingPage; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/landing-pages/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) throw new Error("Failed to update landing page");
    return response.json();
}

export async function deleteLandingPage(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/landing-pages/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!response.ok) throw new Error("Failed to delete landing page");
    return response.json();
}

export async function getPublicLandingPage(
    slug: string
): Promise<{ success: boolean; data: LandingPage }> {
    const response = await fetch(
        `${API_BASE_URL}/api/public/pages/${slug}`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!response.ok) throw new Error("Failed to fetch page");
    return response.json();
}

export async function trackConversion(
    pageId: string
): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/public/pages/${pageId}/track-conversion`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!response.ok) throw new Error("Failed to track conversion");
    return response.json();
}
