// Testnet-only stand-in for card payments while Stripe isn't configured: credits $5 of test credit,
// at most once per account per day (the contract dedupes on the session id). No money moves.
import { z } from 'zod';
import { NETWORK } from '@/lib/config';
import { creditFiat } from '@/lib/server/near';
import { stripeEnabled } from '@/lib/server/stripe';
import { TEST_TOPUP_CENTS } from '@/lib/topup';

const Body = z.object({ accountId: z.string().regex(/^[a-z0-9._-]{2,64}$/) });

export async function POST(req: Request) {
  if (NETWORK !== 'testnet' || stripeEnabled()) return Response.json({ error: 'not available' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  const day = new Date().toISOString().slice(0, 10);
  try {
    const fresh = await creditFiat(parsed.data.accountId, TEST_TOPUP_CENTS, `test:${parsed.data.accountId}:${day}`);
    if (!fresh) return Response.json({ error: 'You’ve already had today’s test credit.' }, { status: 429 });
    return Response.json({ credited: true, cents: TEST_TOPUP_CENTS });
  } catch {
    return Response.json({ error: 'Couldn’t add test credit. Try again.' }, { status: 502 });
  }
}
