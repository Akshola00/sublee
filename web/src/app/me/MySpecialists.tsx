'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { formatCents, formatNear, formatUsdc, listPrompts, rating, viewCall } from '@/lib/chain';
import { dollarsToCents, nearToYocto, usdcToUnits } from '@/lib/units';
import type { PromptView } from '@/lib/types';
import { avatarFor } from '@/lib/avatar';

type Earnings = { usdc: string; cents: string };

export function MySpecialists() {
  const w = useWallet();
  const [mine, setMine] = useState<PromptView[] | null>(null);
  const [earn, setEarn] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchAll = useCallback(async (account: string) => {
    const [all, e] = await Promise.all([listPrompts(), viewCall<Earnings>('earnings_of', { account_id: account })]);
    return { mine: all.filter((p) => p.owner_id === account), earn: e };
  }, []);

  const load = useCallback(async () => {
    if (!w.accountId) return;
    try {
      const r = await fetchAll(w.accountId);
      setMine(r.mine);
      setEarn(r.earn);
    } catch {
      setError('Couldn’t load from NEAR. Try again in a moment.');
    }
  }, [w.accountId, fetchAll]);

  useEffect(() => {
    if (!w.accountId) return;
    let cancelled = false;
    fetchAll(w.accountId).then(
      (r) => {
        if (cancelled) return;
        setMine(r.mine);
        setEarn(r.earn);
      },
      () => !cancelled && setError('Couldn’t load from NEAR. Try again in a moment.'),
    );
    return () => {
      cancelled = true;
    };
  }, [w.accountId, fetchAll]);

  if (!w.ready) return null;
  if (!w.accountId)
    return (
      <div className="card stack">
        <p style={{ margin: 0 }}>Connect your wallet to see the specialists you own.</p>
        <div><button className="btn btn-primary" onClick={w.connect}>Connect wallet</button></div>
      </div>
    );

  const totalUses = mine?.reduce((n, p) => n + p.uses, 0) ?? 0;

  return (
    <div className="stack" style={{ marginTop: 20 }}>
      {error && <div className="notice notice-error">{error}</div>}

      <div className="grid-3">
        <Stat label="Consults" value={mine ? String(totalUses) : '…'} />
        <Stat label="Card earnings" value={earn ? `$${formatCents(earn.cents)}` : '…'} />
        <Stat label="USDC to claim" value={earn ? formatUsdc(earn.usdc) : '…'} />
      </div>
      <div className="spread">
        <span className="caption">NEAR payments go straight to your wallet when a consult completes.</span>
        {earn && earn.usdc !== '0' && (
          <button
            className="btn btn-secondary btn-sm"
            aria-busy={claiming}
            onClick={async () => {
              setClaiming(true);
              try {
                await w.claimUsdc();
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setClaiming(false);
              }
            }}
          >
            {claiming ? 'Confirm in your wallet…' : 'Claim USDC'}
          </button>
        )}
      </div>

      {mine && mine.length === 0 && (
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Create your first specialist</h3>
          <p className="small muted" style={{ margin: 0 }}>Write how you think through a case, set a price, and earn every time it helps someone.</p>
          <div><Link href="/create" className="btn btn-primary">Create a specialist</Link></div>
        </div>
      )}

      {mine?.map((p) => <MineRow key={p.token_id} p={p} onSaved={load} />)}

      {mine && mine.length > 0 && <div><Link href="/create" className="btn btn-secondary">Create another</Link></div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="caption">{label}</div>
      <div className="serif" style={{ fontSize: 26, lineHeight: '34px' }}>{value}</div>
    </div>
  );
}

const fromYoctoInput = (y: string) => (y === '0' ? '' : formatNear(y));
const fromUnitsInput = (u: string) => (u === '0' ? '' : formatUsdc(u));
const fromCentsInput = (c: string) => (c === '0' ? '' : formatCents(c));

function MineRow({ p, onSaved }: { p: PromptView; onSaved: () => Promise<void> }) {
  const w = useWallet();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ near: fromYoctoInput(p.price_near), usdc: fromUnitsInput(p.price_usdc), usd: fromCentsInput(p.price_cents) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (patch: { active?: boolean; prices?: boolean }) => {
    setError(null);
    setBusy(true);
    try {
      await w.updatePrompt({
        token_id: p.token_id,
        ...(patch.prices ? { price_near: nearToYocto(f.near), price_usdc: usdcToUnits(f.usdc), price_cents: dollarsToCents(f.usd) } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      });
      setEdit(false);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="avatar" src={avatarFor(p)} alt="" width={48} height={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="spread">
            <Link href={`/specialist/${p.token_id}`}><h3 style={{ margin: 0 }}>{p.metadata?.title}</h3></Link>
            <span className={`chip ${p.active ? '' : 'lk-low'}`}>{p.active ? 'Live' : 'Paused'}</span>
          </div>
          <div className="caption">
            NFT #{p.token_id} · v{p.version} · {p.uses} consults · ★ {rating(p)} ({p.rating_count})
          </div>
          {!edit && (
            <div className="small muted" style={{ marginTop: 6 }}>
              {[p.price_cents !== '0' && `$${formatCents(p.price_cents)} card`, p.price_usdc !== '0' && `${formatUsdc(p.price_usdc)} USDC`, p.price_near !== '0' && `${formatNear(p.price_near)} NEAR`].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {edit && (
        <div className="grid-3">
          <label className="field"><span>Card (USD)</span><input inputMode="decimal" value={f.usd} onChange={(e) => setF({ ...f, usd: e.target.value })} /></label>
          <label className="field"><span>USDC</span><input inputMode="decimal" value={f.usdc} onChange={(e) => setF({ ...f, usdc: e.target.value })} /></label>
          <label className="field"><span>NEAR</span><input inputMode="decimal" value={f.near} onChange={(e) => setF({ ...f, near: e.target.value })} /></label>
        </div>
      )}
      {error && <div className="notice notice-error small">{error}</div>}

      <div className="row">
        {edit ? (
          <>
            <button className="btn btn-primary btn-sm" aria-busy={busy} disabled={busy} onClick={() => save({ prices: true })}>Save prices</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setEdit(true)}>Edit prices</button>
            <button className="btn btn-ghost btn-sm" aria-busy={busy} disabled={busy} onClick={() => save({ active: !p.active })}>
              {p.active ? 'Pause' : 'Go live'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
