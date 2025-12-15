import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export type ModelType = "gemini-2.5-flash" | "gemini-2.5-pro";

export class ModelFactory {
  static createModel(modelType: ModelType = "gemini-2.5-flash") {
    // Use Google Generative AI (Gemini) with API key authentication
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Please add it to your .env file."
      );
    }

    switch (modelType) {
      case "gemini-2.5-flash":
        console.log("🤖 Initializing model: gemini-2.5-flash");
        return new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.7,
          maxOutputTokens: 8192,
          apiKey,
        });

      case "gemini-2.5-pro":
        console.log("🤖 Initializing model: gemini-2.5-pro");
        return new ChatGoogleGenerativeAI({
          model: "gemini-2.5-pro",
          temperature: 0.7,
          maxOutputTokens: 8192,
          apiKey,
        });

      default:
        console.log("🤖 Initializing model: gemini-2.5-flash (default)");
        return new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.7,
          maxOutputTokens: 8192,
          apiKey,
        });
    }
  }
}
