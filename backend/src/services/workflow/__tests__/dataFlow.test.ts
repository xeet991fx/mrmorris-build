/**
 * Data Flow System Tests
 *
 * Comprehensive tests for the workflow data flow system including:
 * - Step reference resolution ({{steps.stepId.field}})
 * - Variable references ({{variables.varName}})
 * - Nested path access
 * - Backward compatibility
 * - Filter application to step outputs
 */

import { evaluateExpression, replacePlaceholders } from '../expressionEvaluator';
import { getAvailableDataSources } from '../dataSourceResolver';
import { getOutputSchema } from '../outputSchemas';

// ============================================
// EXPRESSION EVALUATOR TESTS
// ============================================

describe('Expression Evaluator - Data Flow', () => {
    describe('Step Output References', () => {
        test('should resolve simple step output reference', () => {
            const context = {
                _previousResults: {
                    'http_req': {
                        stepId: 'http_req',
                        stepName: 'HTTP Request',
                        output: {
                            status: 200,
                            data: { email: 'test@example.com' }
                        }
                    }
                }
            };

            const result = evaluateExpression('steps.http_req.status', context);
            expect(result).toBe(200);
        });

        test('should resolve nested step output reference', () => {
            const context = {
                _previousResults: {
                    'http_req': {
                        stepId: 'http_req',
                        output: {
                            data: {
                                person: {
                                    name: 'John Doe',
                                    email: 'john@example.com'
                                }
                            }
                        }
                    }
                }
            };

            const result = evaluateExpression('steps.http_req.data.person.email', context);
            expect(result).toBe('john@example.com');
        });

        test('should return undefined for non-existent step', () => {
            const context = {
                _previousResults: {}
            };

            const result = evaluateExpression('steps.missing_step.field', context);
            expect(result).toBeUndefined();
        });

        test('should handle step output with filters', () => {
            const context = {
                _previousResults: {
                    'http_req': {
                        output: {
                            data: { email: 'test@example.com' }
                        }
                    }
                }
            };

            const result = evaluateExpression('steps.http_req.data.email | uppercase', context);
            expect(result).toBe('TEST@EXAMPLE.COM');
        });
    });

    describe('Variable References', () => {
        test('should resolve explicit variable reference', () => {
            const context = {
                _variables: {
                    fullName: 'John Doe',
                    leadScore: 85
                }
            };

            const result = evaluateExpression('variables.fullName', context);
            expect(result).toBe('John Doe');
        });

        test('should resolve variable with filters', () => {
            const context = {
                _variables: {
                    fullName: 'john doe'
                }
            };

            const result = evaluateExpression('variables.fullName | uppercase', context);
            expect(result).toBe('JOHN DOE');
        });

        test('should handle missing variable', () => {
            const context = {
                _variables: {}
            };

            const result = evaluateExpression('variables.missing', context);
            expect(result).toBeUndefined();
        });
    });

    describe('Backward Compatibility', () => {
        test('should resolve entity field without prefix', () => {
            const context = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            };

            const result = evaluateExpression('firstName', context);
            expect(result).toBe('John');
        });

        test('should resolve nested entity field', () => {
            const context = {
                contact: {
                    firstName: 'John',
                    email: 'john@example.com'
                }
            };

            const result = evaluateExpression('contact.email', context);
            expect(result).toBe('john@example.com');
        });

        test('should apply filters to entity fields', () => {
            const context = {
                firstName: 'john'
            };

            const result = evaluateExpression('firstName | uppercase', context);
            expect(result).toBe('JOHN');
        });
    });

    describe('Placeholder Replacement', () => {
        test('should replace step output placeholders in templates', () => {
            const context = {
                contact: { firstName: 'John' },
                _previousResults: {
                    'http_req': {
                        output: {
                            data: { company: 'Acme Corp' }
                        }
                    }
                }
            };

            const template = 'Hello {{contact.firstName}} from {{steps.http_req.data.company}}!';
            const result = replacePlaceholders(template, context);

            expect(result).toBe('Hello John from Acme Corp!');
        });

        test('should replace multiple step references', () => {
            const context = {
                _previousResults: {
                    'step1': { output: { value: 'A' } },
                    'step2': { output: { value: 'B' } }
                }
            };

            const template = '{{steps.step1.value}} and {{steps.step2.value}}';
            const result = replacePlaceholders(template, context);

            expect(result).toBe('A and B');
        });

        test('should handle placeholders with filters', () => {
            const context = {
                _variables: { name: 'john doe' }
            };

            const template = 'Welcome {{variables.name | uppercase}}!';
            const result = replacePlaceholders(template, context);

            expect(result).toBe('Welcome JOHN DOE!');
        });

        test('should leave unresolved placeholders unchanged', () => {
            const context = {};

            const template = 'Value: {{steps.missing.field}}';
            const result = replacePlaceholders(template, context);

            expect(result).toBe('Value: ');
        });
    });

    describe('Complex Data Flow Scenarios', () => {
        test('should handle multi-step data flow', () => {
            const context = {
                contact: { firstName: 'John', email: 'john@example.com' },
                _previousResults: {
                    'enrich_contact': {
                        output: {
                            data: {
                                person: {
                                    title: 'CEO',
                                    company: 'Acme Corp'
                                }
                            }
                        }
                    },
                    'calculate_score': {
                        output: {
                            values: {
                                leadScore: 85
                            }
                        }
                    }
                },
                _variables: {
                    leadScore: 85
                }
            };

            const template = `Contact: {{contact.firstName}}
Title: {{steps.enrich_contact.data.person.title}}
Company: {{steps.enrich_contact.data.person.company}}
Score: {{variables.leadScore}}`;

            const result = replacePlaceholders(template, context);

            expect(result).toContain('Contact: John');
            expect(result).toContain('Title: CEO');
            expect(result).toContain('Company: Acme Corp');
            expect(result).toContain('Score: 85');
        });
    });
});

// ============================================
// OUTPUT SCHEMA TESTS
// ============================================

describe('Output Schemas', () => {
    test('should have schema for HTTP request', () => {
        const schema = getOutputSchema('http_request');

        expect(schema).toBeDefined();
        expect(schema.status).toBeDefined();
        expect(schema.data).toBeDefined();
        expect(schema.headers).toBeDefined();
    });

    test('should have schema for Slack integration', () => {
        const schema = getOutputSchema('integration_slack', 'post_message');

        expect(schema).toBeDefined();
        expect(schema.ts).toBeDefined();
        expect(schema.channel).toBeDefined();
    });

    test('should have schema for Transform Set', () => {
        const schema = getOutputSchema('transform', 'transform_set');

        expect(schema).toBeDefined();
        expect(schema.variablesSet).toBeDefined();
        expect(schema.values).toBeDefined();
    });

    test('should have schema for AI Agent', () => {
        const schema = getOutputSchema('ai_agent');

        expect(schema).toBeDefined();
        expect(schema.response).toBeDefined();
        expect(schema.toolsUsed).toBeDefined();
        expect(schema.needsInput).toBeDefined();
    });

    test('should have schema for Email', () => {
        const schema = getOutputSchema('action', 'send_email');

        expect(schema).toBeDefined();
        expect(schema.messageId).toBeDefined();
        expect(schema.sent).toBeDefined();
    });

    test('should return empty schema for unknown type', () => {
        const schema = getOutputSchema('unknown_type');

        expect(schema).toEqual({});
    });
});

// ============================================
// DATA SOURCE RESOLVER TESTS
// ============================================

describe('Data Source Resolver', () => {
    const mockWorkflow = {
        _id: 'workflow123',
        name: 'Test Workflow',
        triggerEntityType: 'contact',
        steps: [
            {
                id: 'step1',
                name: 'HTTP Request',
                type: 'http_request',
                position: { x: 0, y: 0 },
                nextStepIds: ['step2']
            },
            {
                id: 'step2',
                name: 'Slack Post',
                type: 'integration_slack',
                position: { x: 200, y: 0 },
                config: { actionType: 'post_message' },
                nextStepIds: ['step3']
            },
            {
                id: 'step3',
                name: 'Send Email',
                type: 'action',
                position: { x: 400, y: 0 },
                config: { actionType: 'send_email' },
                nextStepIds: []
            }
        ]
    };

    test('should return entity fields for first step', () => {
        const sources = getAvailableDataSources(mockWorkflow, 'step1', 'contact');

        const entitySources = sources.filter(s => s.category === 'entity');
        expect(entitySources.length).toBeGreaterThan(0);

        const emailSource = entitySources.find(s => s.path === 'contact.email');
        expect(emailSource).toBeDefined();
        expect(emailSource?.type).toBe('string');
    });

    test('should include previous step outputs for downstream steps', () => {
        const sources = getAvailableDataSources(mockWorkflow, 'step2', 'contact');

        const stepSources = sources.filter(s => s.category === 'step');
        expect(stepSources.length).toBeGreaterThan(0);

        const httpOutputs = stepSources.filter(s => s.stepId === 'step1');
        expect(httpOutputs.length).toBeGreaterThan(0);

        const statusOutput = httpOutputs.find(s => s.path === 'steps.step1.status');
        expect(statusOutput).toBeDefined();
        expect(statusOutput?.stepName).toBe('HTTP Request');
    });

    test('should include all upstream steps for final step', () => {
        const sources = getAvailableDataSources(mockWorkflow, 'step3', 'contact');

        const stepSources = sources.filter(s => s.category === 'step');

        // Should have outputs from both step1 and step2
        const step1Outputs = stepSources.filter(s => s.stepId === 'step1');
        const step2Outputs = stepSources.filter(s => s.stepId === 'step2');

        expect(step1Outputs.length).toBeGreaterThan(0);
        expect(step2Outputs.length).toBeGreaterThan(0);
    });

    test('should include system variables', () => {
        const sources = getAvailableDataSources(mockWorkflow, 'step1', 'contact');

        const systemSources = sources.filter(s => s.category === 'system');
        expect(systemSources.length).toBeGreaterThan(0);

        const nowVar = systemSources.find(s => s.path === '$now');
        expect(nowVar).toBeDefined();
    });

    test('should include workflow variables placeholder', () => {
        const sources = getAvailableDataSources(mockWorkflow, 'step1', 'contact');

        const variableSources = sources.filter(s => s.category === 'variable');
        expect(variableSources.length).toBeGreaterThan(0);

        const varsPlaceholder = variableSources.find(s => s.path === 'variables');
        expect(varsPlaceholder).toBeDefined();
    });
});

// ============================================
// INTEGRATION SCENARIO TESTS
// ============================================

describe('Data Flow Integration Scenarios', () => {
    describe('Scenario 1: HTTP → Slack Pipeline', () => {
        test('should flow data from HTTP response to Slack message', () => {
            // Simulate HTTP step output
            const httpOutput = {
                status: 200,
                data: {
                    person: {
                        name: 'John Doe',
                        title: 'CEO',
                        organization: { name: 'Acme Corp' }
                    }
                }
            };

            // Context after HTTP step completes
            const context = {
                contact: { firstName: 'John' },
                _previousResults: {
                    'enrich_contact': {
                        stepId: 'enrich_contact',
                        stepName: 'Enrich Contact',
                        output: httpOutput
                    }
                }
            };

            // Slack message template
            const messageTemplate = `Enriched {{contact.firstName}}!
Title: {{steps.enrich_contact.data.person.title}}
Company: {{steps.enrich_contact.data.person.organization.name}}`;

            const result = replacePlaceholders(messageTemplate, context);

            expect(result).toBe(`Enriched John!
Title: CEO
Company: Acme Corp`);
        });
    });

    describe('Scenario 2: Transform → Email Pipeline', () => {
        test('should flow transformed variables to email', () => {
            const context = {
                contact: {
                    firstName: 'John',
                    lastName: 'Doe',
                    interactions: [1, 2, 3, 4, 5]
                },
                _variables: {
                    fullName: 'John Doe',
                    leadScore: 50
                },
                _previousResults: {
                    'calculate_score': {
                        output: {
                            variablesSet: 2,
                            values: {
                                fullName: 'John Doe',
                                leadScore: 50
                            }
                        }
                    }
                }
            };

            const emailSubject = 'Welcome {{variables.fullName}}!';
            const emailBody = 'Your lead score is {{variables.leadScore}} points.';

            const subject = replacePlaceholders(emailSubject, context);
            const body = replacePlaceholders(emailBody, context);

            expect(subject).toBe('Welcome John Doe!');
            expect(body).toBe('Your lead score is 50 points.');
        });
    });

    describe('Scenario 3: Slack Message Timestamp Chain', () => {
        test('should use message timestamp from previous Slack action', () => {
            const context = {
                _previousResults: {
                    'slack_post': {
                        output: {
                            ts: '1234567890.123456',
                            channel: 'C01234567',
                            success: true
                        }
                    }
                }
            };

            // Update message config would reference:
            const channelRef = evaluateExpression('steps.slack_post.channel', context);
            const timestampRef = evaluateExpression('steps.slack_post.ts', context);

            expect(channelRef).toBe('C01234567');
            expect(timestampRef).toBe('1234567890.123456');
        });
    });

    describe('Scenario 4: AI Agent → CRM Update', () => {
        test('should flow AI-generated content to field update', () => {
            const context = {
                contact: { company: 'Acme Corp' },
                _previousResults: {
                    'research_company': {
                        output: {
                            response: 'Acme Corp is a B2B SaaS company specializing in workflow automation. Founded in 2020, they serve over 500 enterprise clients.',
                            toolsUsed: 3,
                            needsInput: false
                        }
                    }
                }
            };

            const fieldValue = evaluateExpression('steps.research_company.response', context);

            expect(fieldValue).toBe('Acme Corp is a B2B SaaS company specializing in workflow automation. Founded in 2020, they serve over 500 enterprise clients.');
        });
    });

    describe('Scenario 5: Complex Multi-Step Chain', () => {
        test('should handle data flow across 4+ steps', () => {
            const context = {
                contact: { email: 'john@example.com' },
                _previousResults: {
                    'http_enrich': {
                        output: {
                            data: { company: 'Acme Corp', title: 'CEO' }
                        }
                    },
                    'transform_data': {
                        output: {
                            values: { fullInfo: 'CEO at Acme Corp' }
                        }
                    },
                    'ai_research': {
                        output: {
                            response: 'High-value enterprise prospect'
                        }
                    }
                },
                _variables: {
                    fullInfo: 'CEO at Acme Corp'
                }
            };

            const finalMessage = replacePlaceholders(
                `Contact: {{contact.email}}
Company: {{steps.http_enrich.data.company}}
Title: {{steps.http_enrich.data.title}}
Summary: {{variables.fullInfo}}
AI Analysis: {{steps.ai_research.response}}`,
                context
            );

            expect(finalMessage).toContain('Contact: john@example.com');
            expect(finalMessage).toContain('Company: Acme Corp');
            expect(finalMessage).toContain('Title: CEO');
            expect(finalMessage).toContain('Summary: CEO at Acme Corp');
            expect(finalMessage).toContain('AI Analysis: High-value enterprise prospect');
        });
    });
});
