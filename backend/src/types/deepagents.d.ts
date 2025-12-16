// Type declarations for deepagents package to speed up TypeScript compilation
// This provides simplified types for the parts of deepagents we use

declare module "deepagents" {
  import { DynamicStructuredTool } from "@langchain/core/tools";
  import { BaseLanguageModel } from "@langchain/core/language_models/base";

  export interface SubAgent {
    name: string;
    description: string;
    systemPrompt: string;
    tools: DynamicStructuredTool[];
  }

  export interface InterruptOnConfig {
    [toolName: string]: {
      allowedDecisions: readonly string[];
    };
  }

  export interface CreateDeepAgentParams {
    model: BaseLanguageModel;
    tools?: DynamicStructuredTool[];
    subagents?: SubAgent[];
    systemPrompt?: string;
    interruptOn?: InterruptOnConfig | Record<string, never>;
  }

  export function createDeepAgent(
    params: CreateDeepAgentParams
  ): {
    invoke(input: { messages: any[] }): Promise<{ messages: any[] }>;
    streamEvents(
      input: { messages: any[] },
      config: { version: string }
    ): AsyncIterableIterator<any>;
  };
}
