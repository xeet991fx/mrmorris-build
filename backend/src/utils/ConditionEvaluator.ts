/**
 * ConditionEvaluator.ts - Story 3.6: Conditional Logic Execution
 *
 * Evaluates conditions against execution context with support for:
 * - Simple conditions: field operator value
 * - Compound conditions: AND/OR logic
 * - Nested conditions via recursive evaluation
 * - Graceful missing field handling with warnings
 *
 * AC1-AC7: Full conditional logic support
 */

import { ExecutionContext } from '../services/AgentExecutionService';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Result from condition evaluation
 */
export interface ConditionResult {
  result: boolean;
  explanation: string;
  warnings: string[];
  fieldValues: Record<string, any>;
}

/**
 * Parsed condition structure
 */
export interface ParsedCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  negated: boolean;
  raw: string;
}

/**
 * Supported condition operators
 */
export type ConditionOperator =
  | '==' | '!=' | '>' | '<' | '>=' | '<='
  | 'equals' | 'not_equals'
  | 'contains' | 'starts_with' | 'ends_with'
  | 'exists' | 'not_exists'
  | 'is' | 'is_not'
  | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal';

/**
 * Field resolution result
 */
interface FieldResolution {
  value: any;
  found: boolean;
  warning?: string;
}

// =============================================================================
// CONDITION EVALUATOR CLASS
// =============================================================================

export class ConditionEvaluator {
  /**
   * Task 6.2: Evaluate a single condition string
   * AC1, AC2, AC3: Simple condition evaluation
   * AC7: Graceful missing field handling
   */
  static evaluate(
    condition: string,
    context: ExecutionContext
  ): ConditionResult {
    const warnings: string[] = [];
    const fieldValues: Record<string, any> = {};

    if (!condition || condition.trim().length === 0) {
      return {
        result: true,
        explanation: 'No condition specified - defaults to TRUE',
        warnings: [],
        fieldValues: {},
      };
    }

    // Check for compound conditions (AND/OR)
    const compoundResult = this.tryParseCompound(condition, context);
    if (compoundResult) {
      return compoundResult;
    }

    // Parse the condition
    const parsed = this.parseCondition(condition);
    if (!parsed) {
      return {
        result: true,
        explanation: `Could not parse condition: "${condition}" - defaulting to TRUE`,
        warnings: [`Unparseable condition: ${condition}`],
        fieldValues: {},
      };
    }

    // Resolve field value from context
    const resolution = this.resolveField(parsed.field, context);
    fieldValues[parsed.field] = resolution.value;

    if (resolution.warning) {
      warnings.push(resolution.warning);
    }

    // AC7: If field not found, default to false with warning
    if (!resolution.found && !['exists', 'not_exists'].includes(parsed.operator)) {
      const result = parsed.negated ? true : false;
      return {
        result,
        explanation: `${parsed.field} ${parsed.operator} ${JSON.stringify(parsed.value)} → ${result ? 'TRUE' : 'FALSE'} (field not found)`,
        warnings,
        fieldValues,
      };
    }

    // Apply operator
    let operatorResult = this.applyOperator(
      resolution.value,
      parsed.operator,
      parsed.value,
      resolution.found
    );

    // Apply negation if present
    if (parsed.negated) {
      operatorResult = !operatorResult;
    }

    const explanation = this.buildExplanation(parsed, resolution.value, operatorResult);

    return {
      result: operatorResult,
      explanation,
      warnings,
      fieldValues,
    };
  }

  /**
   * Task 6.3 & Task 3: Evaluate multiple conditions with AND/OR logic
   * AC5: AND logic - all conditions must be true
   * AC6: OR logic - any condition must be true
   * Task 3.5: Short-circuit evaluation
   */
  static evaluateCompound(
    conditions: string[],
    operator: 'and' | 'or',
    context: ExecutionContext
  ): ConditionResult {
    const results: ConditionResult[] = [];
    const allWarnings: string[] = [];
    const allFieldValues: Record<string, any> = {};

    for (const condition of conditions) {
      const result = this.evaluate(condition, context);
      results.push(result);
      allWarnings.push(...result.warnings);
      Object.assign(allFieldValues, result.fieldValues);

      // Task 3.5: Short-circuit evaluation
      if (operator === 'and' && !result.result) {
        // AND fails fast on first false
        return {
          result: false,
          explanation: `(${conditions.join(' AND ')}) → FALSE (failed at: ${condition})`,
          warnings: allWarnings,
          fieldValues: allFieldValues,
        };
      }
      if (operator === 'or' && result.result) {
        // OR succeeds fast on first true
        return {
          result: true,
          explanation: `(${conditions.join(' OR ')}) → TRUE (matched: ${condition})`,
          warnings: allWarnings,
          fieldValues: allFieldValues,
        };
      }
    }

    // All conditions evaluated
    const finalResult = operator === 'and'
      ? results.every(r => r.result)
      : results.some(r => r.result);

    const explanations = results.map(r => r.explanation).join(` ${operator.toUpperCase()} `);

    return {
      result: finalResult,
      explanation: `(${explanations}) → ${finalResult ? 'TRUE' : 'FALSE'}`,
      warnings: allWarnings,
      fieldValues: allFieldValues,
    };
  }

  /**
   * Task 1.4, 1.5: Try to parse as compound condition (AND/OR)
   */
  private static tryParseCompound(
    condition: string,
    context: ExecutionContext
  ): ConditionResult | null {
    // Check for AND patterns
    const andPatterns = [/ AND /i, / && /];
    for (const pattern of andPatterns) {
      if (pattern.test(condition)) {
        const parts = condition.split(pattern).map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          return this.evaluateCompound(parts, 'and', context);
        }
      }
    }

    // Check for OR patterns
    const orPatterns = [/ OR /i, / \|\| /];
    for (const pattern of orPatterns) {
      if (pattern.test(condition)) {
        const parts = condition.split(pattern).map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          return this.evaluateCompound(parts, 'or', context);
        }
      }
    }

    return null;
  }

  /**
   * Parse condition string into structured format
   * Supports various formats:
   * - "field == value"
   * - "field contains 'value'"
   * - "field > 50000"
   * - "field exists"
   * - "NOT field == value"
   */
  private static parseCondition(condition: string): ParsedCondition | null {
    let negated = false;
    let workingCondition = condition.trim();

    // Task 1.6: Check for NOT prefix
    if (/^(NOT|!)\s+/i.test(workingCondition)) {
      negated = true;
      workingCondition = workingCondition.replace(/^(NOT|!)\s+/i, '').trim();
    }

    // Pattern 1: exists/not_exists operators
    const existsMatch = workingCondition.match(/^([a-zA-Z@_.]+)\s+(exists|not_exists)$/i);
    if (existsMatch) {
      const [, field, op] = existsMatch;
      return {
        field: this.normalizeFieldName(field),
        operator: op.toLowerCase() as ConditionOperator,
        value: null,
        negated,
        raw: condition,
      };
    }

    // Pattern 2: Comparison operators with quoted or unquoted values
    // Matches: field == 'value', field > 50000, field contains "CEO"
    const comparisonMatch = workingCondition.match(
      /^([a-zA-Z@_.]+)\s*(==|!=|>=|<=|>|<|equals|not_equals|contains|starts_with|ends_with|greater_than|less_than|greater_than_or_equal|less_than_or_equal|is|is_not)\s*['"]?([^'"]+)['"]?$/i
    );
    if (comparisonMatch) {
      const [, field, operator, value] = comparisonMatch;
      return {
        field: this.normalizeFieldName(field),
        operator: this.normalizeOperator(operator),
        value: this.parseValue(value.trim()),
        negated,
        raw: condition,
      };
    }

    // Pattern 3: Plain English style - "field is true/false/null/empty"
    const isMatch = workingCondition.match(
      /^([a-zA-Z@_.]+)\s+(is|is not)\s+(true|false|null|empty)$/i
    );
    if (isMatch) {
      const [, field, operator, value] = isMatch;
      return {
        field: this.normalizeFieldName(field),
        operator: operator.toLowerCase().replace(' ', '_') as ConditionOperator,
        value: this.parseValue(value.toLowerCase()),
        negated,
        raw: condition,
      };
    }

    return null;
  }

  /**
   * Normalize field name - remove @ prefix if present
   */
  private static normalizeFieldName(field: string): string {
    return field.replace(/^@/, '');
  }

  /**
   * Normalize operator to standard form
   */
  private static normalizeOperator(op: string): ConditionOperator {
    const normalized = op.toLowerCase().trim();
    const operatorMap: Record<string, ConditionOperator> = {
      '==': '==',
      '=': '==',
      'equals': '==',
      '!=': '!=',
      'not_equals': '!=',
      '>': '>',
      'greater_than': '>',
      '<': '<',
      'less_than': '<',
      '>=': '>=',
      'greater_than_or_equal': '>=',
      '<=': '<=',
      'less_than_or_equal': '<=',
      'contains': 'contains',
      'starts_with': 'starts_with',
      'ends_with': 'ends_with',
      'exists': 'exists',
      'not_exists': 'not_exists',
      'is': 'is',
      'is_not': 'is_not',
    };
    return operatorMap[normalized] || (normalized as ConditionOperator);
  }

  /**
   * Parse value - handle booleans, numbers, strings
   */
  private static parseValue(value: string): any {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null' || lower === 'empty') return null;

    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return num;
    }

    return value;
  }

  /**
   * Task 1.7: Resolve field value from execution context
   * AC7: Graceful handling of missing fields
   */
  private static resolveField(
    field: string,
    context: ExecutionContext
  ): FieldResolution {
    let value: any = undefined;
    let found = false;

    // Handle contact.* fields
    if (field.startsWith('contact.') && context.contact) {
      const key = field.replace('contact.', '');
      if (key in context.contact) {
        value = context.contact[key];
        found = true;
      }
    }
    // Handle deal.* fields
    else if (field.startsWith('deal.') && context.deal) {
      const key = field.replace('deal.', '');
      if (key in context.deal) {
        value = context.deal[key];
        found = true;
      }
    }
    // Handle memory.* fields (Story 3.5 Map support)
    else if (field.startsWith('memory.') && context.memory) {
      const key = field.replace('memory.', '');
      if (context.memory instanceof Map) {
        found = context.memory.has(key);
        value = context.memory.get(key);
      } else {
        found = key in (context.memory as Record<string, any>);
        value = (context.memory as Record<string, any>)[key];
      }
    }
    // Handle step*.* fields (step outputs from Story 3.5)
    else if (field.startsWith('step') && context.stepOutputs) {
      const match = field.match(/^step(\d+)\.(.+)$/);
      if (match) {
        const [, stepNum, prop] = match;
        const stepKey = `step${stepNum}`;
        const stepOutput = context.stepOutputs[stepKey];
        if (stepOutput?.result && typeof stepOutput.result === 'object') {
          found = prop in stepOutput.result;
          value = stepOutput.result[prop];
        }
      }
    }
    // Handle company.* fields (nested in contact)
    else if (field.startsWith('company.') && context.contact?.company) {
      const key = field.replace('company.', '');
      const company = context.contact.company;
      if (typeof company === 'object' && key in company) {
        value = company[key];
        found = true;
      }
    }
    // Handle direct variable references
    else if (context.variables && field in context.variables) {
      value = context.variables[field];
      found = true;
    }

    // AC7: Graceful handling of missing fields
    if (!found) {
      return {
        value: undefined,
        found: false,
        warning: `Field '${field}' not found. Defaulting to false.`,
      };
    }

    return { value, found };
  }

  /**
   * Task 1.2, 1.3 & existing operators: Apply operator to compare values
   */
  private static applyOperator(
    fieldValue: any,
    operator: ConditionOperator,
    expectedValue: any,
    fieldFound: boolean
  ): boolean {
    switch (operator) {
      // Task 1.2: exists operator
      case 'exists':
        return fieldFound && fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

      // Task 1.3: not_exists operator
      case 'not_exists':
        return !fieldFound || fieldValue === undefined || fieldValue === null || fieldValue === '';

      // Equality operators
      case '==':
      case 'equals':
        if (expectedValue === true) return fieldValue === true;
        if (expectedValue === false) return fieldValue === false;
        if (expectedValue === null) return !fieldValue;
        return String(fieldValue).toLowerCase() === String(expectedValue).toLowerCase();

      case '!=':
      case 'not_equals':
        if (expectedValue === true) return fieldValue !== true;
        if (expectedValue === false) return fieldValue !== false;
        if (expectedValue === null) return !!fieldValue;
        return String(fieldValue).toLowerCase() !== String(expectedValue).toLowerCase();

      // Comparison operators
      case '>':
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);

      case '<':
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);

      case '>=':
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(expectedValue);

      case '<=':
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(expectedValue);

      // String operators (case-insensitive)
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(expectedValue).toLowerCase());

      case 'starts_with':
        return String(fieldValue || '').toLowerCase().startsWith(String(expectedValue).toLowerCase());

      case 'ends_with':
        return String(fieldValue || '').toLowerCase().endsWith(String(expectedValue).toLowerCase());

      // Boolean operators
      case 'is':
        if (expectedValue === true) return fieldValue === true;
        if (expectedValue === false) return fieldValue === false;
        if (expectedValue === null || expectedValue === 'empty') return !fieldValue;
        return fieldValue === expectedValue;

      case 'is_not':
        if (expectedValue === true) return fieldValue !== true;
        if (expectedValue === false) return fieldValue !== false;
        if (expectedValue === null || expectedValue === 'empty') return !!fieldValue;
        return fieldValue !== expectedValue;

      default:
        // Unknown operator - default to equality check
        return String(fieldValue) === String(expectedValue);
    }
  }

  /**
   * Task 1.8: Build detailed explanation string
   */
  private static buildExplanation(
    parsed: ParsedCondition,
    fieldValue: any,
    result: boolean
  ): string {
    const negationPrefix = parsed.negated ? 'NOT ' : '';
    const valueDisplay = parsed.value === null ? '' : ` ${JSON.stringify(parsed.value)}`;
    const fieldValueDisplay = fieldValue === undefined ? 'undefined' : JSON.stringify(fieldValue);

    return `${negationPrefix}${parsed.field} ${parsed.operator}${valueDisplay} → ${result ? 'TRUE' : 'FALSE'} (${parsed.field} = ${fieldValueDisplay})`;
  }

  /**
   * Task 6.5: Get supported operators (for extensibility)
   */
  static getSupportedOperators(): ConditionOperator[] {
    return [
      '==', '!=', '>', '<', '>=', '<=',
      'equals', 'not_equals',
      'contains', 'starts_with', 'ends_with',
      'exists', 'not_exists',
      'is', 'is_not',
      'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal',
    ];
  }
}

export default ConditionEvaluator;
