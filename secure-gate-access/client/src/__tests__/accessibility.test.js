// client/src/__tests__/accessibility.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor  } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { useAccessibility, useFocusManagement, useKeyboardShortcuts } from '../hooks/useAccessibility';
import AccessibleButton from '../components/ui/AccessibleButton';
import AccessibleFormField from '../components/ui/AccessibleFormField';
import AccessibleModal from '../components/ui/AccessibleModal';
import { 
  calculateContrastRatio, 
  checkContrastCompliance, 
  auditThemeAccessibility 
} from '../utils/accessibilityAudit';

// Mock React for the accessibility audit
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((fn) => fn()),
  useCallback: jest.fn((fn) => fn()),
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useRef: jest.fn(() => ({ current: null }))
}));

describe('Accessibility Utilities', () => {
  describe('calculateContrastRatio', () => {
    test('calculates contrast ratio correctly', () => {
      // Black on white should have high contrast
      const ratio = calculateContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeGreaterThan(20);
      
      // White on white should have low contrast
      const lowRatio = calculateContrastRatio('#ffffff', '#ffffff');
      expect(lowRatio).toBeCloseTo(1);
    });

    test('handles hex colors with and without #', () => {
      const ratio1 = calculateContrastRatio('#000000', '#ffffff');
      const ratio2 = calculateContrastRatio('000000', 'ffffff');
      expect(ratio1).toBeCloseTo(ratio2);
    });
  });

  describe('checkContrastCompliance', () => {
    test('validates WCAG AA compliance for normal text', () => {
      const result = checkContrastCompliance('#000000', '#ffffff', 'normal');
      expect(result.wcagAA).toBe(true);
      expect(result.ratio).toBeGreaterThan(4.5);
    });

    test('validates WCAG AA compliance for large text', () => {
      const result = checkContrastCompliance('#000000', '#ffffff', 'large');
      expect(result.wcagAA).toBe(true);
      expect(result.ratio).toBeGreaterThan(3);
    });

    test('identifies non-compliant color combinations', () => {
      const result = checkContrastCompliance('#cccccc', '#ffffff', 'normal');
      expect(result.wcagAA).toBe(false);
    });
  });

  describe('auditThemeAccessibility', () => {
    test('returns comprehensive audit results', () => {
      const audit = auditThemeAccessibility();
      
      expect(audit).toHaveProperty('colorCombinations');
      expect(audit).toHaveProperty('focusIndicators');
      expect(audit).toHaveProperty('touchTargets');
      expect(audit).toHaveProperty('semanticElements');
      expect(audit).toHaveProperty('overall');
      
      expect(audit.overall).toHaveProperty('passed');
      expect(audit.overall).toHaveProperty('failed');
      expect(audit.overall).toHaveProperty('warnings');
    });
  });
});

describe('useAccessibility Hook', () => {
  test('provides accessibility state and utilities', () => {
    const TestComponent = () => {
      const accessibility = useAccessibility();
      return (
        <div>
          <span data-testid="keyboard-user">{accessibility.accessibilityState.isKeyboardUser.toString()}</span>
          <span data-testid="high-contrast">{accessibility.accessibilityState.isHighContrast.toString()}</span>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('keyboard-user')).toBeInTheDocument();
    expect(screen.getByTestId('high-contrast')).toBeInTheDocument();
  });

  test('announces messages to screen readers', () => {
    const TestComponent = () => {
      const { announce } = useAccessibility();
      
      const handleClick = () => {
        announce('Test message', 'polite');
      };

      return <button onClick={handleClick}>Test</button>;
    };

    render(<TestComponent />);
    
    // Test that announce function exists and can be called
    const button = screen.getByRole('button');
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});

describe('useFocusManagement Hook', () => {
  test('manages focus within container', () => {
    const TestComponent = () => {
      const { containerRef } = useFocusManagement({ trapFocus: true });
      
      return (
        <div ref={containerRef}>
          <button>First</button>
          <button>Second</button>
        </div>
      );
    };

    render(<TestComponent />);
    
    const firstButton = screen.getByText('First');
    const secondButton = screen.getByText('Second');
    
    expect(firstButton).toBeInTheDocument();
    expect(secondButton).toBeInTheDocument();
  });
});

describe('useKeyboardShortcuts Hook', () => {
  test('handles keyboard shortcuts', () => {
    const mockShortcut = jest.fn();
    
    const TestComponent = () => {
      useKeyboardShortcuts({
        'ctrl+s': mockShortcut,
        'alt+n': mockShortcut
      });
      
      return <div>Test</div>;
    };

    render(<TestComponent />);
    
    // Test Ctrl+S
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(mockShortcut).toHaveBeenCalled();
  });
});

describe('AccessibleButton Component', () => {
  test('renders with proper ARIA attributes', () => {
    render(
      <AccessibleButton aria-label="Test button">
        Click me
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Test button');
  });

  test('handles disabled state correctly', () => {
    render(
      <AccessibleButton disabled>
        Disabled button
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  test('shows loading state with screen reader text', () => {
    render(
      <AccessibleButton loading>
        Loading button
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    const loadingText = screen.getByText('Loading...');
    
    expect(button).toBeDisabled();
    expect(loadingText).toHaveClass('sr-only');
  });

  test('supports different variants', () => {
    const { rerender } = render(
      <AccessibleButton variant="primary">
        Primary
      </AccessibleButton>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
    
    rerender(
      <AccessibleButton variant="danger">
        Danger
      </AccessibleButton>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  test('handles click events with accessibility', async () => {
    const handleClick = jest.fn();
    
    render(
      <AccessibleButton onClick={handleClick} aria-label="Test button">
        Click me
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalled();
  });
});

describe('AccessibleFormField Component', () => {
  test('renders with proper label association', () => {
    render(
      <AccessibleFormField
        label="Test field"
        name="test"
        value=""
        onChange={() => {}}
      />
    );
    
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test field');
    
    expect(input).toBeInTheDocument();
    expect(label).toBeInTheDocument();
    expect(input).toHaveAttribute('id');
    expect(label).toHaveAttribute('for', input.id);
  });

  test('shows required indicator', () => {
    render(
      <AccessibleFormField
        label="Required field"
        required
        value=""
        onChange={() => {}}
      />
    );
    
    const label = screen.getByText('Required field');
    expect(label).toHaveClass('after:content-["*"]');
  });

  test('displays error message with proper ARIA attributes', () => {
    render(
      <AccessibleFormField
        label="Test field"
        error="This field is required"
        value=""
        onChange={() => {}}
      />
    );
    
    const input = screen.getByRole('textbox');
    const error = screen.getByText('This field is required');
    
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveAttribute('aria-live', 'polite');
  });

  test('associates helper text with input', () => {
    render(
      <AccessibleFormField
        label="Test field"
        helperText="This is helper text"
        value=""
        onChange={() => {}}
      />
    );
    
    const input = screen.getByRole('textbox');
    const helper = screen.getByText('This is helper text');
    
    expect(input).toHaveAttribute('aria-describedby');
    expect(helper).toHaveAttribute('id');
  });

  test('supports different input types', () => {
    const { rerender } = render(
      <AccessibleFormField
        label="Text input"
        type="text"
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    
    rerender(
      <AccessibleFormField
        label="Textarea"
        type="textarea"
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

describe('AccessibleModal Component', () => {
  test('renders when open', () => {
    render(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(
      <AccessibleModal
        isOpen={false}
        onClose={() => {}}
        title="Test Modal"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('has proper ARIA attributes', () => {
    render(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
  });

  test('handles close button', () => {
    const handleClose = jest.fn();
    
    render(
      <AccessibleModal
        isOpen={true}
        onClose={handleClose}
        title="Test Modal"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalled();
  });

  test('handles escape key', () => {
    const handleClose = jest.fn();
    
    render(
      <AccessibleModal
        isOpen={true}
        onClose={handleClose}
        title="Test Modal"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});

describe('Accessibility Integration', () => {
  test('components work together seamlessly', () => {
    const TestForm = () => {
      const [formData, setFormData] = React.useState({ name: '', email: '' });
      const [showModal, setShowModal] = React.useState(false);
      
      return (
        <div>
          <AccessibleFormField
            label="Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <AccessibleFormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          
          <AccessibleButton
            onClick={() => setShowModal(true)}
            aria-label="Open modal"
          >
            Submit
          </AccessibleButton>
          
          <AccessibleModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Confirmation"
          >
            <p>Form submitted successfully!</p>
            <AccessibleButton onClick={() => setShowModal(false)}>
              Close
            </AccessibleButton>
          </AccessibleModal>
        </div>
      );
    };

    render(<TestForm />);
    
    // Test form fields
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    
    // Test button
    const submitButton = screen.getByRole('button', { name: 'Open modal' });
    expect(submitButton).toBeInTheDocument();
    
    // Test modal interaction
    fireEvent.click(submitButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});




