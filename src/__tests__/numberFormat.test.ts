import { describe, expect, it } from 'vitest';
import {
  formatOrdinal,
  formatPeso,
  formatPesoDisplay,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';

describe('numberFormat', () => {
  it('formats currency with 2 decimal places including negative and edge cases', () => {
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso(1234)).toBe('₱1,234.00');
    expect(formatPeso(1234.5)).toBe('₱1,234.50');
    expect(formatPeso(0.05)).toBe('₱0.05');
    expect(formatPeso(-145.5)).toBe('-₱145.50');
    expect(formatPeso(-0.004)).toBe('₱0.00');
    expect(formatPeso(-0.001)).toBe('₱0.00');
    expect(formatPeso(-0.001, 0)).toBe('₱0');
    expect(formatPeso(-0.001)).toBe(formatPeso(0));
    expect(formatPeso(Number.NaN)).toBe('₱0.00');
    expect(formatPeso(1234, 0)).toBe('₱1,234');
  });

  it('formats visible and privacy-masked peso strings consistently', () => {
    expect(formatPesoDisplay(1250)).toBe('₱1,250.00');
    expect(formatPesoDisplay(1250.75, false)).toBe('₱1,250.75');
    expect(formatPesoDisplay(1250.75, true)).toBe('₱••••');
    expect(formatPesoDisplay(-45.5, true)).toBe('-₱••••');
    expect(formatPesoDisplay(-0.001, false)).toBe('₱0.00');
    expect(formatPesoDisplay(-0.001, true)).toBe('₱••••');
    expect(formatPesoNumber(-0.001)).toBe('');
  });

  it('formats raw input with commas and preserves valid decimal typing states', () => {
    expect(formatPesoInput('')).toBe('');
    expect(formatPesoInput('abc')).toBe('');
    expect(formatPesoInput('00012500')).toBe('12,500');
    expect(formatPesoInput('12,500php')).toBe('12,500');
    expect(formatPesoInput('12345678901234')).toBe('1,234,567,890');
    expect(formatPesoInput('.')).toBe('0.');
    expect(formatPesoInput('.5')).toBe('0.5');
    expect(formatPesoInput('.05')).toBe('0.05');
    expect(formatPesoInput('.567')).toBe('0.56');
    expect(formatPesoInput('1250.')).toBe('1,250.');
    expect(formatPesoInput('1250.0')).toBe('1,250.0');
    expect(formatPesoInput('1,250.5.3')).toBe('1,250.53');
  });

  it('formats numeric values for TextInput cleanly (drops .00 on whole, keeps 2 decimals on cents)', () => {
    expect(formatPesoNumber(0)).toBe('');
    expect(formatPesoNumber(-500)).toBe('');
    expect(formatPesoNumber(0.004)).toBe('');
    expect(formatPesoNumber(0.05)).toBe('0.05');
    expect(formatPesoNumber(12500)).toBe('12,500');
    expect(formatPesoNumber(12500.4)).toBe('12,500.40');
    expect(formatPesoNumber(12500.999)).toBe('12,501');
  });

  it('parses formatted peso strings back to 2-decimal numbers up to 10 int digits', () => {
    expect(parsePesoInput('')).toBe(0);
    expect(parsePesoInput('.')).toBe(0);
    expect(parsePesoInput('.5')).toBe(0.5);
    expect(parsePesoInput('.05')).toBe(0.05);
    expect(parsePesoInput('₱12,500')).toBe(12500);
    expect(parsePesoInput('₱1,234.56')).toBe(1234.56);
    expect(parsePesoInput('1,234.')).toBe(1234);
    expect(parsePesoInput('999999999999.999')).toBe(9999999999.99);
  });

  it('formats English ordinal suffixes correctly including 11th, 12th, 13th', () => {
    expect(formatOrdinal(1)).toBe('1st');
    expect(formatOrdinal(2)).toBe('2nd');
    expect(formatOrdinal(3)).toBe('3rd');
    expect(formatOrdinal(4)).toBe('4th');
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
    expect(formatOrdinal(21)).toBe('21st');
    expect(formatOrdinal(22)).toBe('22nd');
    expect(formatOrdinal(23)).toBe('23rd');
    expect(formatOrdinal(31)).toBe('31st');
  });
});
