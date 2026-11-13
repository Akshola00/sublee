'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NearConnector } from '@hot-labs/near-connect';
import { CONTRACT_ID, NETWORK, USDC_ID } from './config';

type Wallet = Awaited<ReturnType<NearConnector['wallet']>>;
type Outcome = Awaited<ReturnType<Wallet['signAndSendTransaction']>>;

type Ctx = {
  accountId: string | null;
  ready: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  payNear: (tokenId: string, yocto: string) => Promise<number>;
  payUsdc: (tokenId: string, units: string) => Promise<number>;
  payCredit: (tokenId: string) => Promise<number>;
  signMessage: (message: string, nonce: Uint8Array) => Promise<{ accountId: string; publicKey: string; signature: string }>;
  mintPrompt: (args: MintArgs) => Promise<string>;
  updatePrompt: (args: UpdateArgs) => Promise<void>;
  claimUsdc: () => Promise<void>;
  rate: (consultId: number, stars: number) => Promise<void>;
};

export type MintArgs = {
  title: string;
  description: string;
  media: string | null;
  specialty: string;
  model: string;
  price_near: string;
  price_usdc: string;
  price_cents: string;
  sealed_prompt: string;
};
export type UpdateArgs = {
  token_id: string;
  price_near?: string;
  price_usdc?: string;
  price_cents?: string;
  active?: boolean;
  sealed_prompt?: string;
};

/** Storage deposit for minting; the contract refunds whatever isn't used. */
const MINT_DEPOSIT = '200000000000000000000000'; // 0.2 NEAR (covers an optional ~10 KB photo)

function logsOf(outcome: Outcome): string[] {
  return (outcome as { receipts_outcome?: { outcome: { logs: string[] } }[] }).receipts_outcome?.flatMap((r) => r.outcome.logs) ?? [];
}

function mintedTokenFrom(outcome: Outcome): string {
  for (const l of logsOf(outcome)) {
    if (!l.startsWith('EVENT_JSON:')) continue;
    try {
      const e = JSON.parse(l.slice('EVENT_JSON:'.length));
      if (e.standard === 'nep171' && e.event === 'nft_mint') return String(e.data[0].token_ids[0]);
    } catch {}
  }
  throw new Error('Minted, but the token id was not found. Check My specialists.');
}

const WalletCtx = createContext<Ctx | null>(null);
const GAS_100 = '100000000000000';

/** Find the consult id from the contract's `consult_paid` NEP-297 event in a tx outcome. */
function consultIdFrom(outcome: Outcome, patient: string): number {
  for (const l of logsOf(outcome)) {
    if (!l.startsWith('EVENT_JSON:')) continue;
    try {
      const e = JSON.parse(l.slice('EVENT_JSON:'.length));
      const d = Array.isArray(e.data) ? e.data[0] : e.data;
      if (e.standard === 'sublee' && e.event === 'consult_paid' && d?.patient_id === patient) return Number(d.consult_id);
    } catch {}
  }
  throw new Error('Payment went through but no consult id was found. Check your history.');
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const connector = useRef<NearConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { NearConnector } = await import('@hot-labs/near-connect');
      const c = new NearConnector({ network: NETWORK, autoConnect: true, signIn: { contractId: CONTRACT_ID, methodNames: [] } });
      connector.current = c;
      c.on('wallet:signIn', (p) => setAccountId(p.accounts[0]?.accountId ?? null));
      c.on('wallet:signOut', () => setAccountId(null));
      try {
        const { accounts } = await c.getConnectedWallet();
        if (alive) setAccountId(accounts[0]?.accountId ?? null);
      } catch {}
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const wallet = useCallback(async () => {
    if (!connector.current) throw new Error('Wallet not ready');
    return connector.current.wallet();
  }, []);

  const call = useCallback(
    async (receiverId: string, methodName: string, args: object, deposit: string) => {
      const w = await wallet();
      return w.signAndSendTransaction({
        receiverId,
        actions: [{ type: 'FunctionCall', params: { methodName, args, gas: GAS_100, deposit } }],
      });
    },
    [wallet],
  );

  const value = useMemo<Ctx>(
    () => ({
      accountId,
      ready,
      connect: async () => {
        await connector.current?.connect();
      },
      disconnect: async () => {
        await connector.current?.disconnect();
        setAccountId(null);
      },
      payNear: async (tokenId, yocto) => consultIdFrom(await call(CONTRACT_ID, 'pay_consult_near', { token_id: tokenId }, yocto), accountId!),
      payUsdc: async (tokenId, units) =>
        consultIdFrom(
          await call(USDC_ID, 'ft_transfer_call', { receiver_id: CONTRACT_ID, amount: units, msg: JSON.stringify({ token_id: tokenId }) }, '1'),
          accountId!,
        ),
      payCredit: async (tokenId) => consultIdFrom(await call(CONTRACT_ID, 'pay_consult_credit', { token_id: tokenId }, '0'), accountId!),
      signMessage: async (message, nonce) => {
        const w = await wallet();
        return w.signMessage({ message, recipient: CONTRACT_ID, nonce });
      },
      mintPrompt: async (args) => mintedTokenFrom(await call(CONTRACT_ID, 'mint_prompt', { args }, MINT_DEPOSIT)),
      updatePrompt: async ({ token_id, ...rest }) => {
        // Storage can grow with a new prompt version; attach a deposit only then (excess is refunded).
        await call(CONTRACT_ID, 'update_prompt', { token_id, ...rest }, rest.sealed_prompt ? MINT_DEPOSIT : '0');
      },
      claimUsdc: async () => {
        await call(CONTRACT_ID, 'claim_usdc', {}, '0');
      },
      rate: async (consultId, stars) => {
        await call(CONTRACT_ID, 'rate', { consult_id: consultId, rating: stars }, '0');
      },
    }),
    [accountId, ready, call, wallet],
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const c = useContext(WalletCtx);
  if (!c) throw new Error('useWallet outside WalletProvider');
  return c;
}
