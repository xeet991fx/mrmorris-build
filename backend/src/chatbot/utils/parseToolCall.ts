/**
 * Utility for parsing tool calls from AI responses
 *
 * Handles various formats:
 * - Plain JSON objects
 * - JSON wrapped in markdown code blocks
 * - Multiple JSON objects (extracts first valid one)
 */

interface ToolCall {
    tool: string;
    args: any;
}

/**
 * Parse tool call from AI response with robust error handling
 *
 * @param response - AI model response content
 * @param agentName - Name of agent for error logging
 * @returns Parsed tool call or null if parsing fails
 */
export function parseToolCall(response: string, agentName: string = "Unknown"): ToolCall | null {
    try {
        // Step 1: Try to extract JSON from markdown code blocks first
        const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

        if (codeBlockMatch) {
            try {
                const parsed = JSON.parse(codeBlockMatch[1]);
                if (parsed.tool && parsed.args) {
                    return { tool: parsed.tool, args: parsed.args };
                }
            } catch (e) {
                console.error(`❌ [${agentName}] Failed to parse JSON from code block:`, e);
            }
        }

        // Step 2: Try to find standalone JSON object (non-greedy match)
        const jsonMatch = response.match(/\{(?:[^{}]|\{[^{}]*\})*\}/);

        if (!jsonMatch) {
            console.error(`❌ [${agentName}] No JSON found in response:`, response.substring(0, 200));
            return null;
        }

        // Step 3: Parse the JSON
        const parsed = JSON.parse(jsonMatch[0]);

        // Step 4: Validate structure
        if (!parsed.tool || !parsed.args) {
            console.error(`❌ [${agentName}] Invalid tool call structure. Expected {tool, args}, got:`, parsed);
            return null;
        }

        return { tool: parsed.tool, args: parsed.args };

    } catch (e: any) {
        console.error(`❌ [${agentName}] JSON parse error:`, e.message);
        console.error(`Response (first 300 chars):`, response.substring(0, 300));
        return null;
    }
}

/**
 * Validate that required arguments are present
 *
 * @param args - Arguments object to validate
 * @param required - Array of required field names
 * @param agentName - Name of agent for error logging
 * @returns True if valid, false otherwise
 */
export function validateArgs(
    args: any,
    required: string[],
    agentName: string = "Unknown"
): boolean {
    const missing = required.filter(field => !(field in args));

    if (missing.length > 0) {
        console.error(`❌ [${agentName}] Missing required arguments:`, missing);
        console.error(`Received args:`, args);
        return false;
    }

    return true;
}
