'use client';
// Pull text out of an attached file, entirely in the browser. The file itself never leaves this device;
// only the extracted text is added to the case, which is then encrypted with the rest of it.

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 20_000; // per attachment, matches caseToMessage

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over 10 MB.`);
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return extractPdf(file);
  if (file.type.startsWith('text/') || /\.(txt|csv|md|tsv)$/.test(name)) return clean(await file.text());
  if (file.type.startsWith('image/')) throw new Error('Photos aren’t supported yet. Attach the PDF, or type the key results into the case.');
  throw new Error(`${file.name}: only PDF and text files can be attached.`);
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Rebuild lines from text items using their y position.
    let lastY: number | null = null;
    let line = '';
    const lines: string[] = [];
    for (const it of content.items) {
      if (!('str' in it)) continue;
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = '';
      }
      line += (line && !line.endsWith(' ') ? ' ' : '') + it.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.filter(Boolean).join('\n'));
  }
  await doc.cleanup();
  const text = clean(pages.join('\n\n'));
  if (text.length < 20) throw new Error(`${file.name} looks like a scan with no text in it. Type the key results into the case instead.`);
  return text;
}

const clean = (s: string) => s.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT);
