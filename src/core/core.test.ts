import { describe, expect, it } from 'vitest';
import { answerOptions, priority, recordAttempt, selectFact } from './learning';
import { gameReducer } from './game';
import {
  emptyStats,
  freshProgress,
  makeFact,
  masteredCount,
  TABLE_ORDER,
  unlockedTables,
  type Progress,
} from './model';
import { isProgress, loadProgress, saveProgress, STORAGE_KEY } from './storage';
const now = 1_800_000_000_000;
const start = (progress = freshProgress(), table = 1) =>
  gameReducer(progress, { type: 'start', table, now, random: () => 0.5 });
function finish(progress: Progress) {
  let current = progress;
  for (let i = 0; i < 24; i++) {
    const fact = current.expedition!.questions[i].fact;
    current = gameReducer(current, {
      type: 'answer',
      answer: fact.a * fact.b,
      durationMs: 3000,
      now: now + i * 1000,
    });
    current = gameReducer(current, { type: 'next', now: now + i * 1000, random: () => 0.3 });
    if (current.expedition!.phase === 'break')
      current = gameReducer(current, { type: 'continue', now, random: () => 0.7 });
  }
  return current;
}
describe('preguntas y selección adaptativa', () => {
  it('genera cuatro respuestas válidas y distintas para las cien operaciones', () => {
    for (let a = 1; a <= 10; a++)
      for (let b = 1; b <= 10; b++) {
        for (const random of [() => 0, () => 0.5, () => 0.999]) {
          const options = answerOptions(makeFact(a, b), random);
          expect(options).toHaveLength(4);
          expect(new Set(options).size).toBe(4);
          expect(options).toContain(a * b);
          expect(options.every((n) => n > 0 && n <= 100)).toBe(true);
        }
      }
  });
  it('prioriza dificultad, tiempo, falta de práctica y vencimiento', () => {
    const fluent = {
      ...emptyStats(),
      attempts: 10,
      correct: 10,
      level: 4,
      dueAt: now + 1000,
      averageMs: 3000,
    };
    expect(priority(undefined, now)).toBeGreaterThan(priority(fluent, now));
    expect(priority({ ...fluent, dueAt: now - 1 }, now)).toBeGreaterThan(priority(fluent, now));
    expect(priority({ ...fluent, errors: 5, correct: 5 }, now)).toBeGreaterThan(
      priority(fluent, now),
    );
    expect(priority({ ...fluent, averageMs: 25000 }, now)).toBeGreaterThan(priority(fluent, now));
    expect(priority({ ...fluent, attempts: 1 }, now)).toBeGreaterThan(priority(fluent, now));
  });
  it('no repite las tres últimas ni introduce tablas bloqueadas', () => {
    const history = [makeFact(1, 1), makeFact(1, 2), makeFact(1, 3)];
    for (let seed = 0; seed < 100; seed++) {
      const fact = selectFact(freshProgress(), 1, history, now, () => seed / 100);
      expect(fact.a).toBe(1);
      expect(history.map((f) => f.id)).not.toContain(fact.id);
    }
  });
  it('intercala repasos de tablas anteriores y recupera errores con separación', () => {
    const progress = freshProgress();
    progress.completed = [1];
    expect(
      selectFact(progress, 2, [makeFact(2, 1), makeFact(2, 2), makeFact(2, 3)], now, () => 0).a,
    ).toBe(1);
    progress.facts['1x7'] = recordAttempt(undefined, false, true, 9000, now - 5000);
    expect(
      selectFact(progress, 2, [makeFact(1, 7), makeFact(2, 1), makeFact(2, 2), makeFact(2, 3)], now)
        .id,
    ).toBe('1x7');
  });
  it('incrementa dominio solo en respuestas independientes y separadas', () => {
    const first = recordAttempt(undefined, true, false, 3000, now);
    expect(first.level).toBe(1);
    const repeated = recordAttempt(first, true, false, 3000, now + 1000);
    expect(repeated.level).toBe(1);
    const spaced = recordAttempt(repeated, true, false, 3000, repeated.dueAt + 1);
    expect(spaced.level).toBe(2);
    expect(recordAttempt(spaced, true, true, 3000, now).level).toBe(2);
    expect(recordAttempt(spaced, false, false, 3000, now).errors).toBe(1);
    expect(recordAttempt(undefined, true, false, 80000, now).level).toBe(0);
    expect(recordAttempt(undefined, true, false, Infinity, now).averageMs).toBe(120000);
    expect(recordAttempt(undefined, true, false, 3250.765, now).averageMs).toBe(3251);
  });
});
describe('estado, puntuación y progresión', () => {
  it('bloquea saltos, dobles respuestas y recompensas duplicadas', () => {
    const initial = freshProgress();
    expect(gameReducer(initial, { type: 'start', table: 9, now })).toBe(initial);
    let progress = start();
    expect(gameReducer(progress, { type: 'next', now })).toBe(progress);
    expect(gameReducer(progress, { type: 'claim', decoration: 'flowers' })).toBe(progress);
    const fact = progress.expedition!.questions[0].fact;
    progress = gameReducer(progress, {
      type: 'answer',
      answer: fact.a * fact.b,
      durationMs: 3000,
      now,
    });
    expect(
      gameReducer(progress, { type: 'answer', answer: fact.a * fact.b, durationMs: 3000, now }),
    ).toBe(progress);
    expect(progress.expedition!.lights).toBe(1);
  });
  it('mantiene el reto ante un error y recompensa el intento acompañado', () => {
    let progress = start();
    const fact = progress.expedition!.questions[0].fact;
    progress = gameReducer(progress, { type: 'answer', answer: 0, durationMs: 3000, now });
    expect(progress.expedition!.index).toBe(0);
    expect(progress.expedition!.questions[0].hinted).toBe(true);
    progress = gameReducer(progress, {
      type: 'answer',
      answer: fact.a * fact.b,
      durationMs: 10000,
      now,
    });
    expect(progress.expedition!.lights).toBe(1);
    expect(progress.facts[fact.id]?.errors).toBe(1);
    expect(progress.facts[fact.id]?.attempts).toBe(1);
  });
  it('completa las diez tablas, persiste cada transición y permite volver a jugar', () => {
    let progress = freshProgress();
    for (let i = 0; i < 10; i++) {
      expect(unlockedTables(progress)).toEqual(TABLE_ORDER.slice(0, i + 1));
      progress = start(progress, TABLE_ORDER[i]);
      expect(isProgress(progress)).toBe(true);
      progress = finish(progress);
      expect(progress.expedition!.phase).toBe('reward');
      expect(isProgress(progress)).toBe(true);
      progress = gameReducer(progress, { type: 'claim', decoration: 'crystals' });
      expect(progress.lights).toBe((i + 1) * 24);
      expect(progress.missions).toBe(i + 1);
      expect(isProgress(progress)).toBe(true);
      expect(gameReducer(progress, { type: 'claim', decoration: 'flowers' })).toBe(progress);
    }
    progress = gameReducer(finish(start(progress, 1)), { type: 'claim', decoration: 'flowers' });
    expect(progress.completed).toHaveLength(10);
    expect(progress.decorations[1]).toBe('flowers');
    expect(progress.missions).toBe(11);
  });
  it('no confunde desbloquear un refugio con dominar sus operaciones', () => {
    const progress = gameReducer(finish(start()), { type: 'claim', decoration: 'flowers' });
    expect(progress.completed).toEqual([1]);
    expect(masteredCount(progress, 1)).toBe(0);
  });
  it('requiere reanudar explícitamente después de los ocho retos', () => {
    let progress = start();
    for (let i = 0; i < 8; i++) {
      const f = progress.expedition!.questions[i].fact;
      progress = gameReducer(progress, {
        type: 'answer',
        answer: f.a * f.b,
        durationMs: 4000,
        now,
      });
      progress = gameReducer(progress, { type: 'next', now });
    }
    expect(progress.expedition!.phase).toBe('break');
    expect(isProgress(progress)).toBe(true);
    expect(gameReducer(progress, { type: 'next', now })).toBe(progress);
    progress = gameReducer(progress, { type: 'continue', now });
    expect(progress.expedition!.index).toBe(8);
  });
});
describe('persistencia', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
  };
  it('restaura la partida y los ajustes, incluido un error sin resolver', () => {
    const storage = memory();
    let progress = start();
    progress = gameReducer(progress, { type: 'settings', sound: true, motion: false });
    progress = gameReducer(progress, { type: 'answer', answer: 0, durationMs: 1000, now });
    expect(saveProgress(storage, progress)).toBe(true);
    expect(loadProgress(storage).progress).toEqual(progress);
  });
  it('resiste datos corruptos, versiones desconocidas e invariantes inválidas', () => {
    const storage = memory();
    for (const raw of [
      'null',
      '{}',
      '{"version":99}',
      JSON.stringify({ ...freshProgress(), completed: [9] }),
      JSON.stringify({ ...freshProgress(), facts: { '1x1': { ...emptyStats(), attempts: 3 } } }),
    ]) {
      storage.setItem(STORAGE_KEY, raw);
      expect(loadProgress(storage).warning).toBeTruthy();
      expect(loadProgress(storage).progress.version).toBe(1);
    }
    storage.setItem(STORAGE_KEY, '{bad json');
    expect(loadProgress(storage).warning).toBeTruthy();
    const invalid = start();
    invalid.expedition!.questions[0].options = [1, 1, 1, 1];
    expect(isProgress(invalid)).toBe(false);
  });
  it('no interrumpe el juego si el almacenamiento está bloqueado o lleno', () => {
    const storage = {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('quota');
      },
    };
    expect(loadProgress(storage).progress).toEqual(freshProgress());
    expect(saveProgress(storage, start())).toBe(false);
  });
});
