import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import Navbar from '../Navbar';

const useActiveSection = jest.fn(() => 'home');

jest.mock('@/lib/useActiveSection', () => ({
  useActiveSection: (...args: unknown[]) => useActiveSection(...args),
}));

const render = (ui: React.ReactElement) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

describe('Navbar', () => {
  let queuedFrame: FrameRequestCallback | null;

  beforeEach(() => {
    useActiveSection.mockReturnValue('home');
    queuedFrame = null;
    document.body.style.overflow = '';
    document.body.replaceChildren();
    document.documentElement.style.removeProperty('--nav-height');
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });
    window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      queuedFrame = callback;
      return 1;
    });
    Element.prototype.scrollIntoView = jest.fn();
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
      bottom: 56,
      height: 56,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
  });

  it('scrolls to the requested section without changing routes', () => {
    const target = document.createElement('section');
    target.id = 'about';
    target.scrollIntoView = jest.fn();
    document.body.appendChild(target);
    render(<Navbar />);

    fireEvent.click(screen.getAllByRole('button', { name: 'About' })[0]);

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('opens the mobile menu, locks scrolling, and closes on Escape', () => {
    render(<Navbar />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('closes the mobile menu after selecting a destination', () => {
    const target = document.createElement('section');
    target.id = 'projects';
    target.scrollIntoView = jest.fn();
    document.body.appendChild(target);
    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Projects' }).at(-1)!);

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('closes an open mobile menu when the viewport becomes desktop-sized', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 });
    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes an open menu when downward scrolling hides the navbar', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 });
    act(() => {
      fireEvent.scroll(window);
      queuedFrame?.(0);
    });

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('exposes the active destination with aria-current', () => {
    useActiveSection.mockReturnValue('contact');
    render(<Navbar />);

    const contactButtons = screen.getAllByRole('button', { name: 'Contact', hidden: true });
    expect(contactButtons.some((button) => button.getAttribute('aria-current') === 'page')).toBe(true);
  });
});
