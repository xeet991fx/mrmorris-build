import { LangGraphCRMAgent } from "./LangGraphAgent";
import { ModelType } from "./ModelFactory";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamChunk {
  chunk?: string;
  done: boolean;
  error?: string;
  action?: any;
}

export class AgentService {
  private agent: LangGraphCRMAgent;

  constructor(
    private workspaceId: string,
    private userId: string,
    private autonomousMode: boolean = true,
    private modelType: ModelType = "gemini"
  ) {
    this.agent = new LangGraphCRMAgent(
      workspaceId,
      userId,
      autonomousMode,
      modelType
    );
  }

  async chat(
    message: string,
    history: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    try {
      // Send thinking message
      onChunk({
        chunk: "Thinking...",
        done: false,
      });

      // Get response from agent
      const response = await this.agent.chat(message, history);

      // Split response into chunks for streaming effect
      const words = response.split(" ");
      let currentChunk = "";

      for (let i = 0; i < words.length; i++) {
        currentChunk += words[i] + " ";

        // Send chunk every 5 words or at the end
        if ((i + 1) % 5 === 0 || i === words.length - 1) {
          onChunk({
            chunk: currentChunk,
            done: false,
          });
          currentChunk = "";

          // Small delay for streaming effect
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // Send completion
      onChunk({
        done: true,
      });
    } catch (error: any) {
      console.error("AgentService chat error:", error);
      onChunk({
        chunk: "",
        done: true,
        error: error.message,
      });
    }
  }

  async chatSimple(message: string, history: ChatMessage[]): Promise<string> {
    try {
      return await this.agent.chat(message, history);
    } catch (error: any) {
      console.error("AgentService chatSimple error:", error);
      throw error;
    }
  }
}
