'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { saveEntry, unlock, type HistoryEntry } from '@/lib/history';

/** Offer to keep this consult on this device, encrypted with a key only the patient's wallet can produce. */
export function SaveToHistory({ entry }: { entry: HistoryEntry }) {
  const w = useWallet();
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!w.accountId) return null;
  return (
    <div className="card spread" style={{ marginTop: 14 }}>
      <div style={{ maxWidth: 520 }}>
        <strong>{state === 'saved' ? 'Saved on this device' : 'Keep a private copy'}</strong>
        <div className="small muted">
          {state === 'saved' ? (
            <>Encrypted with your wallet. Find it in <Link href="/history">History</Link>.</>
          ) : (
            'Stored only in this browser, encrypted with a key your wallet creates. Sublee never gets a copy.'
          )}
        </div>
        {error && <div className="small" style={{ color: 'var(--red)', marginTop: 6 }}>{error}</div>}
      </div>
      {state !== 'saved' && (
        <button
          className="btn btn-secondary btn-sm"
          aria-busy={state === 'busy'}
          disabled={state === 'busy'}
          onClick={async () => {
            setError(null);
            setState('busy');
            try {
              await unlock(w.accountId!, w.signMessage);
              await saveEntry(w.accountId!, entry);
              setState('saved');
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
              setState('idle');
            }
          }}
        >
          {state === 'busy' ? 'Confirm in your wallet…' : 'Save to this device'}
        </button>
      )}
    </div>
  );
}
