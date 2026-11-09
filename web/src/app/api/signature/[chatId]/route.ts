// Fetches the enclave's signature for a completion (needs our API key). The browser verifies it
// against the attested key and against the bytes it received; this route can't forge it.
import type { NextRequest } from 'next/server';
import { NEARAI_API, E2EE_MODELS } from '@/lib/config';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/signature/[chatId]'>) {
  const { chatId } = await ctx.params;
  const model = req.nextUrl.searchParams.get('model') ?? '';
  if (!/^[\w-]{4,128}$/.test(chatId) || !(E2EE_MODELS as readonly string[]).includes(model)) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const res = await fetch(
    `${NEARAI_API}/v1/signature/${chatId}?model=${encodeURIComponent(model)}&signing_algo=ed25519`,
    { headers: { Authorization: `Bearer ${process.env.NEARAI_API_KEY}` }, cache: 'no-store' },
  );
  if (!res.ok) return Response.json({ error: 'signature unavailable' }, { status: res.status });
  return Response.json(await res.json());
}
