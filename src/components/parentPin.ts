import type { ParentPin } from '../core/playTime';
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );
  return hex(bits);
}
export async function createParentPin(pin: string): Promise<ParentPin> {
  if (!/^\d{4}$/.test(pin)) throw new Error('invalid-pin');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await hashPin(pin, salt) };
}
export async function checkParentPin(pin: string, saved: ParentPin): Promise<boolean> {
  return /^\d{4}$/.test(pin) && (await hashPin(pin, saved.salt)) === saved.hash;
}
