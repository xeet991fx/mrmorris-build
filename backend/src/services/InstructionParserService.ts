/**
 * InstructionParserService.ts - Story 3.1: Parse and Execute Instructions
 *
 * Parses natural language instructions into structured action arrays using
 * LangChain with Gemini 2.5 Pro for natural language understanding.
 *
 * AC1: Instruction Parsing with Structured Output
 * AC3: Sales-Specific Parsing Intelligence
 * AC4: Parsing Error Handling
 */

import { z } from 'zod';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// =============================================================================
// TYPE DEFINITIONS & ZOD SCHEMAS
// =============================================================================

/**
 * Condition schema for conditional actions
 */
const ConditionSchema = z.object({
  field: z.string().describe('Field to check, e.g., "contact.title"'),
  operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'exists', 'not_exists']),
  value: z.any().describe('Value to compare against'),
}).optional();

/**
 * Action types supported by the system
 */
export const ActionTypeEnum = z.enum([
  'send_email',
  'linkedin_invite',
  'web_search',
  'create_task',
  'add_tag',
  'remove_tag',
  'update_field',
  'enrich_contact',
  'wait',
  'search',
  'conditional',
]);

export type ActionType = z.infer<typeof ActionTypeEnum>;

/**
 * Base action schema
 */
const ActionSchema = z.object({
  type: ActionTypeEnum,
  condition: z.string().optional().describe('Condition in plain English, e.g., "if contact.title contains CEO"'),
  params: z.record(z.any()).optional().describe('Action-specific parameters'),
  order: z.number().describe('Execution order (1-indexed)'),
  // Action-specific fields
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  template: z.string().optional(),
  recipient: z.string().optional(),
  message: z.string().optional(),
  query: z.string().optional(),
  field: z.string().optional(),
  value: z.any().optional(),
  tag: z.string().optional(),
  duration: z.number().optional(),
  unit: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
  title: z.string().optional(),
  assignee: z.string().optional(),
  dueIn: z.number().optional(),
  target: z.enum(['contacts', 'deals']).optional(),
  operator: z.string().optional(),
  trueBranch: z.array(z.lazy(() => ActionSchema)).optional(),
  falseBranch: z.array(z.lazy(() => ActionSchema)).optional(),
});

export type ParsedAction = z.infer<typeof ActionSchema>;

/**
 * Parse result
 */
export interface ParseResult {
  success: boolean;
  actions: ParsedAction[];
  error?: string;
  rawOutput?: string;
  parsingTimeMs?: number;
}

// =============================================================================
// CACHING
// =============================================================================

// Simple in-memory cache for parsed instructions
const parseCache = new Map<string, { result: ParseResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(instructions: string): string {
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < instructions.length; i++) {
    const char = instructions.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `parse_${hash}`;
}

function getCachedParse(instructions: string): ParseResult | null {
  const key = getCacheKey(instructions);
  const cached = parseCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Remove stale cache
  if (cached) {
    parseCache.delete(key);
  }

  return null;
}

function setCachedParse(instructions: string, result: ParseResult): void {
  const key = getCacheKey(instructions);
  parseCache.set(key, { result, timestamp: Date.now() });

  // Clean up old entries (keep max 100)
  if (parseCache.size > 100) {
    const entries = Array.from(parseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < entries.length - 50; i++) {
      parseCache.delete(entries[i][0]);
    }
  }
}

// =============================================================================
// SALES-SPECIFIC SYSTEM PROMPT
// =============================================================================

const SALES_PARSING_PROMPT = `You are an expert sales automation instruction parser. Your job is to convert natural language sales automation instructions into a structured JSON array of actions.

## Available Action Types:
1. **search** - Find contacts or deals matching criteria
   - Parameters: target (contacts/deals), field, operator (equals/contains/greater_than/less_than), value

2. **send_email** - Send an email to a contact
   - Parameters: to (email or @contact.email), subject, body, template (optional template name)

3. **linkedin_invite** - Send LinkedIn connection request
   - Parameters: recipient (LinkedIn URL or @contact.linkedInUrl), message (optional)

4. **web_search** - Search the web for information
   - Parameters: query

5. **create_task** - Create a follow-up task
   - Parameters: title, assignee (optional), dueIn (days from now)

6. **add_tag** - Add a tag to contact/deal
   - Parameters: tag (tag name)

7. **remove_tag** - Remove a tag from contact/deal
   - Parameters: tag (tag name)

8. **update_field** - Update a field value
   - Parameters: field (field name), value (new value)

9. **enrich_contact** - Enrich contact data using Apollo.io
   - Parameters: fields (optional array of fields to enrich)

10. **wait** - Pause execution
    - Parameters: duration (number), unit (seconds/minutes/hours/days)

11. **conditional** - If/then logic
    - Parameters: condition (plain English), trueBranch (actions if true), falseBranch (actions if false)

## Variable Syntax:
- @contact.fieldName - Contact fields (firstName, lastName, email, title, company, etc.)
- @deal.fieldName - Deal fields (name, value, stage, owner, etc.)
- @memory.varName - Agent memory variables
- @current.date - Current date
- @current.time - Current time

## Sales-Specific Interpretations:
- "email them" / "send email" / "reach out" → send_email action
- "connect on LinkedIn" / "send invitation" → linkedin_invite action
- "follow up" / "create reminder" → create_task action
- "find" / "search" / "look for" → search action
- "tag" / "label" / "mark as" → add_tag action
- "wait" / "pause" / "delay" → wait action
- "if" / "when" / "only if" → conditional action with condition
- "CEOs" / "executives" → title contains CEO/Executive
- "enterprise" / "big companies" → company size or value filters

## Output Format:
Return ONLY a JSON array of actions. Each action must have:
- type: one of the action types above
- order: execution order (1, 2, 3, etc.)
- Relevant parameters for that action type

Example output:
[
  { "type": "search", "target": "contacts", "field": "title", "operator": "contains", "value": "CEO", "order": 1 },
  { "type": "send_email", "to": "@contact.email", "subject": "Quick question", "body": "Hi @contact.firstName...", "order": 2 }
]

## Rules:
1. Parse ALL instructions into actions - don't skip any steps
2. Preserve the order of operations as written
3. Use @variable syntax for dynamic values
4. For conditionals, include trueBranch and falseBranch arrays
5. If you cannot parse an instruction, return an error message instead of guessing
6. Always return valid JSON - no markdown code blocks, just the raw JSON array`;

// =============================================================================
// MAIN SERVICE
// =============================================================================

export class InstructionParserService {
  private static model: ChatVertexAI | null = null;

  /**
   * Initialize the LangChain model
   */
  private static getModel(): ChatVertexAI {
    if (!this.model) {
      this.model = new ChatVertexAI({
        model: 'gemini-2.5-pro-preview-05-06',
        temperature: 0.1, // Low temperature for consistent parsing
        maxOutputTokens: 4096,
      });
    }
    return this.model;
  }

  /**
   * Parse natural language instructions into structured actions.
   *
   * AC1: Instruction Parsing with Structured Output
   * AC3: Sales-Specific Parsing Intelligence (>90% accuracy on sales scenarios)
   * AC4: Parsing Error Handling
   */
  static async parseInstructions(
    instructions: string,
    workspaceId: string
  ): Promise<ParseResult> {
    const startTime = Date.now();

    // Check for empty instructions
    if (!instructions || instructions.trim().length === 0) {
      return {
        success: false,
        actions: [],
        error: 'Instructions are empty. Please provide instructions for the agent.',
        parsingTimeMs: Date.now() - startTime,
      };
    }

    // Check cache first (AC: parsing result caching)
    const cached = getCachedParse(instructions);
    if (cached) {
      return {
        ...cached,
        parsingTimeMs: Date.now() - startTime,
      };
    }

    try {
      const model = this.getModel();

      // Create messages for the LLM
      const messages = [
        new SystemMessage(SALES_PARSING_PROMPT),
        new HumanMessage(`Parse these sales automation instructions into a JSON array of actions:\n\n${instructions}`),
      ];

      // Invoke the model
      const response = await model.invoke(messages);
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      // Extract JSON from response (handle potential markdown code blocks)
      let jsonContent = content.trim();

      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      }
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();

      // Parse the JSON
      let actions: ParsedAction[];
      try {
        const parsed = JSON.parse(jsonContent);

        if (!Array.isArray(parsed)) {
          throw new Error('Expected an array of actions');
        }

        // Validate each action
        actions = parsed.map((action: any, index: number) => {
          // Ensure order is set
          if (!action.order) {
            action.order = index + 1;
          }

          // Validate action type
          try {
            ActionTypeEnum.parse(action.type);
          } catch {
            // Try to map common variations
            const typeMap: Record<string, string> = {
              'email': 'send_email',
              'search_contacts': 'search',
              'find_contacts': 'search',
              'linkedin': 'linkedin_invite',
              'task': 'create_task',
              'tag': 'add_tag',
              'update': 'update_field',
              'enrich': 'enrich_contact',
              'delay': 'wait',
              'if': 'conditional',
            };

            const mappedType = typeMap[action.type?.toLowerCase()];
            if (mappedType) {
              action.type = mappedType;
            }
          }

          return action as ParsedAction;
        });

      } catch (parseError: any) {
        return {
          success: false,
          actions: [],
          error: `Unable to parse instructions. Please clarify. Error: ${parseError.message}`,
          rawOutput: content,
          parsingTimeMs: Date.now() - startTime,
        };
      }

      const result: ParseResult = {
        success: true,
        actions,
        rawOutput: content,
        parsingTimeMs: Date.now() - startTime,
      };

      // Cache the result
      setCachedParse(instructions, result);

      return result;

    } catch (error: any) {
      console.error('Instruction parsing error:', error);

      return {
        success: false,
        actions: [],
        error: `Unable to parse instructions. Please clarify. Error: ${error.message}`,
        parsingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate parsed actions against the schema
   */
  static validateActions(actions: ParsedAction[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Check required fields based on action type
      switch (action.type) {
        case 'send_email':
          if (!action.to && !action.params?.to) {
            errors.push(`Action ${i + 1} (send_email): Missing recipient (to)`);
          }
          break;

        case 'linkedin_invite':
          if (!action.recipient && !action.params?.recipient) {
            errors.push(`Action ${i + 1} (linkedin_invite): Missing recipient`);
          }
          break;

        case 'search':
          if (!action.target && !action.params?.target) {
            // Default to contacts
            action.target = 'contacts';
          }
          break;

        case 'add_tag':
        case 'remove_tag':
          if (!action.tag && !action.params?.tag) {
            errors.push(`Action ${i + 1} (${action.type}): Missing tag name`);
          }
          break;

        case 'update_field':
          if (!action.field && !action.params?.field) {
            errors.push(`Action ${i + 1} (update_field): Missing field name`);
          }
          break;

        case 'wait':
          if (!action.duration && !action.params?.duration) {
            errors.push(`Action ${i + 1} (wait): Missing duration`);
          }
          break;

        case 'conditional':
          if (!action.condition) {
            errors.push(`Action ${i + 1} (conditional): Missing condition`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear the parse cache
   */
  static clearCache(): void {
    parseCache.clear();
  }
}

export default InstructionParserService;
