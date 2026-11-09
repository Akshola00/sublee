'use client';
import { TrustCard } from '@/components/TrustCard';
import { OpinionView } from '@/components/OpinionView';
import type { AttestationResult } from '@/lib/attestation';
import type { Opinion } from '@/lib/schema';

const att: AttestationResult = {
  model: 'z-ai/glm-5.3-flash', nonce: '7f3a19c0d2e4b6a8'.repeat(4), modelPubKey: '5a0210f2442c'.padEnd(64, 'a'), verified: true, fetchedAt: 1794262000000,
  checks: [
    { id: 'key-binding', label: 'The lock we use belongs to the sealed hardware', ok: true, source: 'browser' },
    { id: 'nonce', label: 'Its proof is fresh, made just now for you', ok: true, source: 'browser' },
    { id: 'gpu-nonce', label: 'The AI chip answered the same fresh challenge', ok: true, source: 'browser' },
    { id: 'tdx', label: 'Intel confirms the hardware is genuine', ok: true, source: 'server' },
    { id: 'gpu', label: 'NVIDIA confirms the AI chip is genuine', ok: true, source: 'server' },
  ],
};
const opinion: Opinion = {
  summary: 'Your symptoms (fever, a very sore throat, swollen neck glands and no cough) fit a bacterial throat infection such as strep throat well, though a viral cause is still possible. A quick throat swab would tell them apart.',
  urgency: 'soon', urgency_reason: 'Worth seeing a doctor within a day or two to test and, if needed, treat.',
  likely_explanations: [
    { condition: 'Strep throat (bacterial tonsillitis)', likelihood: 'high', reasoning: 'Fever, tender swollen glands and absence of cough score highly on the Centor criteria.' },
    { condition: 'Viral pharyngitis', likelihood: 'medium', reasoning: 'Very common and can look identical; usually milder and often comes with a cough or runny nose.' },
    { condition: 'Glandular fever (mononucleosis)', likelihood: 'low', reasoning: 'Possible at your age with tiredness and swollen glands; a blood test can check if it drags on.' },
  ],
  red_flags: ['Difficulty breathing or swallowing saliva', 'Muffled voice or one-sided throat swelling', 'A rash, or fever above 39.5°C that won’t come down'],
  questions_for_your_doctor: ['Should I have a rapid strep test or throat swab?', 'Given my penicillin allergy, which antibiotic would be safe if I need one?', 'When should I come back if it isn’t improving?'],
  suggested_tests: ['Rapid antigen strep test or throat culture'],
  self_care: ['Rest and fluids', 'Paracetamol for pain and fever as directed on the pack', 'Warm salt-water gargles'],
  what_this_does_not_cover: 'This review can’t examine your throat or glands.',
};

export function PreviewClient() {
  return (
    <div className="wrap section stack">
      <h1>Design preview</h1>
      <TrustCard att={att} resChecks={[{ id: 'sig', label: 'The answer is signed by that same hardware', ok: true, source: 'browser' }, { id: 'res-hash', label: 'The answer wasn’t changed on the way back', ok: true, source: 'browser' }]} stage="done" />
      <OpinionView o={opinion} specialist="General practice second look" />
      <OpinionView o={{ ...opinion, urgency: 'emergency', urgency_reason: 'Chest pain with sweating and breathlessness can be a heart attack.' }} specialist="Cardiology consult" />
    </div>
  );
}
