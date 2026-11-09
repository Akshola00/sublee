'use client';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';

export function Header() {
  const { accountId, ready, connect, disconnect } = useWallet();
  return (
    <header className="top">
      <Link href="/"><strong>Sublee</strong></Link>
      {!ready ? (
        <span className="muted">…</span>
      ) : accountId ? (
        <span className="row">
          <span className="muted">{accountId}</span>
          <button className="secondary" onClick={disconnect}>Disconnect</button>
        </span>
      ) : (
        <button onClick={connect}>Connect wallet</button>
      )}
    </header>
  );
}
