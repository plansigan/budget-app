import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useBudgetActions,
  useDailyBudget,
  useGoals,
  useThemePrefs,
  useWallet,
} from '../context/BudgetContext';
import { SpendCategoryKey } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, SPEND_CATEGORIES } from './AppIcon';
import { BaseModal } from './BaseModal';
import { PaymentSourcePicker } from './form/PaymentSourcePicker';
import { PesoAmountInput } from './form/PesoAmountInput';
import { SpendCategoryPicker } from './form/SpendCategoryPicker';

export type ActionModalMode = 'spend' | 'save' | 'treat';

interface ActionAmountModalProps {
  visible: boolean;
  mode: ActionModalMode;
  initialEnvelopeId?: string | null;
  onClose: () => void;
}

const ActionAmountModalContent: React.FC<
  Omit<ActionAmountModalProps, 'visible'>
> = ({ mode, initialEnvelopeId = null, onClose }) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks, creditCards, lastPaymentSourceId } = useWallet();
  const { envelopes, selectedDateKey } = useDailyBudget();
  const { activeTreat } = useGoals();
  const { logSpend, spendFromEnvelope, fundActiveTreat, saveToJar } =
    useBudgetActions();

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

  const defaultsRef = useRef({
    lastPaymentSourceId,
    banks,
    creditCards,
    envelopes,
  });
  defaultsRef.current = {
    lastPaymentSourceId,
    banks,
    creditCards,
    envelopes,
  };

  const resolveSmartDefaultSource = () => {
    const {
      lastPaymentSourceId: savedSrc,
      banks: bList,
      creditCards: cList,
    } = defaultsRef.current;
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
    const initEnv =
      mode === 'spend' && initialEnvelopeId
        ? defaultsRef.current.envelopes.find((e) => e.id === initialEnvelopeId) ||
          null
        : null;
    setAmountText('');
    setCustomNote('');
    setSelectedCategory('food');
    setSelectedLabel('Food');
    setSelectedIcon(initEnv ? initEnv.icon : 'shopping-bag');
    setPaymentSourceId(resolveSmartDefaultSource());
    setSelectedEnvelopeId(initEnv ? initEnv.id : null);
  }, [mode, initialEnvelopeId]);

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

  const filledBtnBg =
    mode === 'treat' || activeEnvelope
      ? shade.dopamineBtnBg
      : mode === 'save'
      ? shade.positiveBtnBg
      : shade.accent;

  const filledBtnFg =
    mode === 'spend' && !activeEnvelope ? shade.accentText : '#FFFFFF';

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
      customNote.trim() ||
      (activeEnvelope ? activeEnvelope.name : selectedLabel);

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

  const handleSelectDailyBudget = () => {
    triggerLightHaptic();
    setSelectedEnvelopeId(null);
    const catOption = SPEND_CATEGORIES.find((c) => c.key === selectedCategory);
    setSelectedIcon(catOption?.icon || 'shopping-bag');
    if (paymentSourceId === 'none') {
      setPaymentSourceId(resolveSmartDefaultSource());
    }
  };

  return (
    <BaseModal
      visible
      onClose={onClose}
      avoidKeyboard
      androidAvoidHeight
      cardStyle={[
        styles.card,
        { backgroundColor: shade.card, borderColor: accentColor },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.title, { color: shade.text }]}>
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
          accessibilityRole="button"
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
        <PesoAmountInput
          value={amountText}
          onChangeText={setAmountText}
          shade={shade}
          accentColor={accentColor}
          borderColor={accentColor}
          backgroundColor={shade.bg}
          placeholder="How much? (₱)"
          autoFocus
          inputAccessibilityLabel="Transaction amount in pesos"
          containerStyle={styles.amountBox}
          inputStyle={styles.amountInput}
        />

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
                onPress={handleSelectDailyBudget}
                accessibilityRole="button"
                accessibilityLabel="Spend from Daily Budget"
                accessibilityState={{ selected: selectedEnvelopeId === null }}
                style={[
                  styles.sourcePill,
                  {
                    backgroundColor:
                      selectedEnvelopeId === null ? shade.accent : shade.surface,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
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
                  numberOfLines={1}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Spend from ${env.name}: ${formatVisiblePeso(
                      env.balance
                    )} left`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.sourcePill,
                      {
                        backgroundColor: active
                          ? shade.dopamineBtnBg
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
                        numberOfLines={1}
                        style={[
                          styles.sourceTitle,
                          { color: active ? '#FFFFFF' : shade.text },
                        ]}
                      >
                        {env.name}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
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
                  ? `Exceeds ${activeEnvelope.name} balance by ${formatVisiblePeso(
                      numericAmount - activeEnvelope.balance
                    )} (still won't touch daily Safe-to-Spend).`
                  : "Guilt-free allowance • won't reduce today's Safe-to-Spend"}
              </Text>
            )}
          </View>
        )}

        {mode === 'spend' && (
          <>
            <SpendCategoryPicker
              label="CATEGORY & NOTE"
              selectedKey={selectedCategory}
              onSelect={(cat) => {
                setSelectedCategory(cat.key);
                setSelectedIcon(cat.icon);
                setSelectedLabel(cat.label);
              }}
              shade={shade}
              activeColor={filledBtnBg}
              activeTextColor={filledBtnFg}
            />

            <TextInput
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="Optional note (e.g., GrabFood, Jollibee, Milk Tea)"
              placeholderTextColor={shade.muted}
              accessibilityLabel="Transaction note"
              style={[
                styles.noteInput,
                {
                  backgroundColor: shade.bg,
                  color: shade.text,
                  borderColor: shade.border,
                },
              ]}
            />

            <PaymentSourcePicker
              label="HOW DID YOU PAY?"
              selectedId={paymentSourceId}
              onSelect={setPaymentSourceId}
              cashOnHand={cashOnHand}
              banks={banks}
              creditCards={creditCards}
              shade={shade}
              formatVisiblePeso={formatVisiblePeso}
              includeTrackOnly={Boolean(activeEnvelope)}
              trackOnlyId="none"
              trackOnlyLabel="Track Only"
              trackOnlySubLabel="Allowance only"
              creditCardSubMode="avail"
            />
          </>
        )}

        <ScalePressable
          disabled={numericAmount <= 0}
          onPress={handleConfirm}
          accessibilityRole="button"
          style={[
            styles.confirmBtn,
            {
              backgroundColor: numericAmount > 0 ? filledBtnBg : shade.surface,
              opacity: numericAmount > 0 ? 1 : 0.65,
            },
          ]}
        >
          <Text
            style={[
              styles.confirmText,
              { color: numericAmount > 0 ? filledBtnFg : shade.muted },
            ]}
          >
            {mode === 'spend'
              ? numericAmount > 0
                ? `Spend ${formatVisiblePeso(numericAmount)}!`
                : 'Enter Amount to Spend!'
              : mode === 'treat'
              ? numericAmount > 0
                ? `Add ${formatVisiblePeso(numericAmount)} to Treat`
                : 'Enter Treat Amount'
              : numericAmount > 0
              ? `Save ${formatVisiblePeso(numericAmount)} to Jar`
              : 'Enter Amount to Save'}
          </Text>
        </ScalePressable>
      </ScrollView>
    </BaseModal>
  );
};

/**
 * Exact-amount entry modal for Spend!, Fund Treat, and Save to Jar.
 */
export const ActionAmountModal: React.FC<ActionAmountModalProps> = (props) => {
  if (!props.visible) return null;
  return (
    <ActionAmountModalContent
      mode={props.mode}
      initialEnvelopeId={props.initialEnvelopeId}
      onClose={props.onClose}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    maxHeight: '88%',
    alignSelf: 'center',
    borderWidth: 1.5,
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
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountInput: {
    fontSize: 22,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inlineIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    paddingVertical: 9,
    borderRadius: 13,
    minWidth: 96,
    maxWidth: 170,
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
