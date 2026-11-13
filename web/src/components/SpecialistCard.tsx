import Link from 'next/link';
import type { PromptView } from '@/lib/types';
import { formatCents, rating } from '@/lib/chain';
import { avatarFor } from '@/lib/avatar';

export const specialtyLabel = (s: string) => s.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Lowest available price, shown as "from". Card credit (USD) is the most familiar unit. */
export function fromPrice(p: PromptView) {
  if (p.price_cents !== '0') return `$${formatCents(p.price_cents)}`;
  if (p.price_usdc !== '0') return `${(Number(p.price_usdc) / 1e6).toFixed(2)} USDC`;
  return 'NEAR';
}

export function SpecialistCard({ p }: { p: PromptView }) {
  return (
    <Link href={`/specialist/${p.token_id}`} className="card card-link">
      <div className="spec-card">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar" src={avatarFor(p)} alt="" width={48} height={48} />
          <div>
            <h3 style={{ margin: 0 }}>{p.metadata?.title}</h3>
            <div className="caption">{specialtyLabel(p.specialty)}</div>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>{p.metadata?.description}</p>
        <div className="spec-meta">
          <span>★ {rating(p)}</span>
          <span>{p.uses} {p.uses === 1 ? 'consult' : 'consults'}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--ink)' }}>from {fromPrice(p)} <span className="arrow" aria-hidden>→</span></span>
        </div>
      </div>
    </Link>
  );
}
