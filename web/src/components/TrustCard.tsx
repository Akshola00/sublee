'use client';
import type { AttestationResult, Check } from '@/lib/attestation';
import type { Stage } from '@/lib/consult-client';

export function TrustCard({ att, resChecks, stage }: { att: AttestationResult; resChecks: Check[]; stage: Stage | null }) {
  const checks = [
    ...att.checks,
    { id: 'enc', label: 'Your case was encrypted in this browser', ok: att.verified && stage !== 'attesting', source: 'browser' as const },
    ...resChecks,
  ];
  const all = checks.every((c) => c.ok);
  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{all ? 'Your case stayed private' : att.verified ? 'Secure enclave verified' : 'Verification failed'}</h3>
        {att.verified && <span className="chip">Sealed hardware</span>}
      </div>
      <ul className="trust">
        {checks.map((c) => (
          <li key={c.id}>
            <span className={`tick ${c.ok ? 'ok' : 'bad'}`} aria-label={c.ok ? 'passed' : 'not verified'}>{c.ok ? '✓' : '✕'}</span>
            <span className="small">
              {c.label}
              <span className="where">{c.source === 'browser' ? 'your browser' : 'Sublee server'}</span>
              {!c.ok && c.detail && <span className="caption" style={{ display: 'block' }}>{c.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <details className="why" style={{ marginTop: 10 }}>
        <summary>Why you can trust this</summary>
        <div className="small muted stack">
          <p>The AI runs inside a confidential computer (Intel TDX with NVIDIA confidential GPUs on NEAR AI Cloud). Its encryption key is created inside that hardware and never leaves it.</p>
          <p>Before sending, this browser asked the hardware for a fresh, signed proof that includes a random challenge we just made, and checked that the key we encrypt to is the one sealed inside it. Intel and NVIDIA confirm the hardware is genuine.</p>
          <p>Sublee’s server only ever passes along scrambled data. The answer is encrypted back to a key that exists only in this tab, and the enclave signs it so you know it wasn’t changed.</p>
          <div className="mono">model: {att.model}<br />enclave key: {att.modelPubKey}<br />challenge: {att.nonce}<br />checked: {new Date(att.fetchedAt).toISOString().slice(11, 19)} UTC</div>
        </div>
      </details>
    </div>
  );
}
