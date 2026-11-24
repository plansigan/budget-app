import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemePrefs, useWallet } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { PaymentSourcePicker } from './form/PaymentSourcePicker';

interface DebtAccountingOptionsProps {
  isOutflow: boolean;
  sourceId: string;
  onSelectSource: (id: string) => void;
  affectsDaily: boolean;
  onToggleDaily: () => void;
  showDailyToggle?: boolean;
}

/**
 * Shared optional Wallet link & Today Safe-to-Spend impact selector for Debt modals.
 */
export const DebtAccountingOptions: React.FC<DebtAccountingOptionsProps> = ({
  isOutflow,
  sourceId,
  onSelectSource,
  affectsDaily,
  onToggleDaily,
  showDailyToggle = true,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks, creditCards } = useWallet();

  const toggleFill = isOutflow ? shade.accent : shade.positiveBtnBg;
  const toggleCheckColor = isOutflow ? shade.accentText : '#FFFFFF';
  const toggleBorder = affectsDaily
    ? isOutflow
      ? shade.accent
      : shade.positive
    : shade.border;

  return (
    <View style={styles.optionsGap}>
      <PaymentSourcePicker
        label="WALLET ACCOUNT (OPTIONAL)"
        selectedId={sourceId}
        onSelect={onSelectSource}
        cashOnHand={cashOnHand}
        banks={banks}
        creditCards={isOutflow ? creditCards : []}
        shade={shade}
        formatVisiblePeso={formatVisiblePeso}
        includeTrackOnly
        trackOnlyId="none"
        trackOnlyLabel="Track Only"
        trackOnlySubLabel="No wallet change"
        creditCardSubMode="avail"
      />

      {showDailyToggle && (
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onToggleDaily();
          }}
          accessibilityRole="checkbox"
          accessibilityLabel={
            isOutflow
              ? "Count against today's Safe-to-Spend"
              : "Add back to today's Safe-to-Spend"
          }
          accessibilityState={{ checked: affectsDaily }}
          style={[
            styles.dailyToggleCard,
            {
              backgroundColor: shade.surface,
              borderColor: toggleBorder,
            },
          ]}
        >
          <View
            style={[
              styles.checkCircle,
              {
                backgroundColor: affectsDaily ? toggleFill : shade.card,
                borderColor: affectsDaily ? toggleFill : shade.border,
              },
            ]}
          >
            {affectsDaily && (
              <AppIcon name="check" size={12} color={toggleCheckColor} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[styles.toggleTitle, { color: shade.text }]}>
              {isOutflow
                ? "Count against today's Safe-to-Spend"
                : "Add back to today's Safe-to-Spend"}
            </Text>
            <Text style={[styles.toggleSub, { color: shade.muted }]}>
              {isOutflow
                ? 'Subtracted from daily allowance (off = reminder only)'
                : 'Increases today’s allowance (e.g., split payback)'}
            </Text>
          </View>
        </ScalePressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  optionsGap: {
    gap: 10,
  },
  dailyToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  toggleSub: {
    fontSize: 11,
  },
});
