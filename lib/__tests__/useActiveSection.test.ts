import { renderHook } from '@testing-library/react';
import { useActiveSection } from '../useActiveSection';

describe('useActiveSection Hook', () => {
  let mockObserver: {
    observe: jest.Mock;
    disconnect: jest.Mock;
    unobserve: jest.Mock;
    takeRecords: jest.Mock;
  };
  let mockObserverInstance: IntersectionObserver;
  let observerCallback: IntersectionObserverCallback;

  beforeEach(() => {
    // Create a mock IntersectionObserver
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
      takeRecords: jest.fn(),
    };

    // Store the callback when IntersectionObserver is created
    global.IntersectionObserver = jest.fn((callback, options) => {
      observerCallback = callback;
      mockObserverInstance = mockObserver as any;
      return mockObserver as any;
    }) as any;

    // Reset DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('returns the first section as active by default', () => {
      const { result } = renderHook(() => useActiveSection(['home', 'about', 'contact']));
      expect(result.current).toBe('home');
    });

    it('creates IntersectionObserver with correct options', () => {
      renderHook(() => useActiveSection(['home', 'about']));
      
      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: '-40% 0px -55% 0px' }
      );
    });

    it('observes all provided section IDs', () => {
      // Create test elements
      const home = document.createElement('div');
      home.id = 'home';
      const about = document.createElement('div');
      about.id = 'about';
      document.body.appendChild(home);
      document.body.appendChild(about);

      renderHook(() => useActiveSection(['home', 'about']));

      expect(mockObserver.observe).toHaveBeenCalledTimes(2);
      expect(mockObserver.observe).toHaveBeenCalledWith(home);
      expect(mockObserver.observe).toHaveBeenCalledWith(about);
    });

    it('handles missing elements gracefully', () => {
      // Only create one element
      const home = document.createElement('div');
      home.id = 'home';
      document.body.appendChild(home);

      renderHook(() => useActiveSection(['home', 'nonexistent']));

      expect(mockObserver.observe).toHaveBeenCalledTimes(1);
      expect(mockObserver.observe).toHaveBeenCalledWith(home);
    });
  });

  describe('Section Detection', () => {
    it('updates active section when intersection occurs', () => {
      const home = document.createElement('div');
      home.id = 'home';
      const about = document.createElement('div');
      about.id = 'about';
      document.body.appendChild(home);
      document.body.appendChild(about);

      const { result } = renderHook(() => useActiveSection(['home', 'about']));

      // Initially home
      expect(result.current).toBe('home');

      // Simulate about section becoming visible
      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          target: about,
          isIntersecting: true,
          intersectionRatio: 0.5,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        },
      ];
      observerCallback(entries as IntersectionObserverEntry[], mockObserverInstance);

      expect(result.current).toBe('about');
    });

    it('ignores non-intersecting entries', () => {
      const home = document.createElement('div');
      home.id = 'home';
      const about = document.createElement('div');
      about.id = 'about';
      document.body.appendChild(home);
      document.body.appendChild(about);

      const { result } = renderHook(() => useActiveSection(['home', 'about']));

      // Simulate about section not visible
      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          target: about,
          isIntersecting: false,
          intersectionRatio: 0,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        },
      ];
      observerCallback(entries as IntersectionObserverEntry[], mockObserverInstance);

      // Should still be home
      expect(result.current).toBe('home');
    });

    it('handles multiple intersection entries', () => {
      const home = document.createElement('div');
      home.id = 'home';
      const about = document.createElement('div');
      about.id = 'about';
      const contact = document.createElement('div');
      contact.id = 'contact';
      document.body.appendChild(home);
      document.body.appendChild(about);
      document.body.appendChild(contact);

      const { result } = renderHook(() => useActiveSection(['home', 'about', 'contact']));

      // Simulate multiple sections visible
      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          target: about,
          isIntersecting: true,
          intersectionRatio: 0.5,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        },
        {
          target: contact,
          isIntersecting: true,
          intersectionRatio: 0.7,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        },
      ];
      observerCallback(entries as IntersectionObserverEntry[], mockObserverInstance);

      // Last intersecting entry should win
      expect(result.current).toBe('contact');
    });
  });

  describe('Cleanup', () => {
    it('disconnects observer on unmount', () => {
      const { unmount } = renderHook(() => useActiveSection(['home', 'about']));
      
      unmount();
      
      expect(mockObserver.disconnect).toHaveBeenCalledTimes(1);
    });

    it('recreates observer when sectionIds change', () => {
      const { rerender } = renderHook(
        ({ ids }) => useActiveSection(ids),
        { initialProps: { ids: ['home', 'about'] } }
      );

      expect(mockObserver.observe).toHaveBeenCalledTimes(2);
      expect(mockObserver.disconnect).toHaveBeenCalledTimes(0);

      // Change section IDs
      rerender({ ids: ['home', 'about', 'contact'] });

      expect(mockObserver.disconnect).toHaveBeenCalledTimes(1);
      expect(global.IntersectionObserver).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty section array', () => {
      const { result } = renderHook(() => useActiveSection([]));
      expect(result.current).toBeUndefined();
    });

    it('handles single section', () => {
      const home = document.createElement('div');
      home.id = 'home';
      document.body.appendChild(home);

      const { result } = renderHook(() => useActiveSection(['home']));
      expect(result.current).toBe('home');
      expect(mockObserver.observe).toHaveBeenCalledTimes(1);
    });

    it('handles rapid section changes', () => {
      const home = document.createElement('div');
      home.id = 'home';
      const about = document.createElement('div');
      about.id = 'about';
      const contact = document.createElement('div');
      contact.id = 'contact';
      document.body.appendChild(home);
      document.body.appendChild(about);
      document.body.appendChild(contact);

      const { result } = renderHook(() => useActiveSection(['home', 'about', 'contact']));

      // Rapid changes
      const createEntry = (target: HTMLElement, isIntersecting: boolean): Partial<IntersectionObserverEntry> => ({
        target,
        isIntersecting,
        intersectionRatio: isIntersecting ? 0.5 : 0,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      });

      observerCallback([createEntry(about, true)] as IntersectionObserverEntry[], mockObserverInstance);
      expect(result.current).toBe('about');

      observerCallback([createEntry(contact, true)] as IntersectionObserverEntry[], mockObserverInstance);
      expect(result.current).toBe('contact');

      observerCallback([createEntry(home, true)] as IntersectionObserverEntry[], mockObserverInstance);
      expect(result.current).toBe('home');
    });
  });

  describe('Root Margin Configuration', () => {
    it('uses correct viewport offset for detection', () => {
      renderHook(() => useActiveSection(['home']));
      
      const constructorCall = (global.IntersectionObserver as jest.Mock).mock.calls[0];
      expect(constructorCall[1]).toEqual({
        rootMargin: '-40% 0px -55% 0px',
      });
    });
  });
});
