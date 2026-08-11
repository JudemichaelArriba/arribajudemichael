import '@testing-library/jest-dom';

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(): void {}
}

class ResizeObserverMock implements ResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

if (typeof window !== 'undefined') {
  global.IntersectionObserver = IntersectionObserverMock;
  global.ResizeObserver = ResizeObserverMock;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      addListener: jest.fn(),
      dispatchEvent: jest.fn(),
      removeEventListener: jest.fn(),
      removeListener: jest.fn(),
    })),
  });

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: jest.fn(),
  });
}
