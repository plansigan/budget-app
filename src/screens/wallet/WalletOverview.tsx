import React, { useMemo } from 'react';
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
import { getDaysUntilDayOfMonth } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatOrdinal } from '../../utils/numberFormat';
import { WalletConfirmRequest } from './AccountDetailView';
import { InstallmentsSection } from './InstallmentsSection';

interface WalletOverviewProps {
  onOpenAccount: (accountId: string) => void;
  onOpenAddBank: () => void;
  onOpenAddCard: () => void;
  onOpenAddInstallment: () => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const WalletOverview: React.FC<WalletOverviewProps> = ({
  onOpenAccount,
  onOpenAddBank,
  onOpenAddCard,
  onOpenAddInstallment,
  onRequestConfirm,
}) => {
  const {
    shade,
    privacyMode,
    formatVisiblePeso,
    cashOnHand,
    banks,
    creditCards,
    entries,
  } = useBudget();

  const logCountsByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.paymentSourceId) {
        map[e.paymentSourceId] = (map[e.paymentSourceId] || 0) + 1;
      }
    }
    return map;
  }, [entries]);

  const totalBankBalance = banks.reduce((sum, b) => sum + b.balance, 0);
  const totalLiquid = cashOnHand + totalBankBalance;
  const cashLogCount = logCountsByAccount['cash'] || 0;

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
              <AppIcon name="briefcase" size={12} color="#4ADE80" />
              <Text style={[styles.countText, { color: '#4ADE80' }]}>
                {banks.length} {banks.length === 1 ? 'Bank' : 'Banks'}
              </Text>
            </View>
            <View
              style={[styles.countPill, { backgroundColor: shade.heroSurface }]}
            >
              <AppIcon name="credit-card" size={12} color="#A5B4FC" />
              <Text style={[styles.countText, { color: '#A5B4FC' }]}>
                {creditCards.length}{' '}
                {creditCards.length === 1 ? 'Card' : 'Cards'}
              </Text>
            </View>
          </View>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={40} distance={12}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: shade.muted }]}>
            CASH IN WALLET (TAP FOR LOGS)
          </Text>
          <ScalePressable
            onPress={() => onOpenAccount('cash')}
            style={[
              styles.accountRow,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View style={styles.accountLeft}>
              <IconBadge
                name="dollar-sign"
                size={15}
                color={shade.text}
                bg={shade.surface}
                boxSize={34}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountName, { color: shade.text }]}>
                  Physical Cash
                </Text>
                <Text style={[styles.logBadgeText, { color: shade.accent }]}>
                  {cashLogCount} {cashLogCount === 1 ? 'log' : 'logs'} • Tap to
                  view logs ›
                </Text>
              </View>
            </View>
            <Text style={[styles.balanceValue, { color: shade.text }]}>
              {formatVisiblePeso(cashOnHand)}
            </Text>
          </ScalePressable>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={80} distance={12}>
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: shade.muted }]}>
              BANK ACCOUNTS ({banks.length} •{' '}
              {formatVisiblePeso(totalBankBalance)})
            </Text>
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

          {banks.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <Text style={{ color: shade.muted, fontSize: 12 }}>
                0 banks added. Tap + Add Bank above.
              </Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {banks.map((bank) => {
                const count = logCountsByAccount[bank.id] || 0;
                return (
                  <ScalePressable
                    key={bank.id}
                    onPress={() => onOpenAccount(bank.id)}
                    style={[
                      styles.accountRow,
                      { backgroundColor: shade.card, borderColor: shade.border },
                    ]}
                  >
                    <View style={styles.accountLeft}>
                      <IconBadge
                        name="briefcase"
                        size={15}
                        color={shade.positive}
                        bg={shade.positiveSoft}
                        boxSize={34}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.accountName, { color: shade.text }]}
                        >
                          {bank.name}
                        </Text>
                        <Text
                          style={[styles.logBadgeText, { color: shade.accent }]}
                        >
                          {count} {count === 1 ? 'log' : 'logs'} • Tap to view
                          logs ›
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.balanceValue, { color: shade.text }]}>
                      {formatVisiblePeso(bank.balance)}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          )}
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={120} distance={12}>
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
              <Text style={[styles.addToggleText, { color: shade.dopamine }]}>
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
              <Text style={{ color: shade.muted, fontSize: 12 }}>
                0 credit cards added. Tap + Add Card above.
              </Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {creditCards.map((card) => {
                const usedPct = Math.min(
                  100,
                  Math.round((card.used / Math.max(1, card.limit)) * 100)
                );
                const avail = Math.max(0, card.limit - card.used);
                const daysToCutoff = getDaysUntilDayOfMonth(card.cutoffDay);
                const count = logCountsByAccount[card.id] || 0;

                return (
                  <ScalePressable
                    key={card.id}
                    onPress={() => onOpenAccount(card.id)}
                    style={[
                      styles.cardBox,
                      { backgroundColor: shade.card, borderColor: shade.border },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={styles.inlineRow}>
                        <IconBadge
                          name="credit-card"
                          size={15}
                          color={shade.dopamine}
                          bg={shade.dopamineSoft}
                          boxSize={32}
                        />
                        <Text
                          style={[styles.accountName, { color: shade.text }]}
                        >
                          {card.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.cutoffBadge,
                          { backgroundColor: shade.dopamineSoft },
                        ]}
                      >
                        <Text
                          style={[styles.cutoffText, { color: shade.dopamine }]}
                        >
                          Cut-off: {formatOrdinal(card.cutoffDay)} (
                          {daysToCutoff === 0 ? 'Today' : `${daysToCutoff}d`})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rowBetween}>
                      <Text style={[styles.accountSub, { color: shade.muted }]}>
                        Used: {formatVisiblePeso(card.used)} /{' '}
                        {formatVisiblePeso(card.limit)}
                      </Text>
                      <Text
                        style={[
                          styles.accountSub,
                          { color: shade.positive, fontWeight: '800' },
                        ]}
                      >
                        {formatVisiblePeso(avail)} avail
                      </Text>
                    </View>

                    <AnimatedProgressBar
                      percentage={usedPct}
                      trackColor={shade.surface}
                      fillColor={usedPct > 80 ? shade.warning : shade.dopamine}
                      height={7}
                    />

                    <Text
                      style={[styles.logBadgeText, { color: shade.dopamine }]}
                    >
                      {count} {count === 1 ? 'log' : 'logs'} • Tap to view logs
                      & pay bill ›
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          )}
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={150} distance={12}>
        <InstallmentsSection
          onOpenAddModal={onOpenAddInstallment}
          onRequestConfirm={onRequestConfirm}
        />
      </FadeSlideIn>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 36,
    gap: 16,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 9,
    shadowColor: '#111318',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  kicker: {
    fontSize: 10,
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
    gap: 8,
    paddingTop: 2,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    gap: 8,
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
  listGap: {
    gap: 8,
  },
  accountRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '800',
  },
  accountSub: {
    fontSize: 11,
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  addToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  addToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  cardBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 9,
  },
  cutoffBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  cutoffText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
