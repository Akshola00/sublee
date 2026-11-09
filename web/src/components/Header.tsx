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
        {!ready ? null : accountId ? (
          <div className="row">
            <span className="small muted" title={accountId}>{short(accountId)}</span>
            <button className="btn btn-secondary btn-sm" onClick={disconnect}>Sign out</button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={connect}>Connect wallet</button>
        )}
      </div>
    </header>
  );
}
