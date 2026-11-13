'use client';
import '@radix-ui/themes/styles.css';
import '@peerfolio/privy-near-connect/sign-page-plugin/theme.css';
import './sign.css';
import { useEffect, useState } from 'react';
import { SignPagePlugin, type SignPageProps } from '@peerfolio/privy-near-connect/sign-page-plugin';
import { RPC_URL } from '@/lib/config';
import { currentPrivyUser, privy, privyEnabled } from '@/lib/privy';

export function SignClient() {
  const [state, setState] = useState<'loading' | 'ready' | 'signed-out' | 'off'>('loading');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!privyEnabled()) return alive && setState('off');
      await privy().initialize();
      const user = await currentPrivyUser();
      if (!alive) return;
      setOrigin(window.location.origin);
      setState(user ? 'ready' : 'signed-out');
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="wrap section" style={{ maxWidth: 520 }}>
      {/* This popup shows only the confirmation, not the site chrome. */}
      <style>{'.site-header,.site-footer{display:none}'}</style>
      {state === 'loading' && <p className="muted">Loading…</p>}
      {state === 'off' && <p className="muted">Email sign-in isn’t set up on this site.</p>}
      {state === 'signed-out' && (
        <div className="card stack">
          <p style={{ margin: 0 }}>Your email session has ended. Close this window and sign in again on Sublee.</p>
          <div><button className="btn btn-secondary" onClick={() => window.close()}>Close</button></div>
        </div>
      )}
      {state === 'ready' && (
        <SignPagePlugin
          privy={privy() as unknown as SignPageProps['privy']}
          // Only accept requests from this same site, and always sign against NEAR testnet.
          options={{ allowedOrigins: [origin], rpcOptions: { url: RPC_URL } }}
          theme={{ appearance: 'dark', accentColor: 'jade', grayColor: 'sage', radius: 'large' }}
        />
      )}
    </div>
  );
}
