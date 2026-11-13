import type { PromptView } from './types';

const N = 12; // illustrated portraits in /public/avatars (Notionists by Zoish, CC0)

/** The author's own photo if they added one at mint, else an illustrated portrait picked from the token id. */
export function avatarFor(p: Pick<PromptView, 'token_id' | 'metadata'>): string {
  const media = p.metadata?.media;
  if (media && /^(https:\/\/|data:image\/(png|jpe?g|webp);base64,)/.test(media)) return media;
  let h = 0;
  for (const c of p.token_id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `/avatars/${(h * 7 + 3) % N}.svg`;
}
