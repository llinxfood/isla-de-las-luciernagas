import { useEffect, useRef, useState } from 'react';
import type { GameAction } from '../core/game';
import type { Expedition } from '../core/model';
import { STAGES } from '../content';
import { Firefly } from './Artwork';
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
  const [planted, setPlanted] = useState<number[]>([]);
  return (
    <div className="group-garden">
      <p>
        Toca cada parcela: planta {b} {b === 1 ? 'semilla' : 'semillas'}.
      </p>
      <div className="plots">
        {Array.from({ length: a }, (_, i) => (
          <button
            className={`plot ${planted.includes(i) ? 'planted' : ''}`}
            key={i}
            aria-label={`Parcela ${i + 1}, ${planted.includes(i) ? `${b} semillas` : 'plantar'}`}
            disabled={planted.includes(i)}
            onClick={() => {
              setPlanted([...planted, i]);
              onHelp();
              if (planted.length + 1 === a) onReady();
            }}
          >
            {planted.includes(i) ? (
              Array.from({ length: b }, (_, j) => <span key={j}>●</span>)
            ) : (
              <span className="plot-plus">+</span>
            )}
          </button>
        ))}
      </div>
      <p className="garden-count" aria-live="polite">
        {planted.length} {planted.length === 1 ? 'grupo' : 'grupos'} de {b} ={' '}
        <strong>{planted.length * b}</strong> semillas
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
  const question = expedition.questions[expedition.index];
  const exploration = expedition.index < 2;
  const stage = Math.floor(expedition.index / 8);
  const [gardenReady, setGardenReady] = useState(false);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
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
      setFeedback('¡Lo has conseguido! Una luz más para tu refugio.');
    } else {
      setFeedback('Todavía no. Vamos a verlo con semillas. Puedes probar otra vez.');
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
    <section className="challenge" aria-label="Reto de la expedición">
      <div className="challenge-world">
        <div className="stage-label">
          <span>{STAGES[stage].icon}</span> {STAGES[stage].name}
        </div>
        <div
          className={`world-progress world-stage-${stage}`}
          aria-label={`${(expedition.index % 8) + Number(question.resolved)} de 8 piezas completadas`}
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
        <p>{STAGES[stage].instruction}</p>
      </div>
      <div className="question-card">
        <div className="question-top">
          <span className="eyebrow">RETO {(expedition.index % 8) + 1} DE 8</span>
          <span className="table-badge">Tabla del {a}</span>
        </div>
        <h2 ref={title} tabIndex={-1} className="equation">
          {a} <span>×</span> {b} <span>=</span> {question.resolved ? <strong>{a * b}</strong> : '?'}
        </h2>
        <p className="equation-caption">
          {a} {a === 1 ? 'grupo' : 'grupos'} de {b}
        </p>
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
                <label htmlFor="answer">¿Cuántas luces en total?</label>
                <input
                  id="answer"
                  aria-label="Tu respuesta"
                  inputMode="numeric"
                  autoComplete="off"
                  value={input}
                  maxLength={3}
                  onChange={(event) => setInput(event.target.value.replace(/\D/g, '').slice(0, 3))}
                />
                <button className="primary" disabled={!input} type="submit">
                  Encender ✦
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
                    aria-label={`Responder ${option}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {exploration && !gardenReady && (
              <p className="plant-instruction">
                Primero planta todas las parcelas. Después, elige el total.
              </p>
            )}
            <button
              className="help-button"
              disabled={exploration && !gardenReady}
              onClick={() => {
                setShowGarden(!showGarden);
                dispatch({ type: 'hint' });
              }}
            >
              {showGarden ? 'Ocultar semillas' : '✿ Lo vemos con semillas'}
            </button>
          </>
        )}
        <div className={`feedback ${question.resolved ? 'success' : ''}`} role="status">
          {question.resolved ? (
            <>
              <span>✓</span> {feedback || '¡Lo has conseguido! Una luz más para tu refugio.'}
            </>
          ) : (
            feedback
          )}
        </div>
        {question.resolved && (
          <button
            ref={next}
            className="primary next-button"
            onClick={() => dispatch({ type: 'next', now: Date.now() })}
          >
            {expedition.index === 23
              ? 'Descubrir mi refugio'
              : (expedition.index + 1) % 8 === 0
                ? '¡Tramo completado!'
                : 'Seguir explorando'}{' '}
            <span>→</span>
          </button>
        )}
      </div>
      {!showGarden && !question.hinted && !question.resolved && stage === 0 && (
        <div className="garden-invitation">
          <Firefly />
          <p>
            ¿Quieres descubrir cómo funciona?
            <br />
            <button
              onClick={() => {
                setShowGarden(true);
                dispatch({ type: 'hint' });
              }}
            >
              Planta grupos de semillas →
            </button>
          </p>
        </div>
      )}
    </section>
  );
}
