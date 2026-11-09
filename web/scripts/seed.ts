// Mint the demo prompt NFTs from author.sublee.testnet (keys in ~/.near-credentials, legacy keychain).
// Usage (from web/): pnpm tsx --env-file=../.env scripts/seed.ts
import { execFileSync } from 'node:child_process';
import { DEMO_PROMPTS } from './demo-prompts';
import { sealPrompt, promptPublicKey } from '../src/lib/crypto/seal';

const CONTRACT = process.env.CONTRACT_ID ?? 'sublee.testnet';
const AUTHOR = process.env.SEED_AUTHOR ?? 'author.sublee.testnet';
const secret = process.env.PROMPT_SEAL_SECRET;
if (!secret) throw new Error('PROMPT_SEAL_SECRET missing');
const pub = promptPublicKey(secret);

const yocto = (near: string) => {
  const [w, f = ''] = near.split('.');
  return (BigInt(w) * 10n ** 24n + BigInt((f + '0'.repeat(24)).slice(0, 24))).toString();
};

for (const p of DEMO_PROMPTS) {
  const args = {
    args: {
      title: p.title,
      description: p.description,
      media: null,
      specialty: p.specialty,
      model: p.model,
      price_near: yocto(p.priceNear),
      price_usdc: String(Math.round(p.priceUsdc * 1_000_000)),
      price_cents: String(p.priceCents),
      sealed_prompt: sealPrompt(pub, p.prompt),
    },
  };
  const out = execFileSync('near', [
    'contract', 'call-function', 'as-transaction', CONTRACT, 'mint_prompt',
    'json-args', JSON.stringify(args), 'prepaid-gas', '100 Tgas', 'attached-deposit', '0.1 NEAR',
    'sign-as', AUTHOR, 'network-config', 'testnet', 'sign-with-legacy-keychain', 'send',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const id = out.match(/"(\d+)"\s*$/m)?.[1] ?? '?';
  console.log(`minted #${id}: ${p.title}`);
}
