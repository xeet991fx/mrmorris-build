/**
 * ValidationInlineMarkers Component Tests
 *
 * Tests for the inline validation markers in the instructions editor (Story 2.4)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationInlineMarkers, getLineGutterMarkers } from '../ValidationInlineMarkers';
import type { ValidationIssue } from '@/types/agent';

describe('ValidationInlineMarkers Component (Story 2.4)', () => {
  const mockOnIssueClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render nothing when no issues', () => {
      const { container } = render(
        <ValidationInlineMarkers
          instructions="Test instructions"
          issues={[]}
          onIssueClick={mockOnIssueClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Markers', () => {
    it('should render error marker with X icon', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'VARIABLE_UNDEFINED',
          message: 'Variable not defined',
          severity: 'error',
          lineNumber: 1,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button', { name: /1 validation issue on line 1/ });
      expect(marker).toBeInTheDocument();
    });

    it('should show error styling for error markers', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'CONDITION_SYNTAX_ERROR',
          message: 'Invalid syntax',
          severity: 'error',
          lineNumber: 2,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1\nLine 2"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      expect(marker).toHaveClass('bg-red-100');
    });
  });

  describe('Warning Markers', () => {
    it('should render warning marker with triangle icon', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found',
          severity: 'warning',
          lineNumber: 1,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button', { name: /1 validation issue on line 1/ });
      expect(marker).toBeInTheDocument();
    });

    it('should show warning styling for warning markers', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'INTEGRATION_NOT_CONNECTED',
          message: 'Integration not connected',
          severity: 'warning',
          lineNumber: 1,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      expect(marker).toHaveClass('bg-yellow-100');
    });
  });

  describe('Multiple Issues on Same Line', () => {
    it('should group multiple issues on the same line', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'First error',
          severity: 'error',
          lineNumber: 3,
        },
        {
          code: 'WARNING_1',
          message: 'First warning',
          severity: 'warning',
          lineNumber: 3,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1\nLine 2\nLine 3"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      // Should only have one marker button for line 3
      const markers = screen.getAllByRole('button');
      expect(markers).toHaveLength(1);
      expect(markers[0]).toHaveAccessibleName(/2 validation issues on line 3/);
    });

    it('should show error styling when line has both errors and warnings', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'Error on line',
          severity: 'error',
          lineNumber: 1,
        },
        {
          code: 'WARNING_1',
          message: 'Warning on line',
          severity: 'warning',
          lineNumber: 1,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      // Errors take priority over warnings for styling
      expect(marker).toHaveClass('bg-red-100');
    });
  });

  describe('Issues on Different Lines', () => {
    it('should render markers at correct positions', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'Error on line 1',
          severity: 'error',
          lineNumber: 1,
        },
        {
          code: 'WARNING_1',
          message: 'Warning on line 5',
          severity: 'warning',
          lineNumber: 5,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1\nLine 2\nLine 3\nLine 4\nLine 5"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const markers = screen.getAllByRole('button');
      expect(markers).toHaveLength(2);
    });
  });

  describe('Click Handler', () => {
    it('should call onIssueClick when single issue marker is clicked', async () => {
      const user = userEvent.setup();
      const issue: ValidationIssue = {
        code: 'ERROR_1',
        message: 'Test error',
        severity: 'error',
        lineNumber: 1,
      };

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={[issue]}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      await user.click(marker);

      expect(mockOnIssueClick).toHaveBeenCalledWith(issue);
    });
  });

  describe('Tooltip Content', () => {
    it('should show issue message in tooltip', async () => {
      const user = userEvent.setup();
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'Variable @contact.field is undefined',
          severity: 'error',
          lineNumber: 1,
          suggestion: 'Define this field in settings',
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      await user.hover(marker);

      await waitFor(() => {
        expect(screen.getByText('Variable @contact.field is undefined')).toBeInTheDocument();
        expect(screen.getByText('Define this field in settings')).toBeInTheDocument();
      });
    });
  });

  describe('Default Line Number', () => {
    it('should default to line 1 when lineNumber is not provided', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'Error without line number',
          severity: 'error',
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1\nLine 2"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button', { name: /line 1/ });
      expect(marker).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for screen readers', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'Test error',
          severity: 'error',
          lineNumber: 3,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1\nLine 2\nLine 3"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      expect(marker).toHaveAttribute('aria-label', '1 validation issue on line 3');
    });

    it('should use plural form for multiple issues', () => {
      const issues: ValidationIssue[] = [
        {
          code: 'ERROR_1',
          message: 'First error',
          severity: 'error',
          lineNumber: 1,
        },
        {
          code: 'ERROR_2',
          message: 'Second error',
          severity: 'error',
          lineNumber: 1,
        },
      ];

      render(
        <ValidationInlineMarkers
          instructions="Line 1"
          issues={issues}
          onIssueClick={mockOnIssueClick}
        />
      );

      const marker = screen.getByRole('button');
      expect(marker).toHaveAttribute('aria-label', '2 validation issues on line 1');
    });
  });
});

describe('getLineGutterMarkers Helper', () => {
  it('should return empty array for no issues', () => {
    const result = getLineGutterMarkers([]);
    expect(result).toEqual([]);
  });

  it('should group issues by line number', () => {
    const issues: ValidationIssue[] = [
      { code: 'E1', message: 'Error 1', severity: 'error', lineNumber: 1 },
      { code: 'E2', message: 'Error 2', severity: 'error', lineNumber: 1 },
      { code: 'W1', message: 'Warning 1', severity: 'warning', lineNumber: 3 },
    ];

    const result = getLineGutterMarkers(issues);

    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(1);
    expect(result[0].count).toBe(2);
    expect(result[1].lineNumber).toBe(3);
    expect(result[1].count).toBe(1);
  });

  it('should set severity to error when line has both errors and warnings', () => {
    const issues: ValidationIssue[] = [
      { code: 'W1', message: 'Warning', severity: 'warning', lineNumber: 1 },
      { code: 'E1', message: 'Error', severity: 'error', lineNumber: 1 },
    ];

    const result = getLineGutterMarkers(issues);

    expect(result[0].severity).toBe('error');
  });

  it('should set severity to warning when line has only warnings', () => {
    const issues: ValidationIssue[] = [
      { code: 'W1', message: 'Warning 1', severity: 'warning', lineNumber: 2 },
      { code: 'W2', message: 'Warning 2', severity: 'warning', lineNumber: 2 },
    ];

    const result = getLineGutterMarkers(issues);

    expect(result[0].severity).toBe('warning');
  });

  it('should sort results by line number', () => {
    const issues: ValidationIssue[] = [
      { code: 'E3', message: 'Error 3', severity: 'error', lineNumber: 10 },
      { code: 'E1', message: 'Error 1', severity: 'error', lineNumber: 1 },
      { code: 'E2', message: 'Error 2', severity: 'error', lineNumber: 5 },
    ];

    const result = getLineGutterMarkers(issues);

    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(5);
    expect(result[2].lineNumber).toBe(10);
  });

  it('should default to line 1 when lineNumber is not provided', () => {
    const issues: ValidationIssue[] = [
      { code: 'E1', message: 'Error without line', severity: 'error' },
    ];

    const result = getLineGutterMarkers(issues);

    expect(result[0].lineNumber).toBe(1);
  });
});
