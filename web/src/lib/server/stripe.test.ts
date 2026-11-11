import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { verifyWebhook } = await import('./stripe');

const secret = 'whsec_test';
const sign = (body: string, t: number, s = secret) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${body}`).digest('hex')}`;

describe('verifyWebhook', () => {
  const body = '{"type":"checkout.session.completed"}';
  const now = Math.floor(Date.now() / 1000);
  it('accepts a valid signature', () => expect(verifyWebhook(body, sign(body, now), secret)).toBe(true));
  it('rejects a tampered body', () => expect(verifyWebhook(body + ' ', sign(body, now), secret)).toBe(false));
  it('rejects the wrong secret', () => expect(verifyWebhook(body, sign(body, now, 'other'), secret)).toBe(false));
  it('rejects an old timestamp', () => expect(verifyWebhook(body, sign(body, now - 600), secret)).toBe(false));
  it('rejects a missing header', () => expect(verifyWebhook(body, null, secret)).toBe(false));
});
