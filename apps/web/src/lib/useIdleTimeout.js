import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

/**
 * Fires onWarning when the user has been idle for (timeoutMs - warningMs),
 * then fires onTimeout when the full timeoutMs has elapsed.
 * Any user activity resets both timers and calls onActivity.
 *
 * @param {object} opts
 * @param {boolean}  opts.enabled    - Only active when true (i.e. user is authenticated)
 * @param {number}   opts.timeoutMs  - Full idle timeout in ms (e.g. 3 * 60 * 1000)
 * @param {number}   opts.warningMs  - How many ms before timeout to fire onWarning (e.g. 30 * 1000)
 * @param {function} opts.onWarning  - Called when warning threshold is reached
 * @param {function} opts.onActivity - Called when activity resets the timer
 * @param {function} opts.onTimeout  - Called when the full timeout elapses
 */
export function useIdleTimeout({ enabled, timeoutMs, warningMs, onWarning, onActivity, onTimeout }) {
  const warningTimer = useRef(null);
  const idleTimer = useRef(null);
  const onWarningRef = useRef(onWarning);
  const onActivityRef = useRef(onActivity);
  const onTimeoutRef = useRef(onTimeout);

  // Keep refs current so timers always call the latest callbacks
  onWarningRef.current = onWarning;
  onActivityRef.current = onActivity;
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) return;

    function clearTimers() {
      if (warningTimer.current !== null) {
        clearTimeout(warningTimer.current);
        warningTimer.current = null;
      }
      if (idleTimer.current !== null) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    }

    function startTimers() {
      warningTimer.current = setTimeout(() => {
        onWarningRef.current?.();
      }, timeoutMs - warningMs);

      idleTimer.current = setTimeout(() => {
        onTimeoutRef.current?.();
      }, timeoutMs);
    }

    function handleActivity() {
      clearTimers();
      onActivityRef.current?.();
      startTimers();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    startTimers();

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, timeoutMs, warningMs]);
}
