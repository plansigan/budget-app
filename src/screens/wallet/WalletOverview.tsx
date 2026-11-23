import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { useBudget } from '../../context/BudgetContext';
import {
  DebtDirection,
  DebtItem,
  getDaysUntilDayOfMonth,
} from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatOrdinal } from '../../utils/numberFormat';
import { WalletConfirmRequest } from './AccountDetailView';
import { DebtsSection } from './DebtsSection';
import { InstallmentsSection } from './InstallmentsSection';

interface WalletOverviewProps {
  focusDebtsKey?: number;
  onOpenAccount: (accountId: string) => void;
  onOpenAddBank: () => void;
  onOpenAddCard: () => void;
  onOpenAddInstallment: () => void;
  onOpenAddDebt: (defaultDirection?: DebtDirection) => void;
  onEditDebt: (debt: DebtItem) => void;
  onPayDebt: (debt: DebtItem) => void;
  onOpenTransfer: () => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const WalletOverview: React.FC<WalletOverviewProps> = ({
  focusDebtsKey = 0,
  onOpenAccount,
  onOpenAddBank,
  onOpenAddCard,
  onOpenAddInstallment,
  onOpenAddDebt,
  onEditDebt,
  onPayDebt,
  onOpenTransfer,
  onRequestConfirm,
}) => {
  const {
    shade,
    privacyMode,
    formatVisiblePeso,
    cashOnHand,
    banks,
    creditCards,
    installments,
    debts,
    entries,
  } = useBudget();

  const [subTab, setSubTab] = useState<'accounts' | 'installments' | 'debts'>(
    focusDebtsKey > 0 ? 'debts' : 'accounts'
  );

  useEffect(() => {
    if (focusDebtsKey > 0) {
      setSubTab('debts');
    }
  }, [focusDebtsKey]);

  const openDebtsCount = useMemo(
    () => debts.filter((d) => d.paidAmount < d.amount).length,
    [debts]
  );

  const logCountsByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.paymentSourceId) {
        map[e.paymentSourceId] = (map[e.paymentSourceId] || 0) + 1;
      }
      if (e.toPaymentSourceId && e.toPaymentSourceId !== e.paymentSourceId) {
        map[e.toPaymentSourceId] = (map[e.toPaymentSourceId] || 0) + 1;
      }
    }
    return map;
  }, [entries]);

  const totalBankBalance = banks.reduce((sum, b) => sum + b.balance, 0);
  const totalLiquid = cashOnHand + totalBankBalance;

  const liquidAccounts = useMemo(
    () => [
      { id: 'cash', name: 'Physical Cash', balance: cashOnHand, isCash: true },
      ...banks.map((b) => ({
        id: b.id,
        name: b.name,
        balance: b.balance,
        isCash: false,
      })),
    ],
    [cashOnHand, banks]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <FadeSlideIn delay={0} distance={12}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: shade.heroBg, borderColor: shade.heroBorder },
          ]}
        >
          <Text style={[styles.kicker, { color: shade.heroMuted }]}>
            YOUR MONEY (CASH + BANKS)
          </Text>
          <PopValueText valueTrigger={totalLiquid}>
            <AnimatedCounter
              value={totalLiquid}
              masked={privacyMode}
              style={[styles.bigTotal, { color: shade.heroText }]}
            />
          </PopValueText>
          <View style={styles.countsRow}>
            <View
              style={[styles.countPill, { backgroundColor: shade.heroSurface }]}
            >
              <AppIcon name="briefcase" size={13} color="#4ADE80" />
              <Text style={[styles.countText, { color: '#4ADE80' }]}>
                {banks.length} {banks.length === 1 ? 'Bank' : 'Banks'}
              </Text>
            </View>
            <View
              style={[styles.countPill, { backgroundColor: shade.heroSurface }]}
            >
              <AppIcon name="credit-card" size={13} color="#A5B4FC" />
              <Text style={[styles.countText, { color: '#A5B4FC' }]}>
                {creditCards.length}{' '}
                {creditCards.length === 1 ? 'Card' : 'Cards'}
              </Text>
            </View>
            {openDebtsCount > 0 && (
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  setSubTab('debts');
                }}
                style={[
                  styles.countPill,
                  { backgroundColor: shade.heroSurface },
                ]}
              >
                <AppIcon name="users" size={13} color="#FBBF24" />
                <Text style={[styles.countText, { color: '#FBBF24' }]}>
                  {openDebtsCount} {openDebtsCount === 1 ? 'Debt' : 'Debts'}
                </Text>
              </ScalePressable>
            )}
          </View>
        </View>
      </FadeSlideIn>

      {/* Spacious 3-Segment Toggle: Accounts | Installments | Debts */}
      <View
        style={[
          styles.subTabBar,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setSubTab('accounts');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'accounts' }}
          style={[
            styles.subTabBtn,
            subTab === 'accounts' && { backgroundColor: shade.card },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.subTabText,
              { color: subTab === 'accounts' ? shade.text : shade.muted },
            ]}
          >
            Accounts
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setSubTab('installments');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'installments' }}
          style={[
            styles.subTabBtn,
            subTab === 'installments' && { backgroundColor: shade.card },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.subTabText,
              { color: subTab === 'installments' ? shade.text : shade.muted },
            ]}
          >
            Installments ({installments.length})
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setSubTab('debts');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: subTab === 'debts' }}
          style={[
            styles.subTabBtn,
            subTab === 'debts' && { backgroundColor: shade.card },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.subTabText,
              { color: subTab === 'debts' ? shade.text : shade.muted },
            ]}
          >
            {openDebtsCount > 0 ? `Debts (${openDebtsCount})` : 'Debts'}
          </Text>
        </ScalePressable>
      </View>

      {subTab === 'accounts' ? (
        <View style={styles.tabContentGap}>
          {/* Single Grouped Cash & Banks Card */}
          <FadeSlideIn delay={40} distance={10}>
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { color: shade.muted }]}>
                  CASH & BANKS ({liquidAccounts.length})
                </Text>
                <View style={styles.rowRightCluster}>
                  {1 + banks.length + creditCards.length >= 2 && (
                    <ScalePressable
                      onPress={() => {
                        triggerLightHaptic();
                        onOpenTransfer();
                      }}
                      style={[
                        styles.addToggle,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <AppIcon name="repeat" size={12} color={shade.positive} />
                      <Text
                        style={[
                          styles.addToggleText,
                          { color: shade.positive },
                        ]}
                      >
                        Transfer
                      </Text>
                    </ScalePressable>
                  )}
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onOpenAddBank();
                    }}
                    style={[styles.addToggle, { backgroundColor: shade.surface }]}
                  >
                    <AppIcon name="plus" size={12} color={shade.accent} />
                    <Text style={[styles.addToggleText, { color: shade.accent }]}>
                      Add Bank
                    </Text>
                  </ScalePressable>
                </View>
              </View>

              <View
                style={[
                  styles.groupedCard,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                {liquidAccounts.map((acc, idx) => {
                  const count = logCountsByAccount[acc.id] || 0;
                  const isLast = idx === liquidAccounts.length - 1;
                  return (
                    <ScalePressable
                      key={acc.id}
                      onPress={() => onOpenAccount(acc.id)}
                      style={[
                        styles.groupedRow,
                        !isLast && {
                          borderBottomWidth: 1,
                          borderBottomColor: shade.border,
                        },
                      ]}
                    >
                      <View style={styles.accountLeft}>
                        <IconBadge
                          name={acc.isCash ? 'dollar-sign' : 'briefcase'}
                          size={16}
                          color={acc.isCash ? shade.text : shade.positive}
                          bg={acc.isCash ? shade.surface : shade.positiveSoft}
                          boxSize={36}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.accountName, { color: shade.text }]}
                          >
                            {acc.name}
                          </Text>
                          <Text
                            style={[styles.accountSub, { color: shade.muted }]}
                          >
                            {count} {count === 1 ? 'log' : 'logs'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.rowRightCluster}>
                        <Text
                          style={[styles.balanceValue, { color: shade.text }]}
                        >
                          {formatVisiblePeso(acc.balance)}
                        </Text>
                        <AppIcon
                          name="chevron-right"
                          size={16}
                          color={shade.muted}
                        />
                      </View>
                    </ScalePressable>
                  );
                })}
              </View>
            </View>
          </FadeSlideIn>

          {/* Credit Cards Section */}
          <FadeSlideIn delay={80} distance={10}>
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { color: shade.muted }]}>
                  CREDIT CARDS ({creditCards.length})
                </Text>
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenAddCard();
                  }}
                  style={[styles.addToggle, { backgroundColor: shade.surface }]}
                >
                  <AppIcon name="plus" size={12} color={shade.dopamine} />
                  <Text
                    style={[styles.addToggleText, { color: shade.dopamine }]}
                  >
                    Add Card
                  </Text>
                </ScalePressable>
              </View>

              {creditCards.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    { backgroundColor: shade.card, borderColor: shade.border },
                  ]}
                >
                  <Text style={{ color: shade.muted, fontSize: 13 }}>
                    No credit cards added. Tap + Add Card above.
                  </Text>
                </View>
              ) : (
                <View style={styles.listGap}>
                  {creditCards.map((card) => {
                    const usedPct = Math.min(
                      100,
                      Math.round((card.used / Math.max(0.01, card.limit)) * 100)
                    );
                    const avail = Math.max(0, card.limit - card.used);
                    const daysToCutoff = getDaysUntilDayOfMonth(card.cutoffDay);

                    return (
                      <ScalePressable
                        key={card.id}
                        onPress={() => onOpenAccount(card.id)}
                        style={[
                          styles.cardBox,
                          {
                            backgroundColor: shade.card,
                            borderColor: shade.border,
                          },
                        ]}
                      >
                        <View style={styles.rowBetween}>
                          <View style={[styles.inlineRow, { flex: 1, minWidth: 0 }]}>
                            <IconBadge
                              name="credit-card"
                              size={16}
                              color={shade.dopamine}
                              bg={shade.dopamineSoft}
                              boxSize={34}
                            />
                            <Text
                              numberOfLines={1}
                              style={[styles.accountName, { color: shade.text }]}
                            >
                              {card.name}
                            </Text>
                          </View>
                          <View style={styles.rowRightCluster}>
                            <View
                              style={[
                                styles.cutoffBadge,
                                { backgroundColor: shade.dopamineSoft },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.cutoffText,
                                  { color: shade.dopamine },
                                ]}
                              >
                                Cut-off {formatOrdinal(card.cutoffDay)} (
                                {daysToCutoff === 0
                                  ? 'Today'
                                  : `${daysToCutoff}d`}
                                )
                              </Text>
                            </View>
                            <AppIcon
                              name="chevron-right"
                              size={16}
                              color={shade.muted}
                            />
                          </View>
                        </View>

                        <View style={{ gap: 2 }}>
                          <View
                            style={[
                              styles.rowBetween,
                              { flexWrap: 'wrap', gap: 6 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.accountSub,
                                {
                                  color: shade.muted,
                                  fontVariant: ['tabular-nums'],
                                },
                              ]}
                            >
                              Used {formatVisiblePeso(card.used)}
                            </Text>
                            <Text
                              style={[
                                styles.accountSub,
                                {
                                  color: shade.positive,
                                  fontWeight: '800',
                                  fontVariant: ['tabular-nums'],
                                },
                              ]}
                            >
                              {formatVisiblePeso(avail)} avail
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.accountSub,
                              {
                                color: shade.muted,
                                fontVariant: ['tabular-nums'],
                              },
                            ]}
                          >
                            of {formatVisiblePeso(card.limit)} limit
                          </Text>
                        </View>

                        <AnimatedProgressBar
                          percentage={usedPct}
                          trackColor={shade.surface}
                          fillColor={
                            usedPct > 80 ? shade.warning : shade.dopamine
                          }
                          height={7}
                        />
                      </ScalePressable>
                    );
                  })}
                </View>
              )}
            </View>
          </FadeSlideIn>
        </View>
      ) : subTab === 'installments' ? (
        <FadeSlideIn delay={40} distance={10}>
          <InstallmentsSection
            onOpenAddModal={onOpenAddInstallment}
            onRequestConfirm={onRequestConfirm}
          />
        </FadeSlideIn>
      ) : (
        <FadeSlideIn delay={40} distance={10}>
          <DebtsSection
            onOpenAddDebt={onOpenAddDebt}
            onEditDebt={onEditDebt}
            onPayDebt={onPayDebt}
            onRequestConfirm={onRequestConfirm}
          />
        </FadeSlideIn>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  tabContentGap: {
    gap: 16,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 10,
    shadowColor: '#111318',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  bigTotal: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: 15,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 11,
    alignItems: 'center',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupedRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  listGap: {
    gap: 10,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
  },
  accountSub: {
    fontSize: 12,
    marginTop: 1,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  addToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  cardBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 11,
  },
  cutoffBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  cutoffText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
