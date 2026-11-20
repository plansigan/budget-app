const MAX_PESO_DIGITS = 10;

/**
 * Formats a raw numeric string with comma thousands separators as the user types.
 */
export function formatPesoInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, MAX_PESO_DIGITS);
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('en-US');
}

/**
 * Formats a numeric value for display inside a peso TextInput (empty string when 0).
 */
export function formatPesoNumber(value: number): string {
  if (!value || value <= 0) return '';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Parses a comma-formatted peso string back into an integer (capped to 10 digits).
 */
export function parsePesoInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, MAX_PESO_DIGITS);
  return digits ? parseInt(digits, 10) : 0;
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
