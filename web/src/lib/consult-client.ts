'use client';
// Browser-side consult: attest → encrypt → sign → stream → decrypt → verify signature.
// Plaintext case data never leaves this module except as ciphertext addressed to the attested enclave key.
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { attestModel, type AttestationResult, type Check } from './attestation';
import { cancelAuthMessage, consultAuthMessage } from './config';
import { decryptWith, encryptTo, generateClientKeys, isHexCipher } from './crypto/e2ee';

export type Stage = 'attesting' | 'encrypting' | 'signing' | 'thinking' | 'verifying' | 'done';

export type ConsultRun = {
  attestation: AttestationResult;
  text: string;
  chatId: string | null;
  responseChecks: Check[];
};

type Signer = (message: string, nonce: Uint8Array) => Promise<{ accountId: string; publicKey: string; signature: string }>;

/** Error from the consult server, with a machine-readable code when there is one. */
export class ConsultError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

export async function runConsult(opts: {
  consultId: number;
  model: string;
  caseText: string;
  sign: Signer;
  onStage: (s: Stage, a?: AttestationResult) => void;
  onText: (t: string) => void;
}): Promise<ConsultRun> {
  const { consultId, model, caseText, sign, onStage, onText } = opts;

  onStage('attesting');
  const attestation = await attestModel(model);
  onStage('attesting', attestation);
  if (!attestation.verified) throw new Error('The enclave did not pass verification, so nothing was sent.');

  onStage('encrypting', attestation);
  const client = generateClientKeys();
  const messages = [{ role: 'user' as const, content: encryptTo(attestation.modelPubKey, caseText) }];
  const payload = { consultId, modelPubKey: attestation.modelPubKey, clientPubKey: client.publicHex, messages };
  const bodyHash = bytesToHex(sha256(utf8ToBytes(JSON.stringify(payload))));

  onStage('signing', attestation);
  const nonce = randomBytes(32);
  const signed = await sign(consultAuthMessage(consultId, bodyHash), nonce);

  onStage('thinking', attestation);
  const res = await fetch('/api/consult', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      auth: { accountId: signed.accountId, publicKey: signed.publicKey, signature: signed.signature, nonce: b64(nonce) },
    }),
  });
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string; code?: string };
    throw new ConsultError(err.error ?? 'Consult failed', err.code);
  }

  // Decrypt each SSE delta as it arrives; keep the raw bytes to check the enclave's signature.
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let raw = '';
  let buf = '';
  let text = '';
  let chatId: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const s = dec.decode(value, { stream: true });
    raw += s;
    buf += s;
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        chatId ??= j.id ?? null;
        const piece = j.choices?.[0]?.delta?.content;
        if (piece) {
          text += isHexCipher(piece) ? decryptWith(client.secret, piece) : piece;
          onText(text);
        }
      } catch {}
    }
  }

  onStage('verifying', attestation);
  const responseChecks = await verifyResponse(chatId, model, raw, attestation.modelPubKey);
  onStage('done', attestation);
  return { attestation, text, chatId, responseChecks };
}

async function verifyResponse(chatId: string | null, model: string, raw: string, modelPubKey: string): Promise<Check[]> {
  if (!chatId) return [{ id: 'sig', label: 'The answer is signed by that same hardware', ok: false, source: 'browser', detail: 'no chat id' }];
  try {
    // Signatures can lag the stream by a moment.
    let sig: { text?: string; signature?: string } = {};
    for (let i = 0; i < 4 && !sig.signature; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1000));
      const r = await fetch(`/api/signature/${encodeURIComponent(chatId)}?model=${encodeURIComponent(model)}`);
      if (r.ok) sig = await r.json();
    }
    if (!sig.signature || !sig.text) throw new Error('unavailable');
    const [, resHash] = sig.text.split(':');
    const sigOk = ed25519.verify(hexToBytes(sig.signature.replace(/^0x/, '')), utf8ToBytes(sig.text), hexToBytes(modelPubKey));
    return [
      { id: 'sig', label: 'The answer is signed by that same hardware', ok: sigOk, source: 'browser' },
      { id: 'res-hash', label: 'The answer wasn’t changed on the way back', ok: resHash === bytesToHex(sha256(utf8ToBytes(raw))), source: 'browser' },
    ];
  } catch {
    return [{ id: 'sig', label: 'The answer is signed by that same hardware', ok: false, source: 'browser', detail: 'signature not available' }];
  }
}

/** Ask the server to refund a paid, unused consult. The wallet signature proves it's yours. */
export async function cancelConsult(consultId: number, sign: Signer): Promise<void> {
  const nonce = randomBytes(32);
  const s = await sign(cancelAuthMessage(consultId), nonce);
  const res = await fetch('/api/consult/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consultId, auth: { accountId: s.accountId, publicKey: s.publicKey, signature: s.signature, nonce: b64(nonce) } }),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Refund failed');
}
