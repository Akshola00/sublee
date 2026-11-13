'use client';
// Sign in with email (Privy → a NEAR testnet account made for you) or with an existing NEAR wallet.
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { currentPrivyUser, ensureNearAccount, privy, PRIVY_WALLET_ID } from '@/lib/privy';
import { LogoMark } from './Logo';

type Step = 'choose' | 'email' | 'code' | 'setup' | 'finish';

export function SignInDialog({ onClose }: { onClose: () => void }) {
  const w = useWallet();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    if (w.accountId) onClose();
  }, [w.accountId, onClose]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^.*?:\s*/, '') || 'Something went wrong' : String(e));
    } finally {
      setBusy(false);
    }
  };

  // Already signed in to Privy from an earlier visit? Skip straight to account setup.
  const startEmail = () =>
    run(async () => {
      await privy().initialize();
      const user = await currentPrivyUser();
      if (user) await setup(user);
      else setStep('email');
    });

  const setup = async (user: Awaited<ReturnType<typeof currentPrivyUser>>) => {
    setStep('setup');
    setNote('Creating your NEAR account…');
    const accountId = await ensureNearAccount(privy(), user);
    setNote('Adding a little test NEAR so you can try it…');
    const token = await privy().getAccessToken();
    const r = await fetch('/api/fund', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, token }) });
    const j = (await r.json().catch(() => ({}))) as { funded?: boolean; error?: string };
    setNote(j.funded ? 'Your account has 0.3 test NEAR.' : r.ok ? 'Your account is ready.' : (j.error ?? 'Your account is ready, but test NEAR couldn’t be added.'));
    setStep('finish');
  };

  return (
    <dialog ref={ref} className="signin" onClose={onClose} onCancel={onClose} aria-labelledby="signin-title">
      <div className="spread" style={{ marginBottom: 14 }}>
        <span className="row" style={{ gap: 10 }}>
          <LogoMark size={26} />
          <strong id="signin-title" style={{ fontSize: 17 }}>Sign in to Sublee</strong>
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {step === 'choose' && (
        <div className="stack">
          <button className="pay-opt" onClick={startEmail} aria-busy={busy}>
            <span>
              <span style={{ fontWeight: 600, display: 'block' }}>Continue with email</span>
              <span className="caption">No wallet app needed. We make a NEAR testnet account for you.</span>
            </span>
            <span aria-hidden>→</span>
          </button>
          <button className="pay-opt" onClick={() => { onClose(); void w.connectWallet(); }}>
            <span>
              <span style={{ fontWeight: 600, display: 'block' }}>Use a NEAR wallet</span>
              <span className="caption">HOT, Meteor, MyNearWallet, Intear and more.</span>
            </span>
            <span aria-hidden>→</span>
          </button>
          <p className="caption" style={{ margin: 0 }}>Sublee runs on NEAR testnet. No real money moves.</p>
        </div>
      )}

      {step === 'email' && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void run(async () => { await privy().auth.email.sendCode(email.trim()); setStep('code'); }); }}>
          <label className="field"><span>Email</span>
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <button className="btn btn-primary" disabled={busy || !email.includes('@')} aria-busy={busy}>{busy ? 'Sending…' : 'Send me a code'}</button>
          <p className="caption" style={{ margin: 0 }}>Login is handled by Privy. Your email is never linked to your health questions.</p>
        </form>
      )}

      {step === 'code' && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await privy().auth.email.loginWithCode(email.trim(), code.trim()); await setup(r.user as never); }); }}>
          <p className="small muted" style={{ margin: 0 }}>We sent a 6-digit code to <strong>{email}</strong>.</p>
          <label className="field"><span>Code</span>
            <input inputMode="numeric" autoComplete="one-time-code" required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" style={{ letterSpacing: '0.3em', fontSize: 20 }} />
          </label>
          <button className="btn btn-primary" disabled={busy || code.length < 6} aria-busy={busy}>{busy ? 'Checking…' : 'Continue'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCode(''); setStep('email'); }}>Use a different email</button>
        </form>
      )}

      {(step === 'setup' || step === 'finish') && (
        <div className="stack">
          <div className="thinking">{step === 'setup' && <div className="pulse" aria-hidden />}<span>{note}</span></div>
          {step === 'finish' && (
            <>
              <p className="small muted" style={{ margin: 0 }}>Last step: approve the sign-in in the window that opens.</p>
              <button className="btn btn-primary" onClick={() => run(() => w.connectWallet(PRIVY_WALLET_ID))} aria-busy={busy} disabled={busy}>
                {busy ? 'Waiting for approval…' : 'Finish signing in'}
              </button>
            </>
          )}
        </div>
      )}

      {error && <div className="notice notice-error small" style={{ marginTop: 12 }}>{error}</div>}
    </dialog>
  );
}
