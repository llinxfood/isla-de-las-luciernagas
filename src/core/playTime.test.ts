import { describe, expect, it } from 'vitest';
import { legacySave } from '../../tests/fixtures/progress-v1';
import { gameReducer } from './game';
import { freshProgress, type Progress } from './model';
import { isPlayTime, localDay, recordPlayTime, remainingPlayMs } from './playTime';
import { createBackup, isProgress, parseBackup } from './storage';
import { checkParentPin, createParentPin } from '../components/parentPin';
const now = new Date(2026, 9, 3, 12).getTime();
const pin = { salt: 'a'.repeat(32), hash: 'b'.repeat(64) };
const limited = (usedMs = 0): Progress => ({
  ...parseBackup(legacySave),
  playTime: { dailyMinutes: 5, day: localDay(now), usedMs, pin },
});

describe('límite diario y conservación de partidas', () => {
  it('abre partidas históricas sin activar ningún límite', () => {
    expect(remainingPlayMs(parseBackup(legacySave), now)).toBe(Infinity);
    expect(recordPlayTime(freshProgress(), 1000, now)).toEqual(freshProgress());
  });
  it('acumula tiempo y se detiene exactamente en el límite conservando toda la expedición', () => {
    const original = limited(299000);
    const charged = gameReducer(original, { type: 'play-time', elapsedMs: 4000, now });
    expect(charged).toEqual({ ...original, playTime: { ...original.playTime, usedMs: 300000 } });
    expect(remainingPlayMs(charged, now)).toBe(0);
    const current = charged.expedition!.questions[0];
    expect(
      gameReducer(charged, {
        type: 'answer',
        answer: current.fact.a * current.fact.b,
        durationMs: 1000,
        now,
      }),
    ).toBe(charged);
    expect(gameReducer(charged, { type: 'next', now })).toBe(charged);
    expect(
      gameReducer({ ...charged, expedition: null }, { type: 'start', table: 1, now }).expedition,
    ).toBeNull();
    expect(parseBackup(createBackup(charged))).toEqual(charged);
  });
  it('renueva el cupo al cambiar de día y no al retroceder el reloj', () => {
    const original = limited(300000);
    const tomorrow = new Date(2026, 9, 4, 0, 0).getTime();
    expect(remainingPlayMs(original, tomorrow)).toBe(300000);
    expect(recordPlayTime(original, 0, tomorrow).playTime).toEqual({
      ...original.playTime,
      day: localDay(tomorrow),
      usedMs: 0,
    });
    expect(remainingPlayMs(original, now - 86400000)).toBe(0);
  });
  it('cambiar, quitar o reactivar el límite no borra el tiempo utilizado', () => {
    const original = limited(400000);
    expect(recordPlayTime(original, 1000, now)).toBe(original);
    const disabled = gameReducer(original, {
      type: 'play-limit',
      playTime: { ...original.playTime!, dailyMinutes: 0 },
    });
    expect(remainingPlayMs(disabled, now)).toBe(Infinity);
    expect(disabled.playTime!.usedMs).toBe(400000);
    const reenabled = gameReducer(disabled, {
      type: 'play-limit',
      playTime: { ...disabled.playTime!, dailyMinutes: 10 },
    });
    expect(remainingPlayMs(reenabled, now)).toBe(200000);
  });
  it('rechaza límites, fechas, tiempos y hashes inválidos sin aceptar un guardado dañado', () => {
    const original = limited();
    for (const patch of [
      { dailyMinutes: -1 },
      { dailyMinutes: 4 },
      { dailyMinutes: 121 },
      { dailyMinutes: 5.5 },
      { usedMs: -1 },
      { usedMs: NaN },
      { day: '2026-02-30' },
      { pin: { salt: [pin.salt], hash: pin.hash } },
      { pin: { salt: '', hash: '' } },
    ]) {
      expect(isPlayTime({ ...original.playTime, ...patch })).toBe(false);
      expect(isProgress({ ...original, playTime: { ...original.playTime, ...patch } })).toBe(false);
    }
    for (const invalid of [-1, NaN, Infinity])
      expect(recordPlayTime(original, invalid, now)).toBe(original);
  });
});
it('el PIN se conserva como un hash con sal y comprueba aciertos y errores', async () => {
  const saved = await createParentPin('1234');
  expect(isPlayTime({ dailyMinutes: 15, day: localDay(now), usedMs: 0, pin: saved })).toBe(true);
  expect(await checkParentPin('1234', saved)).toBe(true);
  expect(await checkParentPin('9999', saved)).toBe(false);
  expect(await checkParentPin('', saved)).toBe(false);
  expect(saved.hash).not.toBe('1234');
});
