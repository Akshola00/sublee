'use client';
// Privy email sign-in that ends in a NEAR testnet account (an implicit account owned by a Privy embedded key).
// Signing happens in our /sign popup via @peerfolio/privy-near-connect; this file only handles login + wallet setup.
import Privy, { LocalStorage, create as createWallet } from '@privy-io/js-sdk-core';

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
export const PRIVY_CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID ?? '';
export const privyEnabled = () => !!PRIVY_APP_ID;
export const PRIVY_WALLET_ID = 'sublee-email';

let client: Privy | null = null;
export function privy(): Privy {
  if (!privyEnabled()) throw new Error('Email sign-in isn’t set up yet.');
  client ??= new Privy({ appId: PRIVY_APP_ID, clientId: PRIVY_CLIENT_ID || undefined, storage: new LocalStorage() });
  return client;
}

type Linked = { type?: string; chain_type?: string; address?: string };
type UserLike = { linked_accounts?: Linked[] } | null | undefined;
const nearOf = (u: UserLike) => u?.linked_accounts?.find((a) => a.type === 'wallet' && a.chain_type === 'near')?.address ?? null;

/** Make sure the signed-in Privy user has a NEAR wallet; returns its account id (64-hex implicit account). */
export async function ensureNearAccount(p: Privy, user: UserLike): Promise<string> {
  const have = nearOf(user);
  if (have) return have;
  await createWallet(
    { fetchPrivyRoute: p.fetchPrivyRoute.bind(p), getCompiledPath: p.getCompiledPath.bind(p), app: { appId: p.app.appId } },
    { request: { chain_type: 'near' } },
  );
  const { user: fresh } = await p.user.get();
  const id = nearOf(fresh as UserLike);
  if (!id) throw new Error('Couldn’t create your account. Try again.');
  return id;
}

export async function currentPrivyUser(): Promise<UserLike> {
  try {
    const { user } = await privy().user.get();
    return user as UserLike;
  } catch {
    return null;
  }
}

/** The near-connect manifest for our Privy wallet, pointing at this site's sign page and executor. */
export function privyManifest(origin: string) {
  return {
    id: PRIVY_WALLET_ID,
    name: 'Email (Privy)',
    icon: `${origin}/icon.svg`,
    description: 'Sign in with your email. No wallet app needed.',
    website: origin,
    version: '1.0.0',
    executor: `${origin}/privy/executor.js`,
    type: 'sandbox' as const,
    platform: { web: origin },
    features: {
      signMessage: true,
      signInWithoutAddKey: true,
      signInAndSignMessage: true,
      signInWithFunctionCallKey: true,
      signAndSendTransaction: true,
      signAndSendTransactions: true,
      mainnet: false,
      testnet: true,
    },
    permissions: { storage: true, allowsOpen: [origin] },
    metadata: { signPageURL: `${origin}/sign`, debug: false },
  };
}
