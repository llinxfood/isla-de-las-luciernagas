import { emptyStats, makeFact, type Fact, type FactStats, type Progress } from './model';
const DAY = 86_400_000;
const INTERVALS = [0, 0.25 * DAY, DAY, 3 * DAY, 7 * DAY];
export function recordAttempt(
  previous: FactStats | undefined,
  correct: boolean,
  hinted: boolean,
  durationMs: number,
  now: number,
): FactStats {
  const stats = previous ?? emptyStats();
  const duration = Math.round(Math.min(120_000, Math.max(0, durationMs)));
  const independent = correct && !hinted;
  const level = independent
    ? Math.min(4, stats.level + (duration <= 20_000 && now >= stats.dueAt ? 1 : 0))
    : correct
      ? stats.level
      : Math.max(0, stats.level - 1);
  return {
    attempts: stats.attempts + 1,
    correct: stats.correct + Number(correct),
    errors: stats.errors + Number(!correct),
    hints: stats.hints + Number(hinted),
    averageMs: stats.attempts ? Math.round(stats.averageMs * 0.65 + duration * 0.35) : duration,
    lastSeen: now,
    dueAt: now + (independent ? INTERVALS[level] : 0),
    level,
  };
}
export function priority(stats: FactStats | undefined, now: number): number {
  if (!stats) return 6;
  const errorRate = stats.errors / Math.max(1, stats.attempts);
  const overdue = now >= stats.dueAt ? 5 : 0.6;
  return (
    overdue +
    (4 - stats.level) * 1.3 +
    errorRate * 6 +
    Math.min(3, stats.averageMs / 10_000) +
    2 / (stats.attempts + 1)
  );
}
export function selectFact(
  progress: Progress,
  table: number,
  history: Fact[],
  now: number,
  random = Math.random,
): Fact {
  const recent = new Set(history.slice(-3).map((fact) => fact.id));
  // A difficult operation returns after three other operations, never immediately.
  const retry = history.slice(0, -3).find((fact) => {
    const stats = progress.facts[fact.id];
    return !recent.has(fact.id) && stats?.level === 0 && stats.lastSeen > 0 && now >= stats.dueAt;
  });
  if (retry && history.length % 4 === 0) return retry;
  const review = history.length % 4 === 3 && progress.completed.length > 0;
  const tables = review ? [...new Set([...progress.completed, table])] : [table];
  const pool = tables
    .flatMap((a) => Array.from({ length: 10 }, (_, b) => makeFact(a, b + 1)))
    .filter((fact) => !recent.has(fact.id));
  const weights = pool.map((fact) => priority(progress.facts[fact.id], now));
  let draw = Math.max(0, Math.min(0.999999, random())) * weights.reduce((a, b) => a + b, 0);
  return pool.find((_, index) => (draw -= weights[index]) < 0) ?? pool[pool.length - 1];
}
export function answerOptions(fact: Fact, random = Math.random): number[] {
  const answer = fact.a * fact.b;
  const alternatives = [
    ...new Set([
      answer - fact.a,
      answer + fact.a,
      answer - fact.b,
      answer + fact.b,
      answer - 1,
      answer + 1,
      answer - 2,
      answer + 2,
      answer - 3,
      answer + 3,
    ]),
  ].filter((value) => value > 0 && value <= 100 && value !== answer);
  const options = [answer, ...alternatives.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(Math.max(0, random()) * (i + 1)));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
