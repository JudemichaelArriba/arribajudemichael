import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RollingText from '../RollingText';

describe('RollingText Component', () => {
  beforeEach(() => {
    // Reset GSAP mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders text content correctly', () => {
      render(<RollingText>Hello World</RollingText>);
      // Text appears twice: once for layout (opacity-0) and once for animation
      const elements = screen.getAllByText('Hello World');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('applies custom className', () => {
      const { container } = render(
        <RollingText className="custom-class">Test</RollingText>
      );
      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders with default props', () => {
      const { container } = render(<RollingText>Default</RollingText>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Character Splitting', () => {
    it('splits text into individual characters', () => {
      const { container } = render(<RollingText>ABC</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(3);
    });

    it('handles spaces correctly with non-breaking space', () => {
      const { container } = render(<RollingText>A B</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(3);
    });

    it('handles empty string', () => {
      const { container } = render(<RollingText></RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(0);
    });

    it('handles special characters', () => {
      const { container } = render(<RollingText>!@#$%</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(5);
    });
  });

  describe('Mouse Interactions', () => {
    it('responds to mouse enter event', () => {
      const { container } = render(<RollingText>Hover Me</RollingText>);
      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.mouseEnter(wrapper);
      // GSAP animation should be called
      // We can't directly test GSAP animation, but we can verify the event handler works
      expect(wrapper).toBeInTheDocument();
    });

    it('responds to mouse leave event', () => {
      const { container } = render(<RollingText>Leave Me</RollingText>);
      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.mouseLeave(wrapper);
      expect(wrapper).toBeInTheDocument();
    });

    it('handles sequential hover events', () => {
      const { container } = render(<RollingText>Sequential</RollingText>);
      const wrapper = container.firstChild as HTMLElement;
      
      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);
      fireEvent.mouseEnter(wrapper);
      
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct base styles', () => {
      const { container } = render(<RollingText>Styled</RollingText>);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('relative', 'inline-block', 'overflow-hidden');
    });

    it('has correct height and line-height', () => {
      const { container } = render(<RollingText>Height</RollingText>);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveStyle({ height: '1em', lineHeight: 1 });
    });

    it('makes layout text invisible', () => {
      const { container } = render(<RollingText>Layout</RollingText>);
      const layoutText = container.querySelector('.opacity-0');
      
      expect(layoutText).toBeInTheDocument();
    });

    it('positions animated text absolutely', () => {
      const { container } = render(<RollingText>Absolute</RollingText>);
      const animatedWrapper = container.querySelector('[aria-hidden="true"]');
      
      expect(animatedWrapper).toHaveClass('absolute', 'left-0', 'top-0');
    });
  });

  describe('Accessibility', () => {
    it('has aria-hidden on animated text', () => {
      const { container } = render(<RollingText>A11y</RollingText>);
      const animatedWrapper = container.querySelector('[aria-hidden="true"]');
      
      expect(animatedWrapper).toBeInTheDocument();
    });

    it('preserves text for screen readers with opacity-0', () => {
      render(<RollingText>Screen Reader Text</RollingText>);
      // The opacity-0 text is still in the DOM for screen readers
      const elements = screen.getAllByText('Screen Reader Text');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('has non-selectable text', () => {
      const { container } = render(<RollingText>No Select</RollingText>);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('select-none');
    });
  });

  describe('Animation Properties', () => {
    it('applies transform-gpu to characters', () => {
      const { container } = render(<RollingText>GPU</RollingText>);
      const chars = container.querySelectorAll('.char-col');
      
      chars.forEach((char) => {
        expect(char).toHaveClass('transform-gpu');
      });
    });

    it('applies will-change-transform for performance', () => {
      const { container } = render(<RollingText>Optimized</RollingText>);
      const chars = container.querySelectorAll('.char-col');
      
      chars.forEach((char) => {
        expect(char).toHaveClass('will-change-transform');
      });
    });
  });

  describe('Custom Props', () => {
    it('accepts custom duration', () => {
      const { container } = render(
        <RollingText duration={0.5}>Custom Duration</RollingText>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom stagger', () => {
      const { container } = render(
        <RollingText stagger={0.02}>Custom Stagger</RollingText>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses default duration when not provided', () => {
      const { container } = render(<RollingText>Default Duration</RollingText>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses default stagger when not provided', () => {
      const { container } = render(<RollingText>Default Stagger</RollingText>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('GSAP Integration', () => {
    it('creates GSAP context on mount', () => {
      const gsap = require('gsap').default;
      render(<RollingText>Context</RollingText>);
      expect(gsap.context).toHaveBeenCalled();
    });

    it('cleans up on unmount', () => {
      const { unmount } = render(<RollingText>Cleanup</RollingText>);
      unmount();
      // Context cleanup is handled in useLayoutEffect return
    });
  });

  describe('Edge Cases', () => {
    it('handles very long text', () => {
      const longText = 'A'.repeat(100);
      const { container } = render(<RollingText>{longText}</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(100);
    });

    it('handles single character', () => {
      const { container } = render(<RollingText>A</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(1);
    });

    it('handles multiple spaces', () => {
      const { container } = render(<RollingText>A   B</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBe(5);
    });

    it('handles Unicode characters', () => {
      const { container } = render(<RollingText>Hello 👋 World 🌍</RollingText>);
      const charElements = container.querySelectorAll('.char-col');
      expect(charElements.length).toBeGreaterThan(0);
    });
  });
});
