import type { Metadata } from 'next';
import { HistoryList } from './HistoryList';

export const metadata: Metadata = { title: 'History · Sublee' };

export default function HistoryPage() {
  return (
    <div className="wrap section">
      <h1>Your history</h1>
      <p className="muted">
        Consults you chose to keep. They live only in this browser, encrypted with a key your wallet creates. Sublee has no
        copy, so clearing this browser&apos;s data or deleting here removes them for good.
      </p>
      <HistoryList />
    </div>
  );
}
