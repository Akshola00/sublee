'use client';
/** Square-crop and shrink an image in the browser, returning a small WebP data URL for on-chain metadata. */
export async function toAvatarDataUrl(file: File, size = 128): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 8 * 1024 * 1024) throw new Error('That image is over 8 MB.');
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  bmp.close();
  for (const q of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/webp', q);
    if (url.startsWith('data:image/webp') && url.length <= 14_000) return url;
  }
  const jpg = canvas.toDataURL('image/jpeg', 0.7);
  if (jpg.length > 14_000) throw new Error('Couldn’t make that image small enough. Try another.');
  return jpg;
}
