import { describe, expect, it } from 'vitest';
import { nearToYocto, usdcToUnits, dollarsToCents } from './units';

describe('units', () => {
  it('converts exactly', () => {
    expect(nearToYocto('0.25')).toBe('250000000000000000000000');
    expect(nearToYocto('1')).toBe('1000000000000000000000000');
    expect(usdcToUnits('2.5')).toBe('2500000');
    expect(dollarsToCents('1.99')).toBe('199');
    expect(dollarsToCents('')).toBe('0');
    expect(dollarsToCents('.5')).toBe('50');
  });
  it('rejects bad input', () => {
    expect(() => dollarsToCents('1.999')).toThrow();
    expect(() => nearToYocto('abc')).toThrow();
    expect(() => usdcToUnits('-1')).toThrow();
  });
});
