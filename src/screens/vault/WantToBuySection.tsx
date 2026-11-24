import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import {
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useThemePrefs,
} from '../../context/BudgetContext';
import { getDaysUntilDateKey } from '../../state/budgetMath';
import { WantToBuyItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { VaultConfirmRequest } from './GoalsSection';

interface WantToBuySectionProps {
  onOpenAdd: () => void;
  onOpenDecide: (item: WantToBuyItem) => void;
  onRequestConfirm: (req: VaultConfirmRequest) => void;
}

/**
 * Calm, spacious 7-day cool-off wishlist tab so users can pause before
 * deciding whether a purchase belongs in daily spending or savings.
 */
export const WantToBuySection: React.FC<WantToBuySectionProps> = ({
  onOpenAdd,
  onOpenDecide,
  onRequestConfirm,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { todayKey } = useDailyBudget();
  const { wantToBuyItems } = useGoals();
  const { extendWantToBuy, skipWantToBuy, deleteWantToBuy } =
    useBudgetActions();

  const [showHistory, setShowHistory] = useState(false);

  const { readyItems, coolingItems, resolvedItems, totalSkippedSaved } =
    useMemo(() => {
      const ready: WantToBuyItem[] = [];
      const cooling: WantToBuyItem[] = [];
      const resolved: WantToBuyItem[] = [];
      let skippedSum = 0;

      for (const item of wantToBuyItems) {
        if (item.status === 'waiting') {
          if (getDaysUntilDateKey(item.reevaluateOn, todayKey) <= 0) {
            ready.push(item);
          } else {
            cooling.push(item);
          }
        } else {
          resolved.push(item);
          if (item.status === 'skipped') {
            skippedSum += item.price;
          }
        }
      }

      cooling.sort((a, b) => a.reevaluateOn.localeCompare(b.reevaluateOn));
      return {
        readyItems: ready,
        coolingItems: cooling,
        resolvedItems: resolved,
        totalSkippedSaved: skippedSum,
      };
    }, [wantToBuyItems, todayKey]);

  const confirmDelete = (item: WantToBuyItem) => {
    triggerLightHaptic();
    onRequestConfirm({
      title: 'Remove Wish Item?',
      message: `Remove "${item.name}" from Things I Want to Buy?`,
      confirmLabel: 'Remove',
      destructive: true,
      icon: 'trash-2',
      onConfirm: () => deleteWantToBuy(item.id),
    });
  };

  return (
    <FadeSlideIn triggerKey="buy-later-tab" distance={10} style={styles.sectionGap}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[styles.sectionTitle, { color: shade.muted }]}>
            THINGS I WANT TO BUY
          </Text>
          <Text style={[styles.sectionSub, { color: shade.muted }]}>
            Pause 7 days before deciding to buy
          </Text>
        </View>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel="Add item to Buy Later list"
          style={[styles.addBtn, { backgroundColor: shade.surface }]}
        >
          <AppIcon name="plus" size={14} color={shade.dopamine} />
          <Text style={[styles.addBtnText, { color: shade.dopamine }]}>
            Add Item
          </Text>
        </ScalePressable>
      </View>

      {totalSkippedSaved > 0 && (
        <View
          style={[
            styles.savingsBanner,
            { backgroundColor: shade.positiveSoft },
          ]}
        >
          <AppIcon name="shield" size={16} color={shade.positive} />
          <Text style={[styles.savingsBannerText, { color: shade.positive }]}>
            Saved {formatVisiblePeso(totalSkippedSaved)} by skipping impulse buys
          </Text>
        </View>
      )}

      {readyItems.length > 0 && (
        <View style={styles.blockGap}>
          <Text style={[styles.groupLabel, { color: shade.dopamine }]}>
            READY TO RE-EVALUATE ({readyItems.length})
          </Text>
          <View style={styles.listGap}>
            {readyItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: shade.card,
                    borderColor: shade.dopamine,
                  },
                ]}
              >
                <View style={styles.topRow}>
                  <View style={styles.itemIdentity}>
                    <IconBadge
                      name={item.icon}
                      size={18}
                      color={shade.dopamine}
                      bg={shade.dopamineSoft}
                      boxSize={40}
                    />
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.itemName, { color: shade.text }]}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.itemPrice, { color: shade.text }]}>
                        {formatVisiblePeso(item.price)}
                      </Text>
                    </View>
                  </View>

                  <ScalePressable
                    onPress={() => confirmDelete(item)}
                    accessibilityLabel={`Remove ${item.name}`}
                    hitSlop={8}
                    style={[
                      styles.iconDelBtn,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <AppIcon name="trash-2" size={14} color={shade.muted} />
                  </ScalePressable>
                </View>

                {item.note ? (
                  <Text style={[styles.itemNote, { color: shade.muted }]}>
                    {item.note}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.readyPromptBox,
                    { backgroundColor: shade.dopamineSoft },
                  ]}
                >
                  <AppIcon name="clock" size={14} color={shade.dopamine} />
                  <Text
                    style={[styles.readyPromptText, { color: shade.dopamine }]}
                  >
                    7 days passed — do you still want to buy this?
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onOpenDecide(item);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Buy ${item.name}`}
                    style={[
                      styles.primaryCardBtn,
                      { backgroundColor: shade.dopamineBtnBg },
                    ]}
                  >
                    <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                      Yes, Buy It
                    </Text>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => extendWantToBuy(item.id, 7)}
                    accessibilityRole="button"
                    accessibilityLabel={`Wait 7 more days for ${item.name}`}
                    style={[
                      styles.secondaryCardBtn,
                      {
                        backgroundColor: shade.surface,
                        borderColor: shade.border,
                      },
                    ]}
                  >
                    <Text style={[styles.actionBtnText, { color: shade.text }]}>
                      Wait 7d
                    </Text>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => skipWantToBuy(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Skip buying ${item.name}`}
                    style={[
                      styles.secondaryCardBtn,
                      {
                        backgroundColor: shade.positiveSoft,
                        borderColor: shade.positiveSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.actionBtnText, { color: shade.positive }]}
                    >
                      Skip
                    </Text>
                  </ScalePressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {coolingItems.length > 0 && (
        <View style={styles.blockGap}>
          <Text style={[styles.groupLabel, { color: shade.muted }]}>
            COOLING OFF ({coolingItems.length})
          </Text>
          <View style={styles.listGap}>
            {coolingItems.map((item) => {
              const totalSpan = Math.max(
                1,
                getDaysUntilDateKey(item.reevaluateOn, item.createdAt)
              );
              const daysLeft = Math.max(
                1,
                getDaysUntilDateKey(item.reevaluateOn, todayKey)
              );
              const elapsed = Math.max(
                0,
                Math.min(totalSpan, totalSpan - daysLeft)
              );
              const pct = Math.min(
                100,
                Math.round((elapsed / Math.max(1, totalSpan)) * 100)
              );

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: shade.card,
                      borderColor: shade.border,
                    },
                  ]}
                >
                  <View style={styles.topRow}>
                    <View style={styles.itemIdentity}>
                      <IconBadge
                        name={item.icon}
                        size={17}
                        color={shade.accent}
                        bg={shade.surface}
                        boxSize={40}
                      />
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.itemName, { color: shade.text }]}
                        >
                          {item.name}
                        </Text>
                        <Text style={[styles.itemPrice, { color: shade.muted }]}>
                          {formatVisiblePeso(item.price)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.daysBadge,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <Text
                        style={[styles.daysBadgeText, { color: shade.text }]}
                      >
                        {daysLeft}d left
                      </Text>
                    </View>
                  </View>

                  {item.note ? (
                    <Text style={[styles.itemNote, { color: shade.muted }]}>
                      {item.note}
                    </Text>
                  ) : null}

                  <View style={{ gap: 6 }}>
                    <AnimatedProgressBar
                      percentage={pct}
                      trackColor={shade.surface}
                      fillColor={shade.dopamine}
                      height={7}
                    />
                    <Text style={[styles.metaSub, { color: shade.muted }]}>
                      Day {elapsed} of {totalSpan} • Re-evaluate on{' '}
                      {item.reevaluateOn}
                    </Text>
                  </View>

                  <View style={styles.footerRow}>
                    <View style={styles.footerLinks}>
                      <ScalePressable
                        onPress={() => skipWantToBuy(item.id)}
                        accessibilityRole="button"
                        style={[
                          styles.softPillBtn,
                          { backgroundColor: shade.positiveSoft },
                        ]}
                      >
                        <Text
                          style={[
                            styles.softPillText,
                            { color: shade.positive },
                          ]}
                        >
                          Skip & Keep ₱
                        </Text>
                      </ScalePressable>

                      <ScalePressable
                        onPress={() => {
                          triggerLightHaptic();
                          onOpenDecide(item);
                        }}
                        accessibilityRole="button"
                        style={[
                          styles.softPillBtn,
                          { backgroundColor: shade.surface },
                        ]}
                      >
                        <Text
                          style={[styles.softPillText, { color: shade.text }]}
                        >
                          Buy Early
                        </Text>
                      </ScalePressable>
                    </View>

                    <ScalePressable
                      onPress={() => confirmDelete(item)}
                      accessibilityLabel={`Remove ${item.name}`}
                      hitSlop={8}
                      style={[
                        styles.iconDelBtn,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <AppIcon name="trash-2" size={14} color={shade.muted} />
                    </ScalePressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {readyItems.length === 0 && coolingItems.length === 0 && (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <IconBadge
            name="clock"
            size={20}
            color={shade.dopamine}
            bg={shade.dopamineSoft}
            boxSize={44}
          />
          <Text style={[styles.emptyTitle, { color: shade.text }]}>
            No items waiting right now
          </Text>
          <Text style={[styles.emptyBody, { color: shade.muted }]}>
            Add anything you are tempted to buy. After 7 days, Velvet will ask
            whether you still want it—and if you do, whether to fit it into daily
            spending or cover it from savings.
          </Text>
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onOpenAdd();
            }}
            accessibilityRole="button"
            style={[
              styles.emptyCta,
              { backgroundColor: shade.dopamineBtnBg },
            ]}
          >
            <AppIcon name="plus" size={14} color="#FFFFFF" />
            <Text style={[styles.emptyCtaText, { color: '#FFFFFF' }]}>
              Add Something You Want
            </Text>
          </ScalePressable>
        </View>
      )}

      {resolvedItems.length > 0 && (
        <View style={styles.historyWrap}>
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              setShowHistory((v) => !v);
            }}
            accessibilityRole="button"
            style={styles.historyToggleRow}
          >
            <Text style={[styles.groupLabel, { color: shade.muted }]}>
              HISTORY ({resolvedItems.length})
            </Text>
            <AppIcon
              name={showHistory ? 'chevron-down' : 'chevron-right'}
              size={15}
              color={shade.muted}
            />
          </ScalePressable>

          {showHistory && (
            <View style={styles.listGap}>
              {resolvedItems.map((item) => {
                const isSkipped = item.status === 'skipped';
                const statusText = isSkipped
                  ? 'Skipped'
                  : item.fundingChoice === 'daily'
                  ? 'Bought • Daily'
                  : 'Bought • Savings';
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: shade.card,
                        borderColor: shade.border,
                      },
                    ]}
                  >
                    <View style={styles.itemIdentity}>
                      <IconBadge
                        name={item.icon}
                        size={14}
                        color={isSkipped ? shade.positive : shade.muted}
                        bg={isSkipped ? shade.positiveSoft : shade.surface}
                        boxSize={34}
                      />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.historyName, { color: shade.text }]}
                        >
                          {item.name}
                        </Text>
                        <Text style={[styles.metaSub, { color: shade.muted }]}>
                          {formatVisiblePeso(item.price)} • {statusText}
                        </Text>
                      </View>
                    </View>

                    <ScalePressable
                      onPress={() => confirmDelete(item)}
                      accessibilityLabel={`Remove ${item.name} from history`}
                      hitSlop={8}
                      style={[
                        styles.iconDelBtn,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <AppIcon name="trash-2" size={13} color={shade.muted} />
                    </ScalePressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </FadeSlideIn>
  );
};

const styles = StyleSheet.create({
  sectionGap: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  savingsBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  blockGap: {
    gap: 10,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listGap: {
    gap: 14,
  },
  itemCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  readyPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  readyPromptText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryCardBtn: {
    flex: 1.3,
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryCardBtn: {
    flex: 1,
    minWidth: 76,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  daysBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metaSub: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  softPillBtn: {
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  softPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconDelBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 13,
    marginTop: 4,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '800',
  },
  historyWrap: {
    gap: 10,
    marginTop: 4,
  },
  historyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
  },
});
