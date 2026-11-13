// Headless mint as author.sublee.testnet using the same path as the Create page:
// fetch /api/prompt-key → seal locally → mint_prompt. Then run e2e-consult against it to prove the server can unseal.
// Usage (from web/): pnpm tsx scripts/e2e-mint.mts [baseUrl]
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { Account, JsonRpcProvider, type KeyPairString } from 'near-api-js';
import { sealPrompt } from '../src/lib/crypto/seal';
import { CONTRACT_ID, RPC_URL } from '../src/lib/config';
import { dollarsToCents, nearToYocto, usdcToUnits } from '../src/lib/units';

const base = process.argv[2] ?? 'http://localhost:3000';
// MEDIA_BYTES=n mints with a fake n-byte data-URL photo, to check the 0.2 NEAR deposit covers it.
const mediaBytes = Number(process.env.MEDIA_BYTES ?? 0);
const media = mediaBytes ? `data:image/webp;base64,${'A'.repeat(mediaBytes - 23)}` : null;
const AUTHOR = 'author.sublee.testnet';
const cred = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${AUTHOR}.json`, 'utf8'));
const author = new Account(AUTHOR, new JsonRpcProvider({ url: RPC_URL }), cred.private_key as KeyPairString);

const { publicKey } = await (await fetch(`${base}/api/prompt-key`)).json();
const out = await author.callFunctionRaw({
  contractId: CONTRACT_ID,
  methodName: 'mint_prompt',
  args: { args: {
    title: 'E2E test specialist', description: 'Minted by scripts/e2e-mint.mts', media, specialty: 'test',
    model: 'z-ai/glm-5.3-flash', price_near: nearToYocto('0.01'), price_usdc: usdcToUnits('0'), price_cents: dollarsToCents('0.5'),
    sealed_prompt: sealPrompt(publicKey, 'You are a careful test specialist. Keep answers short.'),
  } },
  deposit: nearToYocto('0.2'),
  gas: 100_000_000_000_000n,
});
const ev = out.receipts_outcome.flatMap((r) => r.outcome.logs).find((l) => l.includes('"nft_mint"'));
const tokenId = JSON.parse(ev!.slice(11)).data[0].token_ids[0];
console.log(`minted token #${tokenId}`);
