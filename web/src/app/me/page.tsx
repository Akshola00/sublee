import type { Metadata } from 'next';
import { MySpecialists } from './MySpecialists';

export const metadata: Metadata = { title: 'My specialists · Sublee' };

export default function MePage() {
  return (
    <div className="wrap section">
      <h1>My specialists</h1>
      <p className="muted">The specialist NFTs you own. Earnings go to whoever owns the NFT, so if you sell one, its future earnings go with it.</p>
      <MySpecialists />
    </div>
  );
}
