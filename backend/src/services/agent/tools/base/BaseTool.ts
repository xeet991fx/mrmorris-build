import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export abstract class BaseCRMTool {
  constructor(
    protected workspaceId: string,
    protected userId: string
  ) {}

  abstract get name(): string;
  abstract get description(): string;
  abstract get schema(): any;
  abstract execute(input: any): Promise<any>;

  toLangChainTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: this.name,
      description: this.description,
      schema: this.schema,
      func: async (input) => {
        try {
          const result = await this.execute(input);
          return JSON.stringify(result);
        } catch (error: any) {
          return JSON.stringify({
            error: error.message,
            success: false,
          });
        }
      },
    });
  }
}
