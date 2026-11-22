import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { useBudget } from '../../context/BudgetContext';
import { SinkingFundItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { computeSinkingFundPace } from '../../utils/insightsEngine';

export interface VaultConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface GoalsSectionProps {
  onOpenAddTreat: () => void;
  onOpenAddFund: () => void;
  onOpenDepositFund: (fund: SinkingFundItem) => void;
  onRequestConfirm: (req: VaultConfirmRequest) => void;
}

/**
 * Decluttered, spacious Goals tab showing one unified Treat Wishlist
 * and Saving Buckets with subtle icon delete controls.
 */
export const GoalsSection: React.FC<GoalsSectionProps> = ({
  onOpenAddTreat,
  onOpenAddFund,
  onOpenDepositFund,
  onRequestConfirm,
}) => {
  const {
    shade,
    formatVisiblePeso,
    treats,
    activeTreat,
    sinkingFunds,
    claimTreat,
    deleteTreat,
    setActiveTreat,
    deleteSinkingFund,
  } = useBudget();

  const canAddMore = treats.length < 3;

  return (
    <FadeSlideIn triggerKey="goals-tab" distance={10} style={styles.sectionGap}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          TREAT WISHLIST ({treats.length} / 3)
        </Text>
        {canAddMore ? (
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onOpenAddTreat();
            }}
            style={[styles.addToggleBtn, { backgroundColor: shade.surface }]}
          >
            <AppIcon name="plus" size={13} color={shade.accent} />
            <Text style={[styles.addToggleText, { color: shade.accent }]}>
              New Treat
            </Text>
          </ScalePressable>
        ) : (
          <View style={[styles.maxPill, { backgroundColor: shade.surface }]}>
            <Text style={[styles.maxPillText, { color: shade.dopamine }]}>
              Max 3/3 Treats
            </Text>
          </View>
        )}
      </View>

      {treats.length === 0 ? (
        <View
          style={[
            styles.emptyHeroCard,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.emptyHeroTitle, { color: shade.text }]}>
            Your Treat Wishlist is Empty
          </Text>
          <Text style={[styles.emptyHeroSub, { color: shade.muted }]}>
            Add up to 3 guilt-free treats. Funding one keeps savings protected — if removed later, funded ₱ transfers straight into your Savings Jar.
          </Text>
        </View>
      ) : (
        <View style={styles.listGap}>
          {treats.map((item) => {
            const itemPct = Math.min(
              100,
              Math.round((item.funded / Math.max(0.01, item.target)) * 100)
            );
            const isActive = activeTreat?.id === item.id && !item.claimed;
            const isReady = item.funded >= item.target && !item.claimed;

            return (
              <View
                key={item.id}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: shade.card,
                    borderColor: isActive ? shade.dopamine : shade.border,
                    opacity: item.claimed ? 0.72 : 1,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <ScalePressable
                    onPress={() => !item.claimed && setActiveTreat(item.id)}
                    style={[styles.inlineRow, { flex: 1, minWidth: 0 }]}
                  >
                    <IconBadge
                      name={item.icon}
                      size={16}
                      color={item.claimed ? shade.positive : shade.dopamine}
                      bg={item.claimed ? shade.positiveSoft : shade.dopamineSoft}
                      boxSize={34}
                    />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <View style={styles.inlineRow}>
                        <Text
                          numberOfLines={1}
                          style={[styles.goalName, { color: shade.text }]}
                        >
                          {item.name}
                        </Text>
                        {isActive && (
                          <View
                            style={[
                              styles.statusPill,
                              { backgroundColor: shade.dopamineSoft },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                { color: shade.dopamine },
                              ]}
                            >
                              ACTIVE • {itemPct}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.goalSub,
                          {
                            color: shade.muted,
                            fontVariant: ['tabular-nums'],
                          },
                        ]}
                      >
                        {formatVisiblePeso(item.funded)} /{' '}
                        {formatVisiblePeso(item.target)}
                        {!isActive && !item.claimed
                          ? ` • ${itemPct}% • Tap to set active`
                          : item.claimed
                          ? ' • Claimed'
                          : ''}
                      </Text>
                    </View>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onRequestConfirm({
                        title: 'Delete Treat Goal?',
                        message:
                          item.funded > 0 && !item.claimed
                            ? `Delete "${item.name}"? Its ${formatVisiblePeso(item.funded)} funded progress will be refunded to your Savings Jar.`
                            : `Remove "${item.name}" from your Treat Wishlist?`,
                        confirmLabel: 'Delete Treat',
                        onConfirm: () => deleteTreat(item.id),
                      });
                    }}
                    accessibilityLabel={`Delete ${item.name}`}
                    hitSlop={8}
                    style={[styles.iconDelBtn, { backgroundColor: shade.surface }]}
                  >
                    <AppIcon name="trash-2" size={14} color={shade.muted} />
                  </ScalePressable>
                </View>

                <AnimatedProgressBar
                  percentage={itemPct}
                  trackColor={shade.surface}
                  fillColor={item.claimed ? shade.positive : shade.dopamine}
                  height={7}
                />

                {isActive && (
                  <View style={[styles.rowBetween, { flexWrap: 'wrap', gap: 6 }]}>
                    <Text
                      style={[
                        styles.goalFootnote,
                        { color: shade.muted, fontVariant: ['tabular-nums'] },
                      ]}
                    >
                      Direct: {formatVisiblePeso(item.fromImpulses)}
                    </Text>
                    <Text
                      style={[
                        styles.goalFootnote,
                        { color: shade.muted, fontVariant: ['tabular-nums'] },
                      ]}
                    >
                      End Day Split: {formatVisiblePeso(item.fromRollovers)}
                    </Text>
                  </View>
                )}

                {isReady && (
                  <ScalePressable
                    onPress={() => claimTreat(item.id)}
                    style={[styles.claimBtn, { backgroundColor: shade.dopamine }]}
                  >
                    <Text style={[styles.claimBtnText, { color: '#FFFFFF' }]}>
                      Claim & Enjoy Guilt-Free
                    </Text>
                  </ScalePressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.sectionHeader, { marginTop: 4 }]}>
        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          SAVINGS BUCKETS ({sinkingFunds.length})
        </Text>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenAddFund();
          }}
          style={[styles.addToggleBtn, { backgroundColor: shade.surface }]}
        >
          <AppIcon name="plus" size={13} color={shade.positive} />
          <Text style={[styles.addToggleText, { color: shade.positive }]}>
            Add Bucket
          </Text>
        </ScalePressable>
      </View>

      {sinkingFunds.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <Text style={{ color: shade.muted, fontSize: 13, textAlign: 'center' }}>
            No savings buckets yet. Tap + Add Bucket for Emergency, Travel, or Gifts.
          </Text>
        </View>
      ) : (
        <View style={styles.listGap}>
          {sinkingFunds.map((fund) => {
            const pace = computeSinkingFundPace(fund);
            return (
              <View
                key={fund.id}
                style={[
                  styles.goalCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={[styles.inlineRow, { flex: 1, minWidth: 0 }]}>
                    <IconBadge
                      name={fund.icon}
                      size={16}
                      color={shade.positive}
                      bg={shade.positiveSoft}
                      boxSize={34}
                    />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.goalName, { color: shade.text }]}
                      >
                        {fund.name}
                      </Text>
                      <Text style={[styles.goalSub, { color: shade.muted }]}>
                        {formatVisiblePeso(fund.saved)} /{' '}
                        {formatVisiblePeso(fund.target)} • {pace.pct}% ({pace.targetMonthLabel})
                      </Text>
                    </View>
                  </View>

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onRequestConfirm({
                        title: 'Delete Savings Bucket?',
                        message:
                          fund.saved > 0
                            ? `Delete "${fund.name}"? Its ${formatVisiblePeso(fund.saved)} saved balance will be moved to your Savings Jar.`
                            : `Remove "${fund.name}" from your savings buckets?`,
                        confirmLabel: 'Delete Bucket',
                        onConfirm: () => deleteSinkingFund(fund.id),
                      });
                    }}
                    accessibilityLabel={`Delete ${fund.name}`}
                    hitSlop={8}
                    style={[styles.iconDelBtn, { backgroundColor: shade.surface }]}
                  >
                    <AppIcon name="trash-2" size={14} color={shade.muted} />
                  </ScalePressable>
                </View>

                <AnimatedProgressBar
                  percentage={pace.pct}
                  trackColor={shade.surface}
                  fillColor={shade.positive}
                  height={7}
                />

                <View style={styles.fundFooter}>
                  <Text style={[styles.goalFootnote, { color: shade.positive }]}>
                    {pace.monthlyNeeded > 0
                      ? `Save ${formatVisiblePeso(pace.monthlyNeeded)}/mo`
                      : 'Goal reached!'}
                  </Text>
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onOpenDepositFund(fund);
                    }}
                    style={[
                      styles.fundAddBtn,
                      { backgroundColor: shade.positiveSoft },
                    ]}
                  >
                    <AppIcon name="plus" size={13} color={shade.positive} />
                    <Text
                      style={[styles.fundAddText, { color: shade.positive }]}
                    >
                      Deposit
                    </Text>
                  </ScalePressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </FadeSlideIn>
  );
};

const styles = StyleSheet.create({
  sectionGap: {
    gap: 14,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  emptyHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  emptyHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyHeroSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  maxPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  maxPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listGap: {
    gap: 12,
  },
  goalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 11,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  goalSub: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  goalFootnote: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  iconDelBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtn: {
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  fundFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  fundAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  fundAddText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
