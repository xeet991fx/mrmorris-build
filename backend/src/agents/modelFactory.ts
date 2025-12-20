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

const safetySettings = [
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

/**
 * Get Gemini 2.5 Pro model (lazy loaded)
 */
export const getProModel = (): ChatVertexAI => {
    if (!_proModel) {
        _proModel = new ChatVertexAI({
            model: "gemini-2.5-pro",
            temperature: 0.7,
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
 */
export const getFlashModel = (): ChatVertexAI => {
    if (!_flashModel) {
        _flashModel = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0,
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
