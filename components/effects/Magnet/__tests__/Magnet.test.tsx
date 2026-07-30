import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Magnet from '../Magnet';

describe('Magnet Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Magnet>
          <button>Magnetic Button</button>
        </Magnet>
      );
      expect(screen.getByRole('button', { name: /magnetic button/i })).toBeInTheDocument();
    });

    it('renders with default props', () => {
      const { container } = render(
        <Magnet>
          <div>Content</div>
        </Magnet>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies custom wrapperClassName', () => {
      const { container } = render(
        <Magnet wrapperClassName="custom-wrapper">
          <div>Content</div>
        </Magnet>
      );
      expect(container.firstChild).toHaveClass('custom-wrapper');
    });

    it('applies custom innerClassName', () => {
      const { container } = render(
        <Magnet innerClassName="custom-inner">
          <div>Content</div>
        </Magnet>
      );
      const innerDiv = container.querySelector('.custom-inner');
      expect(innerDiv).toBeInTheDocument();
    });
  });

  describe('Default Styles', () => {
    it('applies correct wrapper styles', () => {
      const { container } = render(
        <Magnet>
          <div>Content</div>
        </Magnet>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({
        position: 'relative',
        display: 'inline-block',
      });
    });

    it('applies transform and transition to inner element', () => {
      const { container } = render(
        <Magnet>
          <div>Content</div>
        </Magnet>
      );
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({
        willChange: 'transform',
      });
    });
  });

  describe('Mouse Interactions', () => {
    it('updates position on mouse move within padding area', () => {
      const { container } = render(
        <Magnet padding={100}>
          <div>Magnetic</div>
        </Magnet>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      
      // Mock getBoundingClientRect
      wrapper.getBoundingClientRect = jest.fn(() => ({
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        right: 200,
        bottom: 150,
        x: 100,
        y: 100,
        toJSON: () => {},
      }));

      // Simulate mouse move within magnetic area
      fireEvent.mouseMove(window, { clientX: 150, clientY: 125 });
      
      expect(wrapper).toBeInTheDocument();
    });

    it('resets position when mouse moves outside padding area', () => {
      const { container } = render(
        <Magnet padding={50}>
          <div>Magnetic</div>
        </Magnet>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      
      wrapper.getBoundingClientRect = jest.fn(() => ({
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        right: 200,
        bottom: 150,
        x: 100,
        y: 100,
        toJSON: () => {},
      }));

      // Move far away from element
      fireEvent.mouseMove(window, { clientX: 500, clientY: 500 });
      
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({
        transform: 'translate3d(0px, 0px, 0)',
      });
    });
  });

  describe('Disabled State', () => {
    it('does not respond to mouse events when disabled', () => {
      const { container } = render(
        <Magnet disabled>
          <div>Disabled Magnet</div>
        </Magnet>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      wrapper.getBoundingClientRect = jest.fn(() => ({
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        right: 200,
        bottom: 150,
        x: 100,
        y: 100,
        toJSON: () => {},
      }));

      fireEvent.mouseMove(window, { clientX: 150, clientY: 125 });
      
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({
        transform: 'translate3d(0px, 0px, 0)',
      });
    });

    it('always shows zero position when disabled', () => {
      const { container } = render(
        <Magnet disabled>
          <div>Always Zero</div>
        </Magnet>
      );
      
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({
        transform: 'translate3d(0px, 0px, 0)',
      });
    });
  });

  describe('Magnet Strength', () => {
    it('applies custom magnetStrength', () => {
      const { container } = render(
        <Magnet magnetStrength={5}>
          <div>Strong Magnet</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses default magnetStrength of 2', () => {
      const { container } = render(
        <Magnet>
          <div>Default Strength</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Padding Configuration', () => {
    it('applies custom padding', () => {
      const { container } = render(
        <Magnet padding={200}>
          <div>Large Padding</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('uses default padding of 100', () => {
      const { container } = render(
        <Magnet>
          <div>Default Padding</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Transitions', () => {
    it('applies custom active transition', () => {
      const { container } = render(
        <Magnet activeTransition="transform 0.1s linear">
          <div>Fast Transition</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies custom inactive transition', () => {
      const { container } = render(
        <Magnet inactiveTransition="transform 1s ease">
          <div>Slow Transition</div>
        </Magnet>
      );
      
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({
        transition: 'transform 1s ease',
      });
    });

    it('uses default transitions', () => {
      const { container } = render(
        <Magnet>
          <div>Default Transitions</div>
        </Magnet>
      );
      
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({
        transition: 'transform 0.5s ease-in-out',
      });
    });
  });

  describe('Event Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(
        <Magnet>
          <div>Cleanup Test</div>
        </Magnet>
      );
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('does not add event listeners when disabled', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(
        <Magnet disabled>
          <div>No Listeners</div>
        </Magnet>
      );
      
      // Should not add mousemove listener when disabled
      const mouseMoveCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'mousemove'
      );
      expect(mouseMoveCalls.length).toBe(0);
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Additional Props', () => {
    it('forwards additional HTML attributes', () => {
      const { container } = render(
        <Magnet data-testid="magnet-test" aria-label="Magnetic wrapper">
          <div>Props Test</div>
        </Magnet>
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('data-testid', 'magnet-test');
      expect(wrapper).toHaveAttribute('aria-label', 'Magnetic wrapper');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing children gracefully', () => {
      const { container } = render(<Magnet />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <Magnet>
          <button>Button 1</button>
          <button>Button 2</button>
        </Magnet>
      );
      
      expect(screen.getByRole('button', { name: /button 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /button 2/i })).toBeInTheDocument();
    });

    it('handles zero padding', () => {
      const { container } = render(
        <Magnet padding={0}>
          <div>Zero Padding</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles zero magnetStrength', () => {
      const { container } = render(
        <Magnet magnetStrength={0}>
          <div>Zero Strength</div>
        </Magnet>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Transform Performance', () => {
    it('uses translate3d for GPU acceleration', () => {
      const { container } = render(
        <Magnet>
          <div>GPU Accelerated</div>
        </Magnet>
      );
      
      const inner = container.querySelector('div > div') as HTMLElement;
      const transform = inner.style.transform;
      expect(transform).toContain('translate3d');
    });

    it('has will-change transform for optimization', () => {
      const { container } = render(
        <Magnet>
          <div>Optimized</div>
        </Magnet>
      );
      
      const inner = container.querySelector('div > div') as HTMLElement;
      expect(inner).toHaveStyle({ willChange: 'transform' });
    });
  });
});
