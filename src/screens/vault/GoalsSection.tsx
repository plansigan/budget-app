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
  const pct = activeTreat
    ? Math.min(100, Math.round((activeTreat.funded / activeTreat.target) * 100))
    : 0;
  const isReady =
    Boolean(activeTreat) &&
    activeTreat!.funded >= activeTreat!.target &&
    !activeTreat!.claimed;

  return (
    <FadeSlideIn triggerKey="goals-tab" distance={10} style={{ gap: 10 }}>
      {activeTreat ? (
        <View
          style={[
            styles.spotlightCard,
            {
              backgroundColor: shade.card,
              borderColor: isReady ? shade.dopamine : shade.border,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.inlineRow}>
              <AppIcon name="lock" size={11} color={shade.dopamine} />
              <Text style={[styles.kicker, { color: shade.dopamine }]}>
                ACTIVE TREAT PASS
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isReady
                    ? shade.dopamine
                    : shade.dopamineSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isReady ? '#FFFFFF' : shade.dopamine },
                ]}
              >
                {activeTreat.claimed
                  ? 'Claimed'
                  : isReady
                  ? '100% Ready'
                  : `${pct}% Funded`}
              </Text>
            </View>
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.treatHeadRow}>
              <IconBadge
                name={activeTreat.icon}
                size={16}
                color={shade.dopamine}
                bg={shade.dopamineSoft}
                boxSize={34}
              />
              <Text style={[styles.treatTitle, { color: shade.text }]}>
                {activeTreat.name}
              </Text>
            </View>
            <Text style={[styles.treatPrice, { color: shade.text }]}>
              {formatVisiblePeso(activeTreat.funded)}{' '}
              <Text style={{ color: shade.muted, fontSize: 13 }}>
                / {formatVisiblePeso(activeTreat.target)}
              </Text>
            </Text>
          </View>

          <AnimatedProgressBar
            percentage={pct}
            trackColor={shade.surface}
            fillColor={shade.dopamine}
            height={8}
          />

          <View style={styles.breakdownRow}>
            <View
              style={[styles.breakdownBox, { backgroundColor: shade.surface }]}
            >
              <Text style={[styles.breakdownLabel, { color: shade.muted }]}>
                Direct Contributions
              </Text>
              <Text style={[styles.breakdownVal, { color: shade.dopamine }]}>
                {formatVisiblePeso(activeTreat.fromImpulses)}
              </Text>
            </View>
            <View
              style={[styles.breakdownBox, { backgroundColor: shade.surface }]}
            >
              <Text style={[styles.breakdownLabel, { color: shade.muted }]}>
                From End Day & Save
              </Text>
              <Text style={[styles.breakdownVal, { color: shade.accent }]}>
                {formatVisiblePeso(activeTreat.fromRollovers)}
              </Text>
            </View>
          </View>

          {isReady && (
            <ScalePressable
              onPress={() => claimTreat(activeTreat.id)}
              style={[styles.claimBtn, { backgroundColor: shade.dopamine }]}
            >
              <Text style={[styles.claimBtnText, { color: '#FFFFFF' }]}>
                Claim & Enjoy Guilt-Free
              </Text>
            </ScalePressable>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.emptyHeroCard,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.kicker, { color: shade.dopamine }]}>
            TREAT WISHLIST (0 / 3)
          </Text>
          <Text style={[styles.emptyHeroTitle, { color: shade.text }]}>
            Your Treat Wishlist is Empty
          </Text>
          <Text style={[styles.emptyHeroSub, { color: shade.muted }]}>
            Add up to 3 treats. They lock once added so you stay focused. If you
            delete one, its saved ₱ goes to your Savings Jar.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          TREAT WISHLIST ({treats.length} / 3 MAX)
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

      {treats.length > 0 && (
        <View style={styles.listGap}>
          {treats.map((item) => {
            const itemPct = Math.min(
              100,
              Math.round((item.funded / item.target) * 100)
            );
            const isActive = activeTreat?.id === item.id;
            return (
              <View
                key={item.id}
                style={[
                  styles.treatRow,
                  {
                    backgroundColor: isActive ? shade.surface : shade.card,
                    borderColor: isActive ? shade.dopamine : shade.border,
                    opacity: item.claimed ? 0.72 : 1,
                  },
                ]}
              >
                <ScalePressable
                  onPress={() => !item.claimed && setActiveTreat(item.id)}
                  style={{ gap: 6 }}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.inlineRow}>
                      <IconBadge
                        name={item.icon}
                        size={14}
                        color={shade.dopamine}
                        bg={shade.dopamineSoft}
                        boxSize={28}
                      />
                      <Text style={[styles.treatRowName, { color: shade.text }]}>
                        {item.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.treatRowMeta,
                        {
                          color: item.claimed ? shade.positive : shade.dopamine,
                        },
                      ]}
                    >
                      {item.claimed ? 'Claimed' : `${itemPct}%`}
                    </Text>
                  </View>

                  <AnimatedProgressBar
                    percentage={itemPct}
                    trackColor={isActive ? shade.card : shade.surface}
                    fillColor={shade.dopamine}
                    height={5}
                  />

                  <View style={styles.rowBetween}>
                    <Text style={[styles.microSub, { color: shade.muted }]}>
                      {formatVisiblePeso(item.funded)} /{' '}
                      {formatVisiblePeso(item.target)}
                    </Text>
                    <View style={styles.inlineRow}>
                      <AppIcon name="lock" size={10} color={shade.muted} />
                      <Text style={[styles.lockTag, { color: shade.muted }]}>
                        Locked
                      </Text>
                    </View>
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
                  style={[
                    styles.deleteBtn,
                    { backgroundColor: shade.warningSoft },
                  ]}
                >
                  <AppIcon name="trash-2" size={12} color={shade.warning} />
                  <Text style={[styles.deleteText, { color: shade.warning }]}>
                    {item.funded > 0 && !item.claimed
                      ? `Delete (+${formatVisiblePeso(item.funded)} → Savings)`
                      : 'Delete Treat'}
                  </Text>
                </ScalePressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
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
          <Text style={{ color: shade.muted, fontSize: 12 }}>
            No savings buckets yet. Tap + Add Bucket for Emergency, Travel, or
            Gifts.
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
                  styles.treatRow,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.inlineRow}>
                    <IconBadge
                      name={fund.icon}
                      size={14}
                      color={shade.positive}
                      bg={shade.positiveSoft}
                      boxSize={28}
                    />
                    <Text style={[styles.treatRowName, { color: shade.text }]}>
                      {fund.name}
                    </Text>
                  </View>
                  <Text
                    style={[styles.treatRowMeta, { color: shade.positive }]}
                  >
                    {pace.pct}% • {pace.targetMonthLabel}
                  </Text>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={[styles.microSub, { color: shade.muted }]}>
                    {formatVisiblePeso(fund.saved)} /{' '}
                    {formatVisiblePeso(fund.target)}
                  </Text>
                  {pace.monthlyNeeded > 0 && (
                    <Text style={[styles.microSub, { color: shade.positive }]}>
                      Save {formatVisiblePeso(pace.monthlyNeeded)}/mo
                    </Text>
                  )}
                </View>

                <AnimatedProgressBar
                  percentage={pace.pct}
                  trackColor={shade.surface}
                  fillColor={shade.positive}
                  height={7}
                />

                <View style={styles.fundActionRow}>
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
                    <AppIcon name="plus" size={12} color={shade.positive} />
                    <Text
                      style={[styles.fundAddText, { color: shade.positive }]}
                    >
                      Deposit
                    </Text>
                  </ScalePressable>

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
                    style={[
                      styles.fundDelBtn,
                      { backgroundColor: shade.warningSoft },
                    ]}
                  >
                    <AppIcon name="trash-2" size={12} color={shade.warning} />
                    <Text
                      style={[styles.fundAddText, { color: shade.warning }]}
                    >
                      Delete
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
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spotlightCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#111318',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyHeroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyHeroSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  treatHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  treatTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  treatPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  breakdownBox: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    gap: 2,
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  breakdownVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  claimBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  maxPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  maxPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listGap: {
    gap: 8,
  },
  treatRow: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    gap: 9,
  },
  treatRowName: {
    fontSize: 14,
    fontWeight: '800',
  },
  treatRowMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  microSub: {
    fontSize: 11,
  },
  lockTag: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  fundActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  fundAddBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 9,
  },
  fundDelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  fundAddText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
