'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { deleteAll, deleteEntry, isUnlocked, listEntries, unlock, type HistoryEntry } from '@/lib/history';
import { OpinionView } from '@/components/OpinionView';

export function HistoryList() {
  const w = useWallet();
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!w.ready) return null;
  if (!w.accountId)
    return (
      <div className="card stack">
        <p style={{ margin: 0 }}>Connect the wallet you consulted with to open your history.</p>
        <div><button className="btn btn-primary" onClick={w.connect}>Connect wallet</button></div>
      </div>
    );
  const account = w.accountId;

  const load = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!isUnlocked(account)) await unlock(account, w.signMessage);
      setItems(await listEntries(account));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!items)
    return (
      <div className="card stack">
        <p style={{ margin: 0 }}>Your wallet signs a message to unlock it. No transaction, no cost.</p>
        {error && <div className="notice notice-error small">{error}</div>}
        <div><button className="btn btn-primary" onClick={load} aria-busy={busy} disabled={busy}>{busy ? 'Confirm in your wallet…' : 'Unlock history'}</button></div>
      </div>
    );

  return (
    <div className="stack" style={{ marginTop: 20 }}>
      {error && <div className="notice notice-error small">{error}</div>}
      {items.length === 0 && (
        <div className="card stack">
          <p style={{ margin: 0 }}>Nothing saved on this device yet. After a consult, choose “Save to this device”.</p>
          <div><Link href="/#specialists" className="btn btn-secondary">Find a specialist</Link></div>
        </div>
      )}
      {items.map((e) => (
        <div key={e.id} className="card stack">
          <div className="spread">
            <div>
              <strong>{e.specialist}</strong>
              <div className="caption">
                {new Date(e.createdAt).toLocaleString()} · consult #{e.consultId} · {e.verified.passed} of {e.verified.total} checks passed
              </div>
            </div>
            <div className="row">
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Close' : 'Open'}</button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await deleteEntry(account, e.id);
                  setItems(items.filter((x) => x.id !== e.id));
                }}
              >
                Delete
              </button>
            </div>
          </div>
          {open === e.id && (
            <>
              <details>
                <summary className="small">What you sent</summary>
                <pre className="small" style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{e.caseText}</pre>
              </details>
              {e.opinion ? <OpinionView o={e.opinion} specialist={e.specialist} /> : <p style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p>}
            </>
          )}
        </div>
      ))}
      {items.length > 0 && (
        <div className="row">
          {confirmAll ? (
            <>
              <span className="small">Delete all {items.length} for good? This can’t be undone.</span>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--red)' }}
                onClick={async () => {
                  await deleteAll(account);
                  setItems(null);
                  setConfirmAll(false);
                }}
              >
                Yes, delete all
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAll(false)}>Keep them</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAll(true)}>Delete all history</button>
          )}
        </div>
      )}
    </div>
  );
}
