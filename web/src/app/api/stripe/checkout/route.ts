// Starts a Stripe Checkout (test mode) for consult credit. The credit lands on-chain via the webhook or /confirm.
import { z } from 'zod';
import { createCheckout, stripeEnabled } from '@/lib/server/stripe';
import { TOPUP_CENTS } from '@/lib/topup';

const Body = z.object({
  accountId: z.string().regex(/^[a-z0-9._-]{2,64}$/),
  cents: z.number().int().refine((c) => (TOPUP_CENTS as readonly number[]).includes(c)),
  returnPath: z.string().regex(/^\/[A-Za-z0-9/_-]*$/).max(200),
});

export async function POST(req: Request) {
  if (!stripeEnabled()) return Response.json({ error: 'Card payments are not set up' }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  const { accountId, cents, returnPath } = parsed.data;
  try {
    const s = await createCheckout(accountId, cents, new URL(req.url).origin, returnPath);
    return Response.json({ url: s.url });
  } catch {
    return Response.json({ error: 'Couldn’t start the card payment' }, { status: 502 });
  }
}
