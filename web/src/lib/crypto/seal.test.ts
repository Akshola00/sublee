import { describe, expect, it } from 'vitest';
import { x25519 } from '@noble/curves/ed25519.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sealPrompt, unsealPrompt, promptPublicKey } from './seal';

const secret = bytesToHex(x25519.utils.randomSecretKey());
describe('prompt seal', () => {
  it('round-trips', () => {
    const s = sealPrompt(promptPublicKey(secret), 'You are a cardiologist…');
    expect(unsealPrompt(secret, s)).toBe('You are a cardiologist…');
  });
  it('fails for another key', () => {
    const other = bytesToHex(x25519.utils.randomSecretKey());
    expect(() => unsealPrompt(other, sealPrompt(promptPublicKey(secret), 'x'))).toThrow();
  });
  it('fails when tampered', () => {
    const s = sealPrompt(promptPublicKey(secret), 'x');
    expect(() => unsealPrompt(secret, s.slice(0, -2) + (s.endsWith('00') ? '01' : '00'))).toThrow();
  });
});
