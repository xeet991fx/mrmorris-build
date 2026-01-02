/**
 * useDataSources Hook Tests
 *
 * Tests for the React hook that fetches available data sources for workflow configuration
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDataSources } from '../useDataSources';

// Mock fetch
global.fetch = jest.fn();

const mockDataSources = [
    {
        category: 'entity',
        path: 'contact.email',
        label: 'Contact: Email',
        type: 'string',
        description: 'Contact email field'
    },
    {
        category: 'step',
        path: 'steps.http_req.data',
        label: 'HTTP Request: data',
        type: 'object',
        description: 'Response body',
        stepId: 'http_req',
        stepName: 'HTTP Request',
        stepType: 'http_request'
    }
];

describe('useDataSources Hook', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    describe('Successful Data Fetching', () => {
        test('should fetch data sources successfully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ dataSources: mockDataSources, grouped: false })
            });

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789')
            );

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.dataSources).toEqual(mockDataSources);
            expect(result.current.error).toBeNull();
        });

        test('should construct correct API URL', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ dataSources: [], grouped: false })
            });

            renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789')
            );

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/workspaces/workspace123/workflows/workflow456/steps/step789/data-sources',
                    expect.any(Object)
                );
            });
        });

        test('should include search parameter when provided', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ dataSources: [], grouped: false })
            });

            renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789', { search: 'email' })
            );

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/workspaces/workspace123/workflows/workflow456/steps/step789/data-sources?search=email',
                    expect.any(Object)
                );
            });
        });

        test('should include grouped parameter when provided', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dataSources: {
                        entity: [mockDataSources[0]],
                        step: [mockDataSources[1]]
                    },
                    grouped: true
                })
            });

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789', { grouped: true })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.groupedSources).toBeDefined();
            expect(result.current.groupedSources?.entity).toHaveLength(1);
            expect(result.current.groupedSources?.step).toHaveLength(1);
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789')
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe('Network error');
            expect(result.current.dataSources).toEqual([]);
        });

        test('should handle HTTP errors', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ error: 'Workflow not found' })
            });

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789')
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe('Workflow not found');
            expect(result.current.dataSources).toEqual([]);
        });

        test('should handle malformed JSON responses', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => { throw new Error('Invalid JSON'); }
            });

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789')
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBeTruthy();
            expect(result.current.dataSources).toEqual([]);
        });
    });

    describe('Parameter Handling', () => {
        test('should skip fetch when required parameters are missing', async () => {
            const { result } = renderHook(() =>
                useDataSources(undefined, 'workflow456', 'step789')
            );

            // Should not be loading
            expect(result.current.loading).toBe(false);
            expect(result.current.dataSources).toEqual([]);
            expect(result.current.error).toBeNull();

            // Should not call fetch
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should skip fetch when workflowId is missing', async () => {
            const { result } = renderHook(() =>
                useDataSources('workspace123', undefined, 'step789')
            );

            expect(result.current.loading).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should skip fetch when stepId is missing', async () => {
            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', undefined)
            );

            expect(result.current.loading).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('Refetch Functionality', () => {
        test('should refetch data when refetch is called', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ dataSources: mockDataSources, grouped: false })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ dataSources: [...mockDataSources, { category: 'system', path: '$now', label: 'Now', type: 'string' }], grouped: false })
                });

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789')
            );

            await waitFor(() => {
                expect(result.current.dataSources).toHaveLength(2);
            });

            // Trigger refetch
            result.current.refetch();

            await waitFor(() => {
                expect(result.current.dataSources).toHaveLength(3);
            });

            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Helper Functions', () => {
        test('formatDataSourceLabel should format label with type', () => {
            const { formatDataSourceLabel } = require('../useDataSources');

            const source = {
                category: 'entity',
                path: 'contact.email',
                label: 'Contact: Email',
                type: 'string'
            };

            expect(formatDataSourceLabel(source)).toBe('Contact: Email (string)');
        });

        test('getSuggestedPlaceholder should wrap path in {{ }}', () => {
            const { getSuggestedPlaceholder } = require('../useDataSources');

            const source = {
                category: 'step',
                path: 'steps.http_req.data',
                label: 'HTTP Request: data',
                type: 'object'
            };

            expect(getSuggestedPlaceholder(source)).toBe('{{steps.http_req.data}}');
        });

        test('getCategoryColor should return correct colors', () => {
            const { getCategoryColor } = require('../useDataSources');

            expect(getCategoryColor('entity')).toContain('purple');
            expect(getCategoryColor('step')).toContain('blue');
            expect(getCategoryColor('variable')).toContain('green');
            expect(getCategoryColor('loop')).toContain('orange');
            expect(getCategoryColor('system')).toContain('gray');
        });

        test('getCategoryIcon should return correct icons', () => {
            const { getCategoryIcon } = require('../useDataSources');

            expect(getCategoryIcon('entity')).toBe('👤');
            expect(getCategoryIcon('step')).toBe('🔗');
            expect(getCategoryIcon('variable')).toBe('📦');
            expect(getCategoryIcon('loop')).toBe('🔄');
            expect(getCategoryIcon('system')).toBe('⚙️');
        });
    });

    describe('Grouped Response Handling', () => {
        test('should handle grouped response and flatten for dataSources', async () => {
            const groupedResponse = {
                entity: [mockDataSources[0]],
                step: [mockDataSources[1]],
                variable: [],
                loop: [],
                system: []
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ dataSources: groupedResponse, grouped: true })
            });

            const { result } = renderHook(() =>
                useDataSources('workspace123', 'workflow456', 'step789', { grouped: true })
            );

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should have flattened dataSources array
            expect(result.current.dataSources).toHaveLength(2);

            // Should also have groupedSources
            expect(result.current.groupedSources).toBeDefined();
            expect(result.current.groupedSources?.entity).toHaveLength(1);
            expect(result.current.groupedSources?.step).toHaveLength(1);
        });
    });
});
