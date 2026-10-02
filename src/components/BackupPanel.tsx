import { useRef, useState } from 'react';
import type { Progress } from '../core/model';
import { recoverFirstFourFriends } from '../core/recovery';
import { useI18n } from '../i18n';
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
  const { t, core } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Progress | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  function reportError(caught: unknown) {
    setError(caught instanceof Error ? core(caught.message) : t.backupOpenError);
  }
  function downloadCurrent() {
    setError('');
    try {
      const raw = protectedSave ? storage.getItem(STORAGE_KEY) : createBackup(progress);
      if (raw === null) throw new Error(t.noOriginal);
      downloadFile(raw, protectedSave ? 'original' : 'partida');
      setMessage(t.downloadRequested);
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
      if (file.size > MAX_BACKUP_BYTES) throw new Error(t.tooBig);
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
      if (raw === null) throw new Error(t.noPrevious);
      setPending(parseBackup(raw));
    } catch (caught) {
      reportError(caught);
    }
  }
  function downloadBeforeRestore() {
    setError('');
    try {
      const raw = storage.getItem(BEFORE_RESTORE_KEY);
      if (raw === null) throw new Error(t.noRestoreYet);
      downloadFile(raw, 'antes-de-restaurar');
      setMessage(t.downloadBeforeRestoreDone);
    } catch (caught) {
      reportError(caught);
    }
  }
  function confirmRestore() {
    if (!pending) return;
    setError('');
    try {
      if (!restoreProgress(storage, pending)) throw new Error(t.restoreFailed);
      onRestore(pending);
      setPending(null);
      setMessage(t.restored);
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
      if (!restoreProgress(storage, recovered)) throw new Error(t.recoverFailed);
      onRestore(recovered);
      setMessage(t.recovered);
    } catch (caught) {
      reportError(caught);
    }
  }
  return (
    <section className="backup-panel" aria-labelledby="backup-title">
      <h3 id="backup-title">{t.backupTitle}</h3>
      <p>{t.backupIntro}</p>
      <div className="backup-actions">
        <button className="secondary" onClick={downloadCurrent}>
          {protectedSave ? t.downloadOriginal : t.downloadCopy}
        </button>
        <button className="secondary" disabled={reading} onClick={() => fileInput.current?.click()}>
          {t.openCopy}
        </button>
      </div>
      <input
        ref={fileInput}
        className="backup-file-input"
        type="file"
        accept=".json,application/json"
        aria-label={t.backupFile}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void readFile(file);
        }}
      />
      <details className="backup-recovery">
        <summary>{t.recoverPrevious}</summary>
        <p>{t.autoCopiesNote}</p>
        <button className="text-button" disabled={reading} onClick={openPrevious}>
          {t.viewPrevious}
        </button>
        <button className="text-button" onClick={downloadBeforeRestore}>
          {t.downloadBeforeRestore}
        </button>
      </details>
      <details className="backup-recovery">
        <summary>{t.recoverFour}</summary>
        <p>{t.recoverFourText}</p>
        {protectedSave && <p>{t.recoverOriginalFirst}</p>}
        <button
          className="secondary"
          disabled={protectedSave || reading || !!pending || progress.completed.length >= 4}
          onClick={recoverFriends}
        >
          {progress.completed.length >= 4 ? t.haveFour : t.recoverFourButton}
        </button>
      </details>
      {pending && (
        <div className="backup-preview">
          <h4>{t.reviewCopy}</h4>
          <p>{t.copySummary(pending.missions, pending.completed.length, pending.lights)}</p>
          {pending.expedition && (
            <p>{t.copyInProgress(pending.expedition.table, pending.expedition.index + 1)}</p>
          )}
          <p>{t.copyReplaces}</p>
          <div className="backup-actions">
            <button className="primary" onClick={confirmRestore}>
              {t.restoreThis}
            </button>
            <button className="secondary" onClick={() => setPending(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      <p role="status">{reading ? t.readingCopy : message}</p>
      {error && (
        <p className="backup-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
