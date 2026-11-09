// Public key authors seal their prompts to (in the browser, before minting).
import { connection } from 'next/server';
import { promptPublicKey } from '@/lib/crypto/seal';

export async function GET() {
  await connection();
  const secret = process.env.PROMPT_SEAL_SECRET;
  if (!secret) return Response.json({ error: 'not configured' }, { status: 500 });
  return Response.json({ publicKey: promptPublicKey(secret), algorithm: 'x25519-hkdf-sha256-xchacha20poly1305' });
}
