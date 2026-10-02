import { lazy, Suspense, useState } from 'react';
import App from '../App';
import { firebaseConfigured, hadCloudSession } from './config';
import { GuestBar } from './GuestBar';

// Guests never download Firebase nor contact Google until they choose to sign in.
const CloudGame = lazy(() => import('./CloudGame'));

export default function AccountApp() {
  const [cloud, setCloud] = useState(() => (hadCloudSession() ? 'restore' : null));
  if (!firebaseConfigured) return <App />;
  if (!cloud)
    return <App key="guest" accountControls={<GuestBar onEnter={() => setCloud('login')} />} />;
  return (
    <Suspense
      fallback={
        <div className="account-screen">
          <h1>Buscando tu isla…</h1>
        </div>
      }
    >
      <CloudGame openLogin={cloud === 'login'} />
    </Suspense>
  );
}
