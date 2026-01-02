/**
 * Output Schema Definitions
 *
 * Defines what data each step type produces and makes available to downstream steps.
 * This enables the {{steps.stepId.field}} syntax in expressions.
 */

export interface StepOutputField {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    example?: any;
}

export interface StepOutputSchema {
    [key: string]: StepOutputField;
}

// ============================================
// SCHEMA DEFINITIONS BY STEP/ACTION TYPE
// ============================================

export const OUTPUT_SCHEMAS: Record<string, StepOutputSchema> = {

    // ============================================
    // HTTP REQUEST
    // ============================================
    http_request: {
        'status': {
            type: 'number',
            description: 'HTTP status code',
            example: 200
        },
        'statusText': {
            type: 'string',
            description: 'HTTP status message',
            example: 'OK'
        },
        'data': {
            type: 'object',
            description: 'Response body (parsed JSON or raw text)',
            example: { results: [], count: 0 }
        },
        'headers': {
            type: 'object',
            description: 'Response headers',
            example: { 'content-type': 'application/json' }
        },
        'success': {
            type: 'boolean',
            description: 'Whether the request was successful',
            example: true
        }
    },

    // ============================================
    // SLACK INTEGRATION
    // ============================================
    integration_slack: {
        'ts': {
            type: 'string',
            description: 'Message timestamp (unique ID)',
            example: '1234567890.123456'
        },
        'channel': {
            type: 'string',
            description: 'Channel ID where action was performed',
            example: 'C01234567'
        },
        'success': {
            type: 'boolean',
            description: 'Whether the Slack action succeeded',
            example: true
        },
        'response': {
            type: 'object',
            description: 'Full Slack API response',
            example: {}
        }
    },

    // ============================================
    // TRANSFORM - SET VARIABLES
    // ============================================
    transform_set: {
        'variablesSet': {
            type: 'number',
            description: 'Number of variables that were set',
            example: 3
        },
        'values': {
            type: 'object',
            description: 'All variables that were set (key-value pairs)',
            example: { fullName: 'John Doe', score: 100 }
        }
    },

    // ============================================
    // TRANSFORM - MAP DATA
    // ============================================
    transform_map: {
        'mappingsApplied': {
            type: 'number',
            description: 'Number of mappings executed',
            example: 5
        },
        'result': {
            type: 'object',
            description: 'Mapped output object',
            example: { contact: { email: 'john@example.com' } }
        }
    },

    // ============================================
    // TRANSFORM - FILTER ARRAY
    // ============================================
    transform_filter: {
        'originalCount': {
            type: 'number',
            description: 'Original array length before filtering',
            example: 100
        },
        'filteredCount': {
            type: 'number',
            description: 'Filtered array length after filtering',
            example: 25
        },
        'filtered': {
            type: 'array',
            description: 'Filtered array result',
            example: []
        }
    },

    // ============================================
    // AI AGENT
    // ============================================
    ai_agent: {
        'response': {
            type: 'string',
            description: 'AI agent text response',
            example: 'I found 5 qualified leads based on the criteria...'
        },
        'toolsUsed': {
            type: 'number',
            description: 'Number of CRM tools the agent used',
            example: 3
        },
        'needsInput': {
            type: 'boolean',
            description: 'Whether agent is waiting for user input',
            example: false
        },
        'toolHistory': {
            type: 'array',
            description: 'History of tools executed by the agent',
            example: []
        }
    },

    // ============================================
    // EMAIL ACTION
    // ============================================
    send_email: {
        'messageId': {
            type: 'string',
            description: 'Email message ID',
            example: '<msg-id@example.com>'
        },
        'sent': {
            type: 'boolean',
            description: 'Whether email was sent successfully',
            example: true
        },
        'sentAt': {
            type: 'string',
            description: 'Timestamp when email was sent',
            example: '2025-01-15T10:30:00Z'
        },
        'recipient': {
            type: 'string',
            description: 'Email recipient address',
            example: 'john@example.com'
        }
    },

    // ============================================
    // CONDITION
    // ============================================
    condition: {
        'conditionResult': {
            type: 'boolean',
            description: 'Whether condition evaluated to true',
            example: true
        },
        'field': {
            type: 'string',
            description: 'Field that was evaluated',
            example: 'status'
        },
        'operator': {
            type: 'string',
            description: 'Operator used in evaluation',
            example: 'equals'
        },
        'value': {
            type: 'string',
            description: 'Value compared against',
            example: 'active'
        },
        'branchTaken': {
            type: 'string',
            description: 'Which branch was taken (yes/no)',
            example: 'yes'
        }
    },

    // ============================================
    // DELAY
    // ============================================
    delay: {
        'delayType': {
            type: 'string',
            description: 'Type of delay (duration, until_time, until_field, until_expression)',
            example: 'duration'
        },
        'delayMs': {
            type: 'number',
            description: 'Delay duration in milliseconds',
            example: 3600000
        },
        'scheduledFor': {
            type: 'string',
            description: 'ISO timestamp when next step is scheduled',
            example: '2025-01-15T11:00:00Z'
        }
    },

    // ============================================
    // LOOP
    // ============================================
    loop: {
        'iterations': {
            type: 'number',
            description: 'Total iterations completed',
            example: 10
        },
        'results': {
            type: 'array',
            description: 'Results from each iteration',
            example: []
        },
        'sourceArray': {
            type: 'array',
            description: 'Original array that was looped over',
            example: []
        }
    },

    // ============================================
    // UPDATE FIELD
    // ============================================
    update_field: {
        'fieldName': {
            type: 'string',
            description: 'Field that was updated',
            example: 'status'
        },
        'oldValue': {
            type: 'string',
            description: 'Previous value before update',
            example: 'pending'
        },
        'newValue': {
            type: 'string',
            description: 'New value after update',
            example: 'active'
        },
        'success': {
            type: 'boolean',
            description: 'Whether update succeeded',
            example: true
        }
    },

    // ============================================
    // CREATE TASK
    // ============================================
    create_task: {
        'taskId': {
            type: 'string',
            description: 'Created task ID',
            example: '507f1f77bcf86cd799439011'
        },
        'taskTitle': {
            type: 'string',
            description: 'Task title',
            example: 'Follow up with lead'
        },
        'taskType': {
            type: 'string',
            description: 'Type of task created',
            example: 'call'
        },
        'dueDate': {
            type: 'string',
            description: 'Task due date',
            example: '2025-01-20T00:00:00Z'
        }
    },

    // ============================================
    // ADD TAG
    // ============================================
    add_tag: {
        'tag': {
            type: 'string',
            description: 'Tag that was added',
            example: 'qualified-lead'
        },
        'success': {
            type: 'boolean',
            description: 'Whether tag was added successfully',
            example: true
        }
    },

    // ============================================
    // REMOVE TAG
    // ============================================
    remove_tag: {
        'tag': {
            type: 'string',
            description: 'Tag that was removed',
            example: 'old-tag'
        },
        'success': {
            type: 'boolean',
            description: 'Whether tag was removed successfully',
            example: true
        }
    },

    // ============================================
    // ASSIGN OWNER
    // ============================================
    assign_owner: {
        'ownerId': {
            type: 'string',
            description: 'ID of the assigned owner',
            example: '507f1f77bcf86cd799439011'
        },
        'ownerName': {
            type: 'string',
            description: 'Name of the assigned owner',
            example: 'John Smith'
        },
        'success': {
            type: 'boolean',
            description: 'Whether assignment succeeded',
            example: true
        }
    },

    // ============================================
    // SEND NOTIFICATION
    // ============================================
    send_notification: {
        'notificationId': {
            type: 'string',
            description: 'Notification ID',
            example: '507f1f77bcf86cd799439011'
        },
        'sent': {
            type: 'boolean',
            description: 'Whether notification was sent',
            example: true
        }
    },

    // ============================================
    // ENROLL WORKFLOW
    // ============================================
    enroll_workflow: {
        'enrollmentId': {
            type: 'string',
            description: 'New enrollment ID',
            example: '507f1f77bcf86cd799439011'
        },
        'workflowId': {
            type: 'string',
            description: 'Workflow that entity was enrolled in',
            example: '507f1f77bcf86cd799439012'
        },
        'success': {
            type: 'boolean',
            description: 'Whether enrollment succeeded',
            example: true
        }
    },

    // ============================================
    // UPDATE LEAD SCORE
    // ============================================
    update_lead_score: {
        'oldScore': {
            type: 'number',
            description: 'Previous lead score',
            example: 50
        },
        'newScore': {
            type: 'number',
            description: 'New lead score',
            example: 75
        },
        'change': {
            type: 'number',
            description: 'Score change amount',
            example: 25
        }
    },

    // ============================================
    // SEND WEBHOOK
    // ============================================
    send_webhook: {
        'status': {
            type: 'number',
            description: 'HTTP status code from webhook',
            example: 200
        },
        'sent': {
            type: 'boolean',
            description: 'Whether webhook was sent successfully',
            example: true
        },
        'response': {
            type: 'object',
            description: 'Webhook response data',
            example: {}
        }
    },

    // ============================================
    // APOLLO ENRICH
    // ============================================
    apollo_enrich: {
        'enriched': {
            type: 'boolean',
            description: 'Whether enrichment succeeded',
            example: true
        },
        'data': {
            type: 'object',
            description: 'Enriched contact data from Apollo',
            example: { title: 'CEO', company: 'Acme Corp' }
        },
        'creditsUsed': {
            type: 'number',
            description: 'Apollo credits consumed',
            example: 1
        }
    },

    // ============================================
    // SEND SMS
    // ============================================
    send_sms: {
        'messageId': {
            type: 'string',
            description: 'SMS message ID',
            example: 'SM1234567890'
        },
        'sent': {
            type: 'boolean',
            description: 'Whether SMS was sent successfully',
            example: true
        },
        'recipient': {
            type: 'string',
            description: 'Phone number that received SMS',
            example: '+1234567890'
        }
    },

    // ============================================
    // WAIT EVENT
    // ============================================
    wait_event: {
        'eventReceived': {
            type: 'boolean',
            description: 'Whether expected event was received',
            example: true
        },
        'eventType': {
            type: 'string',
            description: 'Type of event that was received',
            example: 'email_opened'
        },
        'eventData': {
            type: 'object',
            description: 'Data from the received event',
            example: {}
        },
        'timedOut': {
            type: 'boolean',
            description: 'Whether the wait timed out',
            example: false
        }
    },

    // ============================================
    // PARALLEL
    // ============================================
    parallel: {
        'branches': {
            type: 'number',
            description: 'Number of parallel branches',
            example: 3
        },
        'completed': {
            type: 'number',
            description: 'Number of branches that completed',
            example: 3
        },
        'results': {
            type: 'object',
            description: 'Results from each branch by branch ID',
            example: {}
        }
    },

    // ============================================
    // MERGE
    // ============================================
    merge: {
        'branchesMerged': {
            type: 'number',
            description: 'Number of branches merged',
            example: 3
        },
        'aggregatedResults': {
            type: 'object',
            description: 'Combined results from all branches',
            example: {}
        }
    },

    // ============================================
    // TRY CATCH
    // ============================================
    try_catch: {
        'success': {
            type: 'boolean',
            description: 'Whether try block succeeded',
            example: true
        },
        'error': {
            type: 'object',
            description: 'Error details if try block failed',
            example: null
        },
        'retries': {
            type: 'number',
            description: 'Number of retry attempts made',
            example: 0
        }
    }
};

/**
 * Get output schema for a step type or action type
 */
export function getOutputSchema(stepType: string, actionType?: string): StepOutputSchema {
    // For action steps, try actionType first, then fall back to stepType
    if (stepType === 'action' && actionType) {
        return OUTPUT_SCHEMAS[actionType] || {};
    }

    return OUTPUT_SCHEMAS[stepType] || {};
}

/**
 * Get all available output field paths for a step
 */
export function getOutputPaths(stepType: string, actionType?: string): string[] {
    const schema = getOutputSchema(stepType, actionType);
    return Object.keys(schema);
}

/**
 * Get field metadata for a specific output field
 */
export function getOutputField(
    stepType: string,
    fieldPath: string,
    actionType?: string
): StepOutputField | undefined {
    const schema = getOutputSchema(stepType, actionType);
    return schema[fieldPath];
}

/**
 * Check if a step type produces any output
 */
export function hasOutput(stepType: string, actionType?: string): boolean {
    const paths = getOutputPaths(stepType, actionType);
    return paths.length > 0;
}
