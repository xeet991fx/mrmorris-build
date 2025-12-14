import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

export type ModelType = "gemini" | "gpt-4" | "claude" | "gpt-3.5";

export class ModelFactory {
  static createModel(modelType: ModelType = "gemini") {
    switch (modelType) {
      case "gemini":
        return new ChatGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY,
          model: "gemini-2.0-flash-exp",
          temperature: 0.7,
        });

      case "gpt-4":
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY not configured");
        }
        return new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: "gpt-4-turbo",
          temperature: 0.7,
        });

      case "claude":
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error("ANTHROPIC_API_KEY not configured");
        }
        return new ChatAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: "claude-3-5-sonnet-20241022",
          temperature: 0.7,
        });

      case "gpt-3.5":
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY not configured");
        }
        return new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: "gpt-3.5-turbo",
          temperature: 0.7,
        });

      default:
        return new ChatGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY,
          model: "gemini-2.0-flash-exp",
          temperature: 0.7,
        });
    }
  }
}
