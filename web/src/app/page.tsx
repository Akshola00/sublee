import { Suspense } from 'react';
import { connection } from 'next/server';
import { listPrompts } from '@/lib/chain';
import { SpecialistCard } from '@/components/SpecialistCard';

async function Specialists() {
  await connection(); // live chain data, rendered per request
  const prompts = (await listPrompts()).filter((p) => p.active);
  return (
    <div className="spec-grid">
      {prompts.map((p) => (
        <SpecialistCard key={p.token_id} p={p} />
      ))}
    </div>
  );
}

const STEPS = [
  ['Choose a specialist', 'Each one is written by someone with real expertise, and earns them a fee every time it helps.'],
  ['Describe your case', 'Symptoms, history, test results. It’s encrypted on your device before it goes anywhere.'],
  ['Get a second opinion', 'Opened only inside sealed hardware we can’t see into. You can check the proof yourself.'],
];

export default function Home() {
  return (
    <>
      <section className="wrap-wide section" style={{ paddingTop: 56 }}>
        <div style={{ maxWidth: 620 }}>
          <span className="chip">Private by design · on NEAR</span>
          <h1 style={{ marginTop: 16 }}>A second opinion that stays yours.</h1>
          <p className="muted" style={{ fontSize: 18, lineHeight: '28px' }}>
            Ask a specialist about a diagnosis, a symptom or a test result. Your case is encrypted in this browser and only
            opened inside verified, sealed hardware. Not even Sublee can read it.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <a href="#specialists" className="btn btn-primary">Find a specialist</a>
            <a href="#how" className="btn btn-ghost">How it works</a>
          </div>
        </div>
      </section>

      <section id="how" className="wrap-wide section">
        <div className="steps3">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="card">
              <div className="step-num">{i + 1}</div>
              <h3>{t}</h3>
              <p className="small muted" style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="specialists" className="wrap-wide section">
        <div className="spread" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Specialists</h2>
          <span className="caption">Pay per consult · NEAR, USDC or card</span>
        </div>
        <Suspense fallback={<p className="muted">Loading specialists…</p>}>
          <Specialists />
        </Suspense>
      </section>

      <section className="wrap-wide section">
        <div className="card spread" style={{ padding: 24 }}>
          <div style={{ maxWidth: 560 }}>
            <h2 style={{ marginBottom: 6 }}>Are you an expert?</h2>
            <p className="muted" style={{ margin: 0 }}>Write how you think through a case and mint it as an NFT. Patients use it privately; you earn 85% of every consult, and nobody can copy your prompt.</p>
          </div>
          <a href="/create" className="btn btn-secondary">Create a specialist</a>
        </div>
      </section>
    </>
  );
}
