import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeShade } from '../../theme/palette';
import { BankAccount, CreditCardAccount } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { ScalePressable } from '../AnimatedPrimitives';

export interface PaymentSourcePickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  cashOnHand: number;
  banks: BankAccount[];
  creditCards?: CreditCardAccount[];
  shade: ThemeShade;
  formatVisiblePeso: (amount: number) => string;
  activeColor?: string;
  activeTextColor?: string;
  excludeIds?: string[];
  includeCash?: boolean;
  includeTrackOnly?: boolean;
  trackOnlyId?: string;
  trackOnlyLabel?: string;
  trackOnlySubLabel?: string;
  trackOnlyActiveColor?: string;
  creditCardSubMode?: 'avail' | 'used';
  label?: string;
  emptyNotice?: string;
}

/**
 * Shared horizontal scrollable Cash / Bank / Credit Card account picker.
 */
export const PaymentSourcePicker: React.FC<PaymentSourcePickerProps> = ({
  selectedId,
  onSelect,
  cashOnHand,
  banks,
  creditCards = [],
  shade,
  formatVisiblePeso,
  activeColor,
  activeTextColor,
  excludeIds = [],
  includeCash = true,
  includeTrackOnly = false,
  trackOnlyId = 'external',
  trackOnlyLabel = 'Track Only',
  trackOnlySubLabel = 'No wallet change',
  trackOnlyActiveColor,
  creditCardSubMode = 'avail',
  label,
  emptyNotice,
}) => {
  const excluded = new Set(excludeIds);
  const resolvedActiveBg = activeColor || shade.accent;
  const resolvedActiveFg =
    activeTextColor ||
    (resolvedActiveBg === shade.accent ? shade.accentText : '#FFFFFF');
  const resolvedTrackOnlyBg = trackOnlyActiveColor || shade.accent;
  const resolvedTrackOnlyFg =
    resolvedTrackOnlyBg === shade.accent ? shade.accentText : '#FFFFFF';

  const visibleBanks = banks.filter((b) => !excluded.has(b.id));
  const visibleCards = creditCards.filter((c) => !excluded.has(c.id));
  const showCash = includeCash && !excluded.has('cash');
  const hasAnyOption =
    includeTrackOnly ||
    showCash ||
    visibleBanks.length > 0 ||
    visibleCards.length > 0;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: shade.muted }]}>{label}</Text>
      ) : null}

      {!hasAnyOption && emptyNotice ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.emptyText, { color: shade.muted }]}>
            {emptyNotice}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {includeTrackOnly && (
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onSelect(trackOnlyId);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${trackOnlyLabel}: ${trackOnlySubLabel}`}
              accessibilityState={{ selected: selectedId === trackOnlyId }}
              style={[
                styles.pill,
                {
                  backgroundColor:
                    selectedId === trackOnlyId
                      ? resolvedTrackOnlyBg
                      : shade.surface,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color:
                      selectedId === trackOnlyId
                        ? resolvedTrackOnlyFg
                        : shade.text,
                  },
                ]}
              >
                {trackOnlyLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.sub,
                  {
                    color:
                      selectedId === trackOnlyId
                        ? resolvedTrackOnlyFg
                        : shade.muted,
                  },
                ]}
              >
                {trackOnlySubLabel}
              </Text>
            </ScalePressable>
          )}

          {showCash && (
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onSelect('cash');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Cash: ${formatVisiblePeso(cashOnHand)}`}
              accessibilityState={{ selected: selectedId === 'cash' }}
              style={[
                styles.pill,
                {
                  backgroundColor:
                    selectedId === 'cash' ? resolvedActiveBg : shade.surface,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color:
                      selectedId === 'cash' ? resolvedActiveFg : shade.text,
                  },
                ]}
              >
                Cash
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.sub,
                  {
                    color:
                      selectedId === 'cash' ? resolvedActiveFg : shade.muted,
                  },
                ]}
              >
                {formatVisiblePeso(cashOnHand)}
              </Text>
            </ScalePressable>
          )}

          {visibleBanks.map((bank) => {
            const active = selectedId === bank.id;
            const balLabel = formatVisiblePeso(bank.balance);
            return (
              <ScalePressable
                key={bank.id}
                onPress={() => {
                  triggerLightHaptic();
                  onSelect(bank.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${bank.name}: ${balLabel}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? resolvedActiveBg : shade.surface,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    { color: active ? resolvedActiveFg : shade.text },
                  ]}
                >
                  {bank.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sub,
                    { color: active ? resolvedActiveFg : shade.muted },
                  ]}
                >
                  {balLabel}
                </Text>
              </ScalePressable>
            );
          })}

          {visibleCards.map((card) => {
            const active = selectedId === card.id;
            const avail = Math.max(0, card.limit - card.used);
            const subText =
              creditCardSubMode === 'used'
                ? `${formatVisiblePeso(card.used)} used`
                : `${formatVisiblePeso(avail)} avail`;
            return (
              <ScalePressable
                key={card.id}
                onPress={() => {
                  triggerLightHaptic();
                  onSelect(card.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${card.name} credit card: ${subText}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? resolvedActiveBg : shade.surface,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    { color: active ? resolvedActiveFg : shade.text },
                  ]}
                >
                  {card.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sub,
                    { color: active ? resolvedActiveFg : shade.muted },
                  ]}
                >
                  {subText}
                </Text>
              </ScalePressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    gap: 8,
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 92,
    maxWidth: 165,
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
  },
  sub: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
