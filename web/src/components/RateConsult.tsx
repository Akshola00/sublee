'use client';
import { useState } from 'react';
import { useWallet } from '@/lib/wallet';

/** One rating per completed consult, recorded on-chain against the specialist. */
export function RateConsult({ consultId }: { consultId: number }) {
  const w = useWallet();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (n: number) => {
    setStars(n);
    setError(null);
    setState('busy');
    try {
      await w.rate(consultId, n);
      setState('done');
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(/Only completed/.test(m) ? 'The consult is still being settled. Try again in a few seconds.' : m);
      setState('idle');
    }
  };

  return (
    <div className="card spread" style={{ marginTop: 14 }}>
      <div>
        <strong>{state === 'done' ? 'Thanks for rating' : 'How helpful was this?'}</strong>
        <div className="small muted">{state === 'done' ? 'Your rating is recorded on NEAR.' : 'Your rating is public on-chain; your case is not.'}</div>
        {error && <div className="small" style={{ color: 'var(--red)', marginTop: 6 }}>{error}</div>}
      </div>
      <div className="row" style={{ gap: 2 }} role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="star"
            data-on={(hover || stars) >= n}
            disabled={state !== 'idle'}
            onMouseEnter={() => setHover(n)}
            onClick={() => submit(n)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
