import Link from 'next/link';
import { Suspense } from 'react';
import { listPrompts, formatCents, formatNear, rating } from '@/lib/chain';

async function Specialists() {
  const prompts = (await listPrompts()).filter((p) => p.active);
  return (
    <>
      {prompts.map((p) => (
        <Link key={p.token_id} href={`/specialist/${p.token_id}`} style={{ textDecoration: 'none' }}>
          <div className="card">
            <strong>{p.metadata?.title}</strong>
            <div className="muted">{p.metadata?.description}</div>
            <div className="muted">
              {p.specialty} · {formatNear(p.price_near)} NEAR / ${formatCents(p.price_cents)} · ★ {rating(p)} · {p.uses} consults
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <>
      <h1>A second opinion that even we can’t read.</h1>
      <p className="muted">
        Your case is encrypted in your browser to a key that only exists inside a verified hardware enclave running the AI.
        Specialist prompts are NFTs: their authors earn every time they help someone.
      </p>
      <h2>Specialists</h2>
      <Suspense fallback={<p className="muted">Loading specialists from NEAR…</p>}>
        <Specialists />
      </Suspense>
    </>
  );
}
