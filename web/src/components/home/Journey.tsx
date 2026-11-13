'use client';
// Scroll story: follow one case from your device to the enclave and back. The panel shows what each party sees.
import { useEffect, useRef, useState } from 'react';

const NODES = [
  { icon: '◐', name: 'Your device' },
  { icon: '⇄', name: 'Sublee' },
  { icon: '☁', name: 'NEAR AI' },
  { icon: '◆', name: 'Enclave' },
];

const CIPHER =
  '9f1c0a7be244d8e1035c6af2b7194e0d8a3f62c1e57b09d4a6f8132e7c0b95d4f1a26e83c7b05d9e4a1f6c2b8d370e5a9c14f72b6d083e5a1c9f47b2d60e38a5c1f9b7d24e60a3c58f1b9d72e04a6c3b8f15d97e20c4a6b';

const VIEWS = [
  { who: 'you see', body: 'Tight chest on the stairs for two weeks. Eases after a few minutes of rest.', cipher: false },
  { who: 'sublee sees', body: CIPHER, cipher: true },
  { who: 'the gateway sees', body: CIPHER, cipher: true },
  { who: 'only the enclave reads', body: 'Tight chest on the stairs for two weeks… → a second opinion, encrypted back to you and signed by the chip.', cipher: false },
];

const STEPS = [
  { n: '01 · your device', h: 'You write it. It’s locked right here.', p: 'Before anything is sent, your browser checks the enclave is genuine (Intel and NVIDIA sign for it) and encrypts your case to a key that only exists inside it.' },
  { n: '02 · sublee', h: 'We pass it on without reading it.', p: 'Our server checks your payment on NEAR and adds the specialist’s sealed instructions, also encrypted to the enclave. Your case stays ciphertext the whole way.' },
  { n: '03 · near ai cloud', h: 'Routed, still sealed.', p: 'NEAR AI’s gateway sends it to a GPU running inside sealed hardware. It sees which model you asked for, not what you wrote.' },
  { n: '04 · the enclave', h: 'Opened only inside the chip.', p: 'The model reads your case, writes a second opinion, and encrypts it back to your browser. The hardware signs the answer so you can check it wasn’t changed.' },
];

export function Journey() {
  const [on, setOn] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setOn(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const v = VIEWS[on]!;
  return (
    <div className="journey">
      <div className="journey-sticky">
        <div className="track">
          <div className="track-nodes">
            <div className="track-line"><i style={{ width: `${(on / 3) * 100}%` }} /></div>
            {NODES.map((nd, i) => (
              <div key={nd.name} className="node" data-on={i <= on}>
                <div className="bubble" aria-hidden>{nd.icon}</div>
                <div className="name">{nd.name}</div>
              </div>
            ))}
          </div>
          <div className="track-view">
            <div className="who"><span>{v.who}</span><span>{v.cipher ? '🔒 ciphertext' : 'plain text'}</span></div>
            <div key={on} className={`body ${v.cipher ? 'cipher' : ''}`} style={{ animation: 'fadein .4s ease both' }}>{v.body}</div>
          </div>
        </div>
      </div>
      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s.n} className="step" data-i={i} data-on={on === i} ref={(el) => { refs.current[i] = el; }}>
            <div className="num">{s.n}</div>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
