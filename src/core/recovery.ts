import { TABLE_ORDER, type Progress } from './model';

/** Restore collection access without inventing learning history or replacing an expedition. */
export function recoverFirstFourFriends(progress: Progress): Progress {
  if (progress.completed.length >= 4) return progress;
  const completed = TABLE_ORDER.slice(0, 4);
  const decorations = { ...progress.decorations };
  for (const table of completed) decorations[table] ??= 'flowers';
  return { ...progress, completed, decorations };
}
