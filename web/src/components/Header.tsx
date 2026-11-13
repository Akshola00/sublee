'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { Logo } from './Logo';

const short = (id: string) => (id.length > 22 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id);
const SECTIONS = [
  ['how', 'How it works'],
  ['specialists', 'Specialists'],
  ['privacy', 'Who sees what'],
  ['experts', 'For experts'],
] as const;

/** Highlights the home-page section in view. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

export function Header() {
  const { accountId, ready, connect, disconnect } = useWallet();
  const home = usePathname() === '/';
  const active = useActiveSection(home);
  return (
    <header className="site-header">
      <div className="wrap-wide inner">
        <Link href="/" className="logo" aria-label="Sublee home"><Logo /></Link>
        <nav className="navpill" aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <Link key={id} href={`/#${id}`} data-active={active === id}>{label}</Link>
          ))}
        </nav>
        <nav className="row" style={{ gap: 6 }} aria-label="Account">
          {ready && accountId && <Link href="/history" className="btn btn-ghost btn-sm">History</Link>}
          {ready && accountId && <Link href="/me" className="btn btn-ghost btn-sm nav-hide-sm">My specialists</Link>}
          {!ready ? null : accountId ? (
            <button className="btn btn-secondary btn-sm" onClick={disconnect} title={`Signed in as ${accountId}`}>
              <span className="nav-hide-sm">{short(accountId)} · </span>Sign out
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={connect}>Sign in</button>
          )}
        </nav>
      </div>
    </header>
  );
}
