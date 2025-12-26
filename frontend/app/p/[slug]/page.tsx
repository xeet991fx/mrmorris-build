"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getPublicLandingPage, LandingPage, trackConversion } from "@/lib/api/landingPage";
import { CheckIcon, StarIcon } from "@heroicons/react/24/solid";
import Head from "next/head";

// Declare morrisb tracking interface
declare global {
    interface Window {
        morrisb?: (workspaceId: string) => {
            identify: (email: string, properties?: Record<string, any>) => void;
            track: (eventType: string, eventName: string, properties?: Record<string, any>) => void;
        };
    }
}

export default function PublicLandingPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [page, setPage] = useState<LandingPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPage();
    }, [slug]);

    // Load tracking script when page is loaded
    useEffect(() => {
        if (page && page.workspaceId) {
            // Load tracking script
            const script = document.createElement('script');
            script.src = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/track.js`;
            script.async = true;

            script.onload = () => {
                if (window.morrisb) {
                    window.morrisb(page.workspaceId.toString());
                }
            };

            document.head.appendChild(script);

            // Cleanup
            return () => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };
        }
    }, [page]);

    const loadPage = async () => {
        setIsLoading(true);
        try {
            const response = await getPublicLandingPage(slug);
            if (response.success) {
                setPage(response.data);
            }
        } catch (error: any) {
            console.error("Error loading page:", error);
            setError(error.message || "Page not found");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConversion = async () => {
        if (!page) return;
        try {
            await trackConversion(page._id);
        } catch (error) {
            console.error("Error tracking conversion:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600">Page not found</p>
                </div>
            </div>
        );
    }

    const theme = page.settings.theme;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1a1a1a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';

    return (
        <>
            <Head>
                <title>{page.seo.title}</title>
                <meta name="description" content={page.seo.description} />
                {page.seo.keywords && page.seo.keywords.length > 0 && (
                    <meta name="keywords" content={page.seo.keywords.join(', ')} />
                )}
                {page.seo.ogImage && <meta property="og:image" content={page.seo.ogImage} />}
                <meta property="og:title" content={page.seo.title} />
                <meta property="og:description" content={page.seo.description} />
                {page.seo.favicon && <link rel="icon" href={page.seo.favicon} />}

                {/* Custom header code */}
                {page.settings.headerCode && (
                    <div dangerouslySetInnerHTML={{ __html: page.settings.headerCode }} />
                )}

                {/* Google Analytics */}
                {page.settings.googleAnalyticsId && (
                    <>
                        <script async src={`https://www.googletagmanager.com/gtag/js?id=${page.settings.googleAnalyticsId}`}></script>
                        <script
                            dangerouslySetInnerHTML={{
                                __html: `
                                    window.dataLayer = window.dataLayer || [];
                                    function gtag(){dataLayer.push(arguments);}
                                    gtag('js', new Date());
                                    gtag('config', '${page.settings.googleAnalyticsId}');
                                `,
                            }}
                        />
                    </>
                )}

                {/* Facebook Pixel */}
                {page.settings.facebookPixelId && (
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                                !function(f,b,e,v,n,t,s)
                                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                                n.queue=[];t=b.createElement(e);t.async=!0;
                                t.src=v;s=b.getElementsByTagName(e)[0];
                                s.parentNode.insertBefore(t,s)}(window, document,'script',
                                'https://connect.facebook.net/en_US/fbevents.js');
                                fbq('init', '${page.settings.facebookPixelId}');
                                fbq('track', 'PageView');
                            `,
                        }}
                    />
                )}
            </Head>

            <div
                style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    fontFamily: page.settings.font,
                }}
                className="min-h-screen"
            >
                {/* Custom CSS */}
                {page.settings.customCss && (
                    <style dangerouslySetInnerHTML={{ __html: page.settings.customCss }} />
                )}

                {/* Render sections */}
                {page.sections
                    .sort((a, b) => a.order - b.order)
                    .map((section, index) => (
                        <Section
                            key={section.id}
                            section={section}
                            index={index}
                            primaryColor={page.settings.primaryColor}
                            secondaryColor={page.settings.secondaryColor}
                            isDark={isDark}
                            onConversion={handleConversion}
                        />
                    ))}

                {/* Custom footer code */}
                {page.settings.footerCode && (
                    <div dangerouslySetInnerHTML={{ __html: page.settings.footerCode }} />
                )}

                {/* Custom JS */}
                {page.settings.customJs && (
                    <script dangerouslySetInnerHTML={{ __html: page.settings.customJs }} />
                )}
            </div>
        </>
    );
}

interface SectionProps {
    section: any;
    index: number;
    primaryColor: string;
    secondaryColor: string;
    isDark: boolean;
    onConversion: () => void;
}

function Section({ section, index, primaryColor, secondaryColor, isDark, onConversion }: SectionProps) {
    const { type, settings } = section;

    const containerClasses = "py-16 px-4 sm:px-6 lg:px-8";
    const maxWidthClasses = "max-w-7xl mx-auto";

    const getAlignment = () => {
        switch (settings.alignment) {
            case 'left': return 'text-left';
            case 'center': return 'text-center';
            case 'right': return 'text-right';
            default: return 'text-center';
        }
    };

    const bgStyle = settings.backgroundColor
        ? { backgroundColor: settings.backgroundColor }
        : index % 2 === 0
            ? {}
            : { backgroundColor: isDark ? '#2a2a2a' : '#f9fafb' };

    const textColorStyle = settings.textColor ? { color: settings.textColor } : {};

    switch (type) {
        case 'hero':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={{ ...bgStyle, backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined }}
                >
                    <div className={`${maxWidthClasses} ${getAlignment()}`}>
                        {settings.heading && (
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6" style={textColorStyle}>
                                {settings.heading}
                            </h1>
                        )}
                        {settings.subheading && (
                            <p className="text-xl sm:text-2xl mb-8 opacity-90" style={textColorStyle}>
                                {settings.subheading}
                            </p>
                        )}
                        {settings.buttonText && (
                            <a
                                href={settings.buttonLink || '#'}
                                onClick={onConversion}
                                className="inline-block px-8 py-4 rounded-lg font-semibold text-lg transition-transform hover:scale-105"
                                style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                            >
                                {settings.buttonText}
                            </a>
                        )}
                    </div>
                </motion.section>
            );

        case 'features':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={bgStyle}
                >
                    <div className={maxWidthClasses}>
                        {settings.heading && (
                            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={textColorStyle}>
                                {settings.heading}
                            </h2>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {settings.features?.map((feature: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (index + i) * 0.1 }}
                                    className="p-6 rounded-lg"
                                    style={{ backgroundColor: isDark ? '#333' : '#fff', border: `1px solid ${isDark ? '#444' : '#e5e7eb'}` }}
                                >
                                    {feature.icon && <div className="text-4xl mb-4">{feature.icon}</div>}
                                    <h3 className="text-xl font-semibold mb-2" style={textColorStyle}>
                                        {feature.title}
                                    </h3>
                                    <p className="opacity-80" style={textColorStyle}>
                                        {feature.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            );

        case 'testimonials':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={bgStyle}
                >
                    <div className={maxWidthClasses}>
                        {settings.heading && (
                            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={textColorStyle}>
                                {settings.heading}
                            </h2>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {settings.testimonials?.map((testimonial: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (index + i) * 0.1 }}
                                    className="p-6 rounded-lg"
                                    style={{ backgroundColor: isDark ? '#333' : '#fff', border: `1px solid ${isDark ? '#444' : '#e5e7eb'}` }}
                                >
                                    {testimonial.rating && (
                                        <div className="flex gap-1 mb-4">
                                            {[...Array(testimonial.rating)].map((_, i) => (
                                                <StarIcon key={i} className="w-5 h-5" style={{ color: '#fbbf24' }} />
                                            ))}
                                        </div>
                                    )}
                                    <p className="mb-4 italic" style={textColorStyle}>"{testimonial.quote}"</p>
                                    <div className="flex items-center gap-3">
                                        {testimonial.avatar && (
                                            <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                                        )}
                                        <div>
                                            <p className="font-semibold" style={textColorStyle}>{testimonial.name}</p>
                                            {testimonial.role && (
                                                <p className="text-sm opacity-70" style={textColorStyle}>
                                                    {testimonial.role}{testimonial.company ? ` at ${testimonial.company}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            );

        case 'pricing':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={bgStyle}
                >
                    <div className={maxWidthClasses}>
                        {settings.heading && (
                            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={textColorStyle}>
                                {settings.heading}
                            </h2>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {settings.pricingPlans?.map((plan: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (index + i) * 0.1 }}
                                    className="p-8 rounded-lg relative"
                                    style={{
                                        backgroundColor: plan.highlighted ? primaryColor : (isDark ? '#333' : '#fff'),
                                        border: `2px solid ${plan.highlighted ? primaryColor : (isDark ? '#444' : '#e5e7eb')}`,
                                        color: plan.highlighted ? '#fff' : undefined,
                                    }}
                                >
                                    {plan.highlighted && (
                                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: secondaryColor, color: '#fff' }}>
                                            Popular
                                        </div>
                                    )}
                                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        {plan.period && <span className="opacity-70">{plan.period}</span>}
                                    </div>
                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature: string, j: number) => (
                                            <li key={j} className="flex items-start gap-2">
                                                <CheckIcon className="w-5 h-5 mt-0.5" style={{ color: plan.highlighted ? '#fff' : primaryColor }} />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {plan.buttonText && (
                                        <a
                                            href={plan.buttonLink || '#'}
                                            onClick={onConversion}
                                            className="block w-full text-center px-6 py-3 rounded-lg font-semibold transition-transform hover:scale-105"
                                            style={{
                                                backgroundColor: plan.highlighted ? '#fff' : primaryColor,
                                                color: plan.highlighted ? primaryColor : '#fff',
                                            }}
                                        >
                                            {plan.buttonText}
                                        </a>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            );

        case 'cta':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={{ ...bgStyle, backgroundColor: primaryColor }}
                >
                    <div className={`${maxWidthClasses} ${getAlignment()}`}>
                        {settings.heading && (
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                                {settings.heading}
                            </h2>
                        )}
                        {settings.content && (
                            <p className="text-xl mb-8 text-white opacity-90">
                                {settings.content}
                            </p>
                        )}
                        {settings.buttonText && (
                            <a
                                href={settings.buttonLink || '#'}
                                onClick={onConversion}
                                className="inline-block px-8 py-4 rounded-lg font-semibold text-lg transition-transform hover:scale-105"
                                style={{ backgroundColor: '#ffffff', color: primaryColor }}
                            >
                                {settings.buttonText}
                            </a>
                        )}
                    </div>
                </motion.section>
            );

        case 'content':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={bgStyle}
                >
                    <div className={`${maxWidthClasses} ${getAlignment()}`}>
                        {settings.heading && (
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={textColorStyle}>
                                {settings.heading}
                            </h2>
                        )}
                        {settings.content && (
                            <div className="prose prose-lg max-w-none" style={textColorStyle}>
                                <p>{settings.content}</p>
                            </div>
                        )}
                    </div>
                </motion.section>
            );

        case 'image':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={bgStyle}
                >
                    <div className={maxWidthClasses}>
                        {settings.imageUrl && (
                            <img
                                src={settings.imageUrl}
                                alt="Section image"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        )}
                    </div>
                </motion.section>
            );

        case 'video':
            return (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={containerClasses}
                    style={bgStyle}
                >
                    <div className={maxWidthClasses}>
                        {settings.videoUrl && (
                            <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                                <iframe
                                    src={settings.videoUrl}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>
                </motion.section>
            );

        default:
            return null;
    }
}
