import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeoutMinutes: number;
  onIdle: () => void;
  enabled?: boolean;
}

export function useIdleTimer({
  timeoutMinutes,
  onIdle,
  enabled = true,
}: UseIdleTimerOptions): {
  resetTimer: () => void;
  getLastActiveTime: () => number;
} {
  const timeoutMs = Math.max(timeoutMinutes, 1) * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const onIdleRef = useRef(onIdle);

  // Keep latest onIdle reference
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const handleIdle = useCallback(() => {
    if (enabled) {
      onIdleRef.current();
    }
  }, [enabled]);

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        handleIdle();
      }, timeoutMs);
    }
  }, [enabled, handleIdle, timeoutMs]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    lastActiveRef.current = Date.now();
    resetTimer();

    let lastThrottled = 0;
    const handleActivity = () => {
      const now = Date.now();
      // Throttle event handling to once every 1000ms for high-frequency events like mousemove
      if (now - lastThrottled > 1000) {
        lastThrottled = now;
        resetTimer();
      }
    };

    // Check on tab focus / visibility change if backgrounded tab exceeded idle timeout
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed >= timeoutMs) {
          handleIdle();
        } else {
          resetTimer();
        }
      }
    };

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeoutMs, resetTimer, handleIdle]);

  return {
    resetTimer,
    getLastActiveTime: () => lastActiveRef.current,
  };
}
