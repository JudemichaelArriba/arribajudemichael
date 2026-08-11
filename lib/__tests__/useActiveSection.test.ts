import { act, renderHook } from '@testing-library/react';

import { useActiveSection } from '../useActiveSection';

const SECTION_IDS = ['home', 'about', 'contact'];

interface SectionBounds {
  bottom: number;
  top: number;
}

function addSection(id: string, bounds: SectionBounds): HTMLElement {
  const element = document.createElement('section');
  element.id = id;
  element.getBoundingClientRect = jest.fn(() => ({
    bottom: bounds.bottom,
    height: bounds.bottom - bounds.top,
    left: 0,
    right: 100,
    top: bounds.top,
    width: 100,
    x: 0,
    y: bounds.top,
    toJSON: () => ({}),
  }));
  document.body.appendChild(element);
  return element;
}

describe('useActiveSection', () => {
  let queuedFrame: FrameRequestCallback | null;

  beforeEach(() => {
    document.body.replaceChildren();
    queuedFrame = null;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1_000,
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
    window.cancelAnimationFrame = jest.fn();
  });

  it('keeps Home active while the visitor is near the top', () => {
    addSection('home', { top: -500, bottom: 300 });
    addSection('about', { top: 300, bottom: 1_100 });

    const { result } = renderHook(() => useActiveSection(SECTION_IDS));

    expect(result.current).toBe('home');
  });

  it('prefers the section containing the viewport focus line', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 });
    addSection('home', { top: -900, bottom: -100 });
    addSection('about', { top: 100, bottom: 700 });
    addSection('contact', { top: 650, bottom: 1_200 });

    const { result } = renderHook(() => useActiveSection(SECTION_IDS));

    expect(result.current).toBe('about');
  });

  it('updates after scrolling and falls back to Home when no section is visible', () => {
    const home = addSection('home', { top: -900, bottom: -100 });
    const about = addSection('about', { top: 100, bottom: 700 });
    addSection('contact', { top: 800, bottom: 1_400 });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 900,
      writable: true,
    });

    const { result } = renderHook(() => useActiveSection(SECTION_IDS));
    expect(result.current).toBe('about');

    home.getBoundingClientRect = jest.fn(() => ({ top: -2_000, bottom: -1_000 }) as DOMRect);
    about.getBoundingClientRect = jest.fn(() => ({ top: -900, bottom: -100 }) as DOMRect);
    const contact = document.getElementById('contact');
    if (contact) {
      contact.getBoundingClientRect = jest.fn(() => ({ top: 1_200, bottom: 1_800 }) as DOMRect);
    }

    act(() => {
      window.dispatchEvent(new Event('scroll'));
      queuedFrame?.(0);
    });

    expect(result.current).toBe('home');
  });

  it('ignores missing section elements without throwing', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 });
    addSection('about', { top: 100, bottom: 700 });

    const { result } = renderHook(() => useActiveSection(SECTION_IDS));

    expect(result.current).toBe('about');
  });
});
