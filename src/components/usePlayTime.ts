import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction } from '../core/game';
import type { Progress } from '../core/model';
import { remainingPlayMs } from '../core/playTime';

/** Monotonic time; hidden tabs, settings and the expedition's rest screen are paused. */
export function usePlayTime(
  progress: Progress,
  dispatch: (action: GameAction) => void,
  active: boolean,
) {
  const clock = useRef<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const enabled = !!progress.playTime?.dailyMinutes;
  const flush = useCallback(() => {
    const next = performance.now();
    if (clock.current !== null) {
      dispatch({
        type: 'play-time',
        elapsedMs: Math.max(0, next - clock.current),
        now: Date.now(),
      });
      clock.current = next;
    }
    setNow(Date.now());
  }, [dispatch]);
  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      clock.current = active && !document.hidden ? performance.now() : null;
    };
    resume();
    const visibility = () => {
      flush();
      resume();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', flush);
    const timer = setInterval(() => {
      flush();
      // Rollover also runs while the rest screen is displayed.
      dispatch({ type: 'play-time', elapsedMs: 0, now: Date.now() });
    }, 1000);
    return () => {
      flush();
      clock.current = null;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [active, enabled, dispatch, flush]);
  const remainingMs = remainingPlayMs(progress, now);
  return { remainingMs, blocked: remainingMs === 0, flush };
}
