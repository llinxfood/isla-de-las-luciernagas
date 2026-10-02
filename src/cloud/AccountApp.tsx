import { lazy, Suspense, useState } from 'react';
import App from '../App';
import { firebaseConfigured, hadCloudSession } from './config';
import { useI18n } from '../i18n';
import { GuestBar, GuestPanel } from './GuestBar';

// Guests never download Firebase nor contact Google until they choose to sign in.
const CloudGame = lazy(() => import('./CloudGame'));

export default function AccountApp() {
  const { t } = useI18n();
  const [cloud, setCloud] = useState(() => (hadCloudSession() ? 'restore' : null));
  if (!firebaseConfigured) return <App />;
  if (!cloud)
    return (
      <App
        key="guest"
        notice={<GuestBar onEnter={() => setCloud('login')} />}
        account={<GuestPanel onEnter={() => setCloud('login')} />}
      />
    );
  return (
    <Suspense
      fallback={
        <div className="account-screen">
          <h1>{t.searching}</h1>
        </div>
      }
    >
      <CloudGame openLogin={cloud === 'login'} />
    </Suspense>
  );
}
