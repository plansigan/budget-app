import { describe, expect, it } from 'vitest';
import {
  buildTransactionsCsv,
  parseBackupJson,
  serializeBackupJson,
} from '../utils/backupExport';
import { TransactionEntry } from '../types/budget';

describe('backupExport', () => {
  it('builds RFC-4180 CSV with UTF-8 BOM, formula neutralization, and signed transaction amounts', () => {
    const entries: TransactionEntry[] = [
      {
        id: '1',
        type: 'spend',
        amount: 250,
        label: '=SUM(A1:A2)',
        icon: 'coffee',
        timestamp: '2026-04-10T04:00:00.000Z',
        dateKey: '2026-04-10',
        paymentSourceLabel: 'Cafe, "Special"',
      },
      {
        id: '2',
        type: 'installment_paid',
        amount: 1500,
        label: 'Phone Payment',
        icon: 'credit-card',
        timestamp: '2026-04-10T05:00:00.000Z',
        dateKey: '2026-04-10',
      },
      {
        id: '3',
        type: 'wallet_adjust',
        amount: 300,
        signedDelta: -300,
        label: 'Cash Audit',
        icon: 'sliders',
        timestamp: '2026-04-10T06:00:00.000Z',
        dateKey: '2026-04-10',
        paymentSourceLabel: 'Cash',
      },
    ];

    const csv = buildTransactionsCsv(entries);
    expect(csv.startsWith('\uFEFFDate,Type,Label,Source,Amount_PHP\n')).toBe(true);
    expect(csv).toContain("'=SUM(A1:A2)");
    expect(csv).toContain('"Cafe, ""Special"""');
    expect(csv).toContain('2026-04-10,installment_paid,Phone Payment,,-1500');
    expect(csv).toContain('2026-04-10,wallet_adjust,Cash Audit,Cash,-300');
  });

  it('serializes v6 JSON backup and parses valid v5 and v6 backups', () => {
    const sampleState = {
      settings: {
        monthlyIncome: 45000,
        fixedBills: 15000,
        monthlySavingsGoal: 8000,
        salaryFrequency: 2,
        payday1: 15,
        payday2: 30,
      },
      cashOnHand: 2000,
      entries: [],
      billItems: [],
    };

    const json = serializeBackupJson(sampleState);
    const parsedEnvelope = JSON.parse(json) as { version: number; exportedAt: string; data: unknown };
    expect(parsedEnvelope.version).toBe(6);
    expect(typeof parsedEnvelope.exportedAt).toBe('string');

    const okV6 = parseBackupJson(json);
    expect(okV6.ok).toBe(true);

    // v5 flat state without wrapper envelope should also validate cleanly
    const okV5 = parseBackupJson(JSON.stringify(sampleState));
    expect(okV5.ok).toBe(true);
  });

  it('rejects empty, malformed, negative, or corrupted backup payloads', () => {
    expect(parseBackupJson('   ').ok).toBe(false);
    expect(parseBackupJson('{not json').ok).toBe(false);
    expect(parseBackupJson('[]').ok).toBe(false);
    expect(parseBackupJson('{}').ok).toBe(false);
    expect(
      parseBackupJson(
        JSON.stringify({
          settings: { monthlyIncome: -100 },
        }),
      ).ok,
    ).toBe(false);
    expect(
      parseBackupJson(
        JSON.stringify({
          settings: { monthlyIncome: 30000 },
          cashOnHand: 'bad-number',
        }),
      ).ok,
    ).toBe(false);
    expect(
      parseBackupJson(
        JSON.stringify({
          settings: { monthlyIncome: 30000 },
          entries: 'corrupted',
        }),
      ).ok,
    ).toBe(false);
  });
});
