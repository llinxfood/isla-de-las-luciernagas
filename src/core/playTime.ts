import type { Progress } from './model';

export type PlayTime = {
  dailyMinutes: number; // 0 disables the limit but preserves today's usage.
  day: string;
  usedMs: number;
  pin: { salt: string; hash: string };
};
export function localDay(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function usedToday(time: PlayTime, now: number): number {
  // Moving the clock backwards must not grant a fresh allowance.
  return localDay(now) > time.day ? 0 : time.usedMs;
}
export function remainingPlayMs(progress: Progress, now: number): number {
  const time = progress.playTime;
  return time?.dailyMinutes
    ? Math.max(0, time.dailyMinutes * 60_000 - usedToday(time, now))
    : Infinity;
}
export function recordPlayTime(progress: Progress, elapsedMs: number, now: number): Progress {
  const time = progress.playTime;
  if (!time || !time.dailyMinutes || !Number.isFinite(elapsedMs) || elapsedMs < 0) return progress;
  const day = localDay(now) > time.day ? localDay(now) : time.day;
  const usedMs = Math.min(
    86_400_000,
    usedToday(time, now) + Math.min(Math.round(elapsedMs), remainingPlayMs(progress, now)),
  );
  if (day === time.day && usedMs === time.usedMs) return progress;
  return { ...progress, playTime: { ...time, day, usedMs } };
}
export function isPlayTime(value: unknown): value is PlayTime {
  if (!value || typeof value !== 'object') return false;
  const time = value as PlayTime;
  if (
    !Number.isInteger(time.dailyMinutes) ||
    (time.dailyMinutes !== 0 && (time.dailyMinutes < 5 || time.dailyMinutes > 120))
  )
    return false;
  if (typeof time.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(time.day)) return false;
  const date = new Date(`${time.day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== time.day)
    return false;
  return (
    Number.isSafeInteger(time.usedMs) &&
    time.usedMs >= 0 &&
    time.usedMs <= 86_400_000 &&
    !!time.pin &&
    typeof time.pin.salt === 'string' &&
    typeof time.pin.hash === 'string' &&
    /^[a-f0-9]{32}$/.test(time.pin.salt) &&
    /^[a-f0-9]{64}$/.test(time.pin.hash)
  );
}
