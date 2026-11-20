import { Platform, Share } from 'react-native';
import { VELVET_SHADE } from '../theme/palette';
import { TransactionEntry } from '../types/budget';
import {
  formatEntryDateLocal,
  getTransactionPresentation,
} from './transactionDisplay';

function csvEscape(value: string | number, neutralizeFormula = true): string {
  let str = String(value ?? '');
  if (neutralizeFormula && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats all transaction entries as an RFC-4180 CSV spreadsheet string with UTF-8 BOM.
 */
export function buildTransactionsCsv(entries: TransactionEntry[]): string {
  const header = 'Date,Type,Label,Source,Amount_PHP';
  const rows = entries.map((e) => {
    const date = formatEntryDateLocal(e);
    const source = e.paymentSourceLabel || '';
    const signedAmt = getTransactionPresentation(
      e,
      VELVET_SHADE,
      false
    ).csvSignedAmount;
    return [
      csvEscape(date, true),
      csvEscape(e.type, true),
      csvEscape(e.label, true),
      csvEscape(source, true),
      csvEscape(signedAmt, false),
    ].join(',');
  });
  return `\uFEFF${[header, ...rows].join('\n')}`;
}

/**
 * Serializes the user's complete app state to formatted JSON backup text.
 */
export function serializeBackupJson(state: unknown): string {
  return JSON.stringify(
    {
      version: 6,
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );
}

function isValidOptionalNonNegativeNumber(val: unknown): boolean {
  if (val === undefined) return true;
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

function isValidOptionalFiniteNumber(val: unknown): boolean {
  if (val === undefined) return true;
  return typeof val === 'number' && Number.isFinite(val);
}

const ARRAY_KEYS = [
  'billItems',
  'envelopes',
  'banks',
  'creditCards',
  'installments',
  'sinkingFunds',
  'treats',
  'entries',
  'monthlyArchives',
  'unlockedMilestones',
] as const;

const NUMERIC_TOP_KEYS = [
  'cashOnHand',
  'monthlySaved',
  'rolloverBalance',
  'streakDays',
  'bufferShields',
  'disciplineScore',
] as const;

/**
 * Safely parses and validates pasted backup JSON before restoring app state.
 */
export function parseBackupJson(
  raw: string
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Please paste your backup JSON first.' };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Invalid backup format.' };
    }
    const candidate =
      'data' in parsed &&
      parsed.data &&
      typeof parsed.data === 'object' &&
      !Array.isArray(parsed.data)
        ? (parsed.data as Record<string, unknown>)
        : (parsed as Record<string, unknown>);

    const settings = candidate.settings as Record<string, unknown> | undefined;
    if (
      !settings ||
      typeof settings !== 'object' ||
      Array.isArray(settings) ||
      typeof settings.monthlyIncome !== 'number' ||
      !Number.isFinite(settings.monthlyIncome) ||
      settings.monthlyIncome < 0
    ) {
      return {
        ok: false,
        error: 'Backup file has missing or invalid budget settings.',
      };
    }

    if (
      !isValidOptionalNonNegativeNumber(settings.fixedBills) ||
      !isValidOptionalNonNegativeNumber(settings.monthlySavingsGoal) ||
      !isValidOptionalFiniteNumber(settings.payday1) ||
      !isValidOptionalFiniteNumber(settings.payday2) ||
      !isValidOptionalFiniteNumber(settings.salaryFrequency)
    ) {
      return {
        ok: false,
        error: 'Backup contains invalid numeric values in settings.',
      };
    }

    for (const key of NUMERIC_TOP_KEYS) {
      if (!isValidOptionalFiniteNumber(candidate[key])) {
        return {
          ok: false,
          error: `Backup contains invalid numeric value for ${key}.`,
        };
      }
    }

    for (const key of ARRAY_KEYS) {
      const val = candidate[key];
      if (val !== undefined && !Array.isArray(val)) {
        return {
          ok: false,
          error: 'Backup contains corrupted list data.',
        };
      }
    }

    return { ok: true, data: candidate };
  } catch {
    return {
      ok: false,
      error: 'Could not read JSON. Check that you copied the full backup.',
    };
  }
}

/**
 * Triggers a file download on Web or opens the native Share sheet on iOS/Android.
 */
export async function shareOrDownloadText(
  filename: string,
  content: string,
  mimeType: string,
  title: string
): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      return true;
    }

    await Share.share({
      title,
      message: content,
    });
    return true;
  } catch {
    return false;
  }
}
