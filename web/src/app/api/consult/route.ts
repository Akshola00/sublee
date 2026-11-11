// Forwards an end-to-end-encrypted consult to the NEAR AI enclave.
// PRIVACY: this handler only ever holds ciphertext of the patient's case and the model's reply.
// The only plaintext here is the author's specialist prompt (unsealed in memory, re-encrypted to the enclave).
// Never log request or response bodies.
import { after } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { CONTRACT_ID, NEARAI_API, consultAuthMessage } from '@/lib/config';
import { encryptTo } from '@/lib/crypto/e2ee';
import { unsealPrompt } from '@/lib/crypto/seal';
import { SAFETY_PREAMBLE } from '@/lib/server/preamble';
import { claimConsult, getConsult, getPrompt, getSealedPrompt, markUsed, refundConsult, verifyNep413 } from '@/lib/server/near';

export const maxDuration = 120;

const Hex = z.string().regex(/^[0-9a-f]+$/i);
const Body = z.object({
  consultId: z.number().int().positive(),
  modelPubKey: Hex.length(64),
  clientPubKey: Hex.length(64),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: Hex.max(4_000_000) }))
    .min(1)
    .max(20),
  auth: z.object({
    accountId: z.string().min(2).max(64),
    publicKey: z.string().startsWith('ed25519:'),
    signature: z.string().max(200),
    nonce: z.string().max(100),
  }),
});

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 8_000_000) return fail(413, 'too large');
  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(raw));
  } catch {
    return fail(400, 'bad request');
  }
  if (!parsed.success) return fail(400, 'bad request');
  const { consultId, modelPubKey, clientPubKey, messages, auth } = parsed.data;

  // 1. The wallet that paid signed this exact set of ciphertexts.
  const bodyHash = createHash('sha256').update(JSON.stringify({ consultId, modelPubKey, clientPubKey, messages })).digest('hex');
  const okSig = await verifyNep413({
    accountId: auth.accountId,
    publicKey: auth.publicKey,
    signatureB64: auth.signature,
    nonceB64: auth.nonce,
    message: consultAuthMessage(consultId, bodyHash),
  });
  if (!okSig) return fail(401, 'signature invalid');

  // 2. Consult is paid by this wallet.
  const consult = await getConsult(consultId);
  if (!consult || consult.patient_id !== auth.accountId) return fail(403, 'not your consult');
  if (consult.status !== 'Paid') return fail(409, `consult is ${consult.status.toLowerCase()}`);

  const [prompt, sealed] = await Promise.all([getPrompt(consult.token_id), getSealedPrompt(consult.token_id)]);
  if (!prompt || !sealed) return fail(404, 'specialist not found');

  // 3. Lock it on-chain (atomic single use). Anything failing after this point refunds.
  try {
    await claimConsult(consultId);
  } catch {
    return fail(409, 'consult already in use');
  }

  let settled = false;
  const settle = async (ok: boolean) => {
    if (settled) return;
    settled = true;
    try {
      await (ok ? markUsed(consultId) : refundConsult(consultId));
    } catch {
      // Ops alert only: no payload, no case data.
      console.error(`settle failed consult=${consultId} ok=${ok}`);
    }
  };

  let upstream: Response;
  try {
    const authorPrompt = unsealPrompt(process.env.PROMPT_SEAL_SECRET!, sealed[0]);
    const system = [
      { role: 'system', content: encryptTo(modelPubKey, SAFETY_PREAMBLE) },
      { role: 'system', content: encryptTo(modelPubKey, `Specialist persona:\n${authorPrompt}`) },
    ];
    upstream = await fetch(`${NEARAI_API}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEARAI_API_KEY}`,
        'Content-Type': 'application/json',
        'x-no-aliasing': 'true',
        'X-Signing-Algo': 'ed25519',
        'X-Client-Pub-Key': clientPubKey,
        'X-Model-Pub-Key': modelPubKey,
        'X-Encryption-Version': '2',
      },
      body: JSON.stringify({ model: prompt.model, stream: true, max_tokens: 4000, messages: [...system, ...messages] }),
    });
  } catch {
    after(() => settle(false));
    return fail(502, 'enclave unreachable — you have been refunded');
  }

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status;
    after(() => settle(false));
    // 402 = Sublee's NEAR AI account is out of credits. Tell the client so it can explain (and offer a labelled sample).
    if (status === 402) return Response.json({ error: 'Sublee’s AI credits have run out, so the enclave couldn’t answer. You have been refunded.', code: 'no_credits' }, { status: 402 });
    return fail(502, `enclave error ${status} — you have been refunded`);
  }

  // 4. Pipe the encrypted SSE stream straight through; release escrow only if it completes.
  let sawDone = false;
  let tail = '';
  const decoder = new TextDecoder();
  const watcher = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) {
      tail = (tail + decoder.decode(chunk, { stream: true })).slice(-64);
      if (tail.includes('[DONE]')) sawDone = true;
      ctl.enqueue(chunk);
    },
    flush() {
      void settle(sawDone);
    },
  });
  after(async () => {
    // Keep the function alive until the stream settles (or give up and refund).
    for (let i = 0; i < 240 && !settled; i++) await new Promise((r) => setTimeout(r, 500));
    if (!settled) await settle(false);
  });

  return new Response(upstream.body.pipeThrough(watcher), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Sublee-Model': prompt.model,
      'X-Sublee-Contract': CONTRACT_ID,
    },
  });
}
