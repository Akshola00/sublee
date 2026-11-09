// Spike: verify NEAR AI model attestation, then send an E2EE chat completion and decrypt it.
// Usage: pnpm tsx run.ts [--model z-ai/glm-5.3-flash] [--image path.png] [--skip-chat]
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { js_get_collateral, js_verify } from '@phala/dcap-qvl-node';
import { generateClientKeys, encryptTo, decryptWith, isHexCipher } from './e2ee.ts';

const API = 'https://cloud-api.near.ai';
const KEY = process.env.NEARAI_API_KEY ?? '';
const args = process.argv.slice(2);
const arg = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const model = arg('--model') ?? 'z-ai/glm-5.3-flash';
const imagePath = arg('--image');
const skipChat = args.includes('--skip-chat');

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const check = (name: string, ok: boolean, detail?: string) => { checks.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function attest() {
  const nonce = randomBytes(32).toString('hex');
  const url = `${API}/v1/attestation/report?model=${encodeURIComponent(model)}&provider=near&signing_algo=ed25519&include_tls_fingerprint=false&nonce=${nonce}`;
  const res = await fetch(url, { headers: { 'x-no-aliasing': 'true' } });
  const report = JSON.parse(await res.text(), (_k, v) => v); // tolerate control chars below if needed
  const att = report.model_attestations?.[0];
  if (!att) throw new Error('no model attestation: ' + JSON.stringify(report).slice(0, 300));
  console.log(`model attestation: ${att.model_name ?? model}, signing_algo=${att.signing_algo}`);

  // 1. TDX quote via Intel collateral
  const quote = Buffer.from(att.intel_quote, 'hex');
  const collateral = await js_get_collateral('https://api.trustedservices.intel.com/tdx/certification/v4', quote);
  const r: any = js_verify(quote, collateral, BigInt(Math.floor(Date.now() / 1000)));
  check('Intel TDX quote verifies', ['UpToDate', 'OutOfDate', 'SWHardeningNeeded', 'ConfigurationAndSWHardeningNeeded'].includes(r.status), `status=${r.status}`);
  const reportData = Buffer.from((r.report?.TD10?.report_data ?? '').replace(/^0x/, ''), 'hex');

  // 2. report_data binds signing key (first 32) and our nonce (second 32)
  const signer = Buffer.from(att.signing_address ?? att.signing_public_key, 'hex');
  const padded = Buffer.concat([signer, Buffer.alloc(32 - signer.length)]);
  check('Report data binds the model signing key', reportData.subarray(0, 32).equals(padded));
  check('Report data contains our fresh nonce', reportData.subarray(32, 64).toString('hex') === nonce);
  check('Encryption key = attested signing key', (att.signing_public_key ?? '').toLowerCase() === signer.toString('hex'));

  // 3. NVIDIA GPU attestation via NRAS
  if (att.nvidia_payload) {
    const payload = JSON.parse(att.nvidia_payload);
    check('GPU evidence uses our nonce', String(payload.nonce).toLowerCase() === nonce);
    const g = await fetch('https://nras.attestation.nvidia.com/v3/attest/gpu', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    const body: any = await g.json();
    const jwt: string = body?.[0]?.[1] ?? '';
    const verdict = jwt ? JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())['x-nvidia-overall-att-result'] : undefined;
    check('NVIDIA GPU attestation passes', verdict === true || verdict === 'true', `verdict=${verdict}`);
  } else check('NVIDIA GPU attestation passes', false, 'no nvidia_payload');

  return { modelPub: att.signing_public_key as string, signingAddress: att.signing_address as string };
}

async function chat(modelPub: string) {
  const client = generateClientKeys();
  const caseText = 'Fictional case: 34-year-old, 3 days of fever 38.5C, sore throat, swollen neck glands, no cough. What could this be and what should I ask my doctor? Reply in under 120 words.';
  const content: any = imagePath
    ? JSON.stringify([{ type: 'text', text: caseText }, { type: 'image_url', image_url: { url: `data:image/png;base64,${readFileSync(imagePath).toString('base64')}` } }])
    : caseText;
  const body = JSON.stringify({ model, stream: false, max_tokens: 600, messages: [{ role: 'user', content: encryptTo(modelPub, typeof content === 'string' ? content : content) }] });
  const res = await fetch(`${API}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'x-no-aliasing': 'true',
      'X-Signing-Algo': 'ed25519', 'X-Client-Pub-Key': client.publicHex, 'X-Model-Pub-Key': modelPub, 'X-Encryption-Version': '2',
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) { console.log(`chat HTTP ${res.status}: ${text.slice(0, 400)}`); return; }
  const json = JSON.parse(text);
  const msg = json.choices?.[0]?.message ?? {};
  check('Response content was encrypted in transit', isHexCipher(msg.content));
  const out = isHexCipher(msg.content) ? decryptWith(client.secret, msg.content) : msg.content;
  console.log('\n--- decrypted opinion ---\n' + out + '\n-------------------------');

  // Response signature: text = sha256(request):sha256(response), signed by the attested key
  const sig = await (await fetch(`${API}/v1/signature/${json.id}?model=${encodeURIComponent(model)}&signing_algo=ed25519`, { headers: { Authorization: `Bearer ${KEY}` } })).json() as any;
  if (sig?.signature) {
    const [reqH, resH] = String(sig.text).split(':');
    check('Signed request hash matches what we sent', reqH === createHash('sha256').update(body).digest('hex'));
    check('Signed response hash matches what we got', resH === createHash('sha256').update(text).digest('hex'));
    const ok = ed25519.verify(hexToBytes(sig.signature.replace(/^0x/, '')), utf8ToBytes(sig.text), hexToBytes(modelPub));
    check('Response signature verifies against attested key', ok);
  } else check('Response signature available', false, JSON.stringify(sig).slice(0, 200));
}

const { modelPub } = await attest();
if (!skipChat) await chat(modelPub);
console.log(`\n${checks.filter(c => c.ok).length}/${checks.length} checks passed`);
