// Cancel paid, unused consults as patient.sublee.testnet via /api/consult/cancel.
// Usage (from web/): pnpm tsx scripts/e2e-cancel.mts <consultId...> [--base http://localhost:3000]
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { Account, JsonRpcProvider, type KeyPairString } from 'near-api-js';
import { signMessage } from 'near-api-js/nep413';
import { cancelAuthMessage, CONTRACT_ID, RPC_URL } from '../src/lib/config';

const args = process.argv.slice(2);
const bi = args.indexOf('--base');
const base = bi >= 0 ? args.splice(bi, 2)[1] : 'http://localhost:3000';
const PATIENT = 'patient.sublee.testnet';
const cred = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${PATIENT}.json`, 'utf8'));
const patient = new Account(PATIENT, new JsonRpcProvider({ url: RPC_URL }), cred.private_key as KeyPairString);

for (const id of args.map(Number)) {
  const nonce = randomBytes(32);
  const s = await signMessage({ signerAccount: patient, payload: { message: cancelAuthMessage(id), recipient: CONTRACT_ID, nonce } });
  const res = await fetch(`${base}/api/consult/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consultId: id, auth: { accountId: PATIENT, publicKey: s.publicKey.toString(), signature: Buffer.from(s.signature).toString('base64'), nonce: nonce.toString('base64') } }),
  });
  console.log(`consult #${id}: HTTP ${res.status} ${await res.text()}`);
}
