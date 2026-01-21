/**
 * ValidationResultsPanel Component Tests
 *
 * Tests for the validation results display (Story 2.4)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationResultsPanel } from '../ValidationResultsPanel';
import type { ValidationResult, ValidationIssue } from '@/types/agent';

describe('ValidationResultsPanel Component (Story 2.4)', () => {
  const mockOnIssueClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when validating', () => {
      render(
        <ValidationResultsPanel
          validation={null}
          isLoading={true}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('Validating instructions...')).toBeInTheDocument();
    });

    it('should not show results when loading', () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        summary: {
          errorCount: 0,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={true}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('Validating instructions...')).toBeInTheDocument();
      expect(screen.queryByText('Instructions validated successfully')).not.toBeInTheDocument();
    });
  });

  describe('No Validation State', () => {
    it('should render nothing when no validation and not loading', () => {
      const { container } = render(
        <ValidationResultsPanel
          validation={null}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Success State (AC7)', () => {
    it('should show success message when valid with no warnings', () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        summary: {
          errorCount: 0,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText(/Instructions validated successfully/)).toBeInTheDocument();
      expect(screen.getByText(/No errors found/)).toBeInTheDocument();
    });
  });

  describe('Error Display (AC2, AC3, AC4)', () => {
    it('should display errors with error styling', () => {
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            code: 'VARIABLE_UNDEFINED',
            message: 'Variable @contact.customField1 is not defined',
            severity: 'error',
            lineNumber: 5,
            suggestion: 'Define this custom field in workspace settings',
          },
        ],
        warnings: [],
        summary: {
          errorCount: 1,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('1 error')).toBeInTheDocument();
      expect(screen.getByText('Variable @contact.customField1 is not defined')).toBeInTheDocument();
      expect(screen.getByText('Line 5')).toBeInTheDocument();
      expect(screen.getByText('Define this custom field in workspace settings')).toBeInTheDocument();
    });

    it('should display multiple errors with correct count', () => {
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            code: 'VARIABLE_UNDEFINED',
            message: 'Variable @contact.field1 is not defined',
            severity: 'error',
          },
          {
            code: 'CONDITION_SYNTAX_ERROR',
            message: 'Invalid condition syntax',
            severity: 'error',
          },
        ],
        warnings: [],
        summary: {
          errorCount: 2,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('2 errors')).toBeInTheDocument();
    });
  });

  describe('Warning Display (AC5, AC6)', () => {
    it('should display warnings with warning styling', () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template "Missing Template" not found',
            severity: 'warning',
            lineNumber: 3,
            suggestion: 'Create this template in Settings or check the name',
          },
        ],
        summary: {
          errorCount: 0,
          warningCount: 1,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('1 warning found')).toBeInTheDocument();
      expect(screen.getByText('Template "Missing Template" not found')).toBeInTheDocument();
    });

    it('should display multiple warnings correctly', () => {
      const validation: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            code: 'INTEGRATION_NOT_CONNECTED',
            message: 'Gmail integration not connected',
            severity: 'warning',
          },
          {
            code: 'DAILY_LIMIT_RISK',
            message: 'Email volume approaching daily limit',
            severity: 'warning',
          },
        ],
        summary: {
          errorCount: 0,
          warningCount: 2,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('2 warnings found')).toBeInTheDocument();
    });
  });

  describe('Mixed Errors and Warnings', () => {
    it('should show both errors and warnings with correct counts', () => {
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            code: 'CONDITION_SYNTAX_ERROR',
            message: 'Invalid condition: single = instead of ==',
            severity: 'error',
          },
        ],
        warnings: [
          {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
            severity: 'warning',
          },
          {
            code: 'INTEGRATION_NOT_CONNECTED',
            message: 'Integration not connected',
            severity: 'warning',
          },
        ],
        summary: {
          errorCount: 1,
          warningCount: 2,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText(/1 error/)).toBeInTheDocument();
      expect(screen.getByText(/2 warnings/)).toBeInTheDocument();
    });
  });

  describe('Issue Click Handler', () => {
    it('should call onIssueClick when an issue is clicked', () => {
      const mockIssue: ValidationIssue = {
        code: 'VARIABLE_UNDEFINED',
        message: 'Variable not defined',
        severity: 'error',
        lineNumber: 10,
      };

      const validation: ValidationResult = {
        valid: false,
        errors: [mockIssue],
        warnings: [],
        summary: {
          errorCount: 1,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      const issueCard = screen.getByText('Variable not defined').closest('[role="button"]');
      fireEvent.click(issueCard!);

      expect(mockOnIssueClick).toHaveBeenCalledWith(mockIssue);
    });

    it('should support keyboard navigation for accessibility', () => {
      const mockIssue: ValidationIssue = {
        code: 'VARIABLE_UNDEFINED',
        message: 'Variable not defined',
        severity: 'error',
      };

      const validation: ValidationResult = {
        valid: false,
        errors: [mockIssue],
        warnings: [],
        summary: {
          errorCount: 1,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      const issueCard = screen.getByText('Variable not defined').closest('[role="button"]');
      fireEvent.keyDown(issueCard!, { key: 'Enter' });

      expect(mockOnIssueClick).toHaveBeenCalledWith(mockIssue);
    });
  });

  describe('Instruction Text Display', () => {
    it('should show instruction text when available', () => {
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            code: 'CONDITION_SYNTAX_ERROR',
            message: 'Invalid syntax',
            severity: 'error',
            lineNumber: 5,
            instructionText: 'if status = active:',
          },
        ],
        warnings: [],
        summary: {
          errorCount: 1,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText(/if status = active:/)).toBeInTheDocument();
    });

    it('should truncate long instruction text', () => {
      const longText = 'This is a very long instruction text that should be truncated because it exceeds fifty characters limit';
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            code: 'CONDITION_SYNTAX_ERROR',
            message: 'Invalid syntax',
            severity: 'error',
            lineNumber: 5,
            instructionText: longText,
          },
        ],
        warnings: [],
        summary: {
          errorCount: 1,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      // Should show truncated text with ellipsis
      expect(screen.getByText(/This is a very long instruction text that should be/)).toBeInTheDocument();
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    });
  });

  describe('Suggestion Display', () => {
    it('should show lightbulb icon with suggestion', () => {
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            code: 'CONDITION_SYNTAX_ERROR',
            message: 'Single = found',
            severity: 'error',
            suggestion: 'Did you mean == for comparison?',
          },
        ],
        warnings: [],
        summary: {
          errorCount: 1,
          warningCount: 0,
          validatedAt: new Date().toISOString(),
        },
      };

      render(
        <ValidationResultsPanel
          validation={validation}
          isLoading={false}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(screen.getByText('Did you mean == for comparison?')).toBeInTheDocument();
    });
  });
});
