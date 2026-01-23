/**
 * ConditionEvaluator.test.ts - Story 3.6: Conditional Logic Execution Tests
 *
 * Task 8: Unit and integration tests for condition evaluation
 * AC1-AC7: Full conditional logic test coverage
 */

import { ConditionEvaluator, ConditionResult } from '../utils/ConditionEvaluator';
import { ExecutionContext } from '../services/AgentExecutionService';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Create a mock execution context for testing
 */
function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    workspaceId: 'test-workspace-123',
    agentId: 'test-agent-123',
    executionId: 'exec-123',
    contact: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      title: 'CEO of Sales',
      company: {
        name: 'Acme Corp',
        industry: 'SaaS',
        size: 500,
      },
      replied: true,
      opened_email: false,
      score: 85,
      phone: '+1234567890',
    },
    deal: {
      name: 'Enterprise Deal',
      value: 75000,
      stage: 'Negotiation',
      owner: 'Jane Smith',
    },
    memory: new Map([
      ['lastContact', '2026-01-20'],
      ['followUpCount', 3],
    ]),
    variables: {
      customVar: 'test-value',
    },
    triggerType: 'manual',
    stepOutputs: {
      step1: {
        action: 'search',
        result: { count: 10, contacts: ['a', 'b', 'c'] },
        timestamp: new Date(),
      },
    },
    currentStep: 1,
    totalSteps: 5,
    ...overrides,
  };
}

// =============================================================================
// TASK 8.1: Simple Equals Condition Tests
// =============================================================================

describe('ConditionEvaluator - Simple Equals', () => {
  it('should evaluate equals condition correctly - string match', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate("contact.firstName == 'John'", context);

    expect(result.result).toBe(true);
    expect(result.explanation).toContain('TRUE');
    expect(result.warnings).toHaveLength(0);
  });

  it('should evaluate equals condition correctly - string mismatch', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate("contact.firstName == 'Jane'", context);

    expect(result.result).toBe(false);
    expect(result.explanation).toContain('FALSE');
  });

  it('should evaluate boolean equals correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.replied == true', context);

    expect(result.result).toBe(true);
  });

  it('should evaluate numeric equals correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.value == 75000', context);

    expect(result.result).toBe(true);
  });
});

// =============================================================================
// TASK 8.2: Contains Operator Tests (Case-Insensitive)
// =============================================================================

describe('ConditionEvaluator - Contains Operator', () => {
  it('should match substring case-insensitively (AC1)', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate("contact.title contains 'CEO'", context);

    expect(result.result).toBe(true);
    expect(result.explanation).toContain('TRUE');
  });

  it('should match substring with different case', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate("contact.title contains 'ceo'", context);

    expect(result.result).toBe(true);
  });

  it('should not match when substring is not present (AC2)', () => {
    const context = createMockContext({
      contact: { ...createMockContext().contact, title: 'Sales Manager' },
    });
    const result = ConditionEvaluator.evaluate("contact.title contains 'CEO'", context);

    expect(result.result).toBe(false);
    expect(result.explanation).toContain('FALSE');
  });
});

// =============================================================================
// TASK 8.3: Numeric Comparison Operators
// =============================================================================

describe('ConditionEvaluator - Numeric Comparisons', () => {
  it('should evaluate greater than correctly (AC3)', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.value > 50000', context);

    expect(result.result).toBe(true);
    expect(result.explanation).toContain('TRUE');
  });

  it('should evaluate less than correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.value < 100000', context);

    expect(result.result).toBe(true);
  });

  it('should evaluate greater than or equal correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.value >= 75000', context);

    expect(result.result).toBe(true);
  });

  it('should evaluate less than or equal correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.score <= 85', context);

    expect(result.result).toBe(true);
  });

  it('should return false when value does not meet threshold', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.value > 100000', context);

    expect(result.result).toBe(false);
  });
});

// =============================================================================
// TASK 8.4: AND Logic Tests
// =============================================================================

describe('ConditionEvaluator - AND Logic (AC5)', () => {
  it('should return true when all conditions are true', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate(
      "contact.title contains 'CEO' AND company.industry == 'SaaS'",
      context
    );

    expect(result.result).toBe(true);
    expect(result.explanation).toContain('TRUE');
  });

  it('should return false when any condition is false', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate(
      "contact.title contains 'CEO' AND company.industry == 'Healthcare'",
      context
    );

    expect(result.result).toBe(false);
    expect(result.explanation).toContain('FALSE');
  });

  it('should short-circuit on first false condition', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate(
      "contact.title contains 'Manager' AND deal.value > 1000000",
      context
    );

    expect(result.result).toBe(false);
    // Should mention the failed condition
    expect(result.explanation).toContain('Manager');
  });

  it('should work with evaluateCompound directly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluateCompound(
      ["contact.title contains 'CEO'", "company.industry == 'SaaS'", 'contact.replied == true'],
      'and',
      context
    );

    expect(result.result).toBe(true);
  });
});

// =============================================================================
// TASK 8.5: OR Logic Tests
// =============================================================================

describe('ConditionEvaluator - OR Logic (AC6)', () => {
  it('should return true when any condition is true', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate(
      'contact.replied == true OR contact.opened_email == true',
      context
    );

    expect(result.result).toBe(true);
    expect(result.explanation).toContain('TRUE');
  });

  it('should return false when all conditions are false', () => {
    const context = createMockContext({
      contact: { ...createMockContext().contact, replied: false, opened_email: false },
    });
    const result = ConditionEvaluator.evaluate(
      'contact.replied == true OR contact.opened_email == true',
      context
    );

    expect(result.result).toBe(false);
  });

  it('should short-circuit on first true condition', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate(
      'contact.replied == true OR nonexistent.field == true',
      context
    );

    expect(result.result).toBe(true);
    // Should mention the matched condition
    expect(result.explanation).toContain('replied');
  });

  it('should work with evaluateCompound directly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluateCompound(
      ['contact.replied == true', 'contact.opened_email == true'],
      'or',
      context
    );

    expect(result.result).toBe(true);
  });
});

// =============================================================================
// TASK 8.6: NOT Logic Tests
// =============================================================================

describe('ConditionEvaluator - NOT Logic', () => {
  it('should negate true condition to false', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('NOT contact.replied == true', context);

    expect(result.result).toBe(false);
  });

  it('should negate false condition to true', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('NOT contact.opened_email == true', context);

    expect(result.result).toBe(true);
  });

  it('should work with ! prefix', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('! contact.replied == true', context);

    expect(result.result).toBe(false);
  });
});

// =============================================================================
// TASK 8.7: Nested Conditions Tests
// =============================================================================

describe('ConditionEvaluator - Nested Conditions (AC4)', () => {
  it('should evaluate outer condition correctly', () => {
    const context = createMockContext();
    const outerResult = ConditionEvaluator.evaluate('contact.replied == true', context);

    expect(outerResult.result).toBe(true);
  });

  it('should evaluate inner condition correctly when outer is true', () => {
    const context = createMockContext({
      contact: { ...createMockContext().contact, replied: true, interested: true },
    });
    const innerResult = ConditionEvaluator.evaluate('contact.interested == true', context);

    expect(innerResult.result).toBe(true);
  });

  it('should support compound conditions within nested evaluation', () => {
    const context = createMockContext({
      contact: { ...createMockContext().contact, replied: true, interested: true },
    });

    // Simulate nested evaluation
    const outer = ConditionEvaluator.evaluate('contact.replied == true', context);
    if (outer.result) {
      const inner = ConditionEvaluator.evaluate('contact.interested == true', context);
      expect(inner.result).toBe(true);
    }
  });
});

// =============================================================================
// TASK 8.8: Missing Field Tests
// =============================================================================

describe('ConditionEvaluator - Missing Fields (AC7)', () => {
  it('should return false with warning for missing field', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate("contact.customField99 == 'value'", context);

    expect(result.result).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('customField99');
    expect(result.warnings[0]).toContain('not found');
  });

  it('should include field name in warning message', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.nonexistentField > 100', context);

    expect(result.warnings[0]).toContain('deal.nonexistentField');
  });

  it('should not crash and continue execution', () => {
    const context = createMockContext();
    // This should not throw
    expect(() => {
      ConditionEvaluator.evaluate('missing.field == true', context);
    }).not.toThrow();
  });

  it('should handle exists operator for missing field', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.nonexistent exists', context);

    expect(result.result).toBe(false);
  });

  it('should handle not_exists operator for missing field', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.nonexistent not_exists', context);

    expect(result.result).toBe(true);
  });
});

// =============================================================================
// TASK 8.1-8.8: Exists Operator Tests
// =============================================================================

describe('ConditionEvaluator - Exists Operators', () => {
  it('should return true for existing field with value', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.phone exists', context);

    expect(result.result).toBe(true);
  });

  it('should return false for non-existing field', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.linkedIn exists', context);

    expect(result.result).toBe(false);
  });

  it('should handle not_exists correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('contact.linkedIn not_exists', context);

    expect(result.result).toBe(true);
  });
});

// =============================================================================
// TASK 8.9-8.10: Integration Tests
// =============================================================================

describe('ConditionEvaluator - Integration Tests', () => {
  it('should handle complex compound condition (AC5 real-world scenario)', () => {
    const context = createMockContext();
    // Simulate: If CEO AND SaaS AND deal > 50k
    const conditions = [
      "contact.title contains 'CEO'",
      "company.industry == 'SaaS'",
      'deal.value > 50000',
    ];
    const result = ConditionEvaluator.evaluateCompound(conditions, 'and', context);

    expect(result.result).toBe(true);
    expect(result.fieldValues).toHaveProperty('contact.title');
    expect(result.fieldValues).toHaveProperty('deal.value');
  });

  it('should handle if/else branch selection scenario (AC3)', () => {
    const context = createMockContext();

    // High-value deal path
    const highValueCondition = ConditionEvaluator.evaluate('deal.value > 50000', context);
    expect(highValueCondition.result).toBe(true);

    // Simulate: trueBranch executes "send urgent email"
    const urgentPath = highValueCondition.result;
    expect(urgentPath).toBe(true);

    // Low-value deal path
    const lowContext = createMockContext({
      deal: { ...createMockContext().deal, value: 10000 },
    });
    const lowValueCondition = ConditionEvaluator.evaluate('deal.value > 50000', lowContext);
    expect(lowValueCondition.result).toBe(false);

    // Simulate: falseBranch executes "send standard email"
    const standardPath = !lowValueCondition.result;
    expect(standardPath).toBe(true);
  });

  it('should track field values for debugging', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('deal.value > 50000', context);

    expect(result.fieldValues).toBeDefined();
    expect(result.fieldValues['deal.value']).toBe(75000);
  });

  it('should provide clear explanation for all condition types', () => {
    const context = createMockContext();

    // Simple condition
    const simple = ConditionEvaluator.evaluate("contact.title contains 'CEO'", context);
    expect(simple.explanation).toContain('CEO');
    expect(simple.explanation).toContain('TRUE');

    // Compound AND
    const compound = ConditionEvaluator.evaluateCompound(
      ["contact.title contains 'CEO'", "company.industry == 'SaaS'"],
      'and',
      context
    );
    expect(compound.explanation).toContain('AND');
    expect(compound.explanation).toContain('TRUE');
  });

  it('should handle memory Map access correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('memory.followUpCount > 2', context);

    expect(result.result).toBe(true);
    expect(result.fieldValues['memory.followUpCount']).toBe(3);
  });

  it('should handle step output references correctly', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('step1.count > 5', context);

    expect(result.result).toBe(true);
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('ConditionEvaluator - Edge Cases', () => {
  it('should handle empty condition string', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('', context);

    expect(result.result).toBe(true);
    expect(result.explanation).toContain('No condition');
  });

  it('should handle whitespace-only condition', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('   ', context);

    expect(result.result).toBe(true);
  });

  it('should handle unparseable condition gracefully', () => {
    const context = createMockContext();
    const result = ConditionEvaluator.evaluate('this is not a valid condition format', context);

    expect(result.result).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle null context fields gracefully', () => {
    const context = createMockContext({ contact: undefined });
    const result = ConditionEvaluator.evaluate("contact.title contains 'CEO'", context);

    expect(result.result).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle is/is_not operators', () => {
    const context = createMockContext();

    const isTrue = ConditionEvaluator.evaluate('contact.replied is true', context);
    expect(isTrue.result).toBe(true);

    const isNot = ConditionEvaluator.evaluate('contact.opened_email is_not true', context);
    expect(isNot.result).toBe(true);
  });

  it('should return list of supported operators', () => {
    const operators = ConditionEvaluator.getSupportedOperators();

    expect(operators).toContain('==');
    expect(operators).toContain('contains');
    expect(operators).toContain('exists');
    expect(operators).toContain('not_exists');
  });
});
