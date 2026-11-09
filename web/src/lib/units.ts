// Decimal string → integer base units, without floating point.
function toUnits(value: string, decimals: number): string {
  const v = value.trim();
  if (!v) return '0';
  if (!/^\d*(\.\d*)?$/.test(v)) throw new Error(`"${value}" isn't a number`);
  const [w = '0', f = ''] = v.split('.');
  if (f.length > decimals) throw new Error(`Use at most ${decimals} decimal places`);
  return (BigInt(w || '0') * 10n ** BigInt(decimals) + BigInt((f + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString();
}

export const nearToYocto = (near: string) => toUnits(near, 24);
export const usdcToUnits = (usdc: string) => toUnits(usdc, 6);
export const dollarsToCents = (usd: string) => toUnits(usd, 2);
