import { useEffect, useRef, useState } from 'react';
import type { GameAction } from '../core/game';
import type { Expedition } from '../core/model';
import { stageIcon } from '../content';
import { useI18n } from '../i18n';
import { Firefly } from './Artwork';

function SeedPattern({ count }: { count: number }) {
  const columns = count === 9 ? 3 : count > 5 ? Math.ceil(count / 2) : count;
  const rows = Math.ceil(count / columns);
  const { t } = useI18n();
  return (
    <span className="seed-group" aria-hidden="true">
      <svg className="seed-pattern" viewBox={`0 0 100 ${rows * 20}`}>
        {Array.from({ length: count }, (_, index) => (
          <circle
            key={index}
            cx={(100 - columns * 20) / 2 + (index % columns) * 20 + 10}
            cy={Math.floor(index / columns) * 20 + 10}
            r="4.5"
          />
        ))}
      </svg>
      <span className="seed-total">
        {count} <small>{t.seeds(count)}</small>
      </span>
    </span>
  );
}

function GroupGarden({
  a,
  b,
  onHelp,
  onReady,
}: {
  a: number;
  b: number;
  onHelp: () => void;
  onReady: () => void;
}) {
  const { t } = useI18n();
  const [planted, setPlanted] = useState<number[]>([]);
  return (
    <div className="group-garden">
      <p>{t.tapPlots(b)}</p>
      <div className="plots">
        {Array.from({ length: a }, (_, i) => (
          <button
            className={`plot ${planted.includes(i) ? 'planted' : ''}`}
            key={i}
            aria-label={t.plotLabel(i + 1, planted.includes(i), b)}
            disabled={planted.includes(i)}
            onClick={() => {
              setPlanted([...planted, i]);
              onHelp();
              if (planted.length + 1 === a) onReady();
            }}
          >
            {planted.includes(i) ? <SeedPattern count={b} /> : <span className="plot-plus">+</span>}
          </button>
        ))}
      </div>
      <p className="garden-count" aria-live="polite">
        {t.groupsOf(planted.length, b)} = <strong>{planted.length * b}</strong> {t.seedsWord}
      </p>
    </div>
  );
}
export function Challenge({
  expedition,
  dispatch,
  sound,
}: {
  expedition: Expedition;
  dispatch: (action: GameAction) => void;
  sound: () => void;
}) {
  const { t, content } = useI18n();
  const question = expedition.questions[expedition.index];
  const exploration = expedition.index < 2;
  const stage = Math.floor(expedition.index / 8);
  const [gardenReady, setGardenReady] = useState(false);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const [showGarden, setShowGarden] = useState(question.hinted);
  const next = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const timer = useRef({ start: 0, elapsed: 0 });
  useEffect(() => {
    timer.current.start = performance.now();
    title.current?.focus();
    const pause = () => {
      if (document.hidden) timer.current.elapsed += performance.now() - timer.current.start;
      else timer.current.start = performance.now();
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (question.resolved) next.current?.focus();
  }, [question.resolved]);
  function answer(value: number, endMs: number, now: number) {
    if (question.resolved) return;
    const correct = value === question.fact.a * question.fact.b;
    if (correct) {
      sound();
    } else {
      setWrong(true);
      setShowGarden(true);
      setInput('');
    }
    dispatch({
      type: 'answer',
      answer: value,
      durationMs: timer.current.elapsed + endMs - timer.current.start,
      now,
    });
  }
  const { a, b } = question.fact;
  return (
    <section className="challenge" aria-label={t.challengeLabel}>
      <div className="challenge-world">
        <div className="stage-label">
          <span>{stageIcon(stage)}</span> {content.stages[stage].name}
        </div>
        <div
          className={`world-progress world-stage-${stage}`}
          aria-label={t.piecesDone((expedition.index % 8) + Number(question.resolved))}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={i < (expedition.index % 8) + Number(question.resolved) ? 'filled' : ''}
            >
              {stage === 0 ? '✿' : stage === 1 ? '▰' : '✦'}
            </span>
          ))}
        </div>
        <p>{content.stages[stage].instruction}</p>
      </div>
      <div className="question-card">
        <div className="question-top">
          <span className="eyebrow">{t.challengeOf((expedition.index % 8) + 1)}</span>
          <span className="table-badge">{t.table(a)}</span>
        </div>
        <h2 ref={title} tabIndex={-1} className="equation">
          {a} <span>×</span> {b} <span>=</span> {question.resolved ? <strong>{a * b}</strong> : '?'}
        </h2>
        <p className="equation-caption">{t.groupsOf(a, b)}</p>
        {showGarden && !question.resolved && (
          <GroupGarden
            a={a}
            b={b}
            onHelp={() => dispatch({ type: 'hint' })}
            onReady={() => setGardenReady(true)}
          />
        )}
        {!question.resolved && (
          <>
            {stage === 2 ? (
              <form
                className="number-answer"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (input) answer(Number(input), performance.now(), Date.now());
                }}
              >
                <label htmlFor="answer">{t.howManyLights}</label>
                <input
                  id="answer"
                  aria-label={t.yourAnswer}
                  inputMode="numeric"
                  autoComplete="off"
                  value={input}
                  maxLength={3}
                  onChange={(event) => setInput(event.target.value.replace(/\D/g, '').slice(0, 3))}
                />
                <button className="primary" disabled={!input} type="submit">
                  {t.lightUp}
                </button>
              </form>
            ) : (
              <div className={`answers ${stage === 1 ? 'stepping-stones' : ''}`}>
                {question.options.map((option) => (
                  <button
                    className="answer"
                    disabled={exploration && !gardenReady}
                    key={option}
                    onClick={() => answer(option, performance.now(), Date.now())}
                    aria-label={t.answerLabel(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {exploration && !gardenReady && <p className="plant-instruction">{t.plantFirst}</p>}
            <button
              className="help-button"
              disabled={exploration && !gardenReady}
              onClick={() => {
                setShowGarden(!showGarden);
                dispatch({ type: 'hint' });
              }}
            >
              {showGarden ? t.hideSeeds : t.showSeeds}
            </button>
          </>
        )}
        <div className={`feedback ${question.resolved ? 'success' : ''}`} role="status">
          {question.resolved ? (
            <>
              <span>✓</span> {t.correct}
            </>
          ) : (
            wrong && t.wrong
          )}
        </div>
        {question.resolved && (
          <button
            ref={next}
            className="primary next-button"
            onClick={() => dispatch({ type: 'next', now: Date.now() })}
          >
            {expedition.index === 23
              ? t.discoverRefuge
              : (expedition.index + 1) % 8 === 0
                ? t.legDone
                : t.keepExploring}{' '}
            <span>→</span>
          </button>
        )}
      </div>
      {!showGarden && !question.hinted && !question.resolved && stage === 0 && (
        <div className="garden-invitation">
          <Firefly />
          <p>
            {t.howItWorks}
            <br />
            <button
              onClick={() => {
                setShowGarden(true);
                dispatch({ type: 'hint' });
              }}
            >
              {t.plantGroups} →
            </button>
          </p>
        </div>
      )}
    </section>
  );
}
