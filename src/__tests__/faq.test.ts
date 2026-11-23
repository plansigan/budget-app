import { describe, expect, it } from 'vitest';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  filterFaqItems,
} from '../data/faqData';

describe('App Guide & FAQ data', () => {
  it('provides unique IDs, non-empty content, and coverage for every category', () => {
    const ids = new Set<string>();
    for (const item of FAQ_ITEMS) {
      expect(item.id.trim().length).toBeGreaterThan(0);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);

      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.summary.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
      expect(item.tags.length).toBeGreaterThan(0);
    }

    for (const cat of FAQ_CATEGORIES) {
      if (cat.key === 'all') continue;
      const inCategory = FAQ_ITEMS.filter((item) => item.category === cat.key);
      expect(inCategory.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('filters by category, case-insensitive query, tags, and handles empty matches', () => {
    expect(filterFaqItems(FAQ_ITEMS, 'all', '')).toHaveLength(FAQ_ITEMS.length);
    expect(filterFaqItems(FAQ_ITEMS, 'all', '   ')).toHaveLength(
      FAQ_ITEMS.length
    );

    const debtsOnly = filterFaqItems(FAQ_ITEMS, 'debts', '');
    expect(debtsOnly.length).toBeGreaterThan(0);
    expect(debtsOnly.every((item) => item.category === 'debts')).toBe(true);

    const caseInsensitive = filterFaqItems(FAQ_ITEMS, 'all', 'CREDIT CARD');
    expect(caseInsensitive.some((i) => i.id === 'card-spend-here-vs-bills')).toBe(
      true
    );

    const combined = filterFaqItems(FAQ_ITEMS, 'debts', 'add back');
    expect(combined.some((i) => i.id === 'add-back-safe-to-spend')).toBe(true);
    expect(combined.every((i) => i.category === 'debts')).toBe(true);

    const byTag = filterFaqItems(FAQ_ITEMS, 'all', 'gcash');
    expect(byTag.length).toBeGreaterThan(0);

    const empty = filterFaqItems(
      FAQ_ITEMS,
      'all',
      'nonexistent-feature-xyz-123'
    );
    expect(empty).toHaveLength(0);
  });

  it('answers realistic user questions across key workflows', () => {
    expect(
      filterFaqItems(FAQ_ITEMS, 'all', 'safe-to-spend').length
    ).toBeGreaterThan(0);
    expect(filterFaqItems(FAQ_ITEMS, 'all', 'i owe').length).toBeGreaterThan(0);
    expect(filterFaqItems(FAQ_ITEMS, 'all', 'add back').length).toBeGreaterThan(
      0
    );
    expect(filterFaqItems(FAQ_ITEMS, 'all', 'backup').length).toBeGreaterThan(
      0
    );
  });
});
