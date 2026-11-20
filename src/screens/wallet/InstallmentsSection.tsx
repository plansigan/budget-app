import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AnimatedProgressBar,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { useBudget } from '../../context/BudgetContext';
import { triggerLightHaptic } from '../../utils/haptics';
import {
  computeInstallmentSummary,
  getInstallmentPayoffLabel,
} from '../../utils/insightsEngine';
import { WalletConfirmRequest } from './AccountDetailView';

interface InstallmentsSectionProps {
  onOpenAddModal: () => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const InstallmentsSection: React.FC<InstallmentsSectionProps> = ({
  onOpenAddModal,
  onRequestConfirm,
}) => {
  const {
    shade,
    formatVisiblePeso,
    installments,
    markInstallmentMonthPaid,
    toggleInstallmentInBudget,
    removeInstallment,
  } = useBudget();

  const installmentSummary = useMemo(
    () => computeInstallmentSummary(installments),
    [installments]
  );

  return (
    <View style={styles.section}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: shade.muted }]}>
            INSTALLMENTS ({installmentSummary.activeCount} ACTIVE •{' '}
            {formatVisiblePeso(installmentSummary.totalMonthlyCommitted)}/MO)
          </Text>
          <Text style={[styles.debtFreeSub, { color: shade.positive }]}>
            Debt-Free Goal: {installmentSummary.debtFreeLabel}
            {installmentSummary.activeCount > 0
              ? ` • ${formatVisiblePeso(
                  installmentSummary.totalRemainingBalance
                )} left`
              : ''}
          </Text>
        </View>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenAddModal();
          }}
          style={[styles.addToggle, { backgroundColor: shade.surface }]}
        >
          <AppIcon name="plus" size={12} color={shade.accent} />
          <Text style={[styles.addToggleText, { color: shade.accent }]}>
            Add Plan
          </Text>
        </ScalePressable>
      </View>

      {installments.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <Text style={{ color: shade.muted, fontSize: 12 }}>
            0 installments tracked. Tap + Add Plan for monthly payments.
          </Text>
        </View>
      ) : (
        <View style={styles.listGap}>
          {installments.map((item) => {
            const isDone = item.paidMonths >= item.totalMonths;
            const pct = Math.min(
              100,
              Math.round(
                (item.paidMonths / Math.max(1, item.totalMonths)) * 100
              )
            );
            const payoffLabel = getInstallmentPayoffLabel(item);
            const remBalance =
              Math.max(0, item.totalMonths - item.paidMonths) *
              item.monthlyAmount;

            return (
              <View
                key={item.id}
                style={[
                  styles.cardBox,
                  {
                    backgroundColor: shade.card,
                    borderColor: isDone ? shade.positive : shade.border,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={[styles.inlineRow, { flex: 1 }]}>
                    <IconBadge
                      name="calendar"
                      size={14}
                      color={isDone ? shade.positive : shade.accent}
                      bg={isDone ? shade.positiveSoft : shade.surface}
                      boxSize={32}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: shade.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.accountSub, { color: shade.muted }]}>
                        {item.provider} • {item.paidMonths}/{item.totalMonths}{' '}
                        months
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.cutoffBadge,
                      {
                        backgroundColor: isDone
                          ? shade.positiveSoft
                          : shade.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cutoffText,
                        { color: isDone ? shade.positive : shade.text },
                      ]}
                    >
                      {payoffLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <Text
                    style={[
                      styles.accountSub,
                      { color: shade.text, fontWeight: '700' },
                    ]}
                  >
                    {formatVisiblePeso(item.monthlyAmount)} / mo
                  </Text>
                  <Text style={[styles.accountSub, { color: shade.muted }]}>
                    {formatVisiblePeso(remBalance)} left
                  </Text>
                </View>

                <AnimatedProgressBar
                  percentage={pct}
                  trackColor={shade.surface}
                  fillColor={isDone ? shade.positive : shade.accent}
                  height={7}
                />

                <View style={styles.instActionRow}>
                  {!isDone && (
                    <ScalePressable
                      onPress={() => markInstallmentMonthPaid(item.id)}
                      style={[
                        styles.instActionBtn,
                        { backgroundColor: shade.positiveSoft },
                      ]}
                    >
                      <AppIcon name="check" size={12} color={shade.positive} />
                      <Text
                        style={[
                          styles.instActionText,
                          { color: shade.positive },
                        ]}
                      >
                        Paid 1 Mo
                      </Text>
                    </ScalePressable>
                  )}

                  {!isDone && (
                    <ScalePressable
                      onPress={() => toggleInstallmentInBudget(item.id)}
                      style={[
                        styles.instActionBtn,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <Text
                        style={[styles.instActionText, { color: shade.muted }]}
                      >
                        {item.includeInBudget
                          ? 'In Daily Budget'
                          : 'Track Only'}
                      </Text>
                    </ScalePressable>
                  )}

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onRequestConfirm({
                        title: 'Delete Installment Plan?',
                        message: `Remove "${item.name}" from your installments list?`,
                        confirmLabel: 'Delete',
                        onConfirm: () => removeInstallment(item.id),
                      });
                    }}
                    style={[
                      styles.instDeleteBtn,
                      { backgroundColor: shade.warningSoft },
                    ]}
                  >
                    <AppIcon name="trash-2" size={12} color={shade.warning} />
                    <Text
                      style={[styles.instActionText, { color: shade.warning }]}
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
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  debtFreeSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
  listGap: {
    gap: 8,
  },
  cardBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 9,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '800',
  },
  accountSub: {
    fontSize: 11,
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
  instActionRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 2,
  },
  instActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 8,
  },
  instDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  instActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
