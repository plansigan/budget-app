const MAX_PESO_DIGITS = 10;
const MAX_DECIMAL_DIGITS = 2;

function sanitizeDecimalPieces(raw: string): {
  intDigits: string;
  decDigits: string;
  hasDot: boolean;
} {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) {
    return { intDigits: '', decDigits: '', hasDot: false };
  }
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) {
    return {
      intDigits: cleaned.slice(0, MAX_PESO_DIGITS),
      decDigits: '',
      hasDot: false,
    };
  }
  return {
    intDigits: cleaned.slice(0, dotIndex).slice(0, MAX_PESO_DIGITS),
    decDigits: cleaned
      .slice(dotIndex + 1)
      .replace(/\./g, '')
      .slice(0, MAX_DECIMAL_DIGITS),
    hasDot: true,
  };
}

/**
 * Formats a numeric peso amount with fixed decimal places (default 2: `₱1,234.00`, `-₱145.50`).
 */
export function formatPeso(amount: number, decimals = 2): string {
  const factor = 10 ** decimals;
  const safe = Number.isFinite(amount)
    ? Math.round(amount * factor) / factor
    : 0;
  const normalized = Math.abs(safe) === 0 ? 0 : safe;
  const sign = normalized < 0 ? '-' : '';
  const formatted = Math.abs(normalized).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}₱${formatted}`;
}

/**
 * Formats a peso amount for visible or privacy-masked UI display.
 */
export function formatPesoDisplay(
  amount: number,
  masked = false,
  decimals = 2
): string {
  if (masked) {
    const safe = Number.isFinite(amount) ? amount : 0;
    return safe < 0 ? '-₱••••' : '₱••••';
  }
  return formatPeso(amount, decimals);
}

/**
 * Formats a raw numeric string with comma thousands separators and up to 2 decimal places as the user types.
 */
export function formatPesoInput(raw: string): string {
  const { intDigits, decDigits, hasDot } = sanitizeDecimalPieces(raw);
  if (!hasDot) {
    return intDigits ? parseInt(intDigits, 10).toLocaleString('en-US') : '';
  }
  const intPart = intDigits
    ? parseInt(intDigits, 10).toLocaleString('en-US')
    : '0';
  return `${intPart}.${decDigits}`;
}

/**
 * Formats a numeric value for display inside a peso TextInput (empty string when <= 0; whole numbers drop `.00`).
 */
export function formatPesoNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const cents = Math.round(value * 100);
  if (cents <= 0) return '';
  const rounded = cents / 100;
  const isWhole = cents % 100 === 0;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a comma-formatted peso string back into a 2-decimal number (capped to 10 integer digits).
 */
export function parsePesoInput(raw: string): number {
  const { intDigits, decDigits, hasDot } = sanitizeDecimalPieces(raw);
  if (!hasDot) {
    return intDigits ? parseInt(intDigits, 10) : 0;
  }
  const combined = `${intDigits || '0'}.${decDigits || '0'}`;
  const parsed = parseFloat(combined);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

/**
 * Formats a day-of-month number with its proper English ordinal suffix (1st, 2nd, 3rd, 11th, 21st).
 */
export function formatOrdinal(day: number): string {
  const n = Math.round(day);
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }
  switch (Math.abs(n) % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
