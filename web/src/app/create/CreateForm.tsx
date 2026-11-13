'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/lib/wallet';
import { E2EE_MODELS } from '@/lib/config';
import { sealPrompt } from '@/lib/crypto/seal';
import { dollarsToCents, nearToYocto, usdcToUnits } from '@/lib/units';
import { toAvatarDataUrl } from '@/lib/image';

const MODEL_LABELS: Record<string, string> = {
  'z-ai/glm-5.3-flash': 'GLM 5.3 Flash · fast, reads images (recommended)',
  'Qwen/Qwen3.8-27B': 'Qwen 3.8 27B · reads images',
  'deepseek-ai/DeepSeek-V4.1-Flash-1017': 'DeepSeek V4.1 Flash · strong reasoning, reads images',
  'Qwen/Qwen3-VL-30B-A3B-Instruct': 'Qwen3 VL 30B · best for photos',
};

// Sealed hex must fit the contract's 32 KB cap: (32768 / 2) - 72 bytes of overhead.
const MAX_PROMPT_BYTES = 16_000;

const TEMPLATE = `You are a [specialty] consultant with [N] years of experience.
When you review a case:
- Start with what you would want to rule out first, and why.
- Name the findings that point towards and away from each possibility.
- Say which single test or question would change your thinking most.
- Flag anything that needs same-day care in plain words.`;

export function CreateForm() {
  const w = useWallet();
  const router = useRouter();
  const [f, setF] = useState({
    title: '',
    description: '',
    specialty: '',
    model: E2EE_MODELS[0] as string,
    near: '0.1',
    usdc: '1',
    usd: '1',
    prompt: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<'seal' | 'mint' | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const promptBytes = new TextEncoder().encode(f.prompt).length;
  const problems = [
    !f.title.trim() && 'Give it a title.',
    f.title.length > 120 && 'Keep the title under 120 characters.',
    !f.specialty.trim() && 'Add a specialty.',
    f.prompt.trim().length < 80 && 'Write at least a few lines of instructions.',
    promptBytes > MAX_PROMPT_BYTES && `Instructions are too long (${promptBytes.toLocaleString()} of ${MAX_PROMPT_BYTES.toLocaleString()} bytes).`,
    !f.near && !f.usdc && !f.usd && 'Set at least one price.',
  ].filter(Boolean) as string[];

  const mint = async () => {
    setError(null);
    if (problems.length) return setError(problems[0]!);
    if (!w.accountId) return w.connect();
    try {
      setBusy('seal');
      const prices = { price_near: nearToYocto(f.near), price_usdc: usdcToUnits(f.usdc), price_cents: dollarsToCents(f.usd) };
      const keyRes = await fetch('/api/prompt-key');
      if (!keyRes.ok) throw new Error('Couldn’t get the sealing key. Try again.');
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const sealed = sealPrompt(publicKey, f.prompt);
      setBusy('mint');
      const tokenId = await w.mintPrompt({
        title: f.title.trim(),
        description: f.description.trim(),
        media: photo,
        specialty: f.specialty.trim().toLowerCase().replace(/\s+/g, '-'),
        model: f.model,
        sealed_prompt: sealed,
        ...prices,
      });
      router.push(`/specialist/${tokenId}?minted=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <div className="card stack">
        <h2 style={{ marginBottom: 0 }}>What patients see</h2>
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar lg" src={photo ?? '/avatars/0.svg'} alt="" width={72} height={72} />
          <div className="stack" style={{ gap: 6 }}>
            <label className="btn btn-secondary btn-sm" style={{ position: 'relative' }}>
              {photo ? 'Change photo' : 'Add your photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    setPhoto(await toAvatarDataUrl(file));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : String(err));
                  }
                }}
              />
            </label>
            <span className="caption">{photo ? <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, minHeight: 0 }} onClick={() => setPhoto(null)}>Use an illustration instead</button> : 'Optional. Without one, patients see an illustration. It’s public on-chain.'}</span>
          </div>
        </div>
        <label className="field"><span>Title</span>
          <input value={f.title} onChange={set('title')} placeholder="Thyroid results explained" maxLength={120} />
        </label>
        <label className="field"><span>Specialty</span>
          <input value={f.specialty} onChange={set('specialty')} placeholder="endocrinology" />
        </label>
        <label className="field"><span>Description</span>
          <textarea rows={2} value={f.description} onChange={set('description')} maxLength={2000} placeholder="One or two sentences on what this specialist is good at." />
        </label>
      </div>

      <div className="card stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Your instructions</h2>
          <span className="chip">Sealed before it leaves this page</span>
        </div>
        <p className="small muted">
          This is the expertise you’re selling. Sublee always adds its own safety rules and answer format before your
          instructions, so focus on how you think through a case.
        </p>
        <label className="field"><span>Prompt</span>
          <textarea rows={10} value={f.prompt} onChange={set('prompt')} placeholder={TEMPLATE} style={{ fontSize: 15 }} />
        </label>
        <div className="spread">
          <button type="button" className="btn btn-ghost" onClick={() => setF((s) => ({ ...s, prompt: s.prompt || TEMPLATE }))}>Start from a template</button>
          <span className="caption">{promptBytes.toLocaleString()} / {MAX_PROMPT_BYTES.toLocaleString()} bytes</span>
        </div>
        <label className="field"><span>Model</span>
          <select value={f.model} onChange={set('model')}>
            {E2EE_MODELS.map((m) => <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>)}
          </select>
        </label>
        <p className="caption" style={{ margin: 0 }}>Only models that run in verified, encrypted hardware are offered.</p>
      </div>

      <div className="card stack">
        <h2 style={{ marginBottom: 0 }}>Price per consult</h2>
        <p className="small muted">Leave a field empty to not accept that method. You keep 85% of each consult; 15% goes to Sublee.</p>
        <div className="grid-3">
          <label className="field"><span>Card (USD)</span><input inputMode="decimal" value={f.usd} onChange={set('usd')} placeholder="1.00" /></label>
          <label className="field"><span>USDC</span><input inputMode="decimal" value={f.usdc} onChange={set('usdc')} placeholder="1.00" /></label>
          <label className="field"><span>NEAR</span><input inputMode="decimal" value={f.near} onChange={set('near')} placeholder="0.1" /></label>
        </div>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="spread">
        <span className="caption">Minting costs a small storage deposit (up to 0.2 NEAR); the unused part comes back.</span>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={mint} aria-busy={!!busy} disabled={!!busy}>
          {busy === 'seal' ? 'Sealing…' : busy === 'mint' ? 'Confirm in your wallet…' : w.accountId ? 'Seal and mint' : 'Connect wallet to mint'}
        </button>
      </div>
    </div>
  );
}
