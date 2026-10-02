import { useRef, useState } from 'react';
import type { Progress } from '../core/model';
import { recoverFirstFourFriends } from '../core/recovery';
import {
  BACKUP_KEY,
  BEFORE_RESTORE_KEY,
  STORAGE_KEY,
  MAX_BACKUP_BYTES,
  createBackup,
  parseBackup,
  restoreProgress,
} from '../core/storage';

function downloadFile(content: string, label: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `luciernagas-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BackupPanel({
  progress,
  storage,
  protectedSave,
  onRestore,
}: {
  progress: Progress;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  protectedSave: boolean;
  onRestore: (progress: Progress) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Progress | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  function reportError(caught: unknown) {
    setError(caught instanceof Error ? caught.message : 'No se ha podido abrir la copia.');
  }
  function downloadCurrent() {
    setError('');
    try {
      const raw = protectedSave ? storage.getItem(STORAGE_KEY) : createBackup(progress);
      if (raw === null) throw new Error('No encontramos la partida original en este navegador.');
      downloadFile(raw, protectedSave ? 'original' : 'partida');
      setMessage(
        'Descarga solicitada. Conserva el archivo fuera del navegador para poder recuperar la partida.',
      );
    } catch (caught) {
      reportError(caught);
    }
  }
  async function readFile(file: File) {
    setPending(null);
    setError('');
    setMessage('');
    setReading(true);
    try {
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error('La copia es demasiado grande. El límite es 1 MB.');
      setPending(parseBackup(await file.text()));
    } catch (caught) {
      reportError(caught);
    } finally {
      setReading(false);
    }
  }
  function openPrevious() {
    setPending(null);
    setError('');
    setMessage('');
    try {
      const raw = storage.getItem(BACKUP_KEY);
      if (raw === null) throw new Error('Todavía no hay una copia automática anterior.');
      setPending(parseBackup(raw));
    } catch (caught) {
      reportError(caught);
    }
  }
  function downloadBeforeRestore() {
    setError('');
    try {
      const raw = storage.getItem(BEFORE_RESTORE_KEY);
      if (raw === null)
        throw new Error('Todavía no se ha restaurado ninguna partida en este navegador.');
      downloadFile(raw, 'antes-de-restaurar');
      setMessage('Descarga solicitada de la partida anterior a la última restauración.');
    } catch (caught) {
      reportError(caught);
    }
  }
  function confirmRestore() {
    if (!pending) return;
    setError('');
    try {
      if (!restoreProgress(storage, pending))
        throw new Error('No se pudo guardar la restauración. La partida actual no se ha cambiado.');
      onRestore(pending);
      setPending(null);
      setMessage('Partida restaurada. Puedes cerrar Ajustes y continuar tu aventura.');
    } catch (caught) {
      reportError(caught);
    }
  }
  function recoverFriends() {
    if (protectedSave || pending || reading) return;
    setError('');
    setMessage('');
    try {
      const recovered = recoverFirstFourFriends(progress);
      if (recovered === progress) return;
      if (!restoreProgress(storage, recovered))
        throw new Error('No se pudo guardar la recuperación. La partida actual no se ha cambiado.');
      onRestore(recovered);
      setMessage('Luma, Pipo, Coral y Mora están disponibles. Puedes cerrar Ajustes.');
    } catch (caught) {
      reportError(caught);
    }
  }
  return (
    <section className="backup-panel" aria-labelledby="backup-title">
      <h3 id="backup-title">Copia de tu aventura</h3>
      <p>
        Las actualizaciones conservan la partida de este navegador. Guarda también un archivo para
        recuperarla si cambias de dispositivo o borras sus datos.
      </p>
      <div className="backup-actions">
        <button className="secondary" onClick={downloadCurrent}>
          {protectedSave ? 'Descargar partida original' : 'Descargar copia'}
        </button>
        <button className="secondary" disabled={reading} onClick={() => fileInput.current?.click()}>
          Abrir una copia
        </button>
      </div>
      <input
        ref={fileInput}
        className="backup-file-input"
        type="file"
        accept=".json,application/json"
        aria-label="Archivo de copia de seguridad"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void readFile(file);
        }}
      />
      <details className="backup-recovery">
        <summary>Recuperar una partida anterior</summary>
        <p>
          Las copias automáticas viven en este navegador. También se borran si eliminas sus datos.
        </p>
        <button className="text-button" disabled={reading} onClick={openPrevious}>
          Ver copia automática anterior
        </button>
        <button className="text-button" onClick={downloadBeforeRestore}>
          Descargar partida previa a la restauración
        </button>
      </details>
      <details className="backup-recovery">
        <summary>Recuperar cuatro amigos sin copia</summary>
        <p>
          Desbloquea a Luma, Pipo, Coral y Mora en este dispositivo. Conserva los demás amigos, las
          operaciones practicadas y la aventura en curso. No añade aciertos ni luces. Guardaremos
          una copia de la partida actual antes de cambiarla.
        </p>
        {protectedSave && <p>Primero recupera la partida original con una copia compatible.</p>}
        <button
          className="secondary"
          disabled={protectedSave || reading || !!pending || progress.completed.length >= 4}
          onClick={recoverFriends}
        >
          {progress.completed.length >= 4
            ? 'Ya tienes los cuatro amigos'
            : 'Recuperar los cuatro amigos'}
        </button>
      </details>
      {pending && (
        <div className="backup-preview">
          <h4>Revisa la copia antes de restaurar</h4>
          <p>
            {pending.missions} expediciones · {pending.completed.length} refugios · {pending.lights}{' '}
            luces
          </p>
          {pending.expedition && (
            <p>
              Aventura en curso: tabla del {pending.expedition.table}, reto{' '}
              {pending.expedition.index + 1} de 24.
            </p>
          )}
          <p>
            Esta copia sustituirá la partida de este navegador. Guardaremos la actual antes de
            cambiarla.
          </p>
          <div className="backup-actions">
            <button className="primary" onClick={confirmRestore}>
              Restaurar esta copia
            </button>
            <button className="secondary" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <p role="status">{reading ? 'Leyendo copia…' : message}</p>
      {error && (
        <p className="backup-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
