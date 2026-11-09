// Sealed box for secret specialist prompts.
// Browser (author) seals to the Sublee prompt public key (X25519); only the server can unseal.
// Format (hex): ephemeral_x25519_pub(32) || nonce(24) || ciphertext+tag. HKDF info differs from E2EE on purpose.
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes, concatBytes } from '@noble/hashes/utils.js';

const INFO = utf8ToBytes('sublee_prompt_seal_v1');

function key(shared: Uint8Array, ephPub: Uint8Array, recipientPub: Uint8Array) {
  // Bind both public keys into the KDF salt so the ciphertext can't be re-targeted.
  return hkdf(sha256, shared, concatBytes(ephPub, recipientPub), INFO, 32);
}

export function sealPrompt(recipientPubHex: string, prompt: string): string {
  const recipient = hexToBytes(recipientPubHex);
  const ephSecret = x25519.utils.randomSecretKey();
  const ephPub = x25519.getPublicKey(ephSecret);
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(key(x25519.getSharedSecret(ephSecret, recipient), ephPub, recipient), nonce).encrypt(
    utf8ToBytes(prompt),
  );
  return bytesToHex(concatBytes(ephPub, nonce, ct));
}

export function unsealPrompt(secretHex: string, sealedHex: string): string {
  const secret = hexToBytes(secretHex);
  const buf = hexToBytes(sealedHex);
  if (buf.length < 72) throw new Error('sealed prompt too short');
  const ephPub = buf.subarray(0, 32);
  const nonce = buf.subarray(32, 56);
  const recipientPub = x25519.getPublicKey(secret);
  const k = key(x25519.getSharedSecret(secret, ephPub), ephPub, recipientPub);
  return new TextDecoder().decode(xchacha20poly1305(k, nonce).decrypt(buf.subarray(56)));
}

export const promptPublicKey = (secretHex: string) => bytesToHex(x25519.getPublicKey(hexToBytes(secretHex)));
