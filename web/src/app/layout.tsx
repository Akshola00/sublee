import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/wallet';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Sublee: private second opinions',
  description: 'A medical second opinion that even we can’t read. End-to-end encrypted to a verified AI enclave on NEAR.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Header />
          <main className="container">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
