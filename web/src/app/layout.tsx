import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/lib/wallet';
import { Header } from '@/components/Header';

const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', axes: ['opsz'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Sublee: a private second opinion',
  description:
    'A medical second opinion that stays yours. Your case is encrypted in your browser and only opened inside verified, sealed hardware on NEAR AI.',
};

export const viewport: Viewport = { themeColor: '#f4faf8', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <WalletProvider>
          <Header />
          <main>{children}</main>
          <footer className="wrap-wide section caption">
            Sublee gives second opinions, not diagnoses. In an emergency, call your local emergency number. Built on NEAR testnet for NEAR HACKATHON.
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
