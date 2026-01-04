/**
 * Web Scraping Service
 *
 * Scrapes company websites to extract key information.
 * Used for lead research and personalization.
 */

export interface ScrapedWebsiteData {
    url: string;
    title?: string;
    description?: string;
    textContent: string;
    headings: string[];
    links: string[];
    images: string[];
    metadata?: {
        keywords?: string;
        author?: string;
        ogTitle?: string;
        ogDescription?: string;
    };
}

/**
 * Scrape website content
 */
export async function scrapeWebsite(url: string): Promise<ScrapedWebsiteData | null> {

    try {
        console.log(`🔍 Scraping website: ${url}`);

        // Validate URL
        if (!isValidUrl(url)) {
            console.error('Invalid URL');
            return null;
        }

        // Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch: ${response.status}`);
            return null;
        }

        const html = await response.text();

        // Parse HTML (simple extraction - for production use Cheerio or JSDOM)
        const data: ScrapedWebsiteData = {
            url,
            title: extractTag(html, 'title'),
            description: extractMetaTag(html, 'description'),
            textContent: extractTextContent(html),
            headings: extractHeadings(html),
            links: extractLinks(html),
            images: extractImages(html),
            metadata: {
                keywords: extractMetaTag(html, 'keywords'),
                author: extractMetaTag(html, 'author'),
                ogTitle: extractMetaTag(html, 'og:title'),
                ogDescription: extractMetaTag(html, 'og:description'),
            },
        };

        console.log(`✅ Scraped: ${data.title} (${data.textContent.length} chars)`);

        return data;

    } catch (error: any) {
        console.error('Scraping failed:', error.message);
        return null;
    }
}

/**
 * Scrape multiple pages from a website
 */
export async function scrapeMultiplePages(
    baseUrl: string,
    paths: string[] = ['/', '/about', '/products', '/services']
): Promise<ScrapedWebsiteData[]> {

    const results: ScrapedWebsiteData[] = [];

    for (const path of paths) {
        const fullUrl = new URL(path, baseUrl).href;
        const data = await scrapeWebsite(fullUrl);

        if (data) {
            results.push(data);
        }

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}

/**
 * Extract specific information from scraped data
 */
export function extractKeyInfo(data: ScrapedWebsiteData): {
    companyName?: string;
    industry?: string;
    products: string[];
    services: string[];
    painPoints: string[];
} {

    const textLower = data.textContent.toLowerCase();

    // Extract products (simple keyword matching)
    const products: string[] = [];
    const productKeywords = ['product', 'solution', 'platform', 'software', 'tool', 'app'];
    for (const keyword of productKeywords) {
        if (textLower.includes(keyword)) {
            // Extract sentences containing the keyword
            const sentences = data.textContent.match(/[^.!?]+[.!?]/g) || [];
            const relevant = sentences.filter(s => s.toLowerCase().includes(keyword));
            products.push(...relevant.slice(0, 3));
        }
    }

    // Extract services
    const services: string[] = [];
    const serviceKeywords = ['service', 'consulting', 'training', 'support', 'implementation'];
    for (const keyword of serviceKeywords) {
        if (textLower.includes(keyword)) {
            const sentences = data.textContent.match(/[^.!?]+[.!?]/g) || [];
            const relevant = sentences.filter(s => s.toLowerCase().includes(keyword));
            services.push(...relevant.slice(0, 3));
        }
    }

    // Extract potential pain points
    const painPoints: string[] = [];
    const painKeywords = ['challenge', 'problem', 'difficulty', 'struggle', 'issue', 'pain', 'frustration'];
    for (const keyword of painKeywords) {
        if (textLower.includes(keyword)) {
            const sentences = data.textContent.match(/[^.!?]+[.!?]/g) || [];
            const relevant = sentences.filter(s => s.toLowerCase().includes(keyword));
            painPoints.push(...relevant.slice(0, 3));
        }
    }

    return {
        companyName: data.title,
        products: Array.from(new Set(products)).slice(0, 5),
        services: Array.from(new Set(services)).slice(0, 5),
        painPoints: Array.from(new Set(painPoints)).slice(0, 5),
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function extractTag(html: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : undefined;
}

function extractMetaTag(html: string, name: string): string | undefined {
    const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);

    if (match) return match[1];

    // Try og: tags
    const ogRegex = new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const ogMatch = html.match(ogRegex);

    return ogMatch ? ogMatch[1] : undefined;
}

function extractTextContent(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

function extractHeadings(html: string): string[] {
    const headings: string[] = [];
    const regex = /<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        headings.push(match[1].trim());
    }

    return headings;
}

function extractLinks(html: string): string[] {
    const links: string[] = [];
    const regex = /<a[^>]*href=["']([^"']*)["']/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        links.push(match[1]);
    }

    return Array.from(new Set(links)); // Remove duplicates
}

function extractImages(html: string): string[] {
    const images: string[] = [];
    const regex = /<img[^>]*src=["']([^"']*)["']/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        images.push(match[1]);
    }

    return Array.from(new Set(images)); // Remove duplicates
}

export default {
    scrapeWebsite,
    scrapeMultiplePages,
    extractKeyInfo,
};
