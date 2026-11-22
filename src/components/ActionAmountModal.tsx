import React, { useEffect, useRef, useState } from 'react';
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
import {
  formatPeso,
  formatPesoInput,
  parsePesoInput,
} from '../utils/numberFormat';
import { useWebKeyboardInset } from '../utils/useWebKeyboardInset';
import { FadeSlideIn, ScalePressable } from './AnimatedPrimitives';
import { AppIcon, SPEND_CATEGORIES } from './AppIcon';

export type ActionModalMode = 'spend' | 'save' | 'treat';

interface ActionAmountModalProps {
  visible: boolean;
  mode: ActionModalMode;
  initialEnvelopeId?: string | null;
  onClose: () => void;
}

/**
 * Exact-amount entry modal (zero preset amount chips) for Spend!, Fund Treat,
 * and Save to Jar, with Daily Budget / Spending Envelope and Cash / Bank / Card selection.
 */
export const ActionAmountModal: React.FC<ActionAmountModalProps> = ({
  visible,
  mode,
  initialEnvelopeId = null,
  onClose,
}) => {
  const {
    shade,
    formatVisiblePeso,
    cashOnHand,
    banks,
    creditCards,
    envelopes,
    activeTreat,
    selectedDateKey,
    lastPaymentSourceId,
    logSpend,
    spendFromEnvelope,
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
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(
    null
  );

  const sourceDefaultsRef = useRef({
    lastPaymentSourceId,
    banks,
    creditCards,
  });
  sourceDefaultsRef.current = { lastPaymentSourceId, banks, creditCards };

  const resolveSmartDefaultSource = () => {
    const {
      lastPaymentSourceId: savedSrc,
      banks: bList,
      creditCards: cList,
    } = sourceDefaultsRef.current;
    if (savedSrc === 'cash') return 'cash';
    if (
      savedSrc &&
      (bList.some((b) => b.id === savedSrc) ||
        cList.some((c) => c.id === savedSrc))
    ) {
      return savedSrc;
    }
    return 'cash';
  };

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setCustomNote('');
      setSelectedCategory('food');
      setSelectedIcon('shopping-bag');
      setSelectedLabel('Food');
      setPaymentSourceId(resolveSmartDefaultSource());
      setSelectedEnvelopeId(initialEnvelopeId ?? null);
    }
  }, [visible, mode, initialEnvelopeId]);

  const numericAmount = parsePesoInput(amountText);
  const activeEnvelope =
    mode === 'spend' && selectedEnvelopeId
      ? envelopes.find((e) => e.id === selectedEnvelopeId) || null
      : null;

  const accentColor =
    mode === 'treat' || activeEnvelope
      ? shade.dopamine
      : mode === 'save'
      ? shade.positive
      : shade.accent;

  const modalTitle =
    mode === 'spend'
      ? activeEnvelope
        ? `Spend • ${activeEnvelope.name}`
        : 'Spend!'
      : mode === 'treat'
      ? activeTreat
        ? `Fund ${activeTreat.name}`
        : 'Fund Your Treat'
      : 'Save to Monthly Jar';

  const handleConfirm = () => {
    if (numericAmount <= 0) return;
    const finalLabel =
      customNote.trim() || (activeEnvelope ? activeEnvelope.name : selectedLabel);

    if (mode === 'spend') {
      if (activeEnvelope) {
        spendFromEnvelope(
          activeEnvelope.id,
          numericAmount,
          finalLabel,
          selectedIcon,
          paymentSourceId,
          selectedCategory
        );
      } else {
        logSpend(
          numericAmount,
          finalLabel,
          selectedIcon,
          paymentSourceId,
          selectedCategory
        );
      }
    } else if (mode === 'treat') {
      fundActiveTreat(numericAmount);
    } else {
      saveToJar(numericAmount);
    }
    onClose();
  };

  const { keyboardInset, viewportHeight, offsetTop } =
    useWebKeyboardInset(visible);
  const webKeyboardBackdrop =
    Platform.OS === 'web' && keyboardInset > 0
      ? {
          paddingBottom: keyboardInset + 8,
          paddingTop: Math.max(12, offsetTop + 8),
        }
      : undefined;
  const webKeyboardCard =
    Platform.OS === 'web' && keyboardInset > 0 && viewportHeight > 0
      ? { maxHeight: Math.max(240, viewportHeight - 24) }
      : undefined;

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
        style={[styles.backdrop, webKeyboardBackdrop]}
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
            webKeyboardCard,
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
            style={styles.modalScroll}
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
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="How much? (₱)"
                placeholderTextColor={shade.muted}
                autoFocus
                style={[styles.amountInput, { color: shade.text }]}
              />
            </View>

            {mode === 'spend' && envelopes.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: shade.muted }]}>
                  SPEND FROM
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                  contentContainerStyle={styles.sourceScroll}
                >
                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedEnvelopeId(null);
                      if (paymentSourceId === 'none') {
                        setPaymentSourceId(resolveSmartDefaultSource());
                      }
                    }}
                    style={[
                      styles.sourcePill,
                      {
                        backgroundColor:
                          selectedEnvelopeId === null
                            ? shade.accent
                            : shade.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceTitle,
                        {
                          color:
                            selectedEnvelopeId === null
                              ? shade.accentText
                              : shade.text,
                        },
                      ]}
                    >
                      Daily Budget
                    </Text>
                    <Text
                      style={[
                        styles.sourceSub,
                        {
                          color:
                            selectedEnvelopeId === null
                              ? shade.accentText
                              : shade.muted,
                        },
                      ]}
                    >
                      Regular daily
                    </Text>
                  </ScalePressable>

                  {envelopes.map((env) => {
                    const active = selectedEnvelopeId === env.id;
                    return (
                      <ScalePressable
                        key={env.id}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedEnvelopeId(env.id);
                          setSelectedIcon(env.icon);
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
                            name={env.icon}
                            size={12}
                            color={active ? '#FFFFFF' : shade.dopamine}
                          />
                          <Text
                            style={[
                              styles.sourceTitle,
                              { color: active ? '#FFFFFF' : shade.text },
                            ]}
                          >
                            {env.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.sourceSub,
                            { color: active ? '#FFFFFF' : shade.muted },
                          ]}
                        >
                          {formatVisiblePeso(env.balance)} left
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </ScrollView>

                {activeEnvelope && (
                  <Text
                    style={[
                      styles.envelopeHint,
                      {
                        color:
                          numericAmount > activeEnvelope.balance
                            ? shade.warning
                            : shade.dopamine,
                      },
                    ]}
                  >
                    {numericAmount > activeEnvelope.balance
                      ? `Exceeds ${activeEnvelope.name} balance by ${formatPeso(numericAmount - activeEnvelope.balance)} (still won't touch daily Safe-to-Spend).`
                      : `Guilt-free allowance • won't reduce today's Safe-to-Spend`}
                  </Text>
                )}
              </View>
            )}

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
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: shade.muted }]}>
                  HOW DID YOU PAY?
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                  contentContainerStyle={styles.sourceScroll}
                >
                  {activeEnvelope && (
                    <ScalePressable
                      onPress={() => {
                        triggerLightHaptic();
                        setPaymentSourceId('none');
                      }}
                      style={[
                        styles.sourcePill,
                        {
                          backgroundColor:
                            paymentSourceId === 'none'
                              ? shade.accent
                              : shade.surface,
                        },
                      ]}
                    >
                      <View style={styles.inlineIconTitle}>
                        <AppIcon
                          name="check"
                          size={12}
                          color={
                            paymentSourceId === 'none'
                              ? shade.accentText
                              : shade.text
                          }
                        />
                        <Text
                          style={[
                            styles.sourceTitle,
                            {
                              color:
                                paymentSourceId === 'none'
                                  ? shade.accentText
                                  : shade.text,
                            },
                          ]}
                        >
                          Track Only
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.sourceSub,
                          {
                            color:
                              paymentSourceId === 'none'
                                ? shade.accentText
                                : shade.muted,
                          },
                        ]}
                      >
                        Allowance only
                      </Text>
                    </ScalePressable>
                  )}
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
                        ? mode === 'spend' && !activeEnvelope
                          ? shade.accentText
                          : '#FFFFFF'
                        : shade.muted,
                  },
                ]}
              >
                {mode === 'spend'
                  ? numericAmount > 0
                    ? `Spend ${formatPeso(numericAmount)}!`
                    : 'Enter Amount to Spend!'
                  : mode === 'treat'
                  ? numericAmount > 0
                    ? `Add ${formatPeso(numericAmount)} to Treat`
                    : 'Enter Treat Amount'
                  : numericAmount > 0
                  ? `Save ${formatPeso(numericAmount)} to Jar`
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
    minWidth: 0,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    gap: 13,
  },
  modalScroll: {
    width: '100%',
  },
  scrollBody: {
    gap: 13,
    paddingBottom: 2,
    width: '100%',
  },
  sectionBlock: {
    gap: 7,
    width: '100%',
    minWidth: 0,
  },
  horizontalScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  envelopeHint: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    width: '100%',
    minWidth: 0,
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
    minWidth: 0,
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
    width: '100%',
    minWidth: 0,
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
