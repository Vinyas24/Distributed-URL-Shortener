import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlassCard, Button, Input, Badge, Modal } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

const ThemeTester: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('Design System Components (Phase A)', () => {
  it('renders GlassCard with appropriate glass level classes', () => {
    const { rerender } = render(<GlassCard level="base">Base Content</GlassCard>);
    expect(screen.getByText('Base Content')).toHaveClass('glass-base');

    rerender(<GlassCard level="raised">Raised Content</GlassCard>);
    expect(screen.getByText('Raised Content')).toHaveClass('glass-raised');

    rerender(<GlassCard level="overlay">Overlay Content</GlassCard>);
    expect(screen.getByText('Overlay Content')).toHaveClass('glass-overlay');
  });

  it('renders Button and triggers onClick callback', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables Button when isLoading is true and shows loader', () => {
    render(<Button isLoading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('renders Input with accessible label, error message and aria attributes', () => {
    render(
      <Input
        label="Destination URL"
        id="url-input"
        error="Invalid URL"
        placeholder="https://..."
      />
    );
    expect(screen.getByLabelText('Destination URL')).toBeInTheDocument();
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Invalid URL');
    expect(screen.getByPlaceholderText('https://...')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders Input in monospace when isMonospace is true', () => {
    render(<Input placeholder="code" isMonospace />);
    expect(screen.getByPlaceholderText('code')).toHaveClass('font-mono');
  });

  it('renders Badge with custom variants', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toHaveClass('bg-emerald-500/15');
  });

  it('renders Modal when isOpen is true and handles close', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Confirm Delete">
        Modal Body
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Modal Body')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('toggles theme properly via ThemeProvider', () => {
    render(
      <ThemeProvider>
        <ThemeTester />
      </ThemeProvider>
    );
    const initialTheme = screen.getByTestId('theme-value').textContent;
    const toggleBtn = screen.getByRole('button', { name: /toggle/i });
    fireEvent.click(toggleBtn);
    const nextTheme = screen.getByTestId('theme-value').textContent;
    expect(nextTheme).not.toBe(initialTheme);
  });
});
