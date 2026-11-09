import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { getPrompt } from '@/lib/chain';
import { ConsultFlow } from '@/components/ConsultFlow';

async function Specialist({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const p = await getPrompt(id);
  if (!p) notFound();
  return <ConsultFlow prompt={p} />;
}

export default function Page(props: PageProps<'/specialist/[id]'>) {
  return (
    <Suspense fallback={<p className="muted">Loading specialist…</p>}>
      <Specialist params={props.params} />
    </Suspense>
  );
}
