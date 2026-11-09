'use client';
// Consult flow: Pay → Your case → Verify & send → Opinion. Visual rules: docs/DESIGN.md.
import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { formatCents, formatNear, formatUsdc, rating } from '@/lib/chain';
import { runConsult, type Stage } from '@/lib/consult-client';
import type { AttestationResult, Check } from '@/lib/attestation';
import { caseToMessage, parseOpinion, type CaseInput, type Opinion } from '@/lib/schema';
import type { PromptView } from '@/lib/types';
import { SAMPLE_CASES } from '@/lib/sample-cases';
import { monogram, specialtyLabel } from './SpecialistCard';
import { OpinionView } from './OpinionView';
import { TrustCard } from './TrustCard';

const STEP_LABELS = ['Pay', 'Your case', 'Verify & send', 'Opinion'];

const STAGE_TEXT: Record<Stage, string> = {
  attesting: 'Checking the secure enclave is genuine…',
  encrypting: 'Encrypting your case in this browser…',
  signing: 'Confirm in your wallet that this consult is yours…',
  thinking: 'The specialist is reading your case inside the enclave…',
  verifying: 'Checking the enclave signed this answer…',
  done: 'Done',
};

type Method = 'near' | 'usdc' | 'credit';

export function ConsultFlow({ prompt }: { prompt: PromptView }) {
  const w = useWallet();
  const [consultId, setConsultId] = useState<number | null>(null);
  const [form, setForm] = useState<CaseInput>({ concern: '', attachmentsText: [] });
  const [stage, setStage] = useState<Stage | null>(null);
  const [att, setAtt] = useState<AttestationResult | null>(null);
  const [text, setText] = useState('');
  const [resChecks, setResChecks] = useState<Check[]>([]);
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const step = opinion || (stage === 'done' && text) ? 3 : stage ? 2 : consultId != null ? 1 : 0;

  const guard = async (key: string, fn: () => Promise<void>) => {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const pay = (m: Method) =>
    guard(m, async () => {
      if (!w.accountId) return w.connect();
      const id =
        m === 'near' ? await w.payNear(prompt.token_id, prompt.price_near)
        : m === 'usdc' ? await w.payUsdc(prompt.token_id, prompt.price_usdc)
        : await w.payCredit(prompt.token_id);
      setConsultId(id);
    });

  const send = () =>
    guard('send', async () => {
      if (consultId == null) return;
      setText('');
      setOpinion(null);
      setResChecks([]);
      try {
        const r = await runConsult({
          consultId,
          model: prompt.model,
          caseText: caseToMessage(form),
          sign: w.signMessage,
          onStage: (s, a) => {
            setStage(s);
            if (a) setAtt(a);
          },
          onText: setText,
        });
        setResChecks(r.responseChecks);
        setOpinion(parseOpinion(r.text));
      } catch (e) {
        setStage(null);
        throw e;
      }
    });

  const set = (k: keyof CaseInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="wrap section">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 16 }}>
        <div className="monogram lg" aria-hidden>{monogram(prompt.specialty)}</div>
        <div>
          <div className="caption">{specialtyLabel(prompt.specialty)}</div>
          <h1 style={{ margin: '2px 0 6px' }}>{prompt.metadata?.title}</h1>
          <p className="muted" style={{ margin: 0 }}>{prompt.metadata?.description}</p>
          <div className="caption" style={{ marginTop: 8 }}>
            ★ {rating(prompt)} · {prompt.uses} consults · written by {prompt.creator_id}
          </div>
        </div>
      </div>

      <ol className="stepper" aria-label="Consult progress" style={{ padding: 0 }}>
        {STEP_LABELS.map((l, i) => (
          <li key={l} className={i < step ? 'done' : i === step ? 'active' : ''} aria-current={i === step ? 'step' : undefined}>
            <div className="bar" />
            <span>{i < step ? '✓ ' : ''}{l}</span>
          </li>
        ))}
      </ol>

      {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 14 }}>{error}</div>}

      {step === 0 && (
        <div className="card stack">
          <h2 style={{ marginBottom: 4 }}>One consult</h2>
          <p className="small muted">Your payment is held until you get your answer. If the specialist can’t answer, it’s returned automatically.</p>
          <div className="stack">
            {prompt.price_cents !== '0' && (
              <PayOption label="Card credit" sub="Top up with a card" price={`$${formatCents(prompt.price_cents)}`} busy={busy === 'credit'} onClick={() => pay('credit')} />
            )}
            {prompt.price_usdc !== '0' && (
              <PayOption label="USDC" sub="Stablecoin on NEAR" price={`${formatUsdc(prompt.price_usdc)} USDC`} busy={busy === 'usdc'} onClick={() => pay('usdc')} />
            )}
            {prompt.price_near !== '0' && (
              <PayOption label="NEAR" sub="Pay from your wallet" price={`${formatNear(prompt.price_near)} NEAR`} busy={busy === 'near'} onClick={() => pay('near')} />
            )}
          </div>
          {!w.accountId && <p className="caption" style={{ margin: 0 }}>You’ll be asked to connect a NEAR wallet (testnet) first.</p>}
        </div>
      )}

      {step === 1 && (
        <div className="card stack">
          <div className="spread">
            <h2 style={{ margin: 0 }}>Your case</h2>
            <span className="chip">Paid · consult #{consultId}</span>
          </div>
          <p className="small muted">Everything here is encrypted on this device before it’s sent. Nothing is stored by Sublee.</p>
          <div>
            <div className="caption" style={{ marginBottom: 6 }}>Try a sample case</div>
            <div className="row">
              {SAMPLE_CASES.map((s) => (
                <button key={s.name} type="button" className="chip" onClick={() => setForm(s.input)}>{s.name}</button>
              ))}
            </div>
          </div>
          <div className="grid-3">
            <label className="field"><span>Age</span><input inputMode="numeric" value={form.age ?? ''} onChange={set('age')} placeholder="42" /></label>
            <label className="field"><span>Sex</span><input value={form.sex ?? ''} onChange={set('sex')} placeholder="female" /></label>
            <label className="field"><span>How long</span><input value={form.duration ?? ''} onChange={set('duration')} placeholder="3 days" /></label>
          </div>
          <label className="field"><span>What’s going on?</span>
            <textarea rows={5} value={form.concern} onChange={set('concern')} placeholder="Describe your symptoms, diagnosis or question in your own words." />
          </label>
          <label className="field"><span>Medical history</span>
            <textarea rows={2} value={form.history ?? ''} onChange={set('history')} placeholder="Conditions, surgeries, family history" />
          </label>
          <label className="field"><span>Medications and supplements</span>
            <textarea rows={2} value={form.medications ?? ''} onChange={set('medications')} placeholder="Name and dose, if you know it" />
          </label>
          <label className="field"><span>Allergies</span>
            <input value={form.allergies ?? ''} onChange={set('allergies')} placeholder="None known" />
          </label>
          {form.attachmentsText.length > 0 && (
            <div className="notice notice-info small">Attached: {form.attachmentsText.map((a) => a.name).join(', ')}</div>
          )}
          <div className="spread">
            <span className="caption">{form.concern.length < 10 ? 'Add a few words about what’s going on.' : 'Ready to encrypt.'}</span>
            <button className="btn btn-primary" disabled={!!busy || form.concern.trim().length < 10} onClick={send}>
              Encrypt and send
            </button>
          </div>
        </div>
      )}

      {step >= 2 && att && (
        <TrustCard att={att} resChecks={resChecks} stage={stage} />
      )}
      {step === 2 && !att && stage && (
        <div className="card thinking"><div className="pulse" aria-hidden /><span>{STAGE_TEXT[stage]}</span></div>
      )}

      {step === 2 && stage === 'thinking' && (
        <div className="card thinking" style={{ marginTop: 14 }}>
          <div className="pulse" aria-hidden />
          <div>
            <div>{STAGE_TEXT.thinking}</div>
            {text && <div className="caption">{text.length.toLocaleString()} characters received, decrypting as they arrive</div>}
          </div>
        </div>
      )}
      {step === 2 && stage && stage !== 'thinking' && att && (
        <p className="caption" style={{ marginTop: 10 }}>{STAGE_TEXT[stage]}</p>
      )}

      {step === 3 && (
        <div style={{ marginTop: 14 }}>
          {opinion ? <OpinionView o={opinion} specialist={prompt.metadata?.title ?? 'Specialist'} /> : (
            <div className="card"><p className="small muted">The answer didn’t come back in the expected format. Here it is as written:</p><p style={{ whiteSpace: 'pre-wrap' }}>{text}</p></div>
          )}
        </div>
      )}
    </div>
  );
}

function PayOption({ label, sub, price, busy, onClick }: { label: string; sub: string; price: string; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className="pay-opt" onClick={onClick} aria-busy={busy}>
      <span>
        <span style={{ fontWeight: 600, display: 'block' }}>{label}</span>
        <span className="caption">{busy ? 'Waiting for your wallet…' : sub}</span>
      </span>
      <span style={{ fontWeight: 600 }}>{price}</span>
    </button>
  );
}
