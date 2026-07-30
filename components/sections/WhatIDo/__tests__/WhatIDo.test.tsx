import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhatIDo from '../WhatIDo';

// Mock ScrollFloat component
jest.mock('@/components/ui/ScrollFloat/ScrollFloat', () => {
  return function MockScrollFloat({ children, containerClassName, textClassName }: any) {
    return (
      <div data-testid="scroll-float" className={containerClassName}>
        <span className={textClassName}>{children}</span>
      </div>
    );
  };
});

describe('WhatIDo Section', () => {
  const DEFAULT_SENTENCE = 'I build scalable APIs, resilient backend infrastructure, and fluid digital experiences that bridge technical excellence with intuitive design.';

  describe('Rendering', () => {
    it('renders the section', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders the "What I do" eyebrow text', () => {
      render(<WhatIDo />);
      expect(screen.getByText('What I do')).toBeInTheDocument();
    });

    it('renders with default sentence', () => {
      render(<WhatIDo />);
      expect(screen.getByText(DEFAULT_SENTENCE)).toBeInTheDocument();
    });

    it('renders with custom sentence', () => {
      const customSentence = 'Custom sentence for testing';
      render(<WhatIDo sentence={customSentence} />);
      expect(screen.getByText(customSentence)).toBeInTheDocument();
    });

    it('renders ScrollFloat component', () => {
      render(<WhatIDo />);
      expect(screen.getByTestId('scroll-float')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays scalable APIs in default sentence', () => {
      render(<WhatIDo />);
      expect(screen.getByText(/scalable APIs/i)).toBeInTheDocument();
    });

    it('displays backend infrastructure in default sentence', () => {
      render(<WhatIDo />);
      expect(screen.getByText(/backend infrastructure/i)).toBeInTheDocument();
    });

    it('displays technical excellence in default sentence', () => {
      render(<WhatIDo />);
      expect(screen.getByText(/technical excellence/i)).toBeInTheDocument();
    });

    it('accepts empty string as sentence', () => {
      render(<WhatIDo sentence="" />);
      const scrollFloat = screen.getByTestId('scroll-float');
      expect(scrollFloat).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has isolate class on section', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('isolate');
    });

    it('is a centered flex layout', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('has text-center class', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('text-center');
    });

    it('eyebrow has font-mono class', () => {
      render(<WhatIDo />);
      const eyebrow = screen.getByText('What I do');
      expect(eyebrow).toHaveClass('font-mono');
    });

    it('has responsive padding', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('px-5', 'md:px-10');
    });

    it('has vertical padding', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('py-28');
    });
  });

  describe('Props', () => {
    it('sentence prop overrides default', () => {
      const customSentence = 'This is a custom value';
      render(<WhatIDo sentence={customSentence} />);
      
      expect(screen.getByText(customSentence)).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_SENTENCE)).not.toBeInTheDocument();
    });

    it('handles long sentences', () => {
      const longSentence = 'A'.repeat(500);
      render(<WhatIDo sentence={longSentence} />);
      expect(screen.getByText(longSentence)).toBeInTheDocument();
    });

    it('handles special characters in sentence', () => {
      const specialSentence = 'Test & <special> "characters" with \'quotes\'';
      render(<WhatIDo sentence={specialSentence} />);
      expect(screen.getByText(specialSentence)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has inner wrapper div', () => {
      const { container } = render(<WhatIDo />);
      const inner = container.querySelector('.inner');
      expect(inner).toBeInTheDocument();
    });

    it('eyebrow comes before statement', () => {
      const { container } = render(<WhatIDo />);
      const eyebrow = screen.getByText('What I do');
      const statement = screen.getByTestId('scroll-float');
      
      const parent = container.querySelector('.inner');
      const children = Array.from(parent?.children || []);
      const eyebrowIndex = children.findIndex(child => child.contains(eyebrow));
      const statementIndex = children.findIndex(child => child === statement);
      
      expect(eyebrowIndex).toBeLessThan(statementIndex);
    });
  });

  describe('ScrollFloat Integration', () => {
    it('passes containerClassName to ScrollFloat', () => {
      render(<WhatIDo />);
      const scrollFloat = screen.getByTestId('scroll-float');
      expect(scrollFloat.className).toContain('statement');
    });

    it('passes textClassName to ScrollFloat', () => {
      const { container } = render(<WhatIDo />);
      const textSpan = container.querySelector('.statementText');
      expect(textSpan).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic section element', () => {
      const { container } = render(<WhatIDo />);
      const section = container.querySelector('section');
      expect(section?.tagName).toBe('SECTION');
    });

    it('content is readable text', () => {
      render(<WhatIDo />);
      const text = screen.getByText(/scalable APIs/i);
      expect(text).toBeVisible();
    });
  });

  describe('Default Export', () => {
    it('exports default sentence constant', () => {
      render(<WhatIDo />);
      // Verify the default sentence contains key phrases
      expect(screen.getByText(/scalable APIs/i)).toBeInTheDocument();
      expect(screen.getByText(/resilient backend infrastructure/i)).toBeInTheDocument();
      expect(screen.getByText(/fluid digital experiences/i)).toBeInTheDocument();
    });
  });
});
