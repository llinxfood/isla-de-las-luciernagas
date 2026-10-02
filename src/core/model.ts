export const TABLE_ORDER = [1, 2, 10, 5, 3, 4, 6, 7, 8, 9] as const;
export const SESSION_LENGTH = 24;
export type FactId = `${number}x${number}`;
export type Fact = { id: FactId; a: number; b: number };
export type FactStats = {
  attempts: number;
  correct: number;
  errors: number;
  hints: number;
  averageMs: number;
  lastSeen: number;
  dueAt: number;
  level: number;
};
export type Question = {
  fact: Fact;
  options: number[];
  mistakes: number;
  hinted: boolean;
  resolved: boolean;
};
export type Expedition = {
  table: number;
  questions: Question[];
  index: number;
  lights: number;
  phase: 'playing' | 'break' | 'reward';
};
export type Progress = {
  version: 1;
  facts: Partial<Record<FactId, FactStats>>;
  completed: number[];
  decorations: Record<string, 'flowers' | 'mushrooms' | 'crystals'>;
  missions: number;
  lights: number;
  settings: { sound: boolean; motion: boolean };
  expedition: Expedition | null;
};
export const makeFact = (a: number, b: number): Fact => ({ id: `${a}x${b}`, a, b });
export const emptyStats = (): FactStats => ({
  attempts: 0,
  correct: 0,
  errors: 0,
  hints: 0,
  averageMs: 0,
  lastSeen: 0,
  dueAt: 0,
  level: 0,
});
export function freshProgress(): Progress {
  return {
    version: 1,
    facts: {},
    completed: [],
    decorations: {},
    missions: 0,
    lights: 0,
    settings: { sound: false, motion: true },
    expedition: null,
  };
}
export function unlockedTables(progress: Progress): number[] {
  const result: number[] = [];
  for (const table of TABLE_ORDER) {
    result.push(table);
    if (!progress.completed.includes(table)) break;
  }
  return result;
}
export function masteredCount(progress: Progress, table: number): number {
  return Array.from(
    { length: 10 },
    (_, i) => progress.facts[makeFact(table, i + 1).id]?.level ?? 0,
  ).filter((level) => level >= 3).length;
}
