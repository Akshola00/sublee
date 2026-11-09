// Read-only contract views over JSON-RPC. Works in server and client components.
import { CONTRACT_ID, RPC_URLS } from './config';
import type { PromptView } from './types';

export async function viewCall<T>(method: string, args: object = {}): Promise<T> {
  let lastErr: unknown;
  for (const url of RPC_URLS) {
    try {
      return await viewAt<T>(url, method, args);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function viewAt<T>(url: string, method: string, args: object): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'sublee', method: 'query',
      params: { request_type: 'call_function', finality: 'final', account_id: CONTRACT_ID, method_name: method, args_base64: btoa(JSON.stringify(args)) },
    }),
    cache: 'no-store',
  });
  const j = await res.json();
  if (j.error || j.result?.error) throw new Error(j.error?.message ?? j.result.error);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result)));
}

export const listPrompts = () => viewCall<PromptView[]>('list_prompts', { limit: 100 });
export const getPrompt = (id: string) => viewCall<PromptView | null>('get_prompt', { token_id: id });
export const fiatBalance = (account: string) => viewCall<string>('fiat_balance_of', { account_id: account });

export const formatNear = (yocto: string) => {
  const v = BigInt(yocto);
  const whole = v / 10n ** 24n;
  const frac = (v % 10n ** 24n).toString().padStart(24, '0').slice(0, 3).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
};
export const formatUsdc = (units: string) => (Number(units) / 1e6).toFixed(2);
export const formatCents = (cents: string) => (Number(cents) / 100).toFixed(2);
export const rating = (p: PromptView) => (p.rating_count ? (p.rating_sum / p.rating_count).toFixed(1) : '—');
