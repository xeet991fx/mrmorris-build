import { ChatVertexAI } from "@langchain/google-vertexai";

export type ModelType = "gemini-2.5-flash" | "gemini-2.5-pro";

export class ModelFactory {
  static createModel(modelType: ModelType = "gemini-2.5-flash") {
    // Vertex AI requires Google Cloud project configuration
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!project) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT is not configured. Please add it to your .env file for Vertex AI."
      );
    }

    // For authentication, Vertex AI will use:
    // 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (path to service account JSON)
    // 2. Or Application Default Credentials (ADC) if running in Google Cloud

    switch (modelType) {
      case "gemini-2.5-flash":
        return new ChatVertexAI({
          model: "gemini-2.0-flash-exp",
          temperature: 0.7,
          maxOutputTokens: 8192,
          authOptions: {
            projectId: project,
          },
        });

      case "gemini-2.5-pro":
        return new ChatVertexAI({
          model: "gemini-1.5-pro",
          temperature: 0.7,
          maxOutputTokens: 8192,
          authOptions: {
            projectId: project,
          },
        });

      default:
        return new ChatVertexAI({
          model: "gemini-2.0-flash-exp",
          temperature: 0.7,
          maxOutputTokens: 8192,
          authOptions: {
            projectId: project,
          },
        });
    }
  }
}
