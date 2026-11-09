import 'server-only';
import { Account, FailoverRpcProvider, JsonRpcProvider, type KeyPairString } from 'near-api-js';
import { verifyMessage } from 'near-api-js/nep413';
import { CONTRACT_ID, RPC_URLS } from '../config';
import type { PromptView } from '../types';
export type { PromptView };

export type ConsultStatus = 'Paid' | 'Claimed' | 'Used' | 'Refunded';
export type Consult = {
  id: number;
  patient_id: string;
  token_id: string;
  prompt_version: number;
  method: 'Near' | 'Usdc' | 'Fiat';
  amount: string;
  created_at_ms: number;
  status: ConsultStatus;
  rating: number | null;
};

const provider = new FailoverRpcProvider(RPC_URLS.map((url) => new JsonRpcProvider({ url })));

let serverAccount: Account | null = null;
function server(): Account {
  if (serverAccount) return serverAccount;
  const id = process.env.SERVER_ACCOUNT_ID;
  const key = process.env.SERVER_PRIVATE_KEY as KeyPairString | undefined;
  if (!id || !key) throw new Error('server signer not configured');
  serverAccount = new Account(id, provider, key);
  return serverAccount;
}

export async function view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await provider.callFunction<T & object>({ contractId: CONTRACT_ID, method, args, finality: 'final' } as never)) as T;
}

async function call<T>(methodName: string, args: Record<string, unknown>): Promise<T> {
  return server().callFunction<T & object>({ contractId: CONTRACT_ID, methodName, args, gas: 30_000_000_000_000n }) as Promise<T>;
}

export const getConsult = (id: number) => view<Consult | null>('get_consult', { consult_id: id });
export const getPrompt = (tokenId: string) => view<PromptView | null>('get_prompt', { token_id: tokenId });
export const getSealedPrompt = (tokenId: string) => view<[string, number] | null>('get_sealed_prompt', { token_id: tokenId });

/** Atomic single-use lock on-chain. Throws if the consult isn't Paid. */
export const claimConsult = (id: number) => call<Consult>('claim', { consult_id: id });
export const markUsed = (id: number) => call<void>('mark_used', { consult_id: id });
export const refundConsult = (id: number) => call<void>('refund', { consult_id: id });
export const creditFiat = (accountId: string, cents: number, sessionId: string) =>
  call<boolean>('credit_fiat', { account_id: accountId, cents: String(cents), session_id: sessionId });

/** Verify a NEP-413 signature made by a full-access key of `accountId` (checked on-chain). */
export async function verifyNep413(p: {
  accountId: string;
  publicKey: string;
  signatureB64: string;
  nonceB64: string;
  message: string;
}): Promise<boolean> {
  try {
    await verifyMessage({
      signerAccountId: p.accountId,
      signerPublicKey: p.publicKey,
      payload: { message: p.message, recipient: CONTRACT_ID, nonce: Buffer.from(p.nonceB64, 'base64') },
      signature: Buffer.from(p.signatureB64, 'base64'),
      provider,
    });
    return true;
  } catch {
    return false;
  }
}
