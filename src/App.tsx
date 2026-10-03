import { ParentGate, PlayTimeSettings } from './components/PlayTimeSettings';
import { usePlayTime } from './components/usePlayTime';
import { migratePlayTime, remainingPlayMs } from './core/playTime';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { gameReducer } from './core/game';
import {
  freshProgress,
  masteredCount,
  MAX_NAME_LENGTH,
  TABLE_ORDER,
  unlockedTables,
  type Progress,
} from './core/model';
import { hardestFacts, loadProgress, saveProgress } from './core/storage';
import { Creature, Firefly, IslandArt } from './components/Artwork';
import { BackupPanel } from './components/BackupPanel';
import { Challenge } from './components/Challenge';
import { DECORATION_ICONS, type DecorationKey } from './content';
import { LanguageToggle, useI18n } from './i18n';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
function initialState(storage: StoragePort) {
  try {
    const loaded = loadProgress(storage);
    return { ...loaded, progress: migratePlayTime(loaded.progress, Date.now()) };
  } catch {
    return { progress: freshProgress(), protectedSave: false, warning: 'no-storage' };
  }
}
export default function App({
  storage = window.localStorage,
  onSaved,
  notice,
  account,
  cloudAccount = false,
}: {
  storage?: StoragePort;
  onSaved?: () => void;
  /** Optional banner under the header (account invitation or sync problem). */
  notice?: ReactNode;
  /** Account controls shown in Settings. */
  account?: ReactNode;
  cloudAccount?: boolean;
}) {
  const { t, content, core } = useI18n();
  const [initial] = useState(() => initialState(storage));
  const [progress, reduce] = useReducer(gameReducer, initial.progress);
  const [screen, setScreen] = useState<'island' | 'collection' | 'game'>('island');
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState(
    () => initial.progress.expedition?.table ?? unlockedTables(initial.progress).at(-1)!,
  );
  const [decoration, setDecoration] = useState<DecorationKey>('flowers');
  const [warning, setWarning] = useState(initial.warning);
  const [protectedSave, setProtectedSave] = useState(initial.protectedSave);
  const [visited, setVisited] = useState<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const restTitle = useRef<HTMLHeadingElement>(null);
  const focusName = useRef(false);
  useEffect(() => {
    let saved = false;
    try {
      saved = saveProgress(storage, progress);
    } catch {
      /* Storage may be disabled. */
    }
    if (saved) onSaved?.();
    // A synchronous storage failure must be visible even when the browser offers no storage events.
    if (!saved) setWarning((current) => current ?? 'save-failed');
  }, [progress, storage, onSaved]);
  useEffect(() => {
    document.documentElement.dataset.motion = progress.settings.motion ? 'on' : 'off';
  }, [progress.settings.motion]);
  useEffect(() => {
    if (settings) {
      settingsDialog.current?.showModal();
      if (focusName.current) nameInput.current?.focus();
      focusName.current = false;
    } else if (settingsDialog.current?.open) {
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
  const refuge = content.refuges[refugeIndex];
  const expedition = progress.expedition;
  const isPlaying = screen === 'game' && expedition;
  const time = usePlayTime(
    progress,
    reduce,
    !!isPlaying &&
      !settings &&
      expedition?.phase !== 'break' &&
      remainingPlayMs(progress, Date.now()) > 0,
  );
  const dispatch: typeof reduce = (action) => {
    if (['start', 'hint', 'answer', 'next', 'continue', 'claim'].includes(action.type))
      time.flush();
    reduce(action);
  };
  const timeNotice = time.remainingMs > 0 && time.remainingMs <= 60_000;
  useEffect(() => {
    if (time.blocked) {
      setScreen('island');
      restTitle.current?.focus();
    }
  }, [time.blocked]);
  function start() {
    if (time.blocked) return;
    if (!expedition) dispatch({ type: 'start', table: selected, now: Date.now() });
    setScreen('game');
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header">
        <button className="brand" onClick={() => setScreen('island')} aria-label={t.goHome}>
          <span className="brand-mark">✦</span>
          <span>
            {t.brandTop}
            <br />
            <strong>{t.brandBottom}</strong>
          </span>
        </button>
        <nav aria-label={t.mainNav}>
          <button
            className={screen === 'island' ? 'nav-active' : ''}
            onClick={() => setScreen('island')}
          >
            ⌂ <span>{t.myIsland}</span>
          </button>
          <button
            className={screen === 'collection' ? 'nav-active' : ''}
            onClick={() => setScreen('collection')}
          >
            ♧ <span>{t.myFriends}</span>
            <span className="nav-count">{progress.completed.length}/10</span>
          </button>
        </nav>
        <LanguageToggle />
        <button
          ref={settingsButton}
          className="settings-button"
          aria-label={t.settings}
          onClick={() => {
            time.flush();
            setSettings(true);
          }}
        >
          ⚙
        </button>
      </header>
      {warning && (
        <div className="save-warning" role="alert">
          {warning === 'no-storage'
            ? t.noStorage
            : warning === 'save-failed'
              ? t.saveFailed
              : core(warning)}
          <button aria-label={t.closeWarning} onClick={() => setWarning(null)}>
            ×
          </button>
        </div>
      )}
      {(!progress.playTime?.pin || cloudAccount) && notice}
      {timeNotice && !time.blocked && (
        <p className="time-warning" role="status">
          ⌛ {t.timeEnding}
        </p>
      )}
      <main id="main">
        {time.blocked && (
          <section className="milestone time-rest" aria-labelledby="time-rest-title">
            <Firefly happy />
            <h1 ref={restTitle} id="time-rest-title" tabIndex={-1}>
              {t.islandResting}
            </h1>
            <p>{t.restUntilTomorrow}</p>
            <p>{t.adventureKept}</p>
            <button className="secondary" onClick={() => setSettings(true)}>
              {t.adultTimeAccess}
            </button>
          </section>
        )}
        {!time.blocked && !isPlaying && screen === 'island' && (
          <>
            <section className="island-hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-star">✦</span> {t.eyebrowHero}
                </span>
                <h1>
                  {t.heroTitle}
                  <br />
                  <em>{t.heroTitleEm}</em>
                </h1>
                <p>
                  {t.heroText1}
                  <br className="desktop-break" />
                  {t.heroText2}
                </p>
                <div className="luma-message">
                  <Firefly />
                  <p>
                    {progress.name?.trim() ? t.lumaHelloName(progress.name.trim()) : t.lumaHello}
                    <br />
                    <strong>{progress.missions ? t.lumaContinue : t.lumaStart}</strong>
                    {!progress.name && (
                      <button
                        className="text-button ask-name"
                        onClick={() => {
                          focusName.current = true;
                          setSettings(true);
                        }}
                      >
                        {t.askName}
                      </button>
                    )}
                  </p>
                </div>
                <button className="primary hero-cta" onClick={start}>
                  {expedition
                    ? t.ctaContinue
                    : progress.completed.includes(selected)
                      ? t.ctaReplay
                      : t.ctaStart}{' '}
                  <span>→</span>
                </button>
                <span className="session-note">
                  {t.sessionNote} {cloudAccount ? t.savedCloud : t.savedHere}
                </span>
                {expedition && (
                  <span className="session-note">{t.inProgress(expedition.table)}</span>
                )}
              </div>
              <div className="map-art">
                <div className="map-tag">
                  <span className="live-dot" /> {t.islandWaking}
                </div>
                <IslandArt
                  restored={progress.completed.length}
                  decorations={progress.decorations}
                />
                <span className="floating-label label-home">⌂ {content.refuges[0].name}</span>
                <span className="floating-label label-mountain">✦ {content.refuges[9].name}</span>
                <span className="map-caption">{t.mapCaption}</span>
              </div>
            </section>
            <section className="trail-section" aria-labelledby="trail-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{t.mapEyebrow}</span>
                  <h2 id="trail-title">{t.mapTitle}</h2>
                </div>
                <span className="progress-pill">✦ {t.refugeCount(progress.completed.length)}</span>
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
                      aria-label={t.refugeLabel(
                        content.refuges[i].name,
                        table,
                        done ? 'done' : open ? 'open' : 'locked',
                      )}
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
                      <span className="node-name">{content.refuges[i].short}</span>
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
                    {progress.completed.includes(selected) ? t.revisit : t.nextDiscovery} ·{' '}
                    {t.tableCaps(selected)}
                  </span>
                  <h3>{refuge.name}</h3>
                  <p>
                    {progress.completed.includes(selected)
                      ? t.waitsForYou(refuge.creature)
                      : t.discover(refuge.creature)}
                  </p>
                </div>
                <button className="secondary" onClick={start}>
                  {expedition ? t.continueGame : t.explore} →
                </button>
              </div>
            </section>
            <footer className="island-footer">
              <span>✧ {t.footerCalm}</span>
              <span>{cloudAccount ? t.footerCloud : t.footerLocal}</span>
            </footer>
          </>
        )}
        {!time.blocked && screen === 'collection' && (
          <section className="collection">
            <span className="eyebrow">{t.collectionEyebrow}</span>
            <h1>{t.collectionTitle}</h1>
            <p>{t.collectionText}</p>
            <div className="collection-grid">
              {content.refuges.map((friend, i) => {
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
                    <h2>{found ? friend.creature : t.whoLivesHere}</h2>
                    <span className="friend-table">{t.table(table)}</span>
                    {found && (
                      <p>
                        {visited === table
                          ? friend.description
                          : `${DECORATION_ICONS[decor ?? 'flowers']} ${t.inRefuge(content.decorations[decor ?? 'flowers'])}`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {!progress.completed.length && (
              <button className="primary" onClick={start}>
                {t.firstFriend} →
              </button>
            )}
          </section>
        )}
        {!time.blocked && isPlaying && (
          <section className="expedition">
            <div className="expedition-heading">
              <button className="text-button" onClick={() => setScreen('island')}>
                {t.backToIsland}
              </button>
              <span>✦ {t.lights(expedition.lights)}</span>
            </div>
            <div className="stage-tabs">
              {content.stages.map((stage, i) => (
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
                <span className="eyebrow">{t.breakEyebrow}</span>
                <h1>{content.stages[Math.floor(expedition.index / 8)].done}</h1>
                <p>{content.stages[Math.floor(expedition.index / 8)].next}</p>
                <p className="rest-note">{t.stretch}</p>
                <button
                  className="primary"
                  onClick={() => dispatch({ type: 'continue', now: Date.now() })}
                >
                  {t.nextLeg} →
                </button>
                <button className="text-button" onClick={() => setScreen('island')}>
                  {t.saveAndExit}
                </button>
              </div>
            )}
            {expedition.phase === 'reward' && (
              <div className="milestone reward">
                <Creature
                  index={TABLE_ORDER.indexOf(expedition.table as (typeof TABLE_ORDER)[number])}
                />
                <span className="eyebrow">
                  {progress.name?.trim() ? t.wellDone(progress.name.trim()) : t.rewardEyebrow}
                </span>
                <h1>
                  {t.hasHome(
                    content.refuges[
                      TABLE_ORDER.indexOf(expedition.table as (typeof TABLE_ORDER)[number])
                    ].creature,
                  )}
                </h1>
                <p>{t.litLights(expedition.lights)}</p>
                <div className="decoration-choices">
                  {Object.entries(DECORATION_ICONS).map(([key, icon]) => (
                    <button
                      key={key}
                      aria-pressed={decoration === key}
                      className={decoration === key ? 'chosen' : ''}
                      onClick={() => setDecoration(key as DecorationKey)}
                    >
                      <span>{icon}</span>
                      {content.decorations[key as DecorationKey]}
                      {decoration === key && <small>{t.chosen}</small>}
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
                  {t.decorate} →
                </button>
                <p className="rest-note">{t.restTime}</p>
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
          <h2>{t.settingsTitle}</h2>
          <button aria-label={t.closeSettings} onClick={() => setSettings(false)}>
            ×
          </button>
        </div>
        <label className="setting-row name-row">
          <span>
            {t.nameLabel}
            <small>{t.nameHint}</small>
          </span>
          <input
            ref={nameInput}
            type="text"
            autoComplete="off"
            maxLength={MAX_NAME_LENGTH}
            value={progress.name ?? ''}
            onChange={(event) => reduce({ type: 'name', name: event.target.value })}
          />
        </label>
        <label className="setting-row">
          <span>
            {t.sound}
            <small>{t.soundHint}</small>
          </span>
          <input
            type="checkbox"
            checked={progress.settings.sound}
            onChange={(event) => dispatch({ type: 'settings', sound: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>
            {t.motion}
            <small>{t.motionHint}</small>
          </span>
          <input
            type="checkbox"
            checked={progress.settings.motion}
            onChange={(event) => dispatch({ type: 'settings', motion: event.target.checked })}
          />
        </label>
        {account && !progress.playTime?.pin && (
          <section className="account-panel" aria-labelledby="account-title">
            <h3 id="account-title">{t.accountTitle}</h3>
            {account}
          </section>
        )}
        <details className="adult-panel">
          <summary>{t.forAdults}</summary>
          {settings && (
            <ParentGate pin={progress.playTime?.pin}>
              {account && progress.playTime?.pin && (
                <section className="account-panel">
                  <h3>{t.accountTitle}</h3>
                  {account}
                </section>
              )}
              <PlayTimeSettings
                progress={progress}
                disabled={protectedSave}
                onChange={(playTime) => reduce({ type: 'play-limit', playTime })}
              />
              <BackupPanel
                storage={storage}
                progress={progress}
                protectedSave={protectedSave}
                onRestore={(restored) => {
                  dispatch({ type: 'restore', progress: migratePlayTime(restored, Date.now()) });
                  setProtectedSave(false);
                  setWarning(null);
                  setScreen('island');
                  setSelected(restored.expedition?.table ?? unlockedTables(restored).at(-1)!);
                }}
              />
              <AdultProgress progress={progress} />
            </ParentGate>
          )}
        </details>
        <p className="privacy-note">{cloudAccount ? t.privacyCloud : t.privacyLocal}</p>
        <button className="primary" onClick={() => setSettings(false)}>
          {t.done}
        </button>
      </dialog>
    </div>
  );
}
function AdultProgress({ progress }: { progress: Progress }) {
  const { t } = useI18n();
  const difficult = hardestFacts(progress);
  return (
    <div>
      <p>{t.adultSummary(progress.missions, progress.lights)}</p>
      <p>{t.adultMastered}</p>
      <div className="adult-tables">
        {TABLE_ORDER.map((table) => (
          <div key={table}>
            {t.table(table)}
            <strong>{masteredCount(progress, table)}/10</strong>
          </div>
        ))}
      </div>
      <p>
        <strong>{t.adultSupport}</strong>{' '}
        {difficult.length
          ? difficult.map(([id]) => id.replace('x', ' × ')).join(', ')
          : t.adultNoErrors}
      </p>
      <p>{t.adultSession}</p>
    </div>
  );
}
