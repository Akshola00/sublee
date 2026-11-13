'use client';
// The hero's case card. It types a fictional case, then really encrypts it in this browser (NEAR AI's E2EE v2,
// to a throwaway key) and shows the ciphertext: what Sublee's server would see. Tilts with the pointer.
import { useEffect, useRef, useState } from 'react';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { encryptTo } from '@/lib/crypto/e2ee';

const CASES = [
  'Tight chest on the stairs for two weeks. Eases after a few minutes of rest. Dad had a heart attack at 61.',
  'Exhausted for months, hair thinning. Ferritin 6, haemoglobin 98. What should I ask my GP?',
  'Fever, very sore throat, swollen glands, no cough. Allergic to penicillin.',
];

type Phase = 'typing' | 'sealing' | 'sealed';

export function HeroCard() {
  const card = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [cipher, setCipher] = useState('');

  // type → encrypt → hold → next case
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const text = CASES[i]!;
    let n = 0;
    let t: ReturnType<typeof setTimeout>;
    const typeNext = () => {
      n = reduce ? text.length : n + 1 + Math.floor(Math.random() * 2);
      setShown(text.slice(0, n));
      if (n < text.length) t = setTimeout(typeNext, 28);
      else t = setTimeout(seal, 900);
    };
    const seal = () => {
      setPhase('sealing');
      const key = bytesToHex(ed25519.getPublicKey(ed25519.utils.randomSecretKey()));
      const full = encryptTo(key, text);
      let k = 0;
      const scramble = () => {
        k += 6;
        setCipher(full.slice(0, Math.min(k * 3, 300)));
        if (k * 3 < 300) t = setTimeout(scramble, 16);
        else {
          setPhase('sealed');
          t = setTimeout(() => {
            setPhase('typing');
            setCipher('');
            setShown('');
            setI((x) => (x + 1) % CASES.length);
          }, 3200);
        }
      };
      scramble();
    };
    t = setTimeout(typeNext, 400);
    return () => clearTimeout(t);
  }, [i]);

  const onMove = (e: React.PointerEvent) => {
    const el = card.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(x - 0.5) * 14}deg) rotateX(${(0.5 - y) * 12}deg)`;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => {
    if (card.current) card.current.style.transform = '';
  };

  const sealed = phase !== 'typing';
  return (
    <div className="stage" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="orbit o1"><span className="dot" /></div>
      <div className="orbit o2"><span className="dot" /></div>
      <div className="casecard" ref={card}>
        <div className="sheen" />
        <div className="head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar sm" src="/avatars/4.svg" alt="" width={36} height={36} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Your case</div>
            <div className="caption">sample · fictional</div>
          </div>
          <span className="lock" data-on={sealed} style={{ marginLeft: 'auto', fontSize: 12 }}>
            {sealed ? '● sealed' : '○ open'}
          </span>
        </div>
        <div className="field-line" aria-live="off">
          {phase === 'typing' ? (
            <span>{shown}<span style={{ color: 'var(--teal)' }}>▍</span></span>
          ) : (
            <span className="cipher">{cipher}</span>
          )}
        </div>
        <div className="foot">
          <span>{sealed ? 'what our server sees' : 'only on your device'}</span>
          <span>{phase === 'sealed' ? 'xchacha20-poly1305' : phase === 'sealing' ? 'encrypting…' : 'typing'}</span>
        </div>
      </div>
    </div>
  );
}
