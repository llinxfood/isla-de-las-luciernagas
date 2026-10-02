import type { Progress } from '../core/model';
import { isProgress, restoreProgress, STORAGE_KEY } from '../core/storage';

export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type CloudSave = { revision: number; payload: string };
export interface CloudPort {
  read(): Promise<CloudSave | null>;
  write(expectedRevision: number, payload: string): Promise<CloudSave>;
}
export class ConflictError extends Error {}
const BASE_KEY = `${STORAGE_KEY}.cloud-base`;
export function accountStorage(storage: StoragePort, uid: string): StoragePort {
  const prefix = `luciernagas.account.${encodeURIComponent(uid)}.`;
  return {
    getItem: (key) => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
  };
}
export function decodeCloudSave(value: unknown): CloudSave {
  const save = value as CloudSave | null;
  if (
    !save ||
    !Number.isSafeInteger(save.revision) ||
    save.revision < 1 ||
    typeof save.payload !== 'string' ||
    save.payload.length > 250_000 ||
    !isProgress(JSON.parse(save.payload))
  ) {
    throw new Error('La partida de la nube no es compatible. No se ha sustituido.');
  }
  return { revision: save.revision, payload: save.payload };
}
export type SyncState = {
  status: 'loading' | 'saved' | 'pending' | 'conflict' | 'error';
  message: string;
  generation: number;
  remote: CloudSave | null;
};

/** Serializes writes and checks server revisions before replacing anything. */
export class SyncSession {
  state: SyncState = {
    status: 'loading',
    message: 'Buscando tu isla…',
    generation: 0,
    remote: null,
  };
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private base: CloudSave | null;
  constructor(
    private storage: StoragePort,
    private cloud: CloudPort,
  ) {
    const raw = storage.getItem(BASE_KEY);
    this.base = raw ? decodeCloudSave(JSON.parse(raw)) : null;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private publish(
    status: SyncState['status'],
    message: string,
    remote: CloudSave | null = null,
    replace = false,
  ) {
    if (this.stopped) return;
    this.state = { status, message, remote, generation: this.state.generation + Number(replace) };
    for (const listener of this.listeners) listener();
  }
  start() {
    this.stopped = false;
    return this.sync();
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
  changed = () => {
    if (this.stopped || this.state.status === 'conflict') return;
    if (this.storage.getItem(STORAGE_KEY) === this.base?.payload) return;
    this.publish('pending', 'Guardando tu isla…');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.sync();
    }, 350);
  };
  private remember(save: CloudSave) {
    this.storage.setItem(BASE_KEY, JSON.stringify(save));
    this.base = save;
  }
  private adopt(save: CloudSave) {
    const progress = JSON.parse(save.payload) as Progress;
    if (!restoreProgress(this.storage, progress))
      throw new Error('No se pudo guardar la copia local.');
    this.remember(save);
    this.publish('saved', 'Tu isla está guardada en tu cuenta.', null, true);
  }
  sync = (): Promise<void> => {
    if (this.stopped || this.state.status === 'conflict') return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.reconcile()
      .catch(() => {
        this.publish(
          'error',
          'No se ha podido sincronizar. Tu partida sigue aquí. Reintenta antes de cambiar de dispositivo.',
        );
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  };
  private async reconcile() {
    const remote = await this.cloud.read();
    if (this.stopped) return;
    // Read AFTER the network request: the child may have answered while it was in flight.
    const local = this.storage.getItem(STORAGE_KEY);
    if (local && !isProgress(JSON.parse(local))) throw new Error('Partida local incompatible');
    if (remote && local === remote.payload) {
      this.remember(remote);
      this.publish('saved', 'Tu isla está guardada en tu cuenta.');
      return;
    }
    if (remote && (!local || local === this.base?.payload)) {
      this.adopt(remote);
      return;
    }
    if (remote && remote.revision !== this.base?.revision) {
      this.publish(
        'conflict',
        'Hay dos aventuras diferentes. Elige cuál quieres continuar.',
        remote,
      );
      return;
    }
    if (!remote && this.base) throw new Error('La partida remota ya no está disponible');
    if (!local) {
      this.publish('saved', 'La cuenta está lista para tu primera aventura.');
      return;
    }
    try {
      const saved = await this.cloud.write(remote?.revision ?? 0, local);
      if (this.stopped) return;
      this.remember(saved);
      if (this.storage.getItem(STORAGE_KEY) !== local) {
        // A new answer arrived during the write; send that answer next.
        await this.reconcile();
      } else this.publish('saved', 'Tu isla está guardada en tu cuenta.');
    } catch (error) {
      if (error instanceof ConflictError) await this.reconcile();
      else throw error;
    }
  }
  async resolve(choice: 'local' | 'remote') {
    const remote = this.state.remote;
    if (this.state.status !== 'conflict' || !remote || this.running) return;
    // Keep both alternatives before an explicit choice, including the remote one.
    this.storage.setItem(`${STORAGE_KEY}.conflict-local`, this.storage.getItem(STORAGE_KEY) ?? '');
    this.storage.setItem(`${STORAGE_KEY}.conflict-remote`, remote.payload);
    if (choice === 'remote') this.adopt(remote);
    else {
      this.remember(remote);
      this.publish('pending', 'Guardando la aventura elegida…');
    }
    await this.sync();
  }
}
