/**
 * Lazy Model Factory for Vertex AI
 * 
 * Creates models lazily at runtime (after credentials are set)
 * instead of at module import time.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";

// Cached model instances
let _proModel: ChatVertexAI | null = null;
let _flashModel: ChatVertexAI | null = null;

// Relaxed safety settings for business/CRM content (allows creative business content)
const safetySettings = [
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
];

/**
 * Get Gemini 2.5 Pro model (lazy loaded)
 * Optimized for creative, intelligent CRM assistance
 */
export const getProModel = (): ChatVertexAI => {
    if (!_proModel) {
        _proModel = new ChatVertexAI({
            model: "gemini-2.5-pro",
            temperature: 0.9, // Higher temperature for more creative, varied responses
            maxOutputTokens: 8192, // Allow longer, more detailed responses
            topP: 0.95, // Nucleus sampling for better quality
            topK: 40, // Consider top 40 tokens for diversity
            authOptions: {
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
            },
            safetySettings,
        });
    }
    return _proModel;
};

/**
 * Get Gemini 2.5 Flash model (lazy loaded)
 * Optimized for fast routing and quick responses
 */
export const getFlashModel = (): ChatVertexAI => {
    if (!_flashModel) {
        _flashModel = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0.3, // Slightly more creative than 0 for better routing decisions
            maxOutputTokens: 4096,
            authOptions: {
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
            },
            safetySettings,
        });
    }
    return _flashModel;
};

/**
 * Create a custom model with specific settings (lazy loaded)
 */
export const createLazyModel = (
    model: "gemini-2.5-pro" | "gemini-2.5-flash" = "gemini-2.5-pro",
    temperature: number = 0.7
): (() => ChatVertexAI) => {
    let instance: ChatVertexAI | null = null;

    return () => {
        if (!instance) {
            instance = new ChatVertexAI({
                model,
                temperature,
                authOptions: {
                    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
                },
                safetySettings,
            });
        }
        return instance;
    };
};
