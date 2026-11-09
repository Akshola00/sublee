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
};

const WalletCtx = createContext<Ctx | null>(null);
const GAS_100 = '100000000000000';

/** Find the consult id from the contract's `consult_paid` NEP-297 event in a tx outcome. */
function consultIdFrom(outcome: Outcome, patient: string): number {
  const logs = (outcome as { receipts_outcome?: { outcome: { logs: string[] } }[] }).receipts_outcome?.flatMap((r) => r.outcome.logs) ?? [];
  for (const l of logs) {
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
