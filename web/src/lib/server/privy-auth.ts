import 'server-only';
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';

// Verifies a Privy access token (ES256 JWT) against the app's published JWKS. No app secret needed.
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
let jwks: { keys: (JsonWebKey & { kid?: string })[] } | null = null;
let jwksAt = 0;

async function keys() {
  if (!jwks || Date.now() - jwksAt > 3_600_000) {
    const r = await fetch(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error('jwks unavailable');
    jwks = await r.json();
    jwksAt = Date.now();
  }
  return jwks!.keys;
}

const b64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Returns the Privy user id (DID) if the token is valid for our app, else null. */
export async function verifyPrivyToken(token: string): Promise<string | null> {
  if (!APP_ID) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64url(parts[0]!).toString()) as { alg?: string; kid?: string };
    if (header.alg !== 'ES256') return null;
    const jwk = (await keys()).find((k) => !header.kid || k.kid === header.kid);
    if (!jwk) return null;
    const ok = verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: createPublicKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, b64url(parts[2]!));
    if (!ok) return null;
    const c = JSON.parse(b64url(parts[1]!).toString()) as { iss?: string; aud?: string | string[]; exp?: number; sub?: string };
    const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
    if (c.iss !== 'privy.io' || !aud.includes(APP_ID) || !c.exp || c.exp * 1000 < Date.now() || !c.sub) return null;
    return c.sub;
  } catch {
    return null;
  }
}
