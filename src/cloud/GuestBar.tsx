import { useI18n } from '../i18n';

export function GuestBar({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n();
  return (
    <div className="account-bar">
      <span>{t.takeIsland}</span>
      <button className="text-button" onClick={onEnter}>
        {t.signIn}
      </button>
    </div>
  );
}
