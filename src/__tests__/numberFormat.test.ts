import { describe, expect, it } from 'vitest';
import {
  formatOrdinal,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';

describe('numberFormat', () => {
  it('formats raw input with commas and enforces the 10-digit cap', () => {
    expect(formatPesoInput('')).toBe('');
    expect(formatPesoInput('abc')).toBe('');
    expect(formatPesoInput('00012500')).toBe('12,500');
    expect(formatPesoInput('12,500php')).toBe('12,500');
    expect(formatPesoInput('12345678901234')).toBe('1,234,567,890');
  });

  it('formats numeric values for TextInput and returns empty string for <= 0', () => {
    expect(formatPesoNumber(0)).toBe('');
    expect(formatPesoNumber(-500)).toBe('');
    expect(formatPesoNumber(12500.4)).toBe('12,500');
  });

  it('parses formatted strings back to integers up to 10 digits', () => {
    expect(parsePesoInput('')).toBe(0);
    expect(parsePesoInput('₱12,500')).toBe(12500);
    expect(parsePesoInput('999999999999')).toBe(9999999999);
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
