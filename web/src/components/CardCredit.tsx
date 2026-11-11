'use client';
// Card credit: shows the patient's balance, tops it up (Stripe test Checkout, or a labelled testnet stand-in
// when Stripe isn't configured), then pays for the consult from it.
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fiatBalance, formatCents } from '@/lib/chain';
import { useWallet } from '@/lib/wallet';
import { TEST_TOPUP_CENTS, TOPUP_CENTS } from '@/lib/topup';

const usd = (cents: number | string | bigint) => `$${formatCents(String(cents))}`;

async function postJson(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, j: (await r.json().catch(() => ({}))) as Record<string, unknown> };
}

export function CardCredit({ priceCents, busy, onPay }: { priceCents: string; busy: boolean; onPay: () => void }) {
  const w = useWallet();
  const router = useRouter();
  const path = usePathname();
  const topupSession = useSearchParams().get('topup');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [mode, setMode] = useState<'stripe' | 'test' | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async (account: string) => setBalance(BigInt(await fiatBalance(account))), []);

  useEffect(() => {
    let alive = true;
    fetch('/api/credit/mode')
      .then((r) => r.json())
      .then((j) => alive && setMode(j.mode))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!w.accountId) return;
    const account = w.accountId;
    let alive = true;
    (async () => {
      // Back from Stripe Checkout: the server reads the session from Stripe (never trusts us) and credits on-chain.
      if (topupSession) {
        setWorking('confirm');
        try {
          const { j } = await postJson('/api/stripe/confirm', { sessionId: topupSession });
          if (alive)
            setMsg(j.credited ? { kind: 'info', text: `Added ${usd(j.cents as number)} of credit.` } : { kind: 'error', text: (j.error as string) ?? 'The card payment didn’t complete.' });
        } finally {
          if (alive) setWorking(null);
          router.replace(path, { scroll: false });
        }
      }
      if (alive) await refresh(account).catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, [w.accountId, topupSession, refresh, router, path]);

  const price = BigInt(priceCents);
  const enough = balance !== null && balance >= price;

  const topUp = async (cents: number) => {
    if (!w.accountId) return w.connect();
    setMsg(null);
    setWorking(String(cents));
    try {
      if (mode === 'stripe') {
        const { ok, j } = await postJson('/api/stripe/checkout', { accountId: w.accountId, cents, returnPath: path });
        if (!ok || !j.url) throw new Error((j.error as string) ?? 'Couldn’t start the card payment');
        window.location.assign(j.url as string);
        return;
      }
      const { ok, j } = await postJson('/api/credit/test', { accountId: w.accountId });
      if (!ok) throw new Error((j.error as string) ?? 'Couldn’t add test credit');
      setMsg({ kind: 'info', text: `Added ${usd(j.cents as number)} of test credit.` });
      await refresh(w.accountId);
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setWorking(null);
    }
  };

  const sub = busy
    ? 'Waiting for your wallet…'
    : !w.accountId
      ? 'Top up with a card'
      : balance === null
        ? 'Checking your balance…'
        : `Balance ${usd(balance)}`;

  return (
    <div className="pay-opt" style={{ display: 'block', cursor: 'default' }}>
      <div className="spread">
        <span>
          <span style={{ fontWeight: 600, display: 'block' }}>Card credit</span>
          <span className="caption">{sub}</span>
        </span>
        <span className="row" style={{ gap: 10 }}>
          <span style={{ fontWeight: 600 }}>{usd(priceCents)}</span>
          {(!w.accountId || enough) && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onPay} aria-busy={busy} disabled={busy}>
              {w.accountId ? 'Pay from credit' : 'Connect'}
            </button>
          )}
        </span>
      </div>
      {w.accountId && balance !== null && !enough && mode && (
        <div className="stack" style={{ marginTop: 10, gap: 8 }}>
          {mode === 'stripe' ? (
            <>
              <span className="caption">Add credit with a card. Stripe test mode: card 4242 4242 4242 4242, any future date, any CVC.</span>
              <div className="row">
                {TOPUP_CENTS.filter((c) => BigInt(c) + balance >= price).map((c) => (
                  <button key={c} type="button" className="btn btn-secondary btn-sm" onClick={() => topUp(c)} aria-busy={working === String(c)} disabled={!!working}>
                    Add {usd(c)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="caption">
                Card payments aren’t switched on in this testnet demo. You can add {usd(TEST_TOPUP_CENTS)} of free test credit once a day instead. No card, no money.
              </span>
              <div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => topUp(TEST_TOPUP_CENTS)} aria-busy={!!working} disabled={!!working}>
                  {working ? 'Adding…' : `Add ${usd(TEST_TOPUP_CENTS)} test credit`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {working === 'confirm' && <div className="caption" style={{ marginTop: 8 }}>Confirming your card payment…</div>}
      {msg && <div className={`notice ${msg.kind === 'error' ? 'notice-error' : 'notice-info'} small`} style={{ marginTop: 10 }}>{msg.text}</div>}
    </div>
  );
}
