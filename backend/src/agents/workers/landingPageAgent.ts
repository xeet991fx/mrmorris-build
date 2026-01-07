/**
 * Landing Page Worker Agent
 *
 * AI-powered landing page generation using Gemini 2.5 Pro.
 * Creates stunning, professional landing pages from natural language descriptions.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import { createSafeRegex } from "../utils/escapeRegex";
import LandingPage from "../../models/LandingPage";
import { v4 as uuidv4 } from "uuid";
import {
    PAGE_TEMPLATES,
    getTemplateWithIds,
    generateSlug,
    listTemplates,
} from "../utils/pageTemplates";

/**
 * Execute landing page tools
 */
async function executeLandingPageTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "generate_landing_page": {
            const { name, description, template, theme, primaryColor } = args;

            // Generate a unique slug
            const baseSlug = generateSlug(name || "my-page");
            let slug = baseSlug;
            let counter = 1;

            // Ensure slug is unique
            while (await LandingPage.findOne({ workspaceId, slug })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            // Get template if specified
            const templateKey = template?.toLowerCase() || "saas";
            const templateData = getTemplateWithIds(templateKey);

            if (!templateData) {
                return {
                    success: false,
                    error: `Template "${template}" not found. Available: ${Object.keys(PAGE_TEMPLATES).join(", ")}`,
                };
            }

            // 🚀 NEW: Generate AI content for the page
            let aiContent: any = null;
            try {
                const { AILandingPageContentGenerator } = await import("../../services/AILandingPageContentGenerator");
                aiContent = await AILandingPageContentGenerator.generateContent(
                    workspaceId,
                    description || name || "Professional landing page",
                    { tone: 'professional' }
                );
                console.log("✨ AI generated custom content for landing page");
            } catch (contentError: any) {
                console.warn("Could not generate AI content, using template defaults:", contentError.message);
            }

            // Merge AI content into template sections
            const enhancedSections = templateData.sections.map((section, index) => {
                const baseSection = {
                    id: uuidv4(),
                    type: section.type,
                    order: index,
                    settings: { ...section.settings },
                };

                // If AI content available, use it
                if (aiContent) {
                    switch (section.type) {
                        case "hero":
                            baseSection.settings = {
                                ...baseSection.settings,
                                heading: aiContent.hero.headline,
                                subheading: aiContent.hero.subheadline,
                                buttonText: aiContent.hero.ctaText,
                                buttonSecondary: aiContent.hero.ctaSecondary,
                            };
                            break;
                        case "features":
                            baseSection.settings = {
                                ...baseSection.settings,
                                heading: aiContent.features.sectionTitle,
                                features: aiContent.features.items.map((f: any) => ({
                                    title: f.title,
                                    description: f.description,
                                    icon: f.icon || "star",
                                })),
                            };
                            break;
                        case "testimonials":
                            if (aiContent.socialProof?.testimonials) {
                                baseSection.settings = {
                                    ...baseSection.settings,
                                    heading: aiContent.socialProof.headline,
                                    testimonials: aiContent.socialProof.testimonials,
                                };
                            }
                            break;
                        case "cta":
                            baseSection.settings = {
                                ...baseSection.settings,
                                heading: aiContent.cta.headline,
                                subheading: aiContent.cta.subheadline,
                                buttonText: aiContent.cta.buttonText,
                            };
                            break;
                    }
                }

                return baseSection;
            });

            // Create the page with AI-enhanced content
            const page = await LandingPage.create({
                workspaceId,
                userId,
                name: name || "My Landing Page",
                slug,
                description: description || `AI-generated landing page`,
                status: "draft",
                sections: enhancedSections,
                seo: aiContent?.seo || {
                    title: name || "My Landing Page",
                    description: description || "Welcome to our landing page",
                },
                settings: {
                    theme: theme || templateData.theme,
                    primaryColor: primaryColor || templateData.primaryColor,
                    secondaryColor: templateData.secondaryColor,
                    font: templateData.font,
                },
                stats: {
                    views: 0,
                    uniqueVisitors: 0,
                    conversions: 0,
                    conversionRate: 0,
                },
            });

            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

            return {
                success: true,
                pageId: page._id.toString(),
                slug: page.slug,
                name: page.name,
                template: templateKey,
                sections: page.sections.length,
                aiGenerated: !!aiContent,
                editUrl: `${frontendUrl}/projects/${workspaceId}/pages/${page._id}/edit`,
                previewUrl: `${frontendUrl}/p/${page.slug}`,
                message: `Created "${page.name}" with ${page.sections.length} sections using ${templateData.name} template${aiContent ? ' with AI-generated copy' : ''}. Preview: /p/${page.slug}`,
            };
        }

        case "customize_page": {
            const { pageName, heading, subheading, buttonText, primaryColor, theme } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOne({ workspaceId, name: regex });

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            // Find hero section and update
            const heroIndex = page.sections.findIndex((s) => s.type === "hero");
            if (heroIndex !== -1 && (heading || subheading || buttonText)) {
                if (heading) page.sections[heroIndex].settings.heading = heading;
                if (subheading) page.sections[heroIndex].settings.subheading = subheading;
                if (buttonText) page.sections[heroIndex].settings.buttonText = buttonText;
            }

            if (primaryColor) page.settings.primaryColor = primaryColor;
            if (theme) page.settings.theme = theme as "light" | "dark" | "custom";

            page.markModified("sections");
            page.markModified("settings");
            await page.save();

            return {
                success: true,
                message: `Updated "${page.name}" successfully ✏️`,
                slug: page.slug,
            };
        }

        case "add_section": {
            const { pageName, sectionType, heading, content, features, testimonials, pricingPlans } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOne({ workspaceId, name: regex });

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            const validTypes = ["hero", "features", "testimonials", "pricing", "cta", "form", "content", "image", "video"];
            if (!validTypes.includes(sectionType)) {
                return { success: false, error: `Invalid section type. Must be: ${validTypes.join(", ")}` };
            }

            const newOrder = page.sections.length;
            const newSection: any = {
                id: uuidv4(),
                type: sectionType,
                order: newOrder,
                settings: {},
            };

            // Set settings based on type
            if (heading) newSection.settings.heading = heading;
            if (content) newSection.settings.content = content;
            if (features) newSection.settings.features = features;
            if (testimonials) newSection.settings.testimonials = testimonials;
            if (pricingPlans) newSection.settings.pricingPlans = pricingPlans;

            // Default button for CTA
            if (sectionType === "cta") {
                newSection.settings.buttonText = "Get Started";
                newSection.settings.buttonLink = "#signup";
                newSection.settings.alignment = "center";
            }

            page.sections.push(newSection);
            page.markModified("sections");
            await page.save();

            return {
                success: true,
                message: `Added ${sectionType} section to "${page.name}" ✨`,
                sectionId: newSection.id,
            };
        }

        case "publish_page": {
            const { pageName } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOneAndUpdate(
                { workspaceId, name: regex },
                { status: "published" },
                { new: true }
            );

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

            return {
                success: true,
                message: `Published "${page.name}" 🚀 View at: /p/${page.slug}`,
                slug: page.slug,
                url: `${frontendUrl}/p/${page.slug}`,
            };
        }

        case "unpublish_page": {
            const { pageName } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOneAndUpdate(
                { workspaceId, name: regex },
                { status: "draft" },
                { new: true }
            );

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            return {
                success: true,
                message: `"${page.name}" is now unpublished (draft mode) 📝`,
            };
        }

        case "list_pages": {
            const { status } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;

            const pages = await LandingPage.find(filter)
                .select("name slug status sections stats createdAt")
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            return {
                success: true,
                count: pages.length,
                pages: pages.map((p: any) => ({
                    id: p._id.toString(),
                    name: p.name,
                    slug: p.slug,
                    status: p.status,
                    sections: p.sections?.length || 0,
                    views: p.stats?.views || 0,
                })),
            };
        }

        case "get_page_stats": {
            const { pageName } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOne({ workspaceId, name: regex })
                .select("name slug status stats")
                .lean();

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            return {
                success: true,
                name: (page as any).name,
                slug: (page as any).slug,
                status: (page as any).status,
                stats: (page as any).stats || { views: 0, uniqueVisitors: 0, conversions: 0, conversionRate: 0 },
            };
        }

        case "delete_page": {
            const { pageName } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOneAndDelete({ workspaceId, name: regex });

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            return {
                success: true,
                message: `Deleted "${page.name}" 🗑️`,
            };
        }

        case "list_templates": {
            const templates = listTemplates();
            return {
                success: true,
                templates,
                message: `Available templates: ${templates.map((t) => t.name).join(", ")}`,
            };
        }

        case "update_seo": {
            const { pageName, title, description, keywords, ogImage } = args;

            const regex = createSafeRegex(pageName);
            const page = await LandingPage.findOne({ workspaceId, name: regex });

            if (!page) {
                return { success: false, error: `Page "${pageName}" not found` };
            }

            if (title) page.seo.title = title;
            if (description) page.seo.description = description;
            if (keywords) page.seo.keywords = keywords.split(",").map((k: string) => k.trim());
            if (ogImage) page.seo.ogImage = ogImage;

            await page.save();

            return {
                success: true,
                message: `Updated SEO for "${page.name}" 🔍`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Landing Page Agent Node
 */
export async function landingPageAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🎨 Landing Page Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // Gather existing pages for context
        const existingPages = await LandingPage.find({ workspaceId: state.workspaceId })
            .select("name slug status sections createdAt")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const pagesContext = existingPages.length > 0
            ? `EXISTING PAGES:\n${existingPages.map((p: any, i: number) => {
                const isNewest = i === 0 ? " 🆕 LATEST" : "";
                return `${i + 1}. "${p.name}" (/p/${p.slug}) - ${p.status}, ${p.sections?.length || 0} sections${isNewest}`;
            }).join("\n")}`
            : "No existing landing pages.";

        const templatesList = Object.entries(PAGE_TEMPLATES)
            .map(([key, t]) => `• ${key}: ${t.name} - ${t.description}`)
            .join("\n");

        const systemPrompt = `You are an ELITE AI Landing Page Creator powered by Gemini 2.5 Pro.

🎯 YOUR MISSION: Create stunning, professional landing pages from natural language descriptions.

📊 CURRENT WORKSPACE STATE:
${pagesContext}

📋 AVAILABLE TEMPLATES:
${templatesList}

🔧 AVAILABLE TOOLS:

1. generate_landing_page - Create a new landing page
   Args: { name: string, description?: string, template?: "saas"|"agency"|"ecommerce"|"leadgen"|"app"|"coming_soon", theme?: "light"|"dark", primaryColor?: string }

2. customize_page - Modify an existing page
   Args: { pageName: string, heading?: string, subheading?: string, buttonText?: string, primaryColor?: string, theme?: "light"|"dark" }

3. add_section - Add a section to a page
   Args: { pageName: string, sectionType: "hero"|"features"|"testimonials"|"pricing"|"cta"|"form"|"content"|"image"|"video", heading?: string, content?: string }

4. publish_page - Make a page live
   Args: { pageName: string }

5. unpublish_page - Take a page offline
   Args: { pageName: string }

6. list_pages - Show all pages
   Args: { status?: "draft"|"published"|"archived" }

7. get_page_stats - Get analytics for a page
   Args: { pageName: string }

8. delete_page - Remove a page
   Args: { pageName: string }

9. list_templates - Show available templates
   Args: {}

10. update_seo - Update SEO settings
    Args: { pageName: string, title?: string, description?: string, keywords?: string, ogImage?: string }

🧠 INTELLIGENT PAGE GENERATION:
When creating pages, analyze the user's description to:
- Choose the best template (saas for software, agency for services, ecommerce for products, etc.)
- Set appropriate theme (dark for tech/apps, light for professional/corporate)
- Create a meaningful name and slug

EXAMPLES:
- "Create a landing page for my AI writing assistant" → Use saas template, name it appropriately
- "I need a page for my marketing agency" → Use agency template, dark theme
- "Build a product page for my new headphones" → Use ecommerce template

📝 RESPONSE FORMAT:
Always respond with a JSON tool call:
{"tool": "tool_name", "args": {...}}

CRITICAL: Be creative with page names! Don't use generic names. Analyze the user's description.`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Landing Page AI Response:", responseText.substring(0, 500));

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeLandingPageTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (result.success) {
                switch (toolCall.tool) {
                    case "generate_landing_page":
                        friendlyResponse = `## 🎉 Landing Page Created!\n\n`;
                        friendlyResponse += `**${result.name}**\n\n`;
                        friendlyResponse += `📄 Template: ${result.template}\n`;
                        friendlyResponse += `📦 Sections: ${result.sections}\n`;
                        friendlyResponse += `🔗 Preview: \`/p/${result.slug}\`\n\n`;
                        friendlyResponse += `---\n\n`;
                        friendlyResponse += `**Next steps:**\n`;
                        friendlyResponse += `• Edit the page content to match your brand\n`;
                        friendlyResponse += `• Publish when ready with "publish ${result.name}"\n`;
                        friendlyResponse += `• View at ${result.previewUrl}`;
                        break;

                    case "list_pages":
                        if (result.count === 0) {
                            friendlyResponse = "📄 No landing pages found. Try: \"Create a landing page for my SaaS product\"";
                        } else {
                            friendlyResponse = `## 📄 Your Landing Pages (${result.count})\n\n`;
                            friendlyResponse += result.pages.map((p: any) =>
                                `• **${p.name}** (/p/${p.slug}) - ${p.status} | ${p.sections} sections | ${p.views} views`
                            ).join("\n");
                        }
                        break;

                    case "get_page_stats":
                        friendlyResponse = `## 📊 Stats for "${result.name}"\n\n`;
                        friendlyResponse += `• Status: ${result.status}\n`;
                        friendlyResponse += `• Views: ${result.stats.views}\n`;
                        friendlyResponse += `• Unique Visitors: ${result.stats.uniqueVisitors}\n`;
                        friendlyResponse += `• Conversions: ${result.stats.conversions}\n`;
                        friendlyResponse += `• Conversion Rate: ${result.stats.conversionRate.toFixed(1)}%`;
                        break;

                    case "list_templates":
                        friendlyResponse = `## 🎨 Available Templates\n\n`;
                        friendlyResponse += result.templates.map((t: any) =>
                            `• **${t.name}** (\`${t.key}\`) - ${t.description}`
                        ).join("\n");
                        break;

                    case "publish_page":
                        friendlyResponse = `## 🚀 Page Published!\n\n`;
                        friendlyResponse += `Your page is now live at:\n${result.url}`;
                        break;

                    default:
                        friendlyResponse = `✅ ${result.message}`;
                }
            } else {
                friendlyResponse = `❌ ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        // No tool call found
        return {
            messages: [new AIMessage(`I can help you create stunning landing pages! Try:\n• "Create a landing page for my SaaS product"\n• "Build a page for my agency"\n• "Show my pages"\n• "Publish my landing page"`)],
            finalResponse: "Landing page help message",
        };

    } catch (error: any) {
        console.error("❌ Landing Page Agent error:", error);
        return {
            error: error.message,
            finalResponse: `Error: ${error.message}. Please try again.`,
        };
    }
}
