import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { SpendCategoryKey } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoInput, parsePesoInput } from '../utils/numberFormat';
import { FadeSlideIn, ScalePressable } from './AnimatedPrimitives';
import { AppIcon, SPEND_CATEGORIES } from './AppIcon';

export type ActionModalMode = 'spend' | 'save' | 'treat';

interface ActionAmountModalProps {
  visible: boolean;
  mode: ActionModalMode;
  onClose: () => void;
}

/**
 * Exact-amount entry modal (zero preset amount chips) for Spend!, Fund Treat,
 * and Save to Jar, with Cash / Bank / Credit Card source selection on Spend!.
 */
export const ActionAmountModal: React.FC<ActionAmountModalProps> = ({
  visible,
  mode,
  onClose,
}) => {
  const {
    shade,
    formatVisiblePeso,
    cashOnHand,
    banks,
    creditCards,
    activeTreat,
    selectedDateKey,
    logSpend,
    fundActiveTreat,
    saveToJar,
  } = useBudget();

  const [amountText, setAmountText] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<SpendCategoryKey>('food');
  const [selectedIcon, setSelectedIcon] = useState<string>('shopping-bag');
  const [selectedLabel, setSelectedLabel] = useState('Food');
  const [customNote, setCustomNote] = useState('');
  const [paymentSourceId, setPaymentSourceId] = useState('cash');

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setCustomNote('');
      setSelectedCategory('food');
      setSelectedIcon('shopping-bag');
      setSelectedLabel('Food');
      setPaymentSourceId('cash');
    }
  }, [visible, mode]);

  const numericAmount = parsePesoInput(amountText);

  const accentColor =
    mode === 'treat'
      ? shade.dopamine
      : mode === 'save'
      ? shade.positive
      : shade.accent;

  const modalTitle =
    mode === 'spend'
      ? 'Spend!'
      : mode === 'treat'
      ? activeTreat
        ? `Fund ${activeTreat.name}`
        : 'Fund Your Treat'
      : 'Save to Monthly Jar';

  const handleConfirm = () => {
    if (numericAmount <= 0) return;
    const finalLabel = customNote.trim() || selectedLabel;

    if (mode === 'spend') {
      logSpend(
        numericAmount,
        finalLabel,
        selectedIcon,
        paymentSourceId,
        selectedCategory
      );
    } else if (mode === 'treat') {
      fundActiveTreat(numericAmount);
    } else {
      saveToJar(numericAmount);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : Platform.OS === 'android'
            ? 'height'
            : undefined
        }
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss dialog"
        />
        <FadeSlideIn
          triggerKey={`${visible}-${mode}`}
          distance={18}
          style={[
            styles.card,
            { backgroundColor: shade.card, borderColor: accentColor },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: shade.text }]}>
                {modalTitle}
              </Text>
              <Text style={[styles.dateHint, { color: shade.muted }]}>
                Logging for {selectedDateKey}
              </Text>
            </View>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              accessibilityLabel="Close modal"
              hitSlop={8}
              style={[styles.closePill, { backgroundColor: shade.surface }]}
            >
              <Text style={[styles.closeText, { color: shade.muted }]}>
                ✕ Cancel
              </Text>
            </ScalePressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* Exact Amount Input (Always Specify) */}
            <View
              style={[
                styles.amountBox,
                { backgroundColor: shade.bg, borderColor: accentColor },
              ]}
            >
              <Text style={[styles.pesoBig, { color: accentColor }]}>₱</Text>
              <TextInput
                value={amountText}
                onChangeText={(t) => setAmountText(formatPesoInput(t))}
                keyboardType="numeric"
                placeholder="How much? (₱)"
                placeholderTextColor={shade.muted}
                autoFocus
                style={[styles.amountInput, { color: shade.text }]}
              />
            </View>

            {mode === 'spend' && (
              <>
                <Text style={[styles.sectionLabel, { color: shade.muted }]}>
                  CATEGORY & NOTE
                </Text>
                <View style={styles.tagRow}>
                  {SPEND_CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.key;
                    return (
                      <ScalePressable
                        key={cat.key}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedCategory(cat.key);
                          setSelectedIcon(cat.icon);
                          setSelectedLabel(cat.label);
                        }}
                        style={[
                          styles.tagPill,
                          {
                            backgroundColor: active ? accentColor : shade.surface,
                          },
                        ]}
                      >
                        <AppIcon
                          name={cat.icon}
                          size={13}
                          color={active ? shade.accentText : shade.text}
                        />
                        <Text
                          style={[
                            styles.tagText,
                            { color: active ? shade.accentText : shade.text },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </View>

                <TextInput
                  value={customNote}
                  onChangeText={setCustomNote}
                  placeholder="Optional note (e.g., GrabFood, Jollibee, Milk Tea)"
                  placeholderTextColor={shade.muted}
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: shade.bg,
                      color: shade.text,
                      borderColor: shade.border,
                    },
                  ]}
                />
              </>
            )}

            {mode === 'spend' && (
              <View style={{ gap: 7 }}>
                <Text style={[styles.sectionLabel, { color: shade.muted }]}>
                  HOW DID YOU PAY?
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sourceScroll}
                >
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      setPaymentSourceId('cash');
                    }}
                    style={[
                      styles.sourcePill,
                      {
                        backgroundColor:
                          paymentSourceId === 'cash'
                            ? shade.accent
                            : shade.surface,
                      },
                    ]}
                  >
                    <View style={styles.inlineIconTitle}>
                      <AppIcon
                        name="dollar-sign"
                        size={12}
                        color={
                          paymentSourceId === 'cash'
                            ? shade.accentText
                            : shade.text
                        }
                      />
                      <Text
                        style={[
                          styles.sourceTitle,
                          {
                            color:
                              paymentSourceId === 'cash'
                                ? shade.accentText
                                : shade.text,
                          },
                        ]}
                      >
                        Cash
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.sourceSub,
                        {
                          color:
                            paymentSourceId === 'cash'
                              ? shade.accentText
                              : shade.muted,
                        },
                      ]}
                    >
                      {formatVisiblePeso(cashOnHand)}
                    </Text>
                  </ScalePressable>

                  {banks.map((bank) => {
                    const active = paymentSourceId === bank.id;
                    return (
                      <ScalePressable
                        key={bank.id}
                        onPress={() => {
                          triggerLightHaptic();
                          setPaymentSourceId(bank.id);
                        }}
                        style={[
                          styles.sourcePill,
                          {
                            backgroundColor: active ? shade.accent : shade.surface,
                          },
                        ]}
                      >
                        <View style={styles.inlineIconTitle}>
                          <AppIcon
                            name="briefcase"
                            size={12}
                            color={active ? shade.accentText : shade.text}
                          />
                          <Text
                            style={[
                              styles.sourceTitle,
                              { color: active ? shade.accentText : shade.text },
                            ]}
                          >
                            {bank.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.sourceSub,
                            { color: active ? shade.accentText : shade.muted },
                          ]}
                        >
                          {formatVisiblePeso(bank.balance)}
                        </Text>
                      </ScalePressable>
                    );
                  })}

                  {creditCards.map((card) => {
                    const active = paymentSourceId === card.id;
                    const avail = Math.max(0, card.limit - card.used);
                    return (
                      <ScalePressable
                        key={card.id}
                        onPress={() => {
                          triggerLightHaptic();
                          setPaymentSourceId(card.id);
                        }}
                        style={[
                          styles.sourcePill,
                          {
                            backgroundColor: active
                              ? shade.dopamine
                              : shade.surface,
                          },
                        ]}
                      >
                        <View style={styles.inlineIconTitle}>
                          <AppIcon
                            name="credit-card"
                            size={12}
                            color={active ? '#FFFFFF' : shade.text}
                          />
                          <Text
                            style={[
                              styles.sourceTitle,
                              { color: active ? '#FFFFFF' : shade.text },
                            ]}
                          >
                            {card.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.sourceSub,
                            { color: active ? '#FFFFFF' : shade.muted },
                          ]}
                        >
                          {formatVisiblePeso(avail)} avail
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <ScalePressable
              disabled={numericAmount <= 0}
              onPress={handleConfirm}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor:
                    numericAmount > 0 ? accentColor : shade.surface,
                  opacity: numericAmount > 0 ? 1 : 0.6,
                },
              ]}
            >
              <Text
                style={[
                  styles.confirmText,
                  {
                    color:
                      numericAmount > 0
                        ? mode === 'spend'
                          ? shade.accentText
                          : '#FFFFFF'
                        : shade.muted,
                  },
                ]}
              >
                {mode === 'spend'
                  ? numericAmount > 0
                    ? `Spend ₱${numericAmount.toLocaleString()}!`
                    : 'Enter Amount to Spend!'
                  : mode === 'treat'
                  ? numericAmount > 0
                    ? `Add ₱${numericAmount.toLocaleString()} to Treat`
                    : 'Enter Treat Amount'
                  : numericAmount > 0
                  ? `Save ₱${numericAmount.toLocaleString()} to Jar`
                  : 'Enter Amount to Save'}
              </Text>
            </ScalePressable>
          </ScrollView>
        </FadeSlideIn>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    gap: 13,
  },
  scrollBody: {
    gap: 13,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  dateHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  closePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  closeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pesoBig: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
  },
  inlineIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  sourceScroll: {
    gap: 8,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
    minWidth: 96,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  sourceSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
