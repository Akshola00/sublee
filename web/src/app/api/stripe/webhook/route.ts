// Stripe webhook: checkout.session.completed → credit_fiat on-chain (idempotent on the session id).
import { creditFiat } from '@/lib/server/near';
import { verifyWebhook, type CheckoutSession } from '@/lib/server/stripe';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('not configured', { status: 503 });
  const body = await req.text();
  if (!verifyWebhook(body, req.headers.get('stripe-signature'), secret)) return new Response('bad signature', { status: 400 });
  const event = JSON.parse(body) as { type: string; data: { object: CheckoutSession } };
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    if (s.payment_status === 'paid' && s.metadata?.account_id && s.amount_total) {
      try {
        await creditFiat(s.metadata.account_id, s.amount_total, s.id);
      } catch {
        console.error(`credit_fiat failed session=${s.id}`);
        return new Response('retry', { status: 500 }); // Stripe retries
      }
    }
  }
  return new Response('ok');
}
