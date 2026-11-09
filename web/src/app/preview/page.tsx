// Dev-only design preview of screens that need a live enclave answer. 404s in production.
import { notFound } from 'next/navigation';
import { PreviewClient } from './PreviewClient';

export default function Preview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PreviewClient />;
}
