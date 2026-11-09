// NEAR AI Cloud E2EE v2: Ed25519 -> X25519 ECDH, HKDF-SHA256("ed25519_encryption"), XChaCha20-Poly1305.
// Wire format (hex): ephemeral_x25519_pub(32) || nonce(24) || ciphertext+tag
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

const INFO = utf8ToBytes('ed25519_encryption');
const deriveKey = (shared: Uint8Array) => hkdf(sha256, shared, undefined, INFO, 32);

export type ClientKeys = { secret: Uint8Array; publicHex: string };

export function generateClientKeys(): ClientKeys {
  const secret = ed25519.utils.randomSecretKey();
  return { secret, publicHex: bytesToHex(ed25519.getPublicKey(secret)) };
}

export function encryptTo(modelEdPubHex: string, plaintext: string): string {
  const recipient = ed25519.utils.toMontgomery(hexToBytes(modelEdPubHex));
  const ephSecret = x25519.utils.randomSecretKey();
  const ephPub = x25519.getPublicKey(ephSecret);
  const key = deriveKey(x25519.getSharedSecret(ephSecret, recipient));
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(plaintext));
  return bytesToHex(ephPub) + bytesToHex(nonce) + bytesToHex(ct);
}

export function decryptWith(clientEdSecret: Uint8Array, hex: string): string {
  const buf = hexToBytes(hex);
  if (buf.length < 32 + 24 + 16) throw new Error('ciphertext too short');
  const ephPub = buf.subarray(0, 32);
  const nonce = buf.subarray(32, 56);
  const ct = buf.subarray(56);
  const xSecret = ed25519.utils.toMontgomerySecret(clientEdSecret);
  const key = deriveKey(x25519.getSharedSecret(xSecret, ephPub));
  return new TextDecoder().decode(xchacha20poly1305(key, nonce).decrypt(ct));
}

export const isHexCipher = (s: unknown): s is string =>
  typeof s === 'string' && s.length > 144 && s.length % 2 === 0 && /^[0-9a-f]+$/i.test(s);
