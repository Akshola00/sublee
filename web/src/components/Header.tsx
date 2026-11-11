'use client';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';

const short = (id: string) => (id.length > 22 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id);

export function Header() {
  const { accountId, ready, connect, disconnect } = useWallet();
  return (
    <header className="site-header">
      <div className="wrap-wide inner">
        <Link href="/" className="logo" aria-label="Sublee home">
          <span className="logo-mark" aria-hidden>S</span>
          Sublee
        </Link>
        <nav className="row" style={{ gap: 6 }}>
          <Link href="/create" className="btn btn-ghost btn-sm nav-hide-sm">For experts</Link>
          {ready && accountId && <Link href="/history" className="btn btn-ghost btn-sm">History</Link>}
          {ready && accountId && <Link href="/me" className="btn btn-ghost btn-sm nav-hide-sm">My specialists</Link>}
          {!ready ? null : accountId ? (
            <button className="btn btn-secondary btn-sm" onClick={disconnect} title={`Signed in as ${accountId}`}>
              <span className="nav-hide-sm">{short(accountId)} · </span>Sign out
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={connect}>Connect wallet</button>
          )}
        </nav>
      </div>
    </header>
  );
}
