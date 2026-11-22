import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoInput, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { FormModal } from './FormModal';

interface TransferModalProps {
  visible: boolean;
  initialFromId?: string | null;
  initialToId?: string | null;
  onClose: () => void;
}

interface TransferOption {
  id: string;
  label: string;
  subLabel: string;
  icon: string;
  isCard: boolean;
}

/**
 * Spacious modal to transfer funds between Cash / Bank accounts or pay a Credit Card from a real account.
 */
export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  initialFromId = null,
  initialToId = null,
  onClose,
}) => {
  const {
    shade,
    formatVisiblePeso,
    cashOnHand,
    banks,
    creditCards,
    transferBetweenAccounts,
  } = useBudget();

  const [fromId, setFromId] = useState<string>('cash');
  const [toId, setToId] = useState<string>('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');

  const fromOptions: TransferOption[] = [
    {
      id: 'cash',
      label: 'Cash',
      subLabel: formatVisiblePeso(cashOnHand),
      icon: 'dollar-sign',
      isCard: false,
    },
    ...banks.map((b) => ({
      id: b.id,
      label: b.name,
      subLabel: formatVisiblePeso(b.balance),
      icon: 'briefcase',
      isCard: false,
    })),
  ];

  const allDestOptions: TransferOption[] = [
    ...fromOptions,
    ...creditCards.map((c) => ({
      id: c.id,
      label: c.name,
      subLabel: `${formatVisiblePeso(c.used)} used`,
      icon: 'credit-card',
      isCard: true,
    })),
  ];

  const snapshotRef = useRef({ fromOptions, allDestOptions, banks });
  snapshotRef.current = { fromOptions, allDestOptions, banks };

  useEffect(() => {
    if (!visible) return;
    const {
      fromOptions: fromList,
      allDestOptions: destList,
      banks: bList,
    } = snapshotRef.current;

    const preferredFrom =
      initialFromId && fromList.some((o) => o.id === initialFromId)
        ? initialFromId
        : bList[0]?.id || 'cash';
    const validDestinations = destList.filter((d) => d.id !== preferredFrom);
    const preferredTo =
      initialToId &&
      initialToId !== preferredFrom &&
      validDestinations.some((d) => d.id === initialToId)
        ? initialToId
        : validDestinations[0]?.id || '';

    setFromId(preferredFrom);
    setToId(preferredTo);
    setAmountText('');
    setNote('');
  }, [visible, initialFromId, initialToId]);

  const toOptions = allDestOptions.filter((o) => o.id !== fromId);
  const selectedDest = toOptions.find((o) => o.id === toId) || null;
  const numericAmount = parsePesoInput(amountText);
  const canSubmit =
    Boolean(fromId) &&
    Boolean(selectedDest) &&
    fromId !== selectedDest?.id &&
    numericAmount > 0;

  const isCardPayment = Boolean(selectedDest?.isCard);
  const accentColor = isCardPayment ? shade.positive : shade.accent;

  const handleSelectFrom = (nextFrom: string) => {
    triggerLightHaptic();
    setFromId(nextFrom);
    if (nextFrom === toId) {
      const nextDest = allDestOptions.find((o) => o.id !== nextFrom);
      setToId(nextDest ? nextDest.id : '');
    }
  };

  const handleConfirm = () => {
    if (!canSubmit || !selectedDest) return;
    transferBetweenAccounts(
      fromId,
      selectedDest.id,
      numericAmount,
      note.trim() || undefined
    );
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={isCardPayment && selectedDest ? `Pay ${selectedDest.label}` : 'Transfer Money'}
      subtitle="Move funds between Cash, Banks, or pay a Credit Card"
      icon={isCardPayment ? 'credit-card' : 'repeat'}
      accentColor={accentColor}
      onClose={onClose}
    >
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          FROM ACCOUNT
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.pillScroll}
        >
          {fromOptions.map((opt) => {
            const active = fromId === opt.id;
            return (
              <ScalePressable
                key={opt.id}
                onPress={() => handleSelectFrom(opt.id)}
                style={[
                  styles.sourcePill,
                  {
                    backgroundColor: active ? shade.accent : shade.surface,
                  },
                ]}
              >
                <View style={styles.inlineIconTitle}>
                  <AppIcon
                    name={opt.icon}
                    size={12}
                    color={active ? shade.accentText : shade.text}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sourceTitle,
                      { color: active ? shade.accentText : shade.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.sourceSub,
                    { color: active ? shade.accentText : shade.muted },
                  ]}
                >
                  {opt.subLabel}
                </Text>
              </ScalePressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          TO ACCOUNT
        </Text>
        {toOptions.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: shade.surface }]}>
            <Text style={[styles.emptyText, { color: shade.muted }]}>
              Add another bank or credit card to transfer between accounts.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.pillScroll}
          >
            {toOptions.map((opt) => {
              const active = toId === opt.id;
              const activeBg = opt.isCard ? shade.positive : shade.accent;
              const activeFg = opt.isCard ? '#FFFFFF' : shade.accentText;
              return (
                <ScalePressable
                  key={opt.id}
                  onPress={() => {
                    triggerLightHaptic();
                    setToId(opt.id);
                  }}
                  style={[
                    styles.sourcePill,
                    { backgroundColor: active ? activeBg : shade.surface },
                  ]}
                >
                  <View style={styles.inlineIconTitle}>
                    <AppIcon
                      name={opt.icon}
                      size={12}
                      color={active ? activeFg : shade.text}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sourceTitle,
                        { color: active ? activeFg : shade.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.sourceSub,
                      { color: active ? activeFg : shade.muted },
                    ]}
                  >
                    {opt.subLabel}
                  </Text>
                </ScalePressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View
        style={[
          styles.amountBox,
          { backgroundColor: shade.surface, borderColor: accentColor },
        ]}
      >
        <Text style={[styles.pesoPrefix, { color: accentColor }]}>₱</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => setAmountText(formatPesoInput(t))}
          keyboardType="numeric"
          placeholder="Enter exact amount"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={
          isCardPayment
            ? 'Optional note (e.g., Statement balance)'
            : 'Optional note (e.g., Cash-in to GCash)'
        }
        placeholderTextColor={shade.muted}
        style={[
          styles.noteInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <ScalePressable
        disabled={!canSubmit}
        onPress={handleConfirm}
        style={[
          styles.submitBtn,
          {
            backgroundColor: canSubmit ? accentColor : shade.surface,
            opacity: canSubmit ? 1 : 0.65,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            {
              color: canSubmit
                ? isCardPayment
                  ? '#FFFFFF'
                  : shade.accentText
                : shade.muted,
            },
          ]}
        >
          {canSubmit
            ? isCardPayment && selectedDest
              ? `Pay ${selectedDest.label} ₱${numericAmount.toLocaleString()}`
              : `Transfer ₱${numericAmount.toLocaleString()}`
            : 'Enter Amount to Transfer'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  sectionBlock: {
    gap: 7,
    width: '100%',
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  horizontalScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  pillScroll: {
    gap: 8,
  },
  sourcePill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 13,
    minWidth: 96,
  },
  inlineIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  sourceSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyBox: {
    borderRadius: 12,
    padding: 12,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pesoPrefix: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 21,
    fontWeight: '800',
    paddingVertical: 2,
  },
  noteInput: {
    width: '100%',
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
