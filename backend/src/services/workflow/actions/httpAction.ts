/**
 * Enhanced HTTP Action Executor
 *
 * Full-featured HTTP client with authentication, custom headers, and response handling.
 * Supports: API Key, Bearer, Basic Auth, OAuth2
 */

import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { decryptCredentials } from "../../../utils/encryption";
import { replacePlaceholdersInObject } from "../expressionEvaluator";

// ============================================
// TYPES
// ============================================

interface HttpActionConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

    // Authentication
    authentication?: {
        type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';

        // API Key Auth
        apiKey?: {
            key: string;              // Header name or query param name
            value: string;            // API key value (encrypted)
            addTo: 'header' | 'query';
        };

        // Bearer Token Auth
        bearer?: {
            token: string;            // Bearer token (encrypted)
        };

        // Basic Auth
        basic?: {
            username: string;
            password: string;         // Encrypted
        };

        // OAuth2
        oauth2?: {
            accessToken: string;      // Pre-generated access token (encrypted)
            tokenType?: string;       // Default: "Bearer"
        };
    };

    // Headers
    headers?: Array<{ key: string; value: string }>;

    // Query Parameters
    queryParams?: Array<{ key: string; value: string }>;

    // Body
    body?: {
        type: 'json' | 'form' | 'raw' | 'none';
        content: string;
    };

    // Response Handling
    responseHandling?: {
        extractPath?: string;        // JSONPath-like extraction (e.g., "data.results[0]")
        saveToVariable?: string;     // Variable name to store in dataContext
        successCodes?: number[];     // Custom success codes (default: 200-299)
    };

    // Timeouts & Retries
    timeout?: number;                // Milliseconds (default: 30000)
    retries?: number;                // Number of retries (default: 0)
    retryDelay?: number;             // Delay between retries in ms (default: 1000)
}

// ============================================
// HTTP ACTION EXECUTOR
// ============================================

export class HttpActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment, workspaceId } = context;
        const config = step.config as unknown as HttpActionConfig;

        if (!config.url) {
            return this.error("HTTP URL is required");
        }

        // Build context for placeholder replacement with enhanced data flow support
        const replacementContext = {
            ...entity,
            ...(enrollment.dataContext?.variables || {}),
            // Enhanced context for step references ({{steps.stepId.field}})
            _variables: enrollment.dataContext?.variables || {},
            _previousResults: enrollment.dataContext?.previousResults || {},
            // Also expose directly for backward compatibility
            variables: enrollment.dataContext?.variables || {},
            previousResults: enrollment.dataContext?.previousResults || {},
        };

        try {
            // Build URL with query params
            const url = this.buildUrl(config, replacementContext);

            // Build headers
            const headers = this.buildHeaders(config, workspaceId, replacementContext);

            // Build body
            const body = this.buildBody(config, replacementContext);

            // Execute with retries
            const timeout = config.timeout || 30000;
            const retries = config.retries || 0;
            const retryDelay = config.retryDelay || 1000;

            let lastError: Error | null = null;
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    if (attempt > 0) {
                        this.log(`🔄 Retry attempt ${attempt}/${retries}`);
                        await this.sleep(retryDelay * attempt); // Exponential backoff
                    }

                    const result = await this.makeRequest(
                        url,
                        config.method,
                        headers,
                        body,
                        timeout
                    );

                    // Check success
                    const successCodes = config.responseHandling?.successCodes || this.defaultSuccessCodes();
                    if (!successCodes.includes(result.status)) {
                        throw new Error(`HTTP ${result.status}: ${result.statusText}`);
                    }

                    // Handle response
                    const responseData = await this.handleResponse(
                        result,
                        config.responseHandling,
                        enrollment
                    );

                    this.log(`✅ HTTP request successful: ${config.method} ${url}`);

                    return this.success({
                        status: result.status,
                        statusText: result.statusText,
                        data: responseData,
                    });

                } catch (error: any) {
                    lastError = error;
                    if (attempt >= retries) {
                        throw error; // Last attempt failed
                    }
                }
            }

            throw lastError || new Error('Unknown error');

        } catch (error: any) {
            this.log(`❌ HTTP request failed: ${error.message}`);
            return this.error(error.message);
        }
    }

    // ============================================
    // REQUEST BUILDING
    // ============================================

    private buildUrl(config: HttpActionConfig, context: any): string {
        let url = replacePlaceholders(config.url, context);

        // Add query parameters
        if (config.queryParams && config.queryParams.length > 0) {
            const urlObj = new URL(url);
            config.queryParams.forEach(({ key, value }) => {
                const replacedValue = replacePlaceholders(value, context);
                urlObj.searchParams.append(key, replacedValue);
            });
            url = urlObj.toString();
        }

        // Add API key to query if configured
        if (config.authentication?.type === 'api_key' &&
            config.authentication.apiKey?.addTo === 'query') {
            const urlObj = new URL(url);
            urlObj.searchParams.append(
                config.authentication.apiKey.key,
                config.authentication.apiKey.value // Already decrypted if needed
            );
            url = urlObj.toString();
        }

        return url;
    }

    private buildHeaders(
        config: HttpActionConfig,
        workspaceId: Types.ObjectId | string,
        context: any
    ): Record<string, string> {
        const headers: Record<string, string> = {
            'User-Agent': 'MrMorris-CRM/1.0',
        };

        // Content-Type based on body type
        if (config.body?.type === 'json') {
            headers['Content-Type'] = 'application/json';
        } else if (config.body?.type === 'form') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        // Custom headers
        if (config.headers && config.headers.length > 0) {
            config.headers.forEach(({ key, value }) => {
                const replacedValue = replacePlaceholders(value, context);
                headers[key] = replacedValue;
            });
        }

        // Authentication headers
        if (config.authentication) {
            this.addAuthHeaders(headers, config.authentication, workspaceId);
        }

        return headers;
    }

    private addAuthHeaders(
        headers: Record<string, string>,
        auth: NonNullable<HttpActionConfig['authentication']>,
        workspaceId: Types.ObjectId | string
    ): void {
        switch (auth.type) {
            case 'api_key':
                if (auth.apiKey && auth.apiKey.addTo === 'header') {
                    headers[auth.apiKey.key] = auth.apiKey.value;
                }
                break;

            case 'bearer':
                if (auth.bearer) {
                    headers['Authorization'] = `Bearer ${auth.bearer.token}`;
                }
                break;

            case 'basic':
                if (auth.basic) {
                    const credentials = Buffer.from(
                        `${auth.basic.username}:${auth.basic.password}`
                    ).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;

            case 'oauth2':
                if (auth.oauth2) {
                    const tokenType = auth.oauth2.tokenType || 'Bearer';
                    headers['Authorization'] = `${tokenType} ${auth.oauth2.accessToken}`;
                }
                break;
        }
    }

    private buildBody(config: HttpActionConfig, context: any): string | undefined {
        if (!config.body || config.body.type === 'none' || config.method === 'GET' || config.method === 'HEAD') {
            return undefined;
        }

        const content = replacePlaceholders(config.body.content, context);

        if (config.body.type === 'json') {
            try {
                // Validate JSON
                JSON.parse(content);
                return content;
            } catch {
                this.log('⚠️ Invalid JSON in body, using as raw string');
                return content;
            }
        }

        return content;
    }

    // ============================================
    // REQUEST EXECUTION
    // ============================================

    private async makeRequest(
        url: string,
        method: string,
        headers: Record<string, string>,
        body: string | undefined,
        timeout: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        this.log(`🌐 ${method} ${url}`);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    // ============================================
    // RESPONSE HANDLING
    // ============================================

    private async handleResponse(
        response: Response,
        responseHandling: HttpActionConfig['responseHandling'],
        enrollment: IWorkflowEnrollment
    ): Promise<any> {
        // Parse response
        let responseData: any;
        const contentType = response.headers.get('content-type');

        try {
            if (contentType?.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
        } catch {
            responseData = null;
        }

        // Extract data using path
        if (responseHandling?.extractPath && responseData) {
            responseData = this.extractFromPath(responseData, responseHandling.extractPath);
        }

        // Save to variable
        if (responseHandling?.saveToVariable) {
            if (!enrollment.dataContext) {
                enrollment.dataContext = { variables: {}, previousResults: {} };
            }
            if (!enrollment.dataContext.variables) {
                enrollment.dataContext.variables = {};
            }

            enrollment.dataContext.variables[responseHandling.saveToVariable] = responseData;
            this.log(`💾 Saved response to variable: ${responseHandling.saveToVariable}`);
        }

        return responseData;
    }

    private extractFromPath(data: any, path: string): any {
        // Simple JSONPath-like extraction
        // Supports: data.results[0].name
        const segments = path.split('.').flatMap(segment => {
            // Handle array notation: results[0]
            const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                return [arrayMatch[1], parseInt(arrayMatch[2])];
            }
            return [segment];
        });

        let current = data;
        for (const segment of segments) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[segment];
        }

        return current;
    }

    // ============================================
    // HELPERS
    // ============================================

    private defaultSuccessCodes(): number[] {
        return Array.from({ length: 100 }, (_, i) => 200 + i); // 200-299
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
