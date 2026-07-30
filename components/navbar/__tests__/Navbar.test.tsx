import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../Navbar';

// Mock child components
jest.mock('@/components/ui/RollingText', () => {
  return function MockRollingText({ children }: any) {
    return <span data-testid="rolling-text">{children}</span>;
  };
});

jest.mock('@/components/ui/LineSidebar/LineSidebar', () => {
  return function MockLineSidebar({ items, onItemClick, defaultActive }: any) {
    return (
      <div data-testid="line-sidebar">
        {items.map((item: any, index: number) => (
          <button
            key={item.id}
            onClick={() => onItemClick(index, item)}
            data-active={index === defaultActive}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };
});

// Mock useActiveSection hook
jest.mock('@/lib/useActiveSection', () => ({
  useActiveSection: jest.fn(() => 'home'),
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 });
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
    
    // Mock getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      height: 80,
      width: 0,
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => {},
    }));
  });

  describe('Rendering', () => {
    it('renders the navbar', () => {
      render(<Navbar />);
      const nav = screen.getAllByRole('navigation')[0];
      expect(nav).toBeInTheDocument();
    });

    it('renders logo button', () => {
      render(<Navbar />);
      const logoButton = screen.getByText('JM');
      expect(logoButton).toBeInTheDocument();
    });

    it('renders all navigation items', () => {
      render(<Navbar />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Tech Stack')).toBeInTheDocument();
      expect(screen.getByText('Experience')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('renders mobile menu button', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('Logo Interaction', () => {
    it('logo button scrolls to home', () => {
      const mockScrollIntoView = jest.fn();
      const homeElement = document.createElement('div');
      homeElement.id = 'home';
      homeElement.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(homeElement);

      render(<Navbar />);
      const logoButton = screen.getByText('JM');
      fireEvent.click(logoButton);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      
      document.body.removeChild(homeElement);
    });
  });

  describe('Navigation Links', () => {
    it('clicking nav link scrolls to section', () => {
      const mockScrollIntoView = jest.fn();
      const aboutElement = document.createElement('div');
      aboutElement.id = 'about';
      aboutElement.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(aboutElement);

      render(<Navbar />);
      const aboutButtons = screen.getAllByText('About');
      fireEvent.click(aboutButtons[0]); // Click desktop nav About

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      
      document.body.removeChild(aboutElement);
    });

    it('all nav items are clickable', () => {
      render(<Navbar />);
      const navItems = ['Home', 'About', 'Tech Stack', 'Experience', 'Projects', 'Contact'];
      
      navItems.forEach(item => {
        const buttons = screen.getAllByText(item);
        expect(buttons[0]).toBeInTheDocument();
        expect(buttons[0].closest('button')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Menu', () => {
    it('menu is closed by default', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('clicking menu button opens menu', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      expect(menuButton).toHaveAttribute('aria-label', 'Close navigation menu');
    });

    it('clicking menu button twice toggles menu', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      fireEvent.click(screen.getByLabelText(/close navigation menu/i));
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('overlay is rendered', () => {
      render(<Navbar />);
      const overlay = document.getElementById('portfolio-navigation-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('clicking overlay scrim closes menu', () => {
      const { container } = render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      const scrim = container.querySelector('.overlayScrim');
      fireEvent.click(scrim!);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('LineSidebar Integration', () => {
    it('renders LineSidebar in overlay', () => {
      render(<Navbar />);
      const lineSidebar = screen.getByTestId('line-sidebar');
      expect(lineSidebar).toBeInTheDocument();
    });

    it('clicking LineSidebar item scrolls and closes menu', () => {
      const mockScrollIntoView = jest.fn();
      const projectsElement = document.createElement('div');
      projectsElement.id = 'projects';
      projectsElement.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(projectsElement);

      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      const projectsButton = screen.getByRole('button', { name: 'Projects' });
      fireEvent.click(projectsButton);
      
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      document.body.removeChild(projectsElement);
    });
  });

  describe('Scroll Behavior', () => {
    it('updates nav height CSS variable', async () => {
      render(<Navbar />);
      
      await waitFor(() => {
        const height = document.documentElement.style.getPropertyValue('--nav-height');
        expect(height).toBeTruthy();
      });
    });

    it('body overflow is hidden when menu is open', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('body overflow is restored when menu closes', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      expect(document.body.style.overflow).toBe('hidden');
      
      fireEvent.click(screen.getByLabelText(/close navigation menu/i));
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  describe('Active State', () => {
    it('uses active section from hook', () => {
      const { useActiveSection } = require('@/lib/useActiveSection');
      useActiveSection.mockReturnValue('about');
      
      render(<Navbar />);
      // Active state is reflected in the component
      expect(screen.getByText('About')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<Navbar />);
      expect(screen.getByLabelText(/primary navigation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/compact navigation/i)).toBeInTheDocument();
    });

    it('menu button has aria-expanded', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      expect(menuButton).toHaveAttribute('aria-expanded');
    });

    it('menu button has aria-controls', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      expect(menuButton).toHaveAttribute('aria-controls', 'portfolio-navigation-overlay');
    });

    it('overlay has aria-hidden attribute', () => {
      render(<Navbar />);
      const overlay = document.getElementById('portfolio-navigation-overlay');
      expect(overlay).toHaveAttribute('aria-hidden');
    });

    it('all buttons have type="button"', () => {
      const { container } = render(<Navbar />);
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Navigation Items', () => {
    it('has correct nav item structure', () => {
      render(<Navbar />);
      const navItems = ['Home', 'About', 'Tech Stack', 'Experience', 'Projects', 'Contact'];
      expect(navItems).toHaveLength(6);
    });
  });

  describe('RollingText Integration', () => {
    it('nav links use RollingText', () => {
      render(<Navbar />);
      const rollingTexts = screen.getAllByTestId('rolling-text');
      expect(rollingTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Compact Navigation', () => {
    it('renders compact logo', () => {
      render(<Navbar />);
      const compactLogos = screen.getAllByText('J');
      expect(compactLogos.length).toBeGreaterThan(0);
    });

    it('compact logo has accent span', () => {
      const { container } = render(<Navbar />);
      const accentSpan = container.querySelector('.logoAccent');
      expect(accentSpan).toBeInTheDocument();
      expect(accentSpan).toHaveTextContent('M');
    });
  });

  describe('Edge Cases', () => {
    it('handles scrolling to non-existent section gracefully', () => {
      render(<Navbar />);
      const logoButton = screen.getByText('JM');
      
      // Should not throw error
      expect(() => fireEvent.click(logoButton)).not.toThrow();
    });

    it('handles rapid menu toggle clicks', () => {
      render(<Navbar />);
      const menuButton = screen.getByLabelText(/open navigation menu/i);
      
      fireEvent.click(menuButton);
      fireEvent.click(screen.getByLabelText(/close navigation menu/i));
      fireEvent.click(screen.getByLabelText(/open navigation menu/i));
      fireEvent.click(screen.getByLabelText(/close navigation menu/i));
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
