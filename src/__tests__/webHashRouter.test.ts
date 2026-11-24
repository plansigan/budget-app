import { describe, expect, it } from 'vitest';
import { buildWebHash, parseWebHashRoute } from '../utils/webHashRouter';

describe('webHashRouter', () => {
  it('parses primary tabs and defaults unknown or empty hashes to today', () => {
    expect(parseWebHashRoute('')).toEqual({ tab: 'today', walletAccountId: null });
    expect(parseWebHashRoute('#')).toEqual({ tab: 'today', walletAccountId: null });
    expect(parseWebHashRoute('#today')).toEqual({ tab: 'today', walletAccountId: null });
    expect(parseWebHashRoute('#wallet')).toEqual({ tab: 'wallet', walletAccountId: null });
    expect(parseWebHashRoute('#vault')).toEqual({ tab: 'vault', walletAccountId: null });
    expect(parseWebHashRoute('#setup')).toEqual({ tab: 'setup', walletAccountId: null });
    expect(parseWebHashRoute('#settings')).toEqual({ tab: 'today', walletAccountId: null });
    expect(parseWebHashRoute('#unknown-route')).toEqual({
      tab: 'today',
      walletAccountId: null,
    });
  });

  it('parses and serializes wallet account subroutes safely', () => {
    expect(parseWebHashRoute('#wallet/cash')).toEqual({
      tab: 'wallet',
      walletAccountId: 'cash',
    });
    expect(parseWebHashRoute('#wallet/bank-bpi')).toEqual({
      tab: 'wallet',
      walletAccountId: 'bank-bpi',
    });
    expect(parseWebHashRoute('#wallet/')).toEqual({
      tab: 'wallet',
      walletAccountId: null,
    });
    expect(parseWebHashRoute('#wallet/BPI%20Payroll%20%231')).toEqual({
      tab: 'wallet',
      walletAccountId: 'BPI Payroll #1',
    });
    expect(parseWebHashRoute('#wallet/%E0%A4%A')).toEqual({
      tab: 'wallet',
      walletAccountId: '%E0%A4%A',
    });

    expect(buildWebHash('today', null)).toBe('#today');
    expect(buildWebHash('wallet', null)).toBe('#wallet');
    expect(buildWebHash('wallet', 'cash')).toBe('#wallet/cash');
    expect(buildWebHash('wallet', 'BPI Payroll #1')).toBe(
      '#wallet/BPI%20Payroll%20%231'
    );
    expect(buildWebHash('vault', 'bank-1')).toBe('#vault');
    expect(buildWebHash('setup', null)).toBe('#setup');
  });
});
