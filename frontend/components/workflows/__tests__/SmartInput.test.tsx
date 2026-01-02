/**
 * SmartInput Component Tests
 *
 * Tests for the autocomplete input component used in workflow configuration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SmartInput from '../SmartInput';
import { DataSource } from '@/hooks/useDataSources';

// Mock data sources
const mockDataSources: DataSource[] = [
    {
        category: 'entity',
        path: 'contact.email',
        label: 'Contact: Email',
        type: 'string',
        description: 'Contact email field'
    },
    {
        category: 'entity',
        path: 'contact.firstName',
        label: 'Contact: First Name',
        type: 'string',
        description: 'Contact firstName field'
    },
    {
        category: 'step',
        path: 'steps.http_req.data',
        label: 'HTTP Request: data',
        type: 'object',
        description: 'Response body (parsed JSON)',
        stepId: 'http_req',
        stepName: 'HTTP Request',
        stepType: 'http_request'
    },
    {
        category: 'step',
        path: 'steps.http_req.status',
        label: 'HTTP Request: status',
        type: 'number',
        description: 'HTTP status code',
        stepId: 'http_req',
        stepName: 'HTTP Request',
        stepType: 'http_request'
    },
    {
        category: 'variable',
        path: 'variables',
        label: 'Workflow Variables',
        type: 'object',
        description: 'Variables set by Transform nodes'
    },
    {
        category: 'system',
        path: '$now',
        label: 'Current Timestamp',
        type: 'string',
        description: 'Current ISO timestamp'
    }
];

describe('SmartInput Component', () => {
    describe('Basic Rendering', () => {
        test('should render as single-line input by default', () => {
            const onChange = jest.fn();
            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                    placeholder="Enter value"
                />
            );

            const input = screen.getByPlaceholderText('Enter value');
            expect(input).toBeInTheDocument();
            expect(input.tagName).toBe('INPUT');
        });

        test('should render as textarea when multiline is true', () => {
            const onChange = jest.fn();
            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                    placeholder="Enter value"
                    multiline={true}
                    rows={3}
                />
            );

            const textarea = screen.getByPlaceholderText('Enter value');
            expect(textarea).toBeInTheDocument();
            expect(textarea.tagName).toBe('TEXTAREA');
        });

        test('should display current value', () => {
            const onChange = jest.fn();
            render(
                <SmartInput
                    value="Hello {{contact.firstName}}"
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByDisplayValue('Hello {{contact.firstName}}');
            expect(input).toBeInTheDocument();
        });
    });

    describe('Dropdown Trigger', () => {
        test('should show dropdown when typing {{', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            // Dropdown should appear
            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });
        });

        test('should hide dropdown when Escape is pressed', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            // Wait for dropdown
            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Press Escape
            fireEvent.keyDown(input, { key: 'Escape' });

            // Dropdown should be hidden
            await waitFor(() => {
                expect(screen.queryByText(/Contact: Email/)).not.toBeInTheDocument();
            });
        });
    });

    describe('Filtering', () => {
        test('should filter data sources as user types', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{email');

            await waitFor(() => {
                // Should show email-related sources
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
                // Should not show unrelated sources
                expect(screen.queryByText(/Current Timestamp/)).not.toBeInTheDocument();
            });
        });

        test('should show all sources when search is empty', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                // Should show sources from all categories
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
                expect(screen.getByText(/HTTP Request: status/)).toBeInTheDocument();
                expect(screen.getByText(/Workflow Variables/)).toBeInTheDocument();
            });
        });
    });

    describe('Selection and Insertion', () => {
        test('should insert selected data source on click', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Click on the email option
            const emailOption = screen.getByText(/Contact: Email/);
            await user.click(emailOption);

            // Should call onChange with the full placeholder
            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith('{{contact.email}}');
            });
        });

        test('should insert at cursor position', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value="Hello  world"
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox') as HTMLInputElement;

            // Set cursor position between "Hello" and "world"
            input.setSelectionRange(6, 6);
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            const emailOption = screen.getByText(/Contact: Email/);
            await user.click(emailOption);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith('Hello {{contact.email}} world');
            });
        });

        test('should insert on Enter key', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Press Enter (first item should be selected by default)
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => {
                expect(onChange).toHaveBeenCalled();
            });
        });

        test('should insert on Tab key', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Press Tab
            fireEvent.keyDown(input, { key: 'Tab' });

            await waitFor(() => {
                expect(onChange).toHaveBeenCalled();
            });
        });
    });

    describe('Keyboard Navigation', () => {
        test('should navigate with Arrow Down', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Press Arrow Down to move to next item
            fireEvent.keyDown(input, { key: 'ArrowDown' });

            // First item should have selection highlight (bg-blue-100)
            const firstItem = screen.getByText(/Contact: Email/).closest('div');
            expect(firstItem).toHaveClass('bg-gray-100'); // Not selected anymore

            const secondItem = screen.getByText(/Contact: First Name/).closest('div');
            expect(secondItem).toHaveClass('bg-blue-100'); // Now selected
        });

        test('should navigate with Arrow Up', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange=  {onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Arrow Down twice
            fireEvent.keyDown(input, { key: 'ArrowDown' });
            fireEvent.keyDown(input, { key: 'ArrowDown' });

            // Arrow Up once
            fireEvent.keyDown(input, { key: 'ArrowUp' });

            // Second item should be selected again
            const secondItem = screen.getByText(/Contact: First Name/).closest('div');
            expect(secondItem).toHaveClass('bg-blue-100');
        });

        test('should not go below first item when pressing Arrow Up', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                expect(screen.getByText(/Contact: Email/)).toBeInTheDocument();
            });

            // Press Arrow Up (should stay on first item)
            fireEvent.keyDown(input, { key: 'ArrowUp' });

            const firstItem = screen.getByText(/Contact: Email/).closest('div');
            expect(firstItem).toHaveClass('bg-blue-100'); // Still selected
        });
    });

    describe('Category Grouping', () => {
        test('should display category headers', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                // Should show category headers
                expect(screen.getByText('ENTITY')).toBeInTheDocument();
                expect(screen.getByText('STEP')).toBeInTheDocument();
                expect(screen.getByText('VARIABLE')).toBeInTheDocument();
                expect(screen.getByText('SYSTEM')).toBeInTheDocument();
            });
        });

        test('should group sources by category', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{');

            await waitFor(() => {
                const entityHeader = screen.getByText('ENTITY');
                const stepHeader = screen.getByText('STEP');

                // Entity sources should come before step sources
                expect(entityHeader.compareDocumentPosition(stepHeader))
                    .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            });
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty data sources array', () => {
            const onChange = jest.fn();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={[]}
                />
            );

            const input = screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
        });

        test('should show "no results" message when no matches', async () => {
            const onChange = jest.fn();
            const user = userEvent.setup();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, '{{xyz123notfound');

            await waitFor(() => {
                expect(screen.getByText(/No data sources found/)).toBeInTheDocument();
            });
        });

        test('should be disabled when disabled prop is true', () => {
            const onChange = jest.fn();

            render(
                <SmartInput
                    value=""
                    onChange={onChange}
                    dataSources={mockDataSources}
                    disabled={true}
                />
            );

            const input = screen.getByRole('textbox');
            expect(input).toBeDisabled();
        });
    });
});
