import { Platform, Share } from 'react-native';
import { PersistedBudgetState } from '../state/defaults';
import { normalizePersistedState } from '../state/persistence';
import { VELVET_SHADE } from '../theme/palette';
import { TransactionEntry } from '../types/budget';
import {
  formatEntryDateLocal,
  getTransactionPresentation,
} from './transactionDisplay';

export interface BackupSummary {
  exportedAt?: string;
  monthlyIncome: number;
  entriesCount: number;
  banksCount: number;
  creditCardsCount: number;
  envelopesCount: number;
  billItemsCount: number;
  treatsCount: number;
  installmentsCount: number;
  sinkingFundsCount: number;
  debtsCount: number;
}

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
    const source =
      e.type === 'wallet_transfer' &&
      e.paymentSourceLabel &&
      e.toPaymentSourceLabel
        ? `${e.paymentSourceLabel} -> ${e.toPaymentSourceLabel}`
        : e.paymentSourceLabel || '';
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
  'debts',
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
):
  | { ok: true; data: Record<string, unknown>; exportedAt?: string }
  | { ok: false; error: string } {
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

    const exportedAt =
      'exportedAt' in parsed &&
      typeof parsed.exportedAt === 'string' &&
      !Number.isNaN(Date.parse(parsed.exportedAt))
        ? parsed.exportedAt
        : undefined;

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

    return { ok: true, data: candidate, exportedAt };
  } catch {
    return {
      ok: false,
      error: 'Could not read JSON. Check that you copied the full backup.',
    };
  }
}

/**
 * Parses and summarizes backup JSON contents for pre-restore inspection.
 */
export function summarizeBackupJson(
  raw: string
): { ok: true; summary: BackupSummary } | { ok: false; error: string } {
  const parsed = parseBackupJson(raw);
  if (!parsed.ok) return parsed;
  const normalized = normalizePersistedState(
    parsed.data as Partial<PersistedBudgetState>
  );
  return {
    ok: true,
    summary: {
      exportedAt: parsed.exportedAt,
      monthlyIncome: normalized.settings.monthlyIncome,
      entriesCount: normalized.entries.length,
      banksCount: normalized.banks.length,
      creditCardsCount: normalized.creditCards.length,
      envelopesCount: normalized.envelopes.length,
      billItemsCount: normalized.billItems.length,
      treatsCount: normalized.treats.length,
      installmentsCount: normalized.installments.length,
      sinkingFundsCount: normalized.sinkingFunds.length,
      debtsCount: normalized.debts.length,
    },
  };
}

/**
 * Opens the browser/iOS Safari native file picker for a `.json` backup file and returns its text.
 */
export function pickJsonFileTextOnWeb(): Promise<
  | { ok: true; text: string; filename: string }
  | { ok: false; cancelled?: boolean; error?: string }
> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve({
      ok: false,
      error: 'File picker is only available on Web.',
    });
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    let settled = false;
    const cleanup = () => {
      input.removeEventListener('change', handleChange);
      input.removeEventListener('cancel', handleCancel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    const finish = (
      res:
        | { ok: true; text: string; filename: string }
        | { ok: false; cancelled?: boolean; error?: string }
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(res);
    };

    const readFileText = async (file: File): Promise<string> => {
      if (typeof file.text === 'function') {
        return file.text();
      }
      return new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result || ''));
        reader.onerror = () => rej(new Error('Could not read file.'));
        reader.readAsText(file);
      });
    };

    const handleChange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ ok: false, cancelled: true });
        return;
      }
      readFileText(file)
        .then((text) => finish({ ok: true, text, filename: file.name }))
        .catch(() =>
          finish({ ok: false, error: 'Could not read the selected file.' })
        );
    };

    const handleCancel = () => {
      finish({ ok: false, cancelled: true });
    };

    const handleWindowFocus = () => {
      setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          finish({ ok: false, cancelled: true });
        }
      }, 400);
    };

    input.addEventListener('change', handleChange);
    input.addEventListener('cancel', handleCancel);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus, { once: true });
    }

    document.body.appendChild(input);
    input.click();
  });
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
