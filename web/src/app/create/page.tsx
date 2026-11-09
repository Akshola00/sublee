import type { Metadata } from 'next';
import { CreateForm } from './CreateForm';

export const metadata: Metadata = { title: 'Create a specialist · Sublee' };

export default function CreatePage() {
  return (
    <div className="wrap section">
      <span className="chip">For experts</span>
      <h1 style={{ marginTop: 14 }}>Turn your expertise into a specialist.</h1>
      <p className="muted" style={{ fontSize: 17 }}>
        Write the instructions that make the AI reason like you do. Mint them as an NFT and earn 85% of every consult. Your
        prompt is sealed in this browser, so patients can use it but nobody can read or copy it.
      </p>
      <CreateForm />
    </div>
  );
}
