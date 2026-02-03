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
 * Story 3.6: Enhanced condition schema for conditional actions
 * Task 2.2: Support conditions array for compound logic
 */
const ConditionSchema = z.object({
  field: z.string().describe('Field to check, e.g., "contact.title"'),
  operator: z.enum([
    'equals', 'not_equals', 'contains', 'starts_with', 'ends_with',
    'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal',
    'exists', 'not_exists', 'is', 'is_not'
  ]).describe('Comparison operator'),
  value: z.any().describe('Value to compare against'),
});

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
  'human_handoff',
]);

export type ActionType = z.infer<typeof ActionTypeEnum>;

/**
 * Story 3.6: Enhanced action schema with compound condition support
 * Task 2.2, 2.3: conditions array and logicalOperator fields
 */
const ActionSchema = z.object({
  type: ActionTypeEnum,
  condition: z.string().optional().describe('Simple condition in plain English, e.g., "if contact.title contains CEO"'),
  // Story 3.6 Task 2.2: Compound condition support
  conditions: z.array(ConditionSchema).optional().describe('Array of conditions for compound logic (AND/OR)'),
  // Story 3.6 Task 2.3: Logical operator for compound conditions
  logicalOperator: z.enum(['and', 'or']).optional().describe('Logical operator for combining conditions'),
  params: z.record(z.any()).optional().describe('Action-specific parameters'),
  order: z.number().describe('Execution order (1-indexed)'),
  // Action-specific fields
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  template: z.string().optional(),
  recipient: z.string().optional(),
  message: z.string().optional(),
  note: z.string().optional(),
  priority: z.string().optional(),
  query: z.string().optional(),
  field: z.string().optional(),
  value: z.any().optional(),
  newValue: z.any().optional().describe('New value for update_field action'),
  tag: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional().describe('Story 3.10: Multiple tags support - string or array'),
  dueDate: z.union([z.string(), z.number()]).optional().describe('Story 3.10: Natural language or explicit due date'),
  duration: z.number().optional(),
  unit: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
  title: z.string().optional(),
  assignee: z.string().optional(),
  dueIn: z.number().optional(),
  target: z.enum(['contacts', 'deals']).optional(),
  operator: z.string().optional(),
  operation: z.enum(['add', 'remove']).optional().describe('Operation type for tag actions'),
  trueBranch: z.array(z.lazy(() => ActionSchema)).optional(),
  falseBranch: z.array(z.lazy(() => ActionSchema)).optional(),
  // Story 3.12: Human handoff properties
  timeout: z.union([z.string(), z.number()]).optional().describe('Timeout for human handoff before auto-resume'),
  warmLead: z.boolean().optional().describe('Flag to indicate warm lead handoff'),
  // Enrichment fields
  source: z.string().optional().describe('Data source for enrichment (e.g., Apollo.io)'),
  fields: z.array(z.string()).optional().describe('Fields to enrich'),
  // Parsing metadata
  lineNumber: z.number().optional().describe('Line number in original instructions'),
  rawInstruction: z.string().optional().describe('Raw instruction text for error context'),
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

/**
 * Story 3.6: Enhanced prompt with AND/OR/NOT logic examples (Task 2.1, 2.4)
 */
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

11. **conditional** - If/then/else logic with support for AND/OR/NOT
    - Simple condition: condition (plain English string)
    - Compound conditions: conditions (array of {field, operator, value}), logicalOperator ("and" or "or")
    - Branches: trueBranch (actions if true), falseBranch (actions if false)
    - Supports nested conditionals in branches

## Condition Operators:
- equals, not_equals - Exact match
- contains, starts_with, ends_with - String matching (case-insensitive)
- greater_than, less_than, greater_than_or_equal, less_than_or_equal - Numeric comparison
- exists, not_exists - Check if field has/doesn't have a value
- is, is_not - Boolean comparison (true/false/null/empty)

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
- "A AND B" / "both A and B" → compound condition with logicalOperator: "and"
- "A OR B" / "either A or B" → compound condition with logicalOperator: "or"
- "NOT A" / "unless A" → negate condition using not_equals or is_not operator

## Output Format:
Return ONLY a JSON array of actions. Each action must have:
- type: one of the action types above
- order: execution order (1, 2, 3, etc.)
- Relevant parameters for that action type

## Example Outputs:

### Simple Condition:
[
  { "type": "conditional", "condition": "contact.title contains CEO", "trueBranch": [{ "type": "send_email", "to": "@contact.email", "subject": "VIP outreach", "body": "...", "order": 1 }], "order": 1 }
]

### Compound AND Condition (Story 3.6 AC5):
[
  {
    "type": "conditional",
    "conditions": [
      { "field": "contact.title", "operator": "contains", "value": "CEO" },
      { "field": "company.industry", "operator": "equals", "value": "SaaS" }
    ],
    "logicalOperator": "and",
    "trueBranch": [{ "type": "add_tag", "tag": "VIP Lead", "order": 1 }],
    "order": 1
  }
]

### Compound OR Condition (Story 3.6 AC6):
[
  {
    "type": "conditional",
    "conditions": [
      { "field": "contact.replied", "operator": "is", "value": true },
      { "field": "contact.opened_email", "operator": "is", "value": true }
    ],
    "logicalOperator": "or",
    "trueBranch": [{ "type": "create_task", "title": "Follow up with engaged lead", "dueIn": 1, "order": 1 }],
    "order": 1
  }
]

### Nested Conditions (Story 3.6 AC4):
[
  {
    "type": "conditional",
    "condition": "contact.replied == true",
    "trueBranch": [
      {
        "type": "conditional",
        "condition": "contact.interested == true",
        "trueBranch": [{ "type": "create_task", "title": "Schedule demo", "dueIn": 1, "order": 1 }],
        "order": 1
      }
    ],
    "order": 1
  }
]

### If/Else with Comparison (Story 3.6 AC3):
[
  {
    "type": "conditional",
    "condition": "deal.value > 50000",
    "trueBranch": [{ "type": "send_email", "template": "urgent_followup", "order": 1 }],
    "falseBranch": [{ "type": "send_email", "template": "standard_followup", "order": 1 }],
    "order": 1
  }
]

## Rules:
1. Parse ALL instructions into actions - don't skip any steps
2. Preserve the order of operations as written
3. Use @variable syntax for dynamic values
4. For conditionals, include trueBranch and optionally falseBranch arrays
5. For AND/OR conditions, use the conditions array with logicalOperator
6. For nested conditions, place conditional actions inside trueBranch/falseBranch
7. If you cannot parse an instruction, return an error message instead of guessing
8. Always return valid JSON - no markdown code blocks, just the raw JSON array`;

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
        model: 'gemini-2.5-pro', // Using same model as other agents
        temperature: 0.1, // Low temperature for consistent parsing
        maxOutputTokens: 4096,
        authOptions: {
          keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './vertex-key.json',
        },
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

        // Story 3.6 Task 2.5: Enhanced conditional validation
        case 'conditional':
          // Must have either simple condition OR compound conditions
          if (!action.condition && (!action.conditions || action.conditions.length === 0)) {
            errors.push(`Action ${i + 1} (conditional): Missing condition - must have 'condition' string or 'conditions' array`);
          }
          // If using compound conditions, must have logicalOperator
          if (action.conditions && action.conditions.length > 0 && !action.logicalOperator) {
            errors.push(`Action ${i + 1} (conditional): Missing logicalOperator ('and' or 'or') for compound conditions`);
          }
          // Validate trueBranch exists
          if (!action.trueBranch || action.trueBranch.length === 0) {
            errors.push(`Action ${i + 1} (conditional): Missing trueBranch - conditional must have actions to execute when true`);
          }
          // Recursively validate branch actions
          if (action.trueBranch) {
            const branchValidation = this.validateActions(action.trueBranch);
            errors.push(...branchValidation.errors.map(e => `  ${e} (in trueBranch)`));
          }
          if (action.falseBranch) {
            const branchValidation = this.validateActions(action.falseBranch);
            errors.push(...branchValidation.errors.map(e => `  ${e} (in falseBranch)`));
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
