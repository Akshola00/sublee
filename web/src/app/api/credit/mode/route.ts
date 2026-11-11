// Tells the client which top-up is available: real Stripe test checkout, or the testnet stand-in.
import { connection } from 'next/server';
import { stripeEnabled } from '@/lib/server/stripe';

export async function GET() {
  await connection(); // read env per request, not at build time
  return Response.json({ mode: stripeEnabled() ? 'stripe' : 'test' });
}
