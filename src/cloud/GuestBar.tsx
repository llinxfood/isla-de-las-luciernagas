import { useState } from 'react';
import { useI18n } from '../i18n';
import { closeInvite, inviteClosed } from './config';

/** Dismissable invitation at the top of the island. */
export function GuestBar({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n();
  const [closed, setClosed] = useState(inviteClosed);
  if (closed) return null;
  return (
    <div className="account-bar">
      <span>{t.takeIsland}</span>
      <button className="text-button" onClick={onEnter}>
        {t.signIn}
      </button>
      <button
        className="account-bar-close"
        aria-label={t.closeInvite}
        onClick={() => {
          closeInvite();
          setClosed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}

/** Sign-in entry inside Settings, always available even after closing the invitation. */
export function GuestPanel({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <p>{t.takeIsland}</p>
      <button className="secondary" onClick={onEnter}>
        {t.signIn}
      </button>
    </>
  );
}
