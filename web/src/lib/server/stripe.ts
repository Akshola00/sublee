import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Minimal Stripe REST client (test mode). Only payment metadata passes through here, never case data.
const API = 'https://api.stripe.com/v1';

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

async function stripe<T>(path: string, init?: { method?: string; form?: Record<string, string> }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(init?.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init?.form ? new URLSearchParams(init.form) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`stripe ${res.status}`);
  return res.json() as Promise<T>;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number | null;
  metadata: Record<string, string>;
};

export const createCheckout = (accountId: string, cents: number, origin: string, returnPath: string) =>
  stripe<CheckoutSession>('/checkout/sessions', {
    method: 'POST',
    form: {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(cents),
      'line_items[0][price_data][product_data][name]': 'Sublee consult credit',
      'metadata[account_id]': accountId,
      client_reference_id: accountId.slice(0, 200),
      success_url: `${origin}${returnPath}${returnPath.includes('?') ? '&' : '?'}topup={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}`,
    },
  });

export const getCheckout = (id: string) => stripe<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}`);

/** Verify a Stripe-Signature header (v1 HMAC-SHA256 over `${t}.${body}`), within 5 minutes. */
export function verifyWebhook(body: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest();
  return header
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .some((p) => {
      const got = Buffer.from(p.slice(3), 'hex');
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
}
