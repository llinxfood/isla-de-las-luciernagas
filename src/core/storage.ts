import { isPlayTime } from './playTime';
import {
  freshProgress,
  MAX_NAME_LENGTH,
  TABLE_ORDER,
  SESSION_LENGTH,
  type Progress,
  type FactId,
} from './model';
// Keep this key stable across releases; schema changes need an explicit migration.
export const STORAGE_KEY = 'luciernagas.progress.v1';
export const BACKUP_KEY = `${STORAGE_KEY}.backup`;
export const BEFORE_RESTORE_KEY = `${STORAGE_KEY}.before-restore`;
export const MAX_BACKUP_BYTES = 1_048_576;
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
const table = (value: unknown): value is number => integer(value, 1, 10);
const decorations = ['flowers', 'mushrooms', 'crystals'];
export function isProgress(value: unknown): value is Progress {
  if (
    !object(value) ||
    value.version !== 1 ||
    !object(value.facts) ||
    !object(value.settings) ||
    !object(value.decorations)
  )
    return false;
  if ('playTime' in value && !isPlayTime(value.playTime)) return false;
  if (typeof value.settings.sound !== 'boolean' || typeof value.settings.motion !== 'boolean')
    return false;
  if (
    'name' in value &&
    (typeof value.name !== 'string' || !value.name.trim() || value.name.length > MAX_NAME_LENGTH)
  )
    return false;
  if (
    !integer(value.missions) ||
    !integer(value.lights) ||
    !Array.isArray(value.completed) ||
    !value.completed.every(table)
  )
    return false;
  if (new Set(value.completed).size !== value.completed.length) return false;
  // Completed refuges must form a prefix; replay never opens a shortcut.
  if (value.completed.some((t, i) => TABLE_ORDER[i] !== t)) return false;
  if (
    !Object.entries(value.decorations).every(
      ([key, decoration]) =>
        table(Number(key)) && typeof decoration === 'string' && decorations.includes(decoration),
    )
  )
    return false;
  for (const [id, stats] of Object.entries(value.facts)) {
    if (!/^([1-9]|10)x([1-9]|10)$/.test(id) || !object(stats)) return false;
    if (
      !['attempts', 'correct', 'errors', 'hints', 'averageMs', 'lastSeen', 'dueAt', 'level'].every(
        (key) => integer(stats[key]),
      )
    )
      return false;
    if (
      (stats.level as number) > 4 ||
      (stats.averageMs as number) > 120000 ||
      stats.attempts !== (stats.correct as number) + (stats.errors as number) ||
      (stats.hints as number) > (stats.attempts as number)
    )
      return false;
  }
  if (value.expedition === null) return true;
  const session = value.expedition;
  if (
    !object(session) ||
    !table(session.table) ||
    !integer(session.index, 0, SESSION_LENGTH - 1) ||
    !integer(session.lights, 0, SESSION_LENGTH) ||
    !['playing', 'break', 'reward'].includes(session.phase as string) ||
    !Array.isArray(session.questions)
  )
    return false;
  if (
    !(TABLE_ORDER.slice(0, Math.min(10, value.completed.length + 1)) as readonly number[]).includes(
      session.table,
    )
  )
    return false;
  if (session.questions.length !== session.index + 1) return false;
  for (const [index, question] of session.questions.entries()) {
    if (
      !object(question) ||
      !object(question.fact) ||
      !table(question.fact.a) ||
      !table(question.fact.b) ||
      question.fact.id !== `${question.fact.a}x${question.fact.b}`
    )
      return false;
    if (
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      new Set(question.options).size !== 4 ||
      !question.options.every((n) => integer(n, 1, 100)) ||
      !question.options.includes(question.fact.a * question.fact.b)
    )
      return false;
    if (
      !integer(question.mistakes) ||
      typeof question.hinted !== 'boolean' ||
      typeof question.resolved !== 'boolean' ||
      (index < session.index && !question.resolved)
    )
      return false;
  }
  const resolved = session.questions.filter((q) => q.resolved).length;
  if (session.lights !== resolved) return false;
  if (
    session.phase === 'break' &&
    (![7, 15].includes(session.index) || resolved !== session.questions.length)
  )
    return false;
  if (session.phase === 'reward' && resolved !== SESSION_LENGTH) return false;
  return true;
}
function parseStoredProgress(raw: string): Progress | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
export function loadProgress(storage: StoragePort): {
  progress: Progress;
  warning: string | null;
  protectedSave: boolean;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { progress: freshProgress(), warning: null, protectedSave: false };
    const progress = parseStoredProgress(raw);
    if (progress) return { progress, warning: null, protectedSave: false };
    // Never replace an unreadable or newer save, even if making a backup fails.
    return {
      progress: freshProgress(),
      protectedSave: true,
      warning:
        'Esta versión no puede abrir la partida guardada. La original sigue intacta y no se sobrescribirá. Puedes descargarla desde Ajustes → Para acompañantes.',
    };
  } catch {
    return {
      progress: freshProgress(),
      protectedSave: false,
      warning:
        'El guardado no está disponible. Puedes jugar, pero la partida podría perderse al cerrar. Descarga una copia desde Ajustes.',
    };
  }
}
export function saveProgress(storage: StoragePort, progress: Progress): boolean {
  try {
    if (!isProgress(progress)) return false;
    const previous = storage.getItem(STORAGE_KEY);
    if (previous !== null && !parseStoredProgress(previous)) return false;
    const next = JSON.stringify(progress);
    if (previous === next) return true;
    // Commit the previous state first. Quota errors leave the primary save untouched.
    if (previous !== null) storage.setItem(BACKUP_KEY, previous);
    storage.setItem(STORAGE_KEY, next);
    return true;
  } catch {
    return false;
  }
}
export function createBackup(progress: Progress, now = Date.now()): string {
  return JSON.stringify(
    {
      app: 'isla-de-las-luciernagas',
      backupVersion: 1,
      exportedAt: new Date(now).toISOString(),
      progress,
    },
    null,
    2,
  );
}
export function parseBackup(raw: string): Progress {
  if (raw.length > MAX_BACKUP_BYTES)
    throw new Error('La copia es demasiado grande. El límite es 1 MB.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('No se puede leer este archivo. Elige una copia del juego en formato JSON.');
  }
  // Accept the original v1 format as well as portable backup files.
  if (isProgress(parsed)) return parsed;
  if (
    object(parsed) &&
    parsed.app === 'isla-de-las-luciernagas' &&
    parsed.backupVersion === 1 &&
    isProgress(parsed.progress)
  )
    return parsed.progress;
  throw new Error(
    'Esta copia está dañada o pertenece a otra versión. Tu partida actual sigue intacta.',
  );
}
export function restoreProgress(storage: StoragePort, progress: Progress): boolean {
  try {
    if (!isProgress(progress)) return false;
    const previous = storage.getItem(STORAGE_KEY);
    // Only called after explicit confirmation. Keep even an unreadable original verbatim.
    if (previous !== null) storage.setItem(BEFORE_RESTORE_KEY, previous);
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
export function hardestFacts(progress: Progress): [FactId, number][] {
  return Object.entries(progress.facts)
    .filter(([, s]) => s && s.attempts > 0)
    .map(([id, s]) => [id as FactId, s!.errors / s!.attempts] as [FactId, number])
    .filter(([, rate]) => rate > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}
