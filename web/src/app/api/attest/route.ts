// Verifies the signature chains of an enclave quote the browser fetched itself.
// The browser already checked key + nonce binding against the same raw quote, so this
// route can't swap keys; it only answers "is this quote signed by genuine Intel TDX / NVIDIA hardware".
import { js_get_collateral, js_verify } from '@phala/dcap-qvl-node';
import { z } from 'zod';
import type { Check } from '@/lib/attestation';

export const maxDuration = 30;

const Body = z.object({
  intel_quote: z.string().regex(/^[0-9a-fA-F]+$/).max(40_000),
  nvidia_payload: z.string().max(200_000).nullable(),
});

const PCCS = 'https://api.trustedservices.intel.com/tdx/certification/v4';
const NRAS = 'https://nras.attestation.nvidia.com/v3/attest/gpu';
const TDX_OK = new Set(['UpToDate', 'OutOfDate', 'SWHardeningNeeded', 'ConfigurationAndSWHardeningNeeded']);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  const { intel_quote, nvidia_payload } = parsed.data;
  const checks: Check[] = [];

  try {
    const quote = Buffer.from(intel_quote, 'hex');
    const collateral = await js_get_collateral(PCCS, quote);
    const r = js_verify(quote, collateral, BigInt(Math.floor(Date.now() / 1000))) as { status?: string };
    checks.push({
      id: 'tdx',
      label: 'Intel confirms the hardware is genuine',
      ok: TDX_OK.has(r.status ?? ''),
      source: 'server',
      detail: `TCB status: ${r.status}`,
    });
  } catch {
    checks.push({ id: 'tdx', label: 'Intel confirms the hardware is genuine', ok: false, source: 'server', detail: 'quote did not verify' });
  }

  if (nvidia_payload) {
    try {
      const res = await fetch(NRAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: nvidia_payload,
      });
      const body = (await res.json()) as [string, string][];
      const jwt = body?.[0]?.[1] ?? '';
      const claims = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString() || '{}');
      const verdict = claims['x-nvidia-overall-att-result'];
      checks.push({
        id: 'gpu',
        label: 'NVIDIA confirms the AI chip is genuine',
        ok: verdict === true || verdict === 'true',
        source: 'server',
        detail: 'Verified by NVIDIA Remote Attestation Service',
      });
    } catch {
      checks.push({ id: 'gpu', label: 'NVIDIA confirms the AI chip is genuine', ok: false, source: 'server', detail: 'NVIDIA verifier unreachable' });
    }
  }

  return Response.json({ checks });
}
