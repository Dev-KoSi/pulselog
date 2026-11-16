import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Course, LiveCode } from '../types';

export interface LiveCodeState {
  /** URL to put in the QR right now (falls back to the plain check-in link until loaded). */
  url: string;
  code: string | null;
  secondsLeft: number;
  windowSeconds: number;
}

/**
 * The rotating check-in code for a course, refreshed just after each window ends.
 * Countdown uses the server clock offset so a laptop with a wrong clock still ticks correctly.
 */
export function useLiveCode(course: Course | null): LiveCodeState | null {
  const enabled = Boolean(course && course.liveCode && course.status === 'active');
  const courseId = course?.id;
  const [live, setLive] = useState<LiveCode | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0); // serverTime - clientTime

  useEffect(() => {
    setLive(null);
    if (!enabled || !courseId) return;
    let cancelled = false;
    let timer: number | undefined;

    async function refresh() {
      try {
        const next = await api.getLiveCode(courseId!);
        if (cancelled) return;
        offset.current = Date.parse(next.serverTime) - Date.now();
        setLive(next);
        const msLeft = next.expiresAt ? Date.parse(next.expiresAt) - (Date.now() + offset.current) : 30_000;
        timer = window.setTimeout(refresh, Math.max(msLeft, 0) + 250);
      } catch {
        if (!cancelled) timer = window.setTimeout(refresh, 3_000); // server blip: keep trying
      }
    }
    void refresh();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, courseId]);

  useEffect(() => {
    if (!enabled) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [enabled]);

  if (!enabled || !course) return null;
  if (!live?.code || !live.expiresAt || !live.windowSeconds) {
    return { url: course.checkInUrl, code: null, secondsLeft: 0, windowSeconds: 30 };
  }
  const secondsLeft = Math.max(0, Math.ceil((Date.parse(live.expiresAt) - (now + offset.current)) / 1000));
  return { url: live.checkInUrl, code: live.code, secondsLeft, windowSeconds: live.windowSeconds };
}
