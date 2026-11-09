// Patient-initiated refund of a paid consult that was never sent (e.g. the enclave couldn't be verified).
import { z } from 'zod';
import { cancelAuthMessage } from '@/lib/config';
import { getConsult, refundConsult, verifyNep413 } from '@/lib/server/near';

const Body = z.object({
  consultId: z.number().int().positive(),
  auth: z.object({
    accountId: z.string().min(2).max(64),
    publicKey: z.string().startsWith('ed25519:'),
    signature: z.string().max(200),
    nonce: z.string().max(100),
  }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  const { consultId, auth } = parsed.data;
  const ok = await verifyNep413({
    accountId: auth.accountId,
    publicKey: auth.publicKey,
    signatureB64: auth.signature,
    nonceB64: auth.nonce,
    message: cancelAuthMessage(consultId),
  });
  if (!ok) return Response.json({ error: 'signature invalid' }, { status: 401 });
  const c = await getConsult(consultId);
  if (!c || c.patient_id !== auth.accountId) return Response.json({ error: 'not your consult' }, { status: 403 });
  if (c.status !== 'Paid') return Response.json({ error: `consult is ${c.status.toLowerCase()}` }, { status: 409 });
  try {
    await refundConsult(consultId);
  } catch {
    return Response.json({ error: 'refund failed, try again' }, { status: 502 });
  }
  return Response.json({ refunded: true });
}
