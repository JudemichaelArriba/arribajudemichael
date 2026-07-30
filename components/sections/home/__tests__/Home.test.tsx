import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../Home';

// Mock child components
jest.mock('@/components/ui/Button', () => {
  return function MockButton({ children, href }: any) {
    return <a href={href} data-testid="mock-button">{children}</a>;
  };
});

jest.mock('@/components/effects/LightPillar/LightPillar', () => {
  return function MockLightPillar() {
    return <div data-testid="light-pillar" />;
  };
});

describe('Home Section', () => {
  describe('Rendering', () => {
    it('renders the section with correct id', () => {
      const { container } = render(<Home />);
      const section = container.querySelector('#home');
      expect(section).toBeInTheDocument();
    });

    it('renders the name heading', () => {
      render(<Home />);
      const heading = screen.getByRole('heading', { name: /jude michael arriba/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });

    it('renders the role line', () => {
      render(<Home />);
      const roleText = screen.getByText(/full-stack software engineer/i);
      expect(roleText).toBeInTheDocument();
    });

    it('renders the description paragraph', () => {
      render(<Home />);
      const description = screen.getByText(/i architect and deploy scalable backend apis/i);
      expect(description).toBeInTheDocument();
    });

    it('renders the Download CV button', () => {
      render(<Home />);
      const button = screen.getByTestId('mock-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', '/cv.pdf');
    });
  });

  describe('LightPillar Effect', () => {
    it('renders the LightPillar component', () => {
      render(<Home />);
      const lightPillar = screen.getByTestId('light-pillar');
      expect(lightPillar).toBeInTheDocument();
    });

    it('LightPillar is aria-hidden', () => {
      const { container } = render(<Home />);
      const pillarContainer = container.querySelector('[aria-hidden="true"]');
      expect(pillarContainer).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays correct role information', () => {
      render(<Home />);
      expect(screen.getByText(/robust backend apis/i)).toBeInTheDocument();
      expect(screen.getByText(/fluid mobile\/web clients/i)).toBeInTheDocument();
    });

    it('displays correct professional description', () => {
      render(<Home />);
      expect(screen.getByText(/performance optimization/i)).toBeInTheDocument();
      expect(screen.getByText(/long-term maintainability/i)).toBeInTheDocument();
      expect(screen.getByText(/clean architecture/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct section styling classes', () => {
      const { container } = render(<Home />);
      const section = container.querySelector('#home');
      expect(section).toHaveClass('isolate', 'relative', 'flex', 'min-h-svh');
    });

    it('is a centered flex layout', () => {
      const { container } = render(<Home />);
      const section = container.querySelector('#home');
      expect(section).toHaveClass('items-center', 'justify-center');
    });

    it('has text-center class', () => {
      const { container } = render(<Home />);
      const section = container.querySelector('#home');
      expect(section).toHaveClass('text-center');
    });
  });

  describe('Accessibility', () => {
    it('has semantic section element', () => {
      const { container } = render(<Home />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<Home />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('decorative elements are hidden from screen readers', () => {
      const { container } = render(<Home />);
      const decorative = container.querySelector('[aria-hidden="true"]');
      expect(decorative).toBeInTheDocument();
    });
  });

  describe('Button Integration', () => {
    it('button links to CV file', () => {
      render(<Home />);
      const button = screen.getByTestId('mock-button');
      expect(button).toHaveAttribute('href', '/cv.pdf');
    });

    it('button contains Download CV text', () => {
      render(<Home />);
      expect(screen.getByText(/download cv/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive padding classes', () => {
      const { container } = render(<Home />);
      const section = container.querySelector('#home');
      expect(section).toHaveClass('px-8', 'md:px-16');
    });

    it('has responsive text sizing', () => {
      render(<Home />);
      const heading = screen.getByRole('heading', { name: /jude michael arriba/i });
      expect(heading).toHaveClass('text-5xl', 'md:text-7xl');
    });
  });
});
