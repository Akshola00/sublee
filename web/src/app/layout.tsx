import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/lib/wallet';
import { Header } from '@/components/Header';
import { Logo, LogoMark } from '@/components/Logo';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Sublee: a private second opinion',
  description:
    'A medical second opinion that stays yours. Your case is encrypted in your browser and only opened inside verified, sealed hardware on NEAR AI.',
};

export const viewport: Viewport = { themeColor: '#070b0b', width: 'device-width', initialScale: 1, colorScheme: 'dark' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <WalletProvider>
          <Suspense
            fallback={
              <header className="site-header">
                <div className="wrap-wide inner"><Link href="/" className="logo" aria-label="Sublee home"><Logo /></Link></div>
              </header>
            }
          >
            <Header />
          </Suspense>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="wrap-wide section spread caption">
              <span className="row" style={{ gap: 10 }}><LogoMark size={20} /> Second opinions, not diagnoses. In an emergency, call your local emergency number.</span>
              <span className="mono" style={{ wordBreak: 'normal' }}>built at NEAR HACKATHON · testnet</span>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
