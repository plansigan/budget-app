export type TabKey = 'today' | 'wallet' | 'vault' | 'setup';

export interface HashRoute {
  tab: TabKey;
  walletAccountId: string | null;
}

/**
 * Parses a browser URL hash fragment (e.g., #wallet/bank-1) into an app tab and optional wallet account ID.
 */
export function parseWebHashRoute(hash: string): HashRoute {
  const clean = hash.replace(/^#/, '').trim();
  if (!clean) {
    return { tab: 'today', walletAccountId: null };
  }
  if (clean === 'wallet') {
    return { tab: 'wallet', walletAccountId: null };
  }
  if (clean.startsWith('wallet/')) {
    const rawId = clean.slice('wallet/'.length);
    if (!rawId) {
      return { tab: 'wallet', walletAccountId: null };
    }
    try {
      return { tab: 'wallet', walletAccountId: decodeURIComponent(rawId) };
    } catch {
      return { tab: 'wallet', walletAccountId: rawId };
    }
  }
  if (clean === 'vault') {
    return { tab: 'vault', walletAccountId: null };
  }
  if (clean === 'setup') {
    return { tab: 'setup', walletAccountId: null };
  }
  return { tab: 'today', walletAccountId: null };
}

/**
 * Builds the canonical URL hash string for a given tab and optional Wallet account ID.
 */
export function buildWebHash(tab: TabKey, walletAccountId: string | null): string {
  if (tab === 'wallet' && walletAccountId) {
    return `#wallet/${encodeURIComponent(walletAccountId)}`;
  }
  return `#${tab}`;
}
