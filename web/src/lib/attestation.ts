// Attestation checks for a NEAR AI model enclave.
// The browser fetches the report itself (CORS allowed) with a nonce it generated, and checks the
// key + nonce binding directly in the raw TDX quote. Signature-chain checks (Intel PCS, NVIDIA NRAS)
// run on our server because those services don't allow browser calls; they're labelled as such.
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { NEARAI_API } from './config';

export type CheckSource = 'browser' | 'server';
export type Check = { id: string; label: string; ok: boolean; source: CheckSource; detail?: string };

export type ModelAttestation = {
  model_name?: string;
  signing_algo: string;
  signing_address: string;
  signing_public_key: string;
  intel_quote: string;
  nvidia_payload?: string;
};

export type AttestationResult = {
  model: string;
  nonce: string;
  modelPubKey: string;
  checks: Check[];
  verified: boolean;
  fetchedAt: number;
};

// TDX quote v4: 48-byte header + TD report body; report_data is the last 64 bytes of the 584-byte body.
const REPORT_DATA_OFFSET = 568;

export function reportDataFromQuote(quoteHex: string): Uint8Array {
  const q = hexToBytes(quoteHex);
  if (q.length < REPORT_DATA_OFFSET + 64) throw new Error('quote too short');
  const version = q[0] | (q[1] << 8);
  if (version !== 4 && version !== 5) throw new Error(`unsupported quote version ${version}`);
  return q.subarray(REPORT_DATA_OFFSET, REPORT_DATA_OFFSET + 64);
}

/** Pure binding checks; safe to run anywhere. */
export function bindingChecks(att: ModelAttestation, nonce: string): Check[] {
  const checks: Check[] = [];
  let rd: Uint8Array | null = null;
  try {
    rd = reportDataFromQuote(att.intel_quote);
  } catch (e) {
    checks.push({ id: 'quote', label: 'Enclave quote is well-formed', ok: false, source: 'browser', detail: String(e) });
    return checks;
  }
  const key = att.signing_public_key.toLowerCase();
  const padded = key.padEnd(64, '0');
  checks.push({
    id: 'key-binding',
    label: 'Encryption key is sealed inside the enclave quote',
    ok: bytesToHex(rd.subarray(0, 32)) === padded && att.signing_algo === 'ed25519' && key.length === 64,
    source: 'browser',
  });
  checks.push({
    id: 'nonce',
    label: 'Quote is fresh (contains our random challenge)',
    ok: bytesToHex(rd.subarray(32, 64)) === nonce.toLowerCase(),
    source: 'browser',
  });
  if (att.nvidia_payload) {
    let gpuNonce = '';
    try {
      gpuNonce = String(JSON.parse(att.nvidia_payload).nonce ?? '').toLowerCase();
    } catch {}
    checks.push({ id: 'gpu-nonce', label: 'GPU evidence answers our challenge', ok: gpuNonce === nonce, source: 'browser' });
  }
  return checks;
}

/** Browser: fetch a fresh report, check bindings locally, then ask our server to verify the signature chains. */
export async function attestModel(model: string): Promise<AttestationResult> {
  const nonce = bytesToHex(randomBytes(32));
  const url = `${NEARAI_API}/v1/attestation/report?model=${encodeURIComponent(model)}&provider=near&signing_algo=ed25519&include_tls_fingerprint=false&nonce=${nonce}`;
  const res = await fetch(url, { headers: { 'x-no-aliasing': 'true' } });
  if (!res.ok) throw new Error(`attestation fetch failed (${res.status})`);
  const report = JSON.parse((await res.text()).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''));
  const atts: ModelAttestation[] = report.model_attestations ?? [];
  const att = atts.find((a) => a.signing_algo === 'ed25519');
  if (!att) throw new Error('no ed25519 model attestation returned');

  const checks = bindingChecks(att, nonce);
  try {
    const s = await fetch('/api/attest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intel_quote: att.intel_quote, nvidia_payload: att.nvidia_payload ?? null }),
    });
    const server = (await s.json()) as { checks?: Check[] };
    checks.push(...(server.checks ?? []));
  } catch {
    checks.push({ id: 'tdx', label: 'Intel TDX signature chain', ok: false, source: 'server', detail: 'verifier unreachable' });
  }
  return {
    model,
    nonce,
    modelPubKey: att.signing_public_key.toLowerCase(),
    checks,
    verified: checks.length > 0 && checks.every((c) => c.ok),
    fetchedAt: Date.now(),
  };
}
