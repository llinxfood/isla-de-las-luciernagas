import { expect, it } from 'vitest';
import { legacySave } from '../../tests/fixtures/progress-v1';
import { freshProgress } from '../core/model';
import { STORAGE_KEY } from '../core/storage';
import {
  accountStorage,
  ConflictError,
  decodeCloudSave,
  SyncSession,
  type CloudPort,
  type CloudSave,
} from './sync';
function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function cloud(initial: CloudSave | null = null) {
  let current = initial;
  const port: CloudPort = {
    read: async () => current,
    write: async (revision, payload) => {
      if ((current?.revision ?? 0) !== revision) throw new ConflictError();
      return (current = { revision: revision + 1, payload });
    },
  };
  return {
    port,
    set: (save: CloudSave) => {
      current = save;
    },
    get: () => current,
  };
}
it('separa invitados y cuentas, sin cambiar la clave histórica', () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, legacySave);
  const a = accountStorage(storage, 'a');
  const b = accountStorage(storage, 'b');
  a.setItem(STORAGE_KEY, 'cuenta a');
  expect(b.getItem(STORAGE_KEY)).toBeNull();
  expect(storage.getItem(STORAGE_KEY)).toBe(legacySave);
});
it('descarga una partida en un dispositivo nuevo y conserva todos los datos', async () => {
  const storage = memory();
  const remote = cloud({ revision: 8, payload: legacySave });
  const session = new SyncSession(storage, remote.port);
  await session.start();
  expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(JSON.parse(legacySave)));
  expect(session.state.status).toBe('saved');
  session.stop();
});
it('sube una partida existente y reabre su copia sin repetir escrituras', async () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, legacySave);
  const remote = cloud();
  const session = new SyncSession(storage, remote.port);
  await session.start();
  expect(remote.get()).toEqual({ revision: 1, payload: legacySave });
  session.stop();
  const reopened = new SyncSession(storage, remote.port);
  await reopened.start();
  expect(remote.get()?.revision).toBe(1);
  reopened.stop();
});
it('detecta avances simultáneos y conserva ambas alternativas antes de elegir', async () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, legacySave);
  const remote = cloud();
  const session = new SyncSession(storage, remote.port);
  await session.start();
  const local = JSON.stringify({ ...JSON.parse(legacySave), lights: 99 });
  storage.setItem(STORAGE_KEY, local);
  const other = JSON.stringify({ ...JSON.parse(legacySave), lights: 100 });
  remote.set({ revision: 2, payload: other });
  await session.sync();
  expect(session.state.status).toBe('conflict');
  expect(remote.get()?.payload).toBe(other);
  await session.resolve('local');
  expect(remote.get()).toEqual({ revision: 3, payload: local });
  expect(storage.getItem(`${STORAGE_KEY}.conflict-remote`)).toBe(other);
  expect(storage.getItem(`${STORAGE_KEY}.conflict-local`)).toBe(local);
  session.stop();
});
it('mantiene cambios realizados mientras una escritura está en vuelo', async () => {
  const storage = memory();
  const initial = JSON.stringify(freshProgress());
  storage.setItem(STORAGE_KEY, initial);
  const changed = JSON.stringify({ ...freshProgress(), settings: { sound: true, motion: true } });
  const remote = cloud();
  let first = true;
  const session = new SyncSession(storage, {
    ...remote.port,
    write: async (revision, payload) => {
      if (first) {
        first = false;
        storage.setItem(STORAGE_KEY, changed);
      }
      return remote.port.write(revision, payload);
    },
  });
  await session.start();
  expect(remote.get()).toEqual({ revision: 2, payload: changed });
  session.stop();
});
it('un fallo de red conserva cambios y se recupera al reconectar', async () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, legacySave);
  const remote = cloud();
  let offline = true;
  const session = new SyncSession(storage, {
    ...remote.port,
    read: async () => {
      if (offline) throw new Error('offline');
      return remote.port.read();
    },
  });
  await session.start();
  expect(session.state.status).toBe('error');
  expect(storage.getItem(STORAGE_KEY)).toBe(legacySave);
  offline = false;
  await session.sync();
  expect(session.state.status).toBe('saved');
  session.stop();
});
it('reintenta un conflicto de revisión sin sobrescribir el avance remoto', async () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, legacySave);
  const remote = cloud();
  let once = true;
  const other = JSON.stringify({ ...JSON.parse(legacySave), lights: 100 });
  const session = new SyncSession(storage, {
    ...remote.port,
    write: async (revision, payload) => {
      if (once) {
        once = false;
        remote.set({ revision: 1, payload: other });
      }
      return remote.port.write(revision, payload);
    },
  });
  await session.start();
  expect(session.state.status).toBe('conflict');
  await session.resolve('remote');
  expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(JSON.parse(other));
  session.stop();
});
it('rechaza partidas incompatibles y conserva el progreso ante un error local', async () => {
  expect(() => decodeCloudSave({ revision: 1, payload: '{"version":2}' })).toThrow();
  const storage = memory();
  storage.setItem(STORAGE_KEY, legacySave);
  const session = new SyncSession(
    {
      ...storage,
      setItem: () => {
        throw new Error('quota');
      },
    },
    cloud({ revision: 1, payload: legacySave }).port,
  );
  await session.start();
  expect(session.state.status).toBe('error');
  expect(storage.getItem(STORAGE_KEY)).toBe(legacySave);
  session.stop();
});
