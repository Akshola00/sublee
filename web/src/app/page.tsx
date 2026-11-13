import { Suspense } from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import { listPrompts } from '@/lib/chain';
import { HeroCard } from '@/components/home/HeroCard';
import { Journey } from '@/components/home/Journey';
import { Reveal } from '@/components/home/Reveal';
import { SpecialistGrid } from '@/components/home/SpecialistGrid';

async function Specialists() {
  await connection(); // live chain data, rendered per request
  const prompts = (await listPrompts()).filter((p) => p.active);
  return <SpecialistGrid prompts={prompts} />;
}

async function Stats() {
  await connection();
  const prompts = await listPrompts().catch(() => []);
  const live = prompts.filter((p) => p.active);
  const consults = prompts.reduce((n, p) => n + p.uses, 0);
  return (
    <>
      <div><strong>{live.length}</strong>specialists live</div>
      <div><strong>{consults}</strong>consults answered</div>
      <div><strong>0 bytes</strong>of your case stored by us</div>
    </>
  );
}

const SEEING: [string, string, string, string, string][] = [
  ['Your case and attachments', 'yes', 'no, ciphertext', 'no, ciphertext', 'yes'],
  ['The second opinion', 'yes', 'no, ciphertext', 'no, ciphertext', 'yes'],
  ['The specialist’s instructions', 'no', 'yes, briefly in memory', 'no, ciphertext', 'yes'],
  ['That a consult happened', 'yes', 'yes', 'yes', '—'],
];

export default function Home() {
  return (
    <>
      <section className="wrap-wide hero">
        <div>
          <span className="label">private second opinions · on NEAR</span>
          <h1 style={{ marginTop: 18 }}>
            <span className="line"><span>A second opinion</span></span>
            <span className="line"><span>that stays <em className="accent">yours.</em></span></span>
          </h1>
          <p className="lede">
            Ask a specialist about a diagnosis, a symptom or a test result. Your case is encrypted on this device and only
            opened inside verified, sealed hardware. Not even Sublee can read it.
          </p>
          <div className="row cta" style={{ marginTop: 26 }}>
            <a href="#specialists" className="btn btn-primary">Find a specialist <span className="arrow" aria-hidden>→</span></a>
            <a href="#how" className="btn btn-secondary">See where your case goes</a>
          </div>
          <div className="hero-stats">
            <Suspense fallback={<div><strong>…</strong>specialists live</div>}>
              <Stats />
            </Suspense>
          </div>
        </div>
        <HeroCard />
      </section>

      <section id="how" className="wrap-wide section" style={{ paddingTop: 72 }}>
        <Reveal>
          <span className="label">how it works</span>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 1.08, margin: '14px 0 10px', letterSpacing: '-0.03em' }}>
            Follow your case. <em className="accent">Nobody</em> reads it on the way.
          </h2>
          <p className="muted" style={{ maxWidth: 560 }}>Four stops between your question and your answer. Keep scrolling to see what each one can see.</p>
        </Reveal>
        <div style={{ marginTop: 28 }}>
          <Journey />
        </div>
      </section>

      <section id="specialists" className="wrap-wide section" style={{ paddingTop: 72 }}>
        <Reveal>
          <div className="spread" style={{ marginBottom: 18, alignItems: 'flex-end' }}>
            <div>
              <span className="label">specialists</span>
              <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.1, margin: '14px 0 0', letterSpacing: '-0.03em' }}>
                Pick who looks at your case.
              </h2>
            </div>
            <span className="caption">Pay per consult · NEAR, USDC or card · refunded if it can’t answer</span>
          </div>
        </Reveal>
        <Suspense fallback={<p className="muted">Loading specialists…</p>}>
          <Specialists />
        </Suspense>
      </section>

      <section id="privacy" className="wrap-wide section" style={{ paddingTop: 72 }}>
        <Reveal>
          <span className="label">who sees what</span>
          <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.1, margin: '14px 0 8px', letterSpacing: '-0.03em' }}>
            The honest version.
          </h2>
          <p className="muted" style={{ maxWidth: 600 }}>
            Your words are only readable on your device and inside the enclave. Payments are on a public blockchain, so the
            fact that you paid a specialist is visible. What you asked is not.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <div className="card scroll-x" style={{ padding: 6, marginTop: 18 }}>
            <table className="seeing">
              <thead>
                <tr><th></th><th>you</th><th>sublee</th><th>near ai gateway</th><th>enclave</th></tr>
              </thead>
              <tbody>
                {SEEING.map(([what, ...cols]) => (
                  <tr key={what}>
                    <td>{what}</td>
                    {cols.map((c, i) => <td key={i} className={c.startsWith('yes') ? 'y' : 'n'}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      <section id="experts" className="wrap-wide section" style={{ paddingTop: 72, paddingBottom: 72 }}>
        <Reveal>
          <div className="author-band">
            <div className="journey" style={{ gap: 32, alignItems: 'center' }}>
              <div>
                <span className="label">for experts</span>
                <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 40px)', lineHeight: 1.1, margin: '14px 0 10px', letterSpacing: '-0.03em' }}>
                  Your expertise, <em className="accent">sealed</em> and earning.
                </h2>
                <p className="muted">
                  Write how you think through a case and mint it as an NFT. Patients use it privately; you earn 85% of every
                  consult. Your instructions are sealed in your browser before they leave it, so nobody can read or copy them.
                </p>
                <Link href="/create" className="btn btn-primary" style={{ marginTop: 8 }}>Create a specialist <span className="arrow" aria-hidden>→</span></Link>
              </div>
              <div>
                <div className="caption mono" style={{ marginBottom: 8 }}>what’s stored on-chain</div>
                <div className="sealed-prompt">
                  sealed_prompt: 3f9a2c71e0b84d16a5c39f0e72b1d48a6c05e9f3b27d1a84c60f5e29b3d71a0c84e6f2b9d150a7c3e8f4b62d09a1c75e3f8b2d46a0c91e7f5b3d28a64c0e9f1b7d53a2c86e04f9b1d7a3c5e82f0b64d19a7c3e5f8b20d46a9c1e7f3b5d82a0c64e9f17b3d5a28c0e6f4b91d7a3c5e8...
                </div>
                <div className="caption" style={{ marginTop: 8 }}>Only the enclave can open it, for one consult at a time.</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
