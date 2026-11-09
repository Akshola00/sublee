import { randomBytes } from 'node:crypto';
import { js_get_collateral, js_verify } from '@phala/dcap-qvl-node';
const nonce = randomBytes(32).toString('hex');
const r = await (await fetch(`https://cloud-api.near.ai/v1/attestation/report?model=z-ai/glm-5.3-flash&provider=near&signing_algo=ed25519&include_tls_fingerprint=false&nonce=${nonce}`, { headers: { 'x-no-aliasing': 'true' } })).json() as any;
const a = r.model_attestations[0]; const q = Buffer.from(a.intel_quote, 'hex');
const raw = q.subarray(568, 632).toString('hex');
const v: any = js_verify(q, await js_get_collateral('https://api.trustedservices.intel.com/tdx/certification/v4', q), BigInt(Math.floor(Date.now()/1000)));
console.log('version', q.readUInt16LE(0), 'tee', q.readUInt32LE(4).toString(16), 'match', raw === v.report.TD10.report_data.replace(/^0x/,''), 'nonce in raw', raw.endsWith(nonce));
console.log('keys', Object.keys(a));
