import type { Metadata } from 'next';
import { SignClient } from './SignClient';

export const metadata: Metadata = { title: 'Confirm · Sublee', robots: { index: false } };

// Popup opened by near-connect for the email (Privy) wallet. Approves sign-ins, messages and transactions.
export default function SignPage() {
  return <SignClient />;
}
