import { describe, expect, it } from 'vitest';
import { generateClientKeys, encryptTo, decryptWith, isHexCipher } from './e2ee';

describe('NEAR AI E2EE v2', () => {
  it('round-trips unicode', () => {
    const k = generateClientKeys();
    const msg = 'Patient: 34y, fever 38.5°C 🩺';
    const ct = encryptTo(k.publicHex, msg);
    expect(isHexCipher(ct)).toBe(true);
    expect(decryptWith(k.secret, ct)).toBe(msg);
  });
  it('uses a fresh ephemeral key per message', () => {
    const k = generateClientKeys();
    expect(encryptTo(k.publicHex, 'x').slice(0, 64)).not.toBe(encryptTo(k.publicHex, 'x').slice(0, 64));
  });
  it('rejects tampered ciphertext', () => {
    const k = generateClientKeys();
    const ct = encryptTo(k.publicHex, 'secret');
    const bad = ct.slice(0, -2) + (ct.endsWith('00') ? '01' : '00');
    expect(() => decryptWith(k.secret, bad)).toThrow();
  });
  it('rejects the wrong recipient key', () => {
    const a = generateClientKeys(), b = generateClientKeys();
    expect(() => decryptWith(b.secret, encryptTo(a.publicHex, 'secret'))).toThrow();
  });
});
