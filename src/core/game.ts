import { answerOptions, recordAttempt, selectFact } from './learning';
import { SESSION_LENGTH, unlockedTables, type Progress, type Question } from './model';
export type GameAction =
  | { type: 'start'; table: number; now: number; random?: () => number }
  | { type: 'hint' }
  | { type: 'answer'; answer: number; durationMs: number; now: number }
  | { type: 'next'; now: number; random?: () => number }
  | { type: 'continue'; now: number; random?: () => number }
  | { type: 'claim'; decoration: 'flowers' | 'mushrooms' | 'crystals' }
  | { type: 'settings'; sound?: boolean; motion?: boolean };
function question(progress: Progress, table: number, now: number, random = Math.random): Question {
  const history = progress.expedition?.questions.map((q) => q.fact) ?? [];
  const fact = selectFact(progress, table, history, now, random);
  return {
    fact,
    options: answerOptions(fact, random),
    mistakes: 0,
    hinted: history.length < 2,
    resolved: false,
  };
}
export function gameReducer(progress: Progress, action: GameAction): Progress {
  const expedition = progress.expedition;
  if (action.type === 'settings')
    return {
      ...progress,
      settings: {
        ...progress.settings,
        ...(action.sound === undefined ? {} : { sound: action.sound }),
        ...(action.motion === undefined ? {} : { motion: action.motion }),
      },
    };
  if (action.type === 'start') {
    if (expedition || !unlockedTables(progress).includes(action.table)) return progress;
    return {
      ...progress,
      expedition: {
        table: action.table,
        questions: [question(progress, action.table, action.now, action.random)],
        index: 0,
        lights: 0,
        phase: 'playing',
      },
    };
  }
  if (!expedition) return progress;
  const current = expedition.questions[expedition.index];
  if (action.type === 'claim') {
    if (expedition.phase !== 'reward') return progress;
    return {
      ...progress,
      completed: [...new Set([...progress.completed, expedition.table])],
      missions: progress.missions + 1,
      lights: progress.lights + expedition.lights,
      decorations: { ...progress.decorations, [expedition.table]: action.decoration },
      expedition: null,
    };
  }
  if (action.type === 'hint' || action.type === 'answer') {
    if (expedition.phase !== 'playing' || current.resolved) return progress;
    const updated = { ...current };
    let facts = progress.facts;
    let lights = expedition.lights;
    if (action.type === 'hint') updated.hinted = true;
    else if (action.answer !== current.fact.a * current.fact.b) {
      updated.mistakes += 1;
      updated.hinted = true;
    } else {
      updated.resolved = true;
      lights += 1; // Every completed challenge contributes, including supported answers.
      facts = {
        ...facts,
        [current.fact.id]: recordAttempt(
          facts[current.fact.id],
          current.mistakes === 0,
          current.hinted,
          action.durationMs,
          action.now,
        ),
      };
    }
    return {
      ...progress,
      facts,
      expedition: {
        ...expedition,
        lights,
        questions: expedition.questions.map((q, i) => (i === expedition.index ? updated : q)),
      },
    };
  }
  if (action.type === 'next' || action.type === 'continue') {
    if (action.type === 'continue' && expedition.phase !== 'break') return progress;
    if (action.type === 'next' && (expedition.phase !== 'playing' || !current.resolved))
      return progress;
    if (expedition.index + 1 === SESSION_LENGTH)
      return { ...progress, expedition: { ...expedition, phase: 'reward' } };
    if (action.type === 'next' && (expedition.index + 1) % 8 === 0)
      return { ...progress, expedition: { ...expedition, phase: 'break' } };
    return {
      ...progress,
      expedition: {
        ...expedition,
        phase: 'playing',
        index: expedition.index + 1,
        questions: [
          ...expedition.questions,
          question(progress, expedition.table, action.now, action.random),
        ],
      },
    };
  }
  return progress;
}
