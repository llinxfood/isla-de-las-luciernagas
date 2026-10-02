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
import { LanguageToggle, useI18n, type TextKey } from '../i18n';
import { GuestBar, GuestPanel } from './GuestBar';
import { accountStorage, SyncSession } from './sync';

function authMessage(error: unknown): TextKey {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements')
    return 'authWeak';
  if (code === 'auth/email-already-in-use') return 'authInUse';
  if (code === 'auth/invalid-email') return 'authEmail';
  if (code === 'auth/invalid-credential') return 'authCredential';
  if (code === 'auth/operation-not-allowed') return 'authDisabled';
  if (code === 'auth/too-many-requests') return 'authTooMany';
  return 'authNetwork';
}
export default function CloudGame({ openLogin }: { openLogin: boolean }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const { t } = useI18n();
  const [open, setOpen] = useState(openLogin);
  const [error, setError] = useState<TextKey | null>(null);
  useEffect(
    () =>
      onAuthStateChanged(
        firebaseServices().auth,
        (next) => {
          setUser(next);
          rememberCloudSession(next !== null);
        },
        () => setError('authCheckFailed'),
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
          {t[error]}
        </p>
      )}
      {user === undefined ? (
        <div className="account-screen">
          <h1>{t.searching}</h1>
        </div>
      ) : user ? (
        <SignedGame key={user.uid} user={user} onLogout={logout} />
      ) : (
        <App
          key="guest"
          notice={<GuestBar onEnter={() => setOpen(true)} />}
          account={<GuestPanel onEnter={() => setOpen(true)} />}
        />
      )}
      {open && user === null && <LoginDialog onClose={() => setOpen(false)} />}
    </>
  );
}
function LoginDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TextKey | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function submit(reset = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const auth = firebaseServices().auth;
      if (reset) {
        await sendPasswordResetEmail(auth, email.trim());
        setSent(true);
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
        <h2>{register ? t.createTitle : t.loginTitle}</h2>
        <button aria-label={t.closeLogin} onClick={onClose}>
          ×
        </button>
      </div>
      <p>{t.oneAccount}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label>
          {t.emailLabel}
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          {t.passwordLabel}
          <input
            type="password"
            minLength={register ? 10 : undefined}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {register && <p>{t.createNotice}</p>}
        <button className="primary" disabled={busy}>
          {busy ? t.connecting : register ? t.createButton : t.loginButton}
        </button>
      </form>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setError(null);
        }}
      >
        {register ? t.haveAccount : t.createAccount}
      </button>
      <button
        className="text-button"
        disabled={busy || !email.trim()}
        onClick={() => void submit(true)}
      >
        {t.forgot}
      </button>
      {error && <p role="alert">{t[error]}</p>}
      {sent && <p role="status">{t.resetSent}</p>}
    </dialog>
  );
}
function SignedGame({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const { t } = useI18n();
  const storage = useMemo(() => accountStorage(window.localStorage, user.uid), [user.uid]);
  const [session] = useState(() => {
    try {
      return new SyncSession(storage, cloudFor(user.uid));
    } catch {
      return null;
    }
  });
  if (!session)
    return (
      <div className="account-screen">
        <p role="alert">{t.localOpenFailed}</p>
        <button className="secondary" onClick={() => void onLogout()}>
          {t.backNoAccount}
        </button>
      </div>
    );
  return <SyncedGame session={session} storage={storage} onLogout={onLogout} />;
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
  const { t, core } = useI18n();
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [error, setError] = useState<TextKey | null>(null);
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
      setError('choiceFailed');
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
      setError('prepareFailed');
    }
  }
  const hasLocal = storage.getItem(STORAGE_KEY) !== null;
  const blocked = state.status === 'loading' || state.status === 'conflict' || !hasLocal;
  const panel = (
    <>
      <p role="status">{core(state.message)}</p>
      <div className="backup-actions">
        <button className="secondary" onClick={() => void session.sync()}>
          {t.syncNow}
        </button>
        <button className="secondary" onClick={() => void onLogout()}>
          {t.signOut}
        </button>
      </div>
    </>
  );
  // Only a sync problem deserves space above the game; everything else lives in Settings.
  const notice = state.status === 'error' && (
    <div className="account-bar" role="alert">
      <span>{core(state.message)}</span>
      <button className="text-button" onClick={() => void session.sync()}>
        {t.retry}
      </button>
    </div>
  );
  if (blocked)
    return (
      <div className="account-screen">
        <LanguageToggle />
        <h1>{t.travelsTitle}</h1>
        <p role="status">{core(state.message)}</p>
        {state.status === 'conflict' && (
          <>
            <p>{t.bothKept}</p>
            <div className="backup-actions">
              <button className="secondary" onClick={() => void choose('local')}>
                {t.keepLocal(JSON.parse(storage.getItem(STORAGE_KEY)!).completed.length)}
              </button>
              <button className="secondary" onClick={() => void choose('remote')}>
                {t.keepRemote(JSON.parse(state.remote!.payload).completed.length)}
              </button>
            </div>
          </>
        )}
        {!hasLocal && state.status === 'saved' && (
          <>
            <p>{t.noSaveYet}</p>
            <button className="primary" onClick={() => begin(true)}>
              {t.bringSave}
            </button>
            <button className="secondary" onClick={() => begin(false)}>
              {t.newIsland}
            </button>
          </>
        )}
        {state.status === 'error' && (
          <button className="secondary" onClick={() => void session.sync()}>
            {t.retry}
          </button>
        )}
        {error && <p role="alert">{t[error]}</p>}
        <button className="text-button" onClick={() => void onLogout()}>
          {t.backNoAccount}
        </button>
      </div>
    );
  return (
    <App
      key={state.generation}
      storage={storage}
      onSaved={session.changed}
      notice={notice}
      account={panel}
      cloudAccount
    />
  );
}
