import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import Navbar from '../Navbar';

const useActiveSection = jest.fn<string, unknown[]>(() => 'home');

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

  it('takes Home to the very top of the page, not the end of its pinned section', () => {
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    const home = document.createElement('section');
    home.id = 'home';
    home.scrollIntoView = jest.fn();
    document.body.appendChild(home);
    render(<Navbar />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Home' })[0]);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(home.scrollIntoView).not.toHaveBeenCalled();
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

  describe('CV download', () => {
    let savedLinks: { href: string; download: string }[];
    let resolveFetch: (response: Response) => void;
    let rejectFetch: (error: Error) => void;

    beforeEach(() => {
      savedLinks = [];
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        savedLinks.push({ href: this.getAttribute('href') ?? '', download: this.download });
      });
      global.fetch = jest.fn(
        () =>
          new Promise<Response>((resolve, reject) => {
            resolveFetch = resolve;
            rejectFetch = reject;
          })
      ) as unknown as typeof fetch;
      URL.createObjectURL = jest.fn(() => 'blob:cv');
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const cvLink = () => screen.getByRole('link', { name: /Download CV|Downloading CV/ });

    it('shows a loading state until the CV has arrived, then saves it under its file name', async () => {
      render(<Navbar />);
      const link = cvLink();

      fireEvent.click(link);

      expect(global.fetch).toHaveBeenCalledWith('/cv.pdf');
      expect(link).toHaveAttribute('aria-busy', 'true');
      expect(link).toHaveAccessibleName('Downloading CV');

      fireEvent.click(link);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFetch({ ok: true, status: 200, blob: async () => new Blob(['%PDF']) } as Response);
      });

      expect(savedLinks).toEqual([{ href: 'blob:cv', download: 'Jude_Arriba_CV_2026.pdf' }]);
      expect(link).toHaveAttribute('aria-busy', 'false');
      expect(link).toHaveAccessibleName('Download CV');
    });

    it('lets the browser download the file itself when fetching it fails', async () => {
      render(<Navbar />);

      fireEvent.click(cvLink());
      await act(async () => {
        rejectFetch(new Error('offline'));
      });

      expect(savedLinks).toEqual([{ href: '/cv.pdf', download: 'Jude_Arriba_CV_2026.pdf' }]);
      expect(cvLink()).toHaveAttribute('aria-busy', 'false');
    });

    it('leaves modified clicks (new tab, save link) to the browser', () => {
      render(<Navbar />);

      fireEvent.click(cvLink(), { ctrlKey: true });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('exposes the active destination with aria-current', () => {
    useActiveSection.mockReturnValue('contact');
    render(<Navbar />);

    const contactButtons = screen.getAllByRole('button', { name: 'Contact', hidden: true });
    expect(contactButtons.some((button) => button.getAttribute('aria-current') === 'page')).toBe(true);
  });
});
