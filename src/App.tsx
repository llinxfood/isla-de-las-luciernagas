import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { gameReducer } from './core/game';
import {
  freshProgress,
  masteredCount,
  TABLE_ORDER,
  unlockedTables,
  type Progress,
} from './core/model';
import { hardestFacts, loadProgress, saveProgress } from './core/storage';
import { Creature, Firefly, IslandArt } from './components/Artwork';
import { BackupPanel } from './components/BackupPanel';
import { Challenge } from './components/Challenge';
import { DECORATIONS, REFUGES, STAGES } from './content';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
function initialState(storage: StoragePort) {
  try {
    return loadProgress(storage);
  } catch {
    return {
      progress: freshProgress(),
      protectedSave: false,
      warning:
        'No se puede guardar en este navegador. Puedes jugar mientras esta pestaña siga abierta.',
    };
  }
}
export default function App({
  storage = window.localStorage,
  onSaved,
  accountControls,
  cloudAccount = false,
}: {
  storage?: StoragePort;
  onSaved?: () => void;
  accountControls?: ReactNode;
  cloudAccount?: boolean;
}) {
  const [initial] = useState(() => initialState(storage));
  const [progress, dispatch] = useReducer(gameReducer, initial.progress);
  const [screen, setScreen] = useState<'island' | 'collection' | 'game'>('island');
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState(
    () => initial.progress.expedition?.table ?? unlockedTables(initial.progress).at(-1)!,
  );
  const [decoration, setDecoration] = useState<keyof typeof DECORATIONS>('flowers');
  const [warning, setWarning] = useState(initial.warning);
  const [protectedSave, setProtectedSave] = useState(initial.protectedSave);
  const [visited, setVisited] = useState<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let saved = false;
    try {
      saved = saveProgress(storage, progress);
    } catch {
      /* Storage may be disabled. */
    }
    if (saved) onSaved?.();
    // A synchronous storage failure must be visible even when the browser offers no storage events.
    if (!saved)
      setWarning(
        (current) =>
          current ??
          'Puedes seguir jugando, pero no podemos guardar. Descarga una copia desde Ajustes → Para acompañantes antes de cerrar.',
      );
  }, [progress, storage, onSaved]);
  useEffect(() => {
    document.documentElement.dataset.motion = progress.settings.motion ? 'on' : 'off';
  }, [progress.settings.motion]);
  useEffect(() => {
    if (settings) settingsDialog.current?.showModal();
    else if (settingsDialog.current?.open) {
      settingsDialog.current.close();
      settingsButton.current?.focus();
    }
  }, [settings]);
  function chime() {
    if (!progress.settings.sound) return;
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current;
      void ctx.resume().catch(() => undefined);
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.09);
        gain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + i * 0.09 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.35);
        oscillator.start(ctx.currentTime + i * 0.09);
        oscillator.stop(ctx.currentTime + i * 0.09 + 0.4);
      });
    } catch {
      /* Sound is optional; unsupported audio never interrupts play. */
    }
  }
  const unlocked = unlockedTables(progress);
  const refugeIndex = TABLE_ORDER.indexOf(selected as (typeof TABLE_ORDER)[number]);
  const refuge = REFUGES[refugeIndex];
  const expedition = progress.expedition;
  const isPlaying = screen === 'game' && expedition;
  function start() {
    if (!expedition) dispatch({ type: 'start', table: selected, now: Date.now() });
    setScreen('game');
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <header className="site-header">
        <button className="brand" onClick={() => setScreen('island')} aria-label="Ir a mi isla">
          <span className="brand-mark">✦</span>
          <span>
            la isla de las
            <br />
            <strong>luciérnagas</strong>
          </span>
        </button>
        <nav aria-label="Navegación principal">
          <button
            className={screen === 'island' ? 'nav-active' : ''}
            onClick={() => setScreen('island')}
          >
            ⌂ <span>Mi isla</span>
          </button>
          <button
            className={screen === 'collection' ? 'nav-active' : ''}
            onClick={() => setScreen('collection')}
          >
            ♧ <span>Mis amigos</span>
            <span className="nav-count">{progress.completed.length}/10</span>
          </button>
        </nav>
        <button
          ref={settingsButton}
          className="settings-button"
          aria-label="Ajustes"
          onClick={() => setSettings(true)}
        >
          ⚙
        </button>
      </header>
      {warning && (
        <div className="save-warning" role="alert">
          {warning}
          <button aria-label="Cerrar aviso" onClick={() => setWarning(null)}>
            ×
          </button>
        </div>
      )}
      {accountControls}
      <main id="main">
        {!isPlaying && screen === 'island' && (
          <>
            <section className="island-hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-star">✦</span> UNA PEQUEÑA GRAN AVENTURA
                </span>
                <h1>
                  Un poquito de magia.
                  <br />
                  <em>Un mundo por descubrir.</em>
                </h1>
                <p>
                  Multiplica, enciende luces y encuentra
                  <br className="desktop-break" /> nuevos amigos. Tu isla te espera.
                </p>
                <div className="luma-message">
                  <Firefly />
                  <p>
                    ¡Hola! Soy Luma.
                    <br />
                    <strong>
                      {progress.missions
                        ? '¿Seguimos nuestra aventura?'
                        : '¿Me ayudas a iluminar la isla?'}
                    </strong>
                  </p>
                </div>
                <button className="primary hero-cta" onClick={start}>
                  {expedition
                    ? 'Continuar mi aventura'
                    : progress.completed.includes(selected)
                      ? 'Volver a explorar'
                      : '¡Vamos a explorar!'}{' '}
                  <span>→</span>
                </button>
                <span className="session-note">
                  3 pequeños tramos · a tu ritmo ·{' '}
                  {cloudAccount ? 'con copia en tu cuenta' : 'se guarda aquí'}
                </span>
                {expedition && (
                  <span className="session-note">
                    Aventura en curso: tabla del {expedition.table}
                  </span>
                )}
              </div>
              <div className="map-art">
                <div className="map-tag">
                  <span className="live-dot" /> TU ISLA ESTÁ DESPERTANDO
                </div>
                <IslandArt
                  restored={progress.completed.length}
                  decorations={progress.decorations}
                />
                <span className="floating-label label-home">⌂ El claro de Luma</span>
                <span className="floating-label label-mountain">✦ La cima estrellada</span>
                <span className="map-caption">Cada luz cuenta. Cada aventura también.</span>
              </div>
            </section>
            <section className="trail-section" aria-labelledby="trail-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">EL MAPA DE TU AVENTURA</span>
                  <h2 id="trail-title">Diez refugios. Muchos descubrimientos.</h2>
                </div>
                <span className="progress-pill">✦ {progress.completed.length} de 10 refugios</span>
              </div>
              <div className="refuge-trail">
                {TABLE_ORDER.map((table, i) => {
                  const open = unlocked.includes(table);
                  const done = progress.completed.includes(table);
                  return (
                    <button
                      key={table}
                      className={`refuge-node ${selected === table ? 'selected' : ''} ${done ? 'complete' : ''}`}
                      disabled={!open}
                      onClick={() => setSelected(table)}
                      aria-label={`${REFUGES[i].name}, tabla del ${table}, ${done ? 'descubierto' : open ? 'disponible' : 'por descubrir'}`}
                      aria-pressed={selected === table}
                    >
                      <span className="node-circle">
                        {open ? (
                          table
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        )}
                        {done && <small>✓</small>}
                      </span>
                      <span className="node-name">
                        {i === 0 ? 'El claro' : REFUGES[i].name.replace(/^(El |La |Las )/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="selected-refuge">
                <div className="refuge-icon">
                  <Creature index={refugeIndex} />
                </div>
                <div>
                  <span className="eyebrow">
                    {progress.completed.includes(selected)
                      ? 'UN LUGAR AL QUE VOLVER'
                      : 'TU PRÓXIMO DESCUBRIMIENTO'}{' '}
                    · TABLA DEL {selected}
                  </span>
                  <h3>{refuge.name}</h3>
                  <p>
                    {progress.completed.includes(selected)
                      ? `${refuge.creature} te espera para seguir practicando.`
                      : `Prepara el jardín, cruza el río y descubre a ${refuge.creature}.`}
                  </p>
                </div>
                <button className="secondary" onClick={start}>
                  {expedition ? 'Continuar partida' : 'Explorar'} →
                </button>
              </div>
            </section>
            <footer className="island-footer">
              <span>✧ Sin prisas. Con muchas ganas.</span>
              <span>
                {cloudAccount
                  ? 'Tu aventura viaja contigo.'
                  : 'Tu aventura se guarda en este dispositivo.'}
              </span>
            </footer>
          </>
        )}
        {screen === 'collection' && (
          <section className="collection">
            <span className="eyebrow">LOS HABITANTES DE TU ISLA</span>
            <h1>Una pandilla con mucha luz.</h1>
            <p>Visita a tus amigos y descubre sus pequeñas historias.</p>
            <div className="collection-grid">
              {REFUGES.map((friend, i) => {
                const table = TABLE_ORDER[i];
                const found = progress.completed.includes(table);
                const decor = progress.decorations[table];
                return (
                  <button
                    className={`friend-card ${found ? '' : 'undiscovered'}`}
                    key={table}
                    disabled={!found}
                    onClick={() => {
                      setVisited(visited === table ? null : table);
                      chime();
                    }}
                    aria-expanded={visited === table}
                  >
                    {found ? <Creature index={i} /> : <span className="mystery">?</span>}
                    <h2>{found ? friend.creature : '¿Quién vivirá aquí?'}</h2>
                    <span className="friend-table">Tabla del {table}</span>
                    {found && (
                      <p>
                        {visited === table
                          ? friend.description
                          : `${DECORATIONS[decor ?? 'flowers'].icon} ${DECORATIONS[decor ?? 'flowers'].label} en su refugio · Toca para visitar`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {!progress.completed.length && (
              <button className="primary" onClick={start}>
                Descubrir a mi primer amigo →
              </button>
            )}
          </section>
        )}
        {isPlaying && (
          <section className="expedition">
            <div className="expedition-heading">
              <button className="text-button" onClick={() => setScreen('island')}>
                ← Volver a mi isla
              </button>
              <span>✦ {expedition.lights} luces</span>
            </div>
            <div className="stage-tabs">
              {STAGES.map((stage, i) => (
                <div
                  key={stage.name}
                  className={Math.floor(expedition.index / 8) === i ? 'current' : ''}
                >
                  <span>{expedition.index >= (i + 1) * 8 ? '✓' : i + 1}</span>
                  {stage.short}
                </div>
              ))}
            </div>
            {expedition.phase === 'playing' && (
              <Challenge
                key={`${expedition.table}-${expedition.index}`}
                expedition={expedition}
                dispatch={dispatch}
                sound={chime}
              />
            )}
            {expedition.phase === 'break' && (
              <div className="milestone">
                <Firefly happy />
                <span className="eyebrow">8 PASOS MÁS EN TU AVENTURA</span>
                <h1>{STAGES[Math.floor(expedition.index / 8)].done}</h1>
                <p>{STAGES[Math.floor(expedition.index / 8)].next}</p>
                <p className="rest-note">Estira los brazos, respira… ¡Lo estás haciendo genial!</p>
                <button
                  className="primary"
                  onClick={() => dispatch({ type: 'continue', now: Date.now() })}
                >
                  Vamos al siguiente tramo →
                </button>
                <button className="text-button" onClick={() => setScreen('island')}>
                  Seguiré otro día · Guardar y salir
                </button>
              </div>
            )}
            {expedition.phase === 'reward' && (
              <div className="milestone reward">
                <Creature
                  index={TABLE_ORDER.indexOf(expedition.table as (typeof TABLE_ORDER)[number])}
                />
                <span className="eyebrow">¡UN REFUGIO LLENO DE VIDA!</span>
                <h1>
                  {
                    REFUGES[TABLE_ORDER.indexOf(expedition.table as (typeof TABLE_ORDER)[number])]
                      .creature
                  }{' '}
                  tiene un hogar.
                </h1>
                <p>Has encendido {expedition.lights} luces. Elige algo bonito para su refugio.</p>
                <div className="decoration-choices">
                  {Object.entries(DECORATIONS).map(([key, item]) => (
                    <button
                      key={key}
                      aria-pressed={decoration === key}
                      className={decoration === key ? 'chosen' : ''}
                      onClick={() => setDecoration(key as typeof decoration)}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                      {decoration === key && <small>✓ Elegido</small>}
                    </button>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    dispatch({ type: 'claim', decoration });
                    setSelected(
                      unlockedTables({
                        ...progress,
                        completed: [...new Set([...progress.completed, expedition.table])],
                      }).at(-1)!,
                    );
                    setScreen('collection');
                    chime();
                  }}
                >
                  Decorar y conocer a mi amigo →
                </button>
                <p className="rest-note">¡Buen momento para descansar! La isla te esperará.</p>
              </div>
            )}
          </section>
        )}
      </main>
      <dialog
        ref={settingsDialog}
        className="settings-dialog"
        onCancel={() => setSettings(false)}
        onClose={() => setSettings(false)}
      >
        <div className="dialog-heading">
          <h2>Como a ti te gusta</h2>
          <button aria-label="Cerrar ajustes" onClick={() => setSettings(false)}>
            ×
          </button>
        </div>
        <label className="setting-row">
          <span>
            Sonidos suaves<small>Al encender una luz</small>
          </span>
          <input
            type="checkbox"
            checked={progress.settings.sound}
            onChange={(event) => dispatch({ type: 'settings', sound: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>
            Animaciones<small>Un poco de movimiento</small>
          </span>
          <input
            type="checkbox"
            checked={progress.settings.motion}
            onChange={(event) => dispatch({ type: 'settings', motion: event.target.checked })}
          />
        </label>
        <details className="adult-panel">
          <summary>Para acompañantes</summary>
          <BackupPanel
            storage={storage}
            progress={progress}
            protectedSave={protectedSave}
            onRestore={(restored) => {
              dispatch({ type: 'restore', progress: restored });
              setProtectedSave(false);
              setWarning(null);
              setScreen('island');
              setSelected(restored.expedition?.table ?? unlockedTables(restored).at(-1)!);
            }}
          />
          <AdultProgress progress={progress} />
        </details>
        <p className="privacy-note">
          {cloudAccount
            ? 'Tu acceso y tu partida se guardan en Firebase para continuar en otros dispositivos. Sin publicidad ni analítica.'
            : 'El progreso se guarda en este navegador. Borrar sus datos también borra esta copia. Sin publicidad ni analítica.'}
        </p>
        <button className="primary" onClick={() => setSettings(false)}>
          Listo
        </button>
      </dialog>
    </div>
  );
}
function AdultProgress({ progress }: { progress: Progress }) {
  const difficult = hardestFacts(progress);
  return (
    <div>
      <p>
        {progress.missions} expediciones completadas · {progress.lights} luces. Las tablas se abren
        al completar una expedición, sin exigir velocidad.
      </p>
      <p>
        Operaciones afianzadas: respuestas independientes en repasos separados. Las ayudas no restan
        recompensas.
      </p>
      <div className="adult-tables">
        {TABLE_ORDER.map((table) => (
          <div key={table}>
            Tabla del {table}
            <strong>{masteredCount(progress, table)}/10</strong>
          </div>
        ))}
      </div>
      <p>
        <strong>Conviene acompañar:</strong>{' '}
        {difficult.length
          ? difficult.map(([id]) => id.replace('x', ' × ')).join(', ')
          : 'Aún no hay operaciones que destaquen por errores.'}
      </p>
      <p>
        Una sesión tiene 24 retos y dos descansos; puede durar unos 5–10 minutos, según el ritmo. Se
        puede interrumpir en cualquier momento. El tiempo en segundo plano no cuenta.
      </p>
    </div>
  );
}
