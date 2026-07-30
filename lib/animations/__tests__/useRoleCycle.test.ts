import { renderHook, act } from '@testing-library/react';
import { useRoleCycle } from '../useRoleCycle';
import gsap from 'gsap';

// Mock timers
jest.useFakeTimers();

describe('useRoleCycle Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Initialization', () => {
    it('returns initial role and textRef', () => {
      const roles = ['Developer', 'Designer', 'Engineer'];
      const { result } = renderHook(() => useRoleCycle(roles));

      expect(result.current.current).toBe('Developer');
      expect(result.current.textRef).toBeDefined();
      expect(result.current.textRef.current).toBeNull();
    });

    it('handles single role', () => {
      const { result } = renderHook(() => useRoleCycle(['Developer']));
      expect(result.current.current).toBe('Developer');
    });

    it('handles empty roles array', () => {
      const { result } = renderHook(() => useRoleCycle([]));
      expect(result.current.current).toBeUndefined();
    });
  });

  describe('Role Cycling', () => {
    it('cycles through roles at specified interval', () => {
      const roles = ['Developer', 'Designer', 'Engineer'];
      const { result } = renderHook(() => useRoleCycle(roles, 1000));

      expect(result.current.current).toBe('Developer');

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.current).toBe('Designer');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.current).toBe('Engineer');
    });

    it('loops back to first role after last', () => {
      const roles = ['Developer', 'Designer'];
      const { result } = renderHook(() => useRoleCycle(roles, 1000));

      expect(result.current.current).toBe('Developer');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.current).toBe('Designer');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.current).toBe('Developer');
    });

    it('uses default interval of 2800ms', () => {
      const roles = ['Developer', 'Designer'];
      const { result } = renderHook(() => useRoleCycle(roles));

      expect(result.current.current).toBe('Developer');

      act(() => {
        jest.advanceTimersByTime(2800);
      });

      expect(result.current.current).toBe('Designer');
    });

    it('respects custom interval', () => {
      const roles = ['Developer', 'Designer'];
      const { result } = renderHook(() => useRoleCycle(roles, 500));

      expect(result.current.current).toBe('Developer');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.current).toBe('Designer');
    });
  });

  describe('GSAP Animations', () => {
    it('calls gsap.to for exit animation', () => {
      const roles = ['Developer', 'Designer'];
      const mockRef = { current: document.createElement('span') };
      
      const { result } = renderHook(() => useRoleCycle(roles, 1000));
      
      // Assign the ref
      result.current.textRef.current = mockRef.current;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(gsap.to).toHaveBeenCalledWith(
        mockRef.current,
        expect.objectContaining({
          yPercent: -100,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: expect.any(Function),
        })
      );
    });

    it('calls gsap.fromTo for entry animation', () => {
      const roles = ['Developer', 'Designer'];
      const mockRef = { current: document.createElement('span') };
      
      const { result } = renderHook(() => useRoleCycle(roles, 1000));
      result.current.textRef.current = mockRef.current;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Trigger onComplete callback
      const toCall = (gsap.to as jest.Mock).mock.calls[0];
      const onComplete = toCall[1].onComplete;
      
      act(() => {
        onComplete();
      });

      expect(gsap.fromTo).toHaveBeenCalledWith(
        mockRef.current,
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        }
      );
    });

    it('does not animate if textRef.current is null', () => {
      const roles = ['Developer', 'Designer'];
      const { result } = renderHook(() => useRoleCycle(roles, 1000));

      // textRef.current is null
      expect(result.current.textRef.current).toBeNull();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // GSAP should not be called when ref is null
      expect(gsap.to).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('clears interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const roles = ['Developer', 'Designer'];
      
      const { unmount } = renderHook(() => useRoleCycle(roles, 1000));
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('recreates interval when roles change', () => {
      const { rerender } = renderHook(
        ({ roles, interval }) => useRoleCycle(roles, interval),
        {
          initialProps: {
            roles: ['Developer', 'Designer'],
            interval: 1000,
          },
        }
      );

      const setIntervalCallsBefore = (global.setInterval as jest.Mock).mock.calls.length;

      rerender({
        roles: ['Developer', 'Designer', 'Engineer'],
        interval: 1000,
      });

      const setIntervalCallsAfter = (global.setInterval as jest.Mock).mock.calls.length;
      expect(setIntervalCallsAfter).toBeGreaterThan(setIntervalCallsBefore);
    });

    it('recreates interval when interval changes', () => {
      const { result, rerender } = renderHook(
        ({ roles, interval }) => useRoleCycle(roles, interval),
        {
          initialProps: {
            roles: ['Developer', 'Designer'],
            interval: 1000,
          },
        }
      );

      expect(result.current.current).toBe('Developer');

      rerender({
        roles: ['Developer', 'Designer'],
        interval: 500,
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.current).toBe('Designer');
    });
  });

  describe('Edge Cases', () => {
    it('handles very fast intervals', () => {
      const roles = ['A', 'B', 'C'];
      const { result } = renderHook(() => useRoleCycle(roles, 10));

      expect(result.current.current).toBe('A');

      act(() => {
        jest.advanceTimersByTime(10);
      });
      expect(result.current.current).toBe('B');

      act(() => {
        jest.advanceTimersByTime(10);
      });
      expect(result.current.current).toBe('C');
    });

    it('handles very long intervals', () => {
      const roles = ['Developer', 'Designer'];
      const { result } = renderHook(() => useRoleCycle(roles, 10000));

      expect(result.current.current).toBe('Developer');

      act(() => {
        jest.advanceTimersByTime(9999);
      });
      expect(result.current.current).toBe('Developer');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.current).toBe('Designer');
    });

    it('handles many roles', () => {
      const roles = Array.from({ length: 10 }, (_, i) => `Role ${i + 1}`);
      const { result } = renderHook(() => useRoleCycle(roles, 100));

      for (let i = 0; i < 10; i++) {
        expect(result.current.current).toBe(`Role ${i + 1}`);
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      // Should loop back
      expect(result.current.current).toBe('Role 1');
    });

    it('handles special characters in roles', () => {
      const roles = ['<Developer>', 'Designer & Engineer', 'Full-Stack 🚀'];
      const { result } = renderHook(() => useRoleCycle(roles, 1000));

      expect(result.current.current).toBe('<Developer>');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.current).toBe('Designer & Engineer');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.current).toBe('Full-Stack 🚀');
    });
  });

  describe('Animation Timing', () => {
    it('uses correct animation durations', () => {
      const roles = ['Developer', 'Designer'];
      const mockRef = { current: document.createElement('span') };
      
      const { result } = renderHook(() => useRoleCycle(roles, 1000));
      result.current.textRef.current = mockRef.current;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const toCall = (gsap.to as jest.Mock).mock.calls[0];
      expect(toCall[1].duration).toBe(0.4);

      const onComplete = toCall[1].onComplete;
      act(() => {
        onComplete();
      });

      const fromToCall = (gsap.fromTo as jest.Mock).mock.calls[0];
      expect(fromToCall[2].duration).toBe(0.4);
    });

    it('uses correct easing functions', () => {
      const roles = ['Developer', 'Designer'];
      const mockRef = { current: document.createElement('span') };
      
      const { result } = renderHook(() => useRoleCycle(roles, 1000));
      result.current.textRef.current = mockRef.current;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const toCall = (gsap.to as jest.Mock).mock.calls[0];
      expect(toCall[1].ease).toBe('power2.in');

      const onComplete = toCall[1].onComplete;
      act(() => {
        onComplete();
      });

      const fromToCall = (gsap.fromTo as jest.Mock).mock.calls[0];
      expect(fromToCall[2].ease).toBe('power2.out');
    });
  });
});
