import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../Button';

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock child components
jest.mock('@/components/effects/SpecularButton/SpecularButton', () => {
  return function MockSpecularButton({ children, onClick, type, className }: any) {
    return (
      <button onClick={onClick} type={type} className={className} data-testid="specular-button">
        {children}
      </button>
    );
  };
});

jest.mock('@/components/effects/Magnet/Magnet', () => {
  return function MockMagnet({ children }: any) {
    return <div data-testid="magnet-wrapper">{children}</div>;
  };
});

jest.mock('@/components/ui/RollingText', () => {
  return function MockRollingText({ children }: any) {
    return <span data-testid="rolling-text">{children}</span>;
  };
});

describe('Button Component', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('renders primary variant with correct styles', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white', 'text-black');
    });

    it('renders outline variant with correct styles', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-white/20');
    });

    it('renders specular variant', () => {
      render(<Button variant="specular">Specular</Button>);
      expect(screen.getByTestId('specular-button')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size with correct styles', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-xs');
    });

    it('renders medium size with correct styles', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-sm');
    });

    it('renders large size with correct styles', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-8', 'py-4', 'text-base');
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('navigates to href when clicked', () => {
      render(<Button href="/about">Navigate</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).toHaveBeenCalledWith('/about');
    });

    it('calls onClick and navigates when both provided', () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} href="/contact">
          Click and Navigate
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/contact');
    });
  });

  describe('Button Types', () => {
    it('renders as button type by default', () => {
      render(<Button>Default</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('renders as submit type when specified', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('Magnetic Effect', () => {
    it('wraps button in Magnet component when magnetic is true', () => {
      render(<Button magnetic>Magnetic</Button>);
      expect(screen.getByTestId('magnet-wrapper')).toBeInTheDocument();
    });

    it('does not wrap button in Magnet when magnetic is false', () => {
      render(<Button magnetic={false}>Not Magnetic</Button>);
      expect(screen.queryByTestId('magnet-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('Rolling Text', () => {
    it('renders RollingText when rolling is true and children is string', () => {
      render(<Button rolling>Rolling</Button>);
      expect(screen.getByTestId('rolling-text')).toBeInTheDocument();
    });

    it('does not render RollingText when rolling is false', () => {
      render(<Button rolling={false}>Not Rolling</Button>);
      expect(screen.queryByTestId('rolling-text')).not.toBeInTheDocument();
    });

    it('does not render RollingText when children is not a string', () => {
      render(
        <Button rolling>
          <span>Complex Child</span>
        </Button>
      );
      expect(screen.queryByTestId('rolling-text')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom radius', () => {
      render(<Button radius={24}>Custom Radius</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: '24px' });
    });

    it('applies default radius of 12px', () => {
      render(<Button>Default Radius</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: '12px' });
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('maintains semantic button role', () => {
      render(<Button>Semantic</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
