// Called when the patient lands back from Checkout. Reads the session from Stripe (never trusts the client)
// and credits it on-chain. Idempotent with the webhook: the contract ignores a session id it has seen.
import { z } from 'zod';
import { creditFiat } from '@/lib/server/near';
import { getCheckout, stripeEnabled } from '@/lib/server/stripe';

const Body = z.object({ sessionId: z.string().regex(/^cs_test_[A-Za-z0-9]+$/).max(200) });

export async function POST(req: Request) {
  if (!stripeEnabled()) return Response.json({ error: 'Card payments are not set up' }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  try {
    const s = await getCheckout(parsed.data.sessionId);
    const account = s.metadata.account_id;
    if (s.payment_status !== 'paid' || !account || !s.amount_total) return Response.json({ credited: false, status: s.payment_status });
    const fresh = await creditFiat(account, s.amount_total, s.id);
    return Response.json({ credited: true, fresh, cents: s.amount_total, accountId: account });
  } catch {
    return Response.json({ error: 'Couldn’t confirm the payment yet. Refresh in a moment.' }, { status: 502 });
  }
}
