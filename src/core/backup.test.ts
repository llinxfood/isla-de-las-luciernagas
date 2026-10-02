import { describe, expect, it } from 'vitest';
import { legacySave } from '../../tests/fixtures/progress-v1';
import { freshProgress } from './model';
import { gameReducer } from './game';
import {
  BACKUP_KEY,
  BEFORE_RESTORE_KEY,
  STORAGE_KEY,
  createBackup,
  loadProgress,
  parseBackup,
  restoreProgress,
  saveProgress,
} from './storage';
function memory(initial: string | null = null) {
  const data = new Map<string, string>();
  if (initial !== null) data.set(STORAGE_KEY, initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
describe('compatibilidad y copias de seguridad', () => {
  it('abre una partida de la primera versión y conserva todos sus datos al guardar', () => {
    const storage = memory(legacySave);
    const loaded = loadProgress(storage);
    expect(loaded.warning).toBeNull();
    expect(loaded.progress).toEqual(JSON.parse(legacySave));
    expect(saveProgress(storage, loaded.progress)).toBe(true);
    expect(loadProgress(storage).progress).toEqual(JSON.parse(legacySave));
    expect(storage.getItem(BACKUP_KEY)).toBe(legacySave);
  });
  it('exporta y restaura la expedición, el aprendizaje, las recompensas y los ajustes', () => {
    const original = parseBackup(legacySave);
    const restored = parseBackup(createBackup(original, 1790942400000));
    expect(restored).toEqual(original);
    const next = gameReducer(restored, {
      type: 'answer',
      answer: 60,
      now: 1790942400000,
      durationMs: 4500,
    });
    expect(next.expedition?.lights).toBe(1);
    expect(next.facts['1x6']).toEqual(original.facts['1x6']);
    expect(gameReducer(freshProgress(), { type: 'restore', progress: restored })).toEqual(original);
  });
  it.each(['{bad', '', JSON.stringify({ version: 2, important: 'keep me' })])(
    'nunca reemplaza una partida ilegible: %s',
    (raw) => {
      const storage = memory(raw);
      expect(loadProgress(storage).protectedSave).toBe(true);
      expect(saveProgress(storage, freshProgress())).toBe(false);
      expect(loadProgress(storage).protectedSave).toBe(true);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    },
  );
  it('preserva la última partida válida y no rota la copia en una recarga sin cambios', () => {
    const storage = memory();
    const first = parseBackup(legacySave);
    expect(saveProgress(storage, first)).toBe(true);
    const second = gameReducer(first, { type: 'settings', sound: false });
    expect(saveProgress(storage, second)).toBe(true);
    const previous = storage.getItem(BACKUP_KEY);
    expect(parseBackup(previous!)).toEqual(first);
    expect(saveProgress(storage, second)).toBe(true);
    expect(storage.getItem(BACKUP_KEY)).toBe(previous);
  });
  it('guarda la original antes de una restauración, también si es de otra versión', () => {
    const raw = '{"version":2,"data":"future"}';
    const storage = memory(raw);
    const imported = parseBackup(legacySave);
    expect(restoreProgress(storage, imported)).toBe(true);
    expect(storage.getItem(BEFORE_RESTORE_KEY)).toBe(raw);
    expect(loadProgress(storage).progress).toEqual(imported);
  });
  it('rechaza copias dañadas, ajenas y demasiado grandes', () => {
    for (const raw of [
      'invalid',
      '{}',
      JSON.stringify({ app: 'another-game', backupVersion: 1, progress: freshProgress() }),
      ' '.repeat(1_048_577),
    ]) {
      expect(() => parseBackup(raw)).toThrow();
    }
  });
  it('no cambia la principal cuando falla la copia previa por falta de espacio', () => {
    const storage = memory(legacySave);
    const full = {
      getItem: storage.getItem,
      setItem: () => {
        throw Error('quota');
      },
    };
    expect(restoreProgress(full, freshProgress())).toBe(false);
    expect(saveProgress(full, freshProgress())).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe(legacySave);
  });
});
