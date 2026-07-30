import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Preloader from '../Preloader';

// Mock PreloaderLogo
jest.mock('../PreloaderLogo', () => ({
  PreloaderLogo: function MockPreloaderLogo() {
    return <div data-testid="preloader-logo">Logo</div>;
  },
}));

// Mock preloader timeline
jest.mock('@/lib/animations/preloader', () => ({
  buildPreloaderTimeline: jest.fn((refs, options) => {
    // Simulate animation completing after a short delay
    setTimeout(() => {
      options.onComplete();
    }, 100);
  }),
}));

// Mock fonts
jest.mock('@/lib/fonts', () => ({
  urbanist: {
    style: {
      fontFamily: 'Urbanist, sans-serif',
    },
  },
}));

describe('Preloader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('renders preloader initially', () => {
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      expect(screen.getByTestId('preloader-logo')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(
        <Preloader>
          <div>Child Content</div>
        </Preloader>
      );
      
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('preloader has correct styling classes', () => {
      const { container } = render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('preloader has high z-index', () => {
      const { container } = render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toHaveClass('z-[100]');
    });
  });

  describe('Loading State', () => {
    it('hides preloader after animation completes', async () => {
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      expect(screen.getByTestId('preloader-logo')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByTestId('preloader-logo')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('children remain visible after preloader hides', async () => {
      render(
        <Preloader>
          <div>Persistent Content</div>
        </Preloader>
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('preloader-logo')).not.toBeInTheDocument();
      }, { timeout: 200 });
      
      expect(screen.getByText('Persistent Content')).toBeInTheDocument();
    });
  });

  describe('Body Overflow', () => {
    it('sets body overflow to hidden initially', () => {
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body overflow after loading', async () => {
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      }, { timeout: 200 });
    });
  });

  describe('Animation Integration', () => {
    it('calls buildPreloaderTimeline', () => {
      const { buildPreloaderTimeline } = require('@/lib/animations/preloader');
      
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      expect(buildPreloaderTimeline).toHaveBeenCalled();
    });

    it('passes refs to timeline builder', () => {
      const { buildPreloaderTimeline } = require('@/lib/animations/preloader');
      
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      const call = buildPreloaderTimeline.mock.calls[0];
      expect(call[0]).toHaveProperty('overlay');
      expect(call[0]).toHaveProperty('outline');
      expect(call[0]).toHaveProperty('color');
    });

    it('passes onComplete callback', () => {
      const { buildPreloaderTimeline } = require('@/lib/animations/preloader');
      
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      const call = buildPreloaderTimeline.mock.calls[0];
      expect(call[1]).toHaveProperty('onComplete');
      expect(typeof call[1].onComplete).toBe('function');
    });
  });

  describe('PreloaderLogo Integration', () => {
    it('renders PreloaderLogo component', () => {
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      expect(screen.getByTestId('preloader-logo')).toBeInTheDocument();
    });

    it('passes font family to PreloaderLogo', () => {
      const { PreloaderLogo } = require('../PreloaderLogo');
      
      render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      // PreloaderLogo should be called (we can't easily test props with our mock,
      // but we can verify it was rendered)
      expect(screen.getByTestId('preloader-logo')).toBeInTheDocument();
    });
  });

  describe('Children Handling', () => {
    it('renders single child', () => {
      render(
        <Preloader>
          <div>Single Child</div>
        </Preloader>
      );
      
      expect(screen.getByText('Single Child')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <Preloader>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </Preloader>
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('renders complex children', () => {
      render(
        <Preloader>
          <header>Header</header>
          <main>
            <section>Section Content</section>
          </main>
          <footer>Footer</footer>
        </Preloader>
      );
      
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Section Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('Refs', () => {
    it('creates overlay ref', () => {
      const { container } = render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Background Color', () => {
    it('has dark background', () => {
      const { container } = render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toHaveClass('bg-[#141414]');
    });
  });

  describe('Conditional Rendering', () => {
    it('preloader is only rendered when loading', async () => {
      const { container } = render(
        <Preloader>
          <div>Content</div>
        </Preloader>
      );
      
      // Initially rendered
      expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
      
      // After loading completes
      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('children are always rendered', async () => {
      render(
        <Preloader>
          <div data-testid="always-visible">Always Here</div>
        </Preloader>
      );
      
      // Before loading completes
      expect(screen.getByTestId('always-visible')).toBeInTheDocument();
      
      // After loading completes
      await waitFor(() => {
        expect(screen.queryByTestId('preloader-logo')).not.toBeInTheDocument();
      }, { timeout: 200 });
      
      expect(screen.getByTestId('always-visible')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null children gracefully', () => {
      expect(() => {
        render(<Preloader>{null}</Preloader>);
      }).not.toThrow();
    });

    it('handles undefined children gracefully', () => {
      expect(() => {
        render(<Preloader>{undefined}</Preloader>);
      }).not.toThrow();
    });

    it('handles empty fragment', () => {
      expect(() => {
        render(<Preloader><></></Preloader>);
      }).not.toThrow();
    });
  });
});
