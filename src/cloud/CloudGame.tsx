import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import App from '../App';
import { freshProgress } from '../core/model';
import { loadProgress, restoreProgress, STORAGE_KEY } from '../core/storage';
import { rememberCloudSession } from './config';
import { cloudFor, firebaseServices } from './firebase';
import { GuestBar } from './GuestBar';
import { accountStorage, SyncSession } from './sync';

function authMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements')
    return 'Elige una contraseña más larga y segura.';
  if (code === 'auth/email-already-in-use')
    return 'Este correo ya tiene una cuenta. Pulsa Entrar o recupera la contraseña.';
  if (code === 'auth/invalid-email') return 'Revisa el correo electrónico.';
  if (code === 'auth/invalid-credential') return 'Revisa el correo y la contraseña.';
  if (code === 'auth/operation-not-allowed')
    return 'Las cuentas todavía no están activadas. Puedes seguir jugando sin cuenta.';
  if (code === 'auth/too-many-requests')
    return 'Ha habido muchos intentos. Espera un poco antes de volver a probar.';
  return 'No se ha podido conectar. Revisa la conexión y vuelve a intentarlo.';
}
export default function CloudGame({ openLogin }: { openLogin: boolean }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [open, setOpen] = useState(openLogin);
  const [error, setError] = useState('');
  useEffect(
    () =>
      onAuthStateChanged(
        firebaseServices().auth,
        (next) => {
          setUser(next);
          rememberCloudSession(next !== null);
        },
        () => setError('No se pudo comprobar la cuenta. Recarga para reintentar.'),
      ),
    [],
  );
  async function logout() {
    try {
      await signOut(firebaseServices().auth);
    } catch (caught) {
      setError(authMessage(caught));
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="save-warning">
          {error}
        </p>
      )}
      {user === undefined ? (
        <div className="account-screen">
          <h1>Buscando tu isla…</h1>
        </div>
      ) : user ? (
        <SignedGame key={user.uid} user={user} onLogout={logout} />
      ) : (
        <App key="guest" accountControls={<GuestBar onEnter={() => setOpen(true)} />} />
      )}
      {open && user === null && <LoginDialog onClose={() => setOpen(false)} />}
    </>
  );
}
function LoginDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function submit(reset = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const auth = firebaseServices().auth;
      if (reset) {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage(
          'Si existe una cuenta con ese correo, recibirás las instrucciones para recuperar el acceso.',
        );
      } else {
        await (register ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(
          auth,
          email.trim(),
          password,
        );
        onClose();
      }
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog ref={dialog} className="settings-dialog account-dialog" onCancel={onClose}>
      <div className="dialog-heading">
        <h2>{register ? 'Crea tu cuenta de la isla' : 'Vuelve a tu isla'}</h2>
        <button aria-label="Cerrar acceso" onClick={onClose}>
          ×
        </button>
      </div>
      <p>Una cuenta guarda una aventura. Usa el mismo acceso en todos tus dispositivos.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label>
          Correo para recuperar el acceso
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            minLength={register ? 10 : undefined}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {register && (
          <p>
            Al crear la cuenta, el correo y la partida se guardarán en Firebase para sincronizarlos.
            No pedimos nombre real ni edad. Sin anuncios ni analítica.
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Conectando…' : register ? 'Crear mi cuenta' : 'Entrar'}
        </button>
      </form>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setError('');
        }}
      >
        {register ? 'Ya tengo cuenta' : 'Crear una cuenta'}
      </button>
      <button
        className="text-button"
        disabled={busy || !email.trim()}
        onClick={() => void submit(true)}
      >
        He olvidado mi contraseña
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </dialog>
  );
}
function SignedGame({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const storage = useMemo(() => accountStorage(window.localStorage, user.uid), [user.uid]);
  const [setup] = useState(() => {
    try {
      return { session: new SyncSession(storage, cloudFor(user.uid)), error: '' };
    } catch {
      return {
        session: null,
        error: 'No se puede abrir la copia local de esta cuenta. Sus datos se han conservado.',
      };
    }
  });
  if (!setup.session)
    return (
      <div className="account-screen">
        <p role="alert">{setup.error}</p>
        <button className="secondary" onClick={() => void onLogout()}>
          Volver sin cuenta
        </button>
      </div>
    );
  return <SyncedGame session={setup.session} storage={storage} onLogout={onLogout} />;
}
function SyncedGame({
  session,
  storage,
  onLogout,
}: {
  session: SyncSession;
  storage: ReturnType<typeof accountStorage>;
  onLogout: () => Promise<void>;
}) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [error, setError] = useState('');
  useEffect(() => {
    void session.start();
    const refresh = () => {
      if (document.visibilityState === 'visible') void session.sync();
    };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      session.stop();
    };
  }, [session]);
  async function choose(choice: 'local' | 'remote') {
    try {
      await session.resolve(choice);
    } catch {
      setError('No se pudo guardar la elección. Las dos partidas siguen conservadas.');
    }
  }
  function begin(importGuest: boolean) {
    try {
      const guest = loadProgress(window.localStorage);
      if (importGuest && guest.protectedSave) throw new Error();
      if (!restoreProgress(storage, importGuest ? guest.progress : freshProgress()))
        throw new Error();
      session.changed();
    } catch {
      setError(
        'No se pudo preparar la partida. Descarga primero una copia desde el modo sin cuenta.',
      );
    }
  }
  const hasLocal = storage.getItem(STORAGE_KEY) !== null;
  const blocked = state.status === 'loading' || state.status === 'conflict' || !hasLocal;
  const controls = (
    <div className="account-bar">
      <span role="status">{state.message}</span>
      <button className="text-button" onClick={() => void session.sync()}>
        Sincronizar ahora
      </button>
      <button className="text-button" onClick={() => void onLogout()}>
        Cerrar sesión
      </button>
    </div>
  );
  if (blocked)
    return (
      <div className="account-screen">
        <h1>Tu isla viaja contigo</h1>
        <p role="status">{state.message}</p>
        {state.status === 'conflict' && (
          <>
            <p>
              Se han conservado las dos versiones. La elegida será la que continúe en tus
              dispositivos.
            </p>
            <div className="backup-actions">
              <button className="secondary" onClick={() => void choose('local')}>
                Continuar la de este dispositivo (
                {JSON.parse(storage.getItem(STORAGE_KEY)!).completed.length} amigos)
              </button>
              <button className="secondary" onClick={() => void choose('remote')}>
                Continuar la de la nube ({JSON.parse(state.remote!.payload).completed.length}{' '}
                amigos)
              </button>
            </div>
          </>
        )}
        {!hasLocal && state.status === 'saved' && (
          <>
            <p>Esta cuenta todavía no tiene partida. Puedes llevarte la que ya tienes aquí.</p>
            <button className="primary" onClick={() => begin(true)}>
              Llevar mi partida a esta cuenta
            </button>
            <button className="secondary" onClick={() => begin(false)}>
              Empezar una isla nueva
            </button>
          </>
        )}
        {state.status === 'error' && (
          <button className="secondary" onClick={() => void session.sync()}>
            Reintentar
          </button>
        )}
        {error && <p role="alert">{error}</p>}
        <button className="text-button" onClick={() => void onLogout()}>
          Volver sin cuenta
        </button>
      </div>
    );
  return (
    <App
      key={state.generation}
      storage={storage}
      onSaved={session.changed}
      accountControls={controls}
      cloudAccount
    />
  );
}
