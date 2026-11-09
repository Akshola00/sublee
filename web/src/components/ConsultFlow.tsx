'use client';
// Functional consult flow (unstyled). Pay → intake → verify + send → opinion.
import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { formatCents, formatNear, formatUsdc, rating } from '@/lib/chain';
import { runConsult, type Stage } from '@/lib/consult-client';
import type { AttestationResult, Check } from '@/lib/attestation';
import { caseToMessage, parseOpinion, type CaseInput, type Opinion } from '@/lib/schema';
import type { PromptView } from '@/lib/types';
import { SAMPLE_CASES } from '@/lib/sample-cases';

const STAGES: Record<Stage, string> = {
  attesting: 'Verifying the AI enclave…',
  encrypting: 'Encrypting your case in this browser…',
  signing: 'Confirm in your wallet (proves this consult is yours)…',
  thinking: 'The specialist is reviewing your case inside the enclave…',
  verifying: 'Checking the enclave’s signature on the answer…',
  done: 'Done',
};

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
  const [busy, setBusy] = useState(false);

  const guard = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const pay = (m: 'near' | 'usdc' | 'credit') =>
    guard(async () => {
      if (!w.accountId) return w.connect();
      const id =
        m === 'near' ? await w.payNear(prompt.token_id, prompt.price_near)
        : m === 'usdc' ? await w.payUsdc(prompt.token_id, prompt.price_usdc)
        : await w.payCredit(prompt.token_id);
      setConsultId(id);
    });

  const send = () =>
    guard(async () => {
      if (consultId == null) return;
      setText('');
      setOpinion(null);
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
    });

  const set = (k: keyof CaseInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <h1>{prompt.metadata?.title}</h1>
      <p>{prompt.metadata?.description}</p>
      <p className="muted">
        by {prompt.creator_id} · owned by {prompt.owner_id} · model {prompt.model} · ★ {rating(prompt)} · {prompt.uses} consults
      </p>

      {consultId == null ? (
        <div className="card">
          <strong>1. Pay for one consult</strong>
          <p className="muted">Held in escrow: refunded automatically if the enclave fails to answer.</p>
          <div className="row">
            {prompt.price_near !== '0' && <button disabled={busy} onClick={() => pay('near')}>{formatNear(prompt.price_near)} NEAR</button>}
            {prompt.price_usdc !== '0' && <button disabled={busy} onClick={() => pay('usdc')}>{formatUsdc(prompt.price_usdc)} USDC</button>}
            {prompt.price_cents !== '0' && <button disabled={busy} className="secondary" onClick={() => pay('credit')}>${formatCents(prompt.price_cents)} card credit</button>}
          </div>
          {!w.accountId && <p className="muted">Connect a NEAR testnet wallet first.</p>}
        </div>
      ) : (
        <div className="card">
          <strong>2. Describe your case</strong> <span className="muted">(consult #{consultId}, paid)</span>
          <div className="row" style={{ marginTop: 8 }}>
            {SAMPLE_CASES.map((s) => (
              <button key={s.name} className="secondary" onClick={() => setForm(s.input)}>Try: {s.name}</button>
            ))}
          </div>
          <div className="row">
            <div style={{ flex: 1 }}><label>Age</label><input value={form.age ?? ''} onChange={set('age')} /></div>
            <div style={{ flex: 1 }}><label>Sex</label><input value={form.sex ?? ''} onChange={set('sex')} /></div>
            <div style={{ flex: 2 }}><label>How long</label><input value={form.duration ?? ''} onChange={set('duration')} /></div>
          </div>
          <label>What’s going on?</label>
          <textarea rows={5} value={form.concern} onChange={set('concern')} />
          <label>Medical history</label>
          <textarea rows={2} value={form.history ?? ''} onChange={set('history')} />
          <label>Medications & supplements</label>
          <textarea rows={2} value={form.medications ?? ''} onChange={set('medications')} />
          <label>Allergies</label>
          <input value={form.allergies ?? ''} onChange={set('allergies')} />
          <div style={{ marginTop: 12 }}>
            <button disabled={busy || form.concern.length < 10} onClick={send}>Verify enclave, encrypt & send</button>
          </div>
        </div>
      )}

      {stage && <p className="muted">{STAGES[stage]}</p>}
      {error && <p className="bad">{error}</p>}

      {att && (
        <div className="card">
          <strong>Enclave verification</strong>
          <ul className="checks">
            {[...att.checks, ...resChecks].map((c) => (
              <li key={c.id}>
                <span className={c.ok ? 'ok' : 'bad'}>{c.ok ? '✓' : '✗'}</span> {c.label}{' '}
                <span className="muted">({c.source === 'browser' ? 'checked in your browser' : 'checked by Sublee server'}{c.detail ? `, ${c.detail}` : ''})</span>
              </li>
            ))}
          </ul>
          <p className="muted">Encrypted to enclave key {att.modelPubKey.slice(0, 16)}…</p>
        </div>
      )}

      {opinion ? <OpinionView o={opinion} /> : text && <div className="card"><pre>{text}</pre></div>}
    </>
  );
}

function OpinionView({ o }: { o: Opinion }) {
  return (
    <div className="card">
      {o.urgency === 'emergency' && <div className="banner">This may be an emergency. Call your local emergency number now.</div>}
      <p className="muted">Not a diagnosis. Take this to a licensed clinician.</p>
      <h3>Summary</h3>
      <p>{o.summary}</p>
      <p><strong>Urgency:</strong> {o.urgency}. {o.urgency_reason}</p>
      <h3>Possible explanations</h3>
      <ul>{o.likely_explanations.map((x) => <li key={x.condition}><strong>{x.condition}</strong> ({x.likelihood}): {x.reasoning}</li>)}</ul>
      {o.red_flags.length > 0 && (<><h3>Get urgent care if</h3><ul>{o.red_flags.map((x) => <li key={x}>{x}</li>)}</ul></>)}
      <h3>Questions for your doctor</h3>
      <ul>{o.questions_for_your_doctor.map((x) => <li key={x}>{x}</li>)}</ul>
      {o.suggested_tests.length > 0 && (<><h3>Tests that could help</h3><ul>{o.suggested_tests.map((x) => <li key={x}>{x}</li>)}</ul></>)}
      {o.self_care.length > 0 && (<><h3>Meanwhile</h3><ul>{o.self_care.map((x) => <li key={x}>{x}</li>)}</ul></>)}
      {o.what_this_does_not_cover && <p className="muted">{o.what_this_does_not_cover}</p>}
    </div>
  );
}
