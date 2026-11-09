// Headless end-to-end consult as patient.sublee.testnet against a running dev server.
// Usage (from web/): pnpm tsx scripts/e2e-consult.ts [tokenId] [baseUrl]
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import { Account, JsonRpcProvider, type KeyPairString } from 'near-api-js';
import { signMessage } from 'near-api-js/nep413';
import { bindingChecks, type ModelAttestation } from '../src/lib/attestation';
import { encryptTo, decryptWith, generateClientKeys, isHexCipher } from '../src/lib/crypto/e2ee';
import { consultAuthMessage, CONTRACT_ID, RPC_URL } from '../src/lib/config';
import { caseToMessage } from '../src/lib/schema';
import { SAMPLE_CASES } from '../src/lib/sample-cases';

const tokenId = process.argv[2] ?? '1';
const base = process.argv[3] ?? 'http://localhost:3000';
const PATIENT = 'patient.sublee.testnet';
const cred = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${PATIENT}.json`, 'utf8'));
const provider = new JsonRpcProvider({ url: RPC_URL });
const patient = new Account(PATIENT, provider, cred.private_key as KeyPairString);

const view = async <T,>(method: string, args: object) =>
  (await provider.callFunction({ contractId: CONTRACT_ID, method, args, finality: 'final' } as never)) as T;

const prompt = await view<{ model: string; price_near: string }>('get_prompt', { token_id: tokenId });
console.log(`specialist #${tokenId} model=${prompt.model} price=${prompt.price_near} yocto`);

// 1. Pay
const out = await patient.callFunctionRaw({ contractId: CONTRACT_ID, methodName: 'pay_consult_near', args: { token_id: tokenId }, deposit: prompt.price_near, gas: 100_000_000_000_000n });
const logs = out.receipts_outcome.flatMap((r) => r.outcome.logs);
const ev = logs.map((l) => (l.startsWith('EVENT_JSON:') ? JSON.parse(l.slice(11)) : null)).find((e) => e?.event === 'consult_paid');
console.log(JSON.stringify(ev)); const consultId = Number((Array.isArray(ev.data) ? ev.data[0] : ev.data).consult_id);
console.log(`paid → consult #${consultId}`);

// 2. Attest (browser-equivalent binding checks + server chain checks)
const nonce = randomBytes(32).toString('hex');
const rep = JSON.parse((await (await fetch(`https://cloud-api.near.ai/v1/attestation/report?model=${encodeURIComponent(prompt.model)}&provider=near&signing_algo=ed25519&include_tls_fingerprint=false&nonce=${nonce}`, { headers: { 'x-no-aliasing': 'true' } })).text()).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''));
const att: ModelAttestation = rep.model_attestations.find((a: ModelAttestation) => a.signing_algo === 'ed25519');
const checks = [...bindingChecks(att, nonce), ...((await (await fetch(`${base}/api/attest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intel_quote: att.intel_quote, nvidia_payload: att.nvidia_payload ?? null }) })).json()).checks)];
for (const c of checks) console.log(`${c.ok ? '✅' : '❌'} ${c.label} [${c.source}]`);

// 3. Encrypt + sign
const client = generateClientKeys();
const modelPubKey = att.signing_public_key.toLowerCase();
const messages = [{ role: 'user', content: encryptTo(modelPubKey, caseToMessage(SAMPLE_CASES[0].input)) }];
const payload = { consultId, modelPubKey, clientPubKey: client.publicHex, messages };
const bodyHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const n = randomBytes(32);
const signed = await signMessage({ signerAccount: patient, payload: { message: consultAuthMessage(consultId, bodyHash), recipient: CONTRACT_ID, nonce: n } });

// 4. Send
const res = await fetch(`${base}/api/consult`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...payload, auth: { accountId: PATIENT, publicKey: signed.publicKey.toString(), signature: Buffer.from(signed.signature).toString('base64'), nonce: n.toString('base64') } }),
});
console.log(`/api/consult → HTTP ${res.status}`);
if (!res.ok) console.log(await res.text());
else {
  let text = '';
  for (const line of (await res.text()).split('\n')) {
    if (!line.startsWith('data:') || line.includes('[DONE]')) continue;
    try {
      const piece = JSON.parse(line.slice(5)).choices?.[0]?.delta?.content;
      if (piece) text += isHexCipher(piece) ? decryptWith(client.secret, piece) : piece;
    } catch {}
  }
  console.log('--- decrypted ---\n' + text);
}

// 5. Settlement
await new Promise((r) => setTimeout(r, 6000));
console.log('consult status:', (await view<{ status: string }>('get_consult', { consult_id: consultId }))?.status);
