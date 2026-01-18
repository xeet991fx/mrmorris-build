/**
 * DeleteAgentModal Component Tests
 *
 * Tests for the delete agent confirmation modal (Story 1.10)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAgentModal } from '../DeleteAgentModal';
import { IAgent } from '@/types/agent';

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock the API
jest.mock('@/lib/api/agents', () => ({
    deleteAgent: jest.fn(),
}));

import { deleteAgent } from '@/lib/api/agents';
import { toast } from 'sonner';

const mockDeleteAgent = deleteAgent as jest.MockedFunction<typeof deleteAgent>;

// Test data
const mockDraftAgent: IAgent = {
    _id: 'agent-123',
    workspace: 'workspace-456',
    name: 'Test Draft Agent',
    goal: 'Testing the delete modal',
    status: 'Draft',
    createdBy: 'user-789',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
};

const mockLiveAgent: IAgent = {
    _id: 'agent-456',
    workspace: 'workspace-456',
    name: 'Test Live Agent',
    goal: 'Testing the delete modal for live agents',
    status: 'Live',
    createdBy: 'user-789',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    instructions: 'Do the thing',
    triggers: [{ type: 'manual', config: {}, enabled: true }],
};

const mockPausedAgent: IAgent = {
    _id: 'agent-789',
    workspace: 'workspace-456',
    name: 'Test Paused Agent',
    goal: 'Testing the delete modal for paused agents',
    status: 'Paused',
    createdBy: 'user-789',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    instructions: 'Do the thing',
    triggers: [{ type: 'manual', config: {}, enabled: true }],
};

describe('DeleteAgentModal Component (Story 1.10)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Draft Agent Warning', () => {
        it('should show standard warning for Draft agents', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            // Should show the agent name in the warning
            expect(screen.getByText(/Delete agent/)).toBeInTheDocument();
            expect(screen.getByText(/"Test Draft Agent"/)).toBeInTheDocument();
            expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument();

            // Should NOT show Live agent warning
            expect(screen.queryByText(/This agent is Live/)).not.toBeInTheDocument();
        });

        it('should show "Delete Agent" button for Draft agents', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            expect(deleteButton).toHaveTextContent('Delete Agent');
            expect(deleteButton).not.toHaveTextContent('Force Delete');
        });

        it('should show trash icon for Draft agents', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            // Title should have the trash icon (zinc-500 color for Draft)
            const title = screen.getByText('Delete Agent');
            expect(title.querySelector('.text-zinc-500')).toBeInTheDocument();
        });
    });

    describe('Live Agent Warning', () => {
        it('should show stronger warning for Live agents', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockLiveAgent}
                    workspaceId="workspace-456"
                />
            );

            // Should show Live agent warning
            expect(screen.getByText(/This agent is Live and may have active executions/)).toBeInTheDocument();
            expect(screen.getByText(/"Test Live Agent"/)).toBeInTheDocument();
        });

        it('should show "Force Delete" button for Live agents', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockLiveAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            expect(deleteButton).toHaveTextContent('Force Delete');
        });

        it('should show alert triangle icon for Live agents', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockLiveAgent}
                    workspaceId="workspace-456"
                />
            );

            // Title should have the alert triangle icon (red-500 color for Live)
            const title = screen.getByText('Delete Agent');
            expect(title.querySelector('.text-red-500')).toBeInTheDocument();
        });
    });

    describe('Paused Agent Warning', () => {
        it('should show standard warning for Paused agents (not Live)', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockPausedAgent}
                    workspaceId="workspace-456"
                />
            );

            // Paused agents should NOT show the Live warning
            expect(screen.queryByText(/This agent is Live/)).not.toBeInTheDocument();

            // Should show standard delete button
            const deleteButton = screen.getByTestId('delete-confirm-button');
            expect(deleteButton).toHaveTextContent('Delete Agent');
        });
    });

    describe('Modal Buttons', () => {
        it('should show Cancel and Delete buttons', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            expect(screen.getByTestId('delete-cancel-button')).toBeInTheDocument();
            expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument();
        });

        it('should close modal when Cancel is clicked', async () => {
            const onOpenChange = jest.fn();
            const user = userEvent.setup();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const cancelButton = screen.getByTestId('delete-cancel-button');
            await user.click(cancelButton);

            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Loading State', () => {
        it('should show loading state during deletion', async () => {
            const onOpenChange = jest.fn();
            const user = userEvent.setup();

            // Make deleteAgent hang to test loading state
            mockDeleteAgent.mockImplementation(() => new Promise(() => {}));

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            // Should show loading spinner and "Deleting..." text
            await waitFor(() => {
                expect(screen.getByText('Deleting...')).toBeInTheDocument();
            });

            // Buttons should be disabled during loading
            expect(screen.getByTestId('delete-confirm-button')).toBeDisabled();
            expect(screen.getByTestId('delete-cancel-button')).toBeDisabled();
        });
    });

    describe('Successful Deletion', () => {
        it('should call onSuccess after successful deletion', async () => {
            const onOpenChange = jest.fn();
            const onSuccess = jest.fn();
            const user = userEvent.setup();

            mockDeleteAgent.mockResolvedValue({ success: true, message: 'Agent deleted successfully' });

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                    onSuccess={onSuccess}
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(mockDeleteAgent).toHaveBeenCalledWith('workspace-456', 'agent-123');
                expect(toast.success).toHaveBeenCalledWith('Agent deleted successfully');
                expect(onOpenChange).toHaveBeenCalledWith(false);
                expect(onSuccess).toHaveBeenCalled();
            });
        });

        it('should close modal after successful deletion', async () => {
            const onOpenChange = jest.fn();
            const user = userEvent.setup();

            mockDeleteAgent.mockResolvedValue({ success: true, message: 'Agent deleted successfully' });

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(onOpenChange).toHaveBeenCalledWith(false);
            });
        });
    });

    describe('Error Handling', () => {
        it('should show error toast on API failure', async () => {
            const onOpenChange = jest.fn();
            const onSuccess = jest.fn();
            const user = userEvent.setup();

            mockDeleteAgent.mockRejectedValue({
                response: {
                    data: {
                        error: 'Failed to delete agent'
                    }
                }
            });

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                    onSuccess={onSuccess}
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Failed to delete agent');
                // onSuccess should NOT be called on error
                expect(onSuccess).not.toHaveBeenCalled();
                // Modal should NOT close on error
                expect(onOpenChange).not.toHaveBeenCalledWith(false);
            });
        });

        it('should show RBAC permission error correctly', async () => {
            const onOpenChange = jest.fn();
            const user = userEvent.setup();

            mockDeleteAgent.mockRejectedValue({
                response: {
                    data: {
                        error: "You don't have permission to delete agents"
                    }
                }
            });

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("You don't have permission to delete agents");
            });
        });

        it('should handle network errors gracefully', async () => {
            const onOpenChange = jest.fn();
            const user = userEvent.setup();

            mockDeleteAgent.mockRejectedValue(new Error('Network error'));

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Network error');
            });
        });

        it('should reset loading state after error', async () => {
            const onOpenChange = jest.fn();
            const user = userEvent.setup();

            mockDeleteAgent.mockRejectedValue(new Error('API Error'));

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            const deleteButton = screen.getByTestId('delete-confirm-button');
            await user.click(deleteButton);

            // Wait for error handling to complete
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });

            // Button should be enabled again
            await waitFor(() => {
                expect(screen.getByTestId('delete-confirm-button')).not.toBeDisabled();
            });
        });
    });

    describe('Test IDs', () => {
        it('should have correct test IDs for E2E testing', () => {
            const onOpenChange = jest.fn();

            render(
                <DeleteAgentModal
                    open={true}
                    onOpenChange={onOpenChange}
                    agent={mockDraftAgent}
                    workspaceId="workspace-456"
                />
            );

            expect(screen.getByTestId('delete-agent-modal')).toBeInTheDocument();
            expect(screen.getByTestId('delete-cancel-button')).toBeInTheDocument();
            expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument();
        });
    });
});
