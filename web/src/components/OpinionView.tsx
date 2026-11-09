'use client';
import { useState } from 'react';
import type { Opinion } from '@/lib/schema';

const URGENCY: Record<Opinion['urgency'], string> = {
  routine: 'Routine: see your doctor when convenient',
  soon: 'See a doctor in the next few days',
  urgent: 'See a doctor today',
  emergency: 'Emergency',
};

function asText(o: Opinion, specialist: string) {
  const list = (t: string, xs: string[]) => (xs.length ? `\n${t}\n${xs.map((x) => `- ${x}`).join('\n')}\n` : '');
  return [
    `Second opinion (${specialist}, via Sublee). Not a diagnosis.`,
    `\n${o.summary}`,
    `\nUrgency: ${URGENCY[o.urgency]}. ${o.urgency_reason}`,
    list('What it could be', o.likely_explanations.map((x) => `${x.condition} (${x.likelihood}): ${x.reasoning}`)),
    list('Get help quickly if', o.red_flags),
    list('Questions for my doctor', o.questions_for_your_doctor),
    list('Tests that could help', o.suggested_tests),
  ].join('');
}

export function OpinionView({ o, specialist }: { o: Opinion; specialist: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack">
      {o.urgency === 'emergency' && (
        <div className="emergency" role="alert">
          This could be an emergency. Call your local emergency number now.
          {o.urgency_reason && <div style={{ fontWeight: 400, fontSize: 15, marginTop: 6 }}>{o.urgency_reason}</div>}
        </div>
      )}
      <article className="card opinion">
        <div className="spread" style={{ marginBottom: 12 }}>
          <span className="caption">Second opinion · {specialist}</span>
          <span className={`chip pill-${o.urgency}`}>{URGENCY[o.urgency]}</span>
        </div>
        <p className="lead">{o.summary}</p>
        {o.urgency !== 'emergency' && o.urgency_reason && <p className="small muted">{o.urgency_reason}</p>}

        {o.likely_explanations.length > 0 && (
          <section>
            <h3>What it could be</h3>
            <ul className="explain">
              {o.likely_explanations.map((x) => (
                <li key={x.condition}>
                  <div className="row"><strong>{x.condition}</strong><span className={`chip lk-${x.likelihood}`}>{x.likelihood} likelihood</span></div>
                  <div className="small muted" style={{ marginTop: 4 }}>{x.reasoning}</div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {o.red_flags.length > 0 && <Section title="Get help quickly if" items={o.red_flags} />}
        {o.questions_for_your_doctor.length > 0 && <Section title="Ask your doctor" items={o.questions_for_your_doctor} />}
        {o.suggested_tests.length > 0 && <Section title="Tests that could help" items={o.suggested_tests} />}
        {o.self_care.length > 0 && <Section title="Meanwhile" items={o.self_care} />}

        <section>
          <p className="caption">{o.what_this_does_not_cover || 'This is a second opinion, not a diagnosis.'} Always talk to a licensed clinician before acting on it.</p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(asText(o, specialist));
              setCopied(true);
            }}
          >
            {copied ? 'Copied' : 'Copy for my doctor'}
          </button>
        </section>
      </article>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  );
}
