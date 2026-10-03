import { useState, type ReactNode } from 'react';
import type { Progress } from '../core/model';
import { DEFAULT_DAILY_MINUTES, localDay, usedToday, type PlayTime } from '../core/playTime';
import { useI18n } from '../i18n';
import { checkParentPin, createParentPin } from './parentPin';

export function ParentGate({ pin, children }: { pin?: PlayTime['pin']; children: ReactNode }) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(!pin);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!pin || unlocked) return children;
  return (
    <form
      className="play-time-settings"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          if (await checkParentPin(input, pin)) setUnlocked(true);
          else {
            setError(t.pinWrong);
            setInput('');
          }
        } catch {
          setError(t.pinUnavailable);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t.parentPin}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          value={input}
          onChange={(event) => setInput(event.target.value.replace(/\D/g, ''))}
        />
      </label>
      <button className="secondary" disabled={busy}>
        {t.unlockAdults}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function PlayTimeSettings({
  progress,
  disabled,
  onChange,
}: {
  progress: Progress;
  disabled: boolean;
  onChange: (time: PlayTime) => void;
}) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(progress.playTime?.dailyMinutes !== 0);
  const [minutes, setMinutes] = useState(
    String(progress.playTime?.dailyMinutes || DEFAULT_DAILY_MINUTES),
  );
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function save() {
    if (disabled || busy) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const dailyMinutes = enabled ? Number(minutes) : 0;
      if (
        !Number.isInteger(dailyMinutes) ||
        (enabled && (dailyMinutes < 5 || dailyMinutes > 120))
      ) {
        setError(t.limitInvalid);
        return;
      }
      const existing = progress.playTime;
      if (!existing?.pin && (!/^\d{4}$/.test(pin) || pin !== confirmation)) {
        setError(t.pinMismatch);
        return;
      }
      const parentPin = existing?.pin ?? (await createParentPin(pin));
      onChange({
        dailyMinutes,
        day: existing && existing.day > localDay(Date.now()) ? existing.day : localDay(Date.now()),
        usedMs: existing ? usedToday(existing, Date.now()) : 0,
        pin: parentPin,
      });
      setPin('');
      setConfirmation('');
      setSaved(true);
    } catch {
      setError(t.pinUnavailable);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="play-time-settings" aria-labelledby="play-time-title">
      <h3 id="play-time-title">{t.playTimeTitle}</h3>
      <p>{t.playTimeDescription}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="setting-row">
          <span>{t.dailyLimit}</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => {
              setEnabled(event.target.checked);
              setSaved(false);
            }}
          />
        </label>
        {enabled && (
          <>
            <label>
              {t.minutesPerDay}
              <input
                type="number"
                min={5}
                max={120}
                step={1}
                inputMode="numeric"
                required
                value={minutes}
                disabled={disabled}
                onChange={(event) => {
                  setMinutes(event.target.value);
                  setSaved(false);
                }}
              />
            </label>
          </>
        )}
        {!progress.playTime?.pin && (
          <>
            <label>
              {t.newParentPin}
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label>
              {t.confirmParentPin}
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <p>{t.pinReminder}</p>
          </>
        )}
        {progress.playTime && (
          <p>{t.playedToday(Math.ceil(usedToday(progress.playTime, Date.now()) / 60_000))}</p>
        )}
        <button className="secondary" disabled={disabled || busy}>
          {t.saveTimeLimit}
        </button>
      </form>
      {saved && <p role="status">{t.limitSaved}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
