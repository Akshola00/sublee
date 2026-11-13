// Testnet only: gives a brand-new email (Privy) account a little test NEAR so it can pay and sign.
// Gated on a valid Privy login, only for implicit accounts that don't exist on-chain yet, and capped by
// the funder account's balance. No real money is involved.
import { z } from 'zod';
import { Account, FailoverRpcProvider, JsonRpcProvider, type KeyPairString } from 'near-api-js';
import { NETWORK, RPC_URLS } from '@/lib/config';
import { verifyPrivyToken } from '@/lib/server/privy-auth';

const FUND_YOCTO = 300_000_000_000_000_000_000_000n; // 0.3 NEAR
const Body = z.object({ accountId: z.string().regex(/^[0-9a-f]{64}$/), token: z.string().max(4000) });
const provider = new FailoverRpcProvider(RPC_URLS.map((url) => new JsonRpcProvider({ url })));

export async function POST(req: Request) {
  if (NETWORK !== 'testnet') return Response.json({ error: 'not available' }, { status: 404 });
  const id = process.env.FUNDER_ACCOUNT_ID;
  const key = process.env.FUNDER_PRIVATE_KEY as KeyPairString | undefined;
  if (!id || !key) return Response.json({ error: 'Funding isn’t set up' }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  if (!(await verifyPrivyToken(parsed.data.token))) return Response.json({ error: 'Sign in again' }, { status: 401 });

  const exists = await provider.viewAccount({ accountId: parsed.data.accountId, finality: 'final' } as never).then(
    () => true,
    () => false,
  );
  if (exists) return Response.json({ funded: false, reason: 'exists' });

  try {
    await new Account(id, provider, key).transfer({ receiverId: parsed.data.accountId, amount: FUND_YOCTO });
    return Response.json({ funded: true, amount: '0.3' });
  } catch {
    return Response.json({ error: 'Couldn’t add test NEAR right now. Try again in a minute.' }, { status: 502 });
  }
}
