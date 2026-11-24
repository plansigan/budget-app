import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FadeSlideIn,
  PopValueText,
} from '../../components/AnimatedPrimitives';
import { BudgetStepperRow } from '../../components/BudgetStepperRow';
import { MonthlyBillsBreakdownCard } from '../../components/MonthlyBillsBreakdownCard';
import { SalaryScheduleCard } from '../../components/SalaryScheduleCard';
import { SpendingEnvelopesCard } from '../../components/SpendingEnvelopesCard';
import {
  useBudgetActions,
  useDailyBudget,
  useThemePrefs,
} from '../../context/BudgetContext';
import { BillItem } from '../../types/budget';

interface BudgetPlanSectionProps {
  focusAllowancesKey: number;
  onRequestPayBill: (bill: BillItem) => void;
  onAllowancesLayout?: (y: number) => void;
}

export const BudgetPlanSection: React.FC<BudgetPlanSectionProps> = React.memo(
  ({ focusAllowancesKey, onRequestPayBill, onAllowancesLayout }) => {
    const { shade, privacyMode, formatVisiblePeso } = useThemePrefs();
    const { todayKey, settings, billItems, envelopes, baseDailyAllowance } =
      useDailyBudget();
    const {
      updateBudgetConfig,
      updateSalarySchedule,
      updateBillAmount,
      updateBillItem,
      updateBillDueDay,
      addBillItem,
      removeBillItem,
      addEnvelope,
      updateEnvelope,
      deleteEnvelope,
      refillEnvelope,
    } = useBudgetActions();

    return (
      <FadeSlideIn delay={0} style={styles.section}>
        <View
          style={[
            styles.formulaCard,
            {
              backgroundColor: shade.heroBg,
              borderColor: shade.heroBorder,
            },
          ]}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[styles.formulaKicker, { color: shade.heroMuted }]}>
              DAILY BUDGET FORMULA
            </Text>
            <Text style={[styles.formulaSub, { color: shade.heroText }]}>
              {formatVisiblePeso(settings.monthlyIncome)} in − Bills, Allowances &{' '}
              {formatVisiblePeso(settings.monthlySavingsGoal)} save
            </Text>
          </View>
          <PopValueText valueTrigger={baseDailyAllowance}>
            <Text
              numberOfLines={1}
              style={[styles.formulaResult, { color: shade.heroPositive }]}
            >
              {formatVisiblePeso(baseDailyAllowance)}/day
            </Text>
          </PopValueText>
        </View>

        <BudgetStepperRow
          label="Monthly Income"
          hint="How much you take home"
          value={settings.monthlyIncome}
          shade={shade}
          privacyMode={privacyMode}
          onChange={(val) =>
            updateBudgetConfig(
              val,
              settings.fixedBills,
              settings.monthlySavingsGoal
            )
          }
        />

        <SalaryScheduleCard
          frequency={settings.salaryFrequency}
          payday1={settings.payday1}
          payday2={settings.payday2}
          shade={shade}
          onChange={updateSalarySchedule}
        />

        <MonthlyBillsBreakdownCard
          bills={billItems}
          shade={shade}
          enableTracking
          collapsible
          defaultExpanded={false}
          currentMonthKey={todayKey.slice(0, 7)}
          privacyMode={privacyMode}
          onUpdateAmount={updateBillAmount}
          onUpdateBillItem={updateBillItem}
          onUpdateDueDay={updateBillDueDay}
          onAddBill={addBillItem}
          onRemoveBill={removeBillItem}
          onRequestPayBill={onRequestPayBill}
        />

        <View onLayout={(e) => onAllowancesLayout?.(e.nativeEvent.layout.y)}>
          <SpendingEnvelopesCard
            envelopes={envelopes}
            salaryFrequency={settings.salaryFrequency}
            shade={shade}
            privacyMode={privacyMode}
            collapsible
            defaultExpanded={false}
            focusSignal={focusAllowancesKey}
            onAddEnvelope={addEnvelope}
            onUpdateEnvelope={updateEnvelope}
            onDeleteEnvelope={deleteEnvelope}
            onRefillEnvelope={refillEnvelope}
          />
        </View>

        <BudgetStepperRow
          label="Monthly Savings Goal"
          hint="Set aside first each month"
          value={settings.monthlySavingsGoal}
          shade={shade}
          privacyMode={privacyMode}
          onChange={(val) =>
            updateBudgetConfig(settings.monthlyIncome, settings.fixedBills, val)
          }
        />
      </FadeSlideIn>
    );
  }
);

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  formulaCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formulaKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  formulaSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  formulaResult: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
});
