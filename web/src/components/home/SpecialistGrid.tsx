'use client';
import { useMemo, useState } from 'react';
import type { PromptView } from '@/lib/types';
import { SpecialistCard, specialtyLabel } from '@/components/SpecialistCard';

/** Specialists with a specialty filter. */
export function SpecialistGrid({ prompts }: { prompts: PromptView[] }) {
  const [f, setF] = useState<string | null>(null);
  const specialties = useMemo(() => [...new Set(prompts.map((p) => p.specialty))], [prompts]);
  const shown = f ? prompts.filter((p) => p.specialty === f) : prompts;
  return (
    <>
      <div className="spec-filter" role="group" aria-label="Filter by specialty" style={{ marginBottom: 18 }}>
        <button aria-pressed={f === null} onClick={() => setF(null)}>All</button>
        {specialties.map((s) => (
          <button key={s} aria-pressed={f === s} onClick={() => setF(s)}>{specialtyLabel(s)}</button>
        ))}
      </div>
      <div className="spec-grid">
        {shown.map((p, i) => (
          <div key={p.token_id} style={{ animation: `fadein .4s ${i * 50}ms ease both` }}>
            <SpecialistCard p={p} />
          </div>
        ))}
      </div>
    </>
  );
}
