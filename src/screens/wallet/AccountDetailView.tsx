import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import {
  AnimatedProgressBar,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge, SPEND_CATEGORIES } from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
import { useBudget } from '../../context/BudgetContext';
import { SpendCategoryKey, getDaysUntilDayOfMonth } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import {
  formatOrdinal,
  formatPesoInput,
  parsePesoInput,
} from '../../utils/numberFormat';

type AccountActionMode = 'deposit' | 'spend' | 'adjust' | null;

export interface WalletConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface AccountDetailViewProps {
  selectedAccountId: string;
  onBack: () => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({
  selectedAccountId,
  onBack,
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
    depositToWalletAccount,
    setAccountBalanceWithLog,
    logSpend,
    removeBank,
    removeCreditCard,
    undoEntry,
  } = useBudget();

  const [actionMode, setActionMode] = useState<AccountActionMode>(null);
  const [actionAmountText, setActionAmountText] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [actionCategory, setActionCategory] =
    useState<SpendCategoryKey>('food');
  const [actionIcon, setActionIcon] = useState<string>('shopping-bag');

  const isCash = selectedAccountId === 'cash';
  const selectedBank = banks.find((b) => b.id === selectedAccountId);
  const selectedCard = creditCards.find((c) => c.id === selectedAccountId);

  if (!isCash && !selectedBank && !selectedCard) {
    return null;
  }

  const accountTitle = isCash
    ? 'Physical Cash'
    : selectedBank
    ? selectedBank.name
    : selectedCard!.name;

  const accountIcon = isCash
    ? 'dollar-sign'
    : selectedBank
    ? 'briefcase'
    : 'credit-card';

  const accountEntries = entries.filter(
    (e) => e.paymentSourceId === selectedAccountId
  );

  const totalOut = accountEntries
    .filter(
      (e) =>
        e.type === 'spend' ||
        e.type === 'bill_paid' ||
        e.type === 'envelope_spend'
    )
    .reduce((acc, e) => acc + e.amount, 0);
  const totalIn = accountEntries
    .filter((e) => e.type === 'wallet_deposit')
    .reduce((acc, e) => acc + e.amount, 0);

  const numericActionAmt = parsePesoInput(actionAmountText);

  const openAccountActionModal = (mode: Exclude<AccountActionMode, null>) => {
    triggerLightHaptic();
    setActionAmountText('');
    setActionNote('');
    setActionCategory('food');
    setActionIcon('shopping-bag');
    setActionMode(mode);
  };

  const handleSubmitAccountAction = () => {
    if (actionMode === 'adjust') {
      setAccountBalanceWithLog(
        selectedAccountId,
        numericActionAmt,
        actionNote.trim() || undefined
      );
    } else if (actionMode === 'deposit') {
      if (numericActionAmt <= 0) return;
      depositToWalletAccount(
        selectedAccountId,
        numericActionAmt,
        actionNote.trim() || undefined
      );
    } else if (actionMode === 'spend') {
      if (numericActionAmt <= 0) return;
      const defaultCatLabel =
        SPEND_CATEGORIES.find((c) => c.key === actionCategory)?.label ||
        'Wallet Spend';
      logSpend(
        numericActionAmt,
        actionNote.trim() || defaultCatLabel,
        actionIcon,
        selectedAccountId,
        actionCategory
      );
    }
    setActionMode(null);
    setActionAmountText('');
    setActionNote('');
  };

  const currentBalance = isCash
    ? cashOnHand
    : selectedBank
    ? selectedBank.balance
    : selectedCard!.used;

  const cardAvail = selectedCard
    ? Math.max(0, selectedCard.limit - selectedCard.used)
    : 0;
  const cardPct = selectedCard
    ? Math.min(
        100,
        Math.round((selectedCard.used / Math.max(1, selectedCard.limit)) * 100)
      )
    : 0;
  const cardDaysLeft = selectedCard
    ? getDaysUntilDayOfMonth(selectedCard.cutoffDay)
    : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <FadeSlideIn
        triggerKey={selectedAccountId}
        direction="right"
        distance={16}
      >
        <View style={{ gap: 13 }}>
          <View style={styles.rowBetween}>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onBack();
              }}
              style={[
                styles.backPill,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <AppIcon name="chevron-left" size={14} color={shade.text} />
              <Text style={[styles.backPillText, { color: shade.text }]}>
                All Accounts
              </Text>
            </ScalePressable>

            {!isCash && (
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  const bankId = selectedBank?.id;
                  const cardId = selectedCard?.id;
                  onRequestConfirm({
                    title: selectedBank
                      ? 'Remove Bank Account?'
                      : 'Remove Credit Card?',
                    message: `Remove "${accountTitle}" from your Wallet? Existing transaction logs will remain in your history.`,
                    confirmLabel: 'Remove',
                    onConfirm: () => {
                      if (bankId) removeBank(bankId);
                      else if (cardId) removeCreditCard(cardId);
                      onBack();
                    },
                  });
                }}
                style={[
                  styles.deleteAccPill,
                  { backgroundColor: shade.warningSoft },
                ]}
              >
                <AppIcon name="trash-2" size={12} color={shade.warning} />
                <Text style={[styles.deleteAccText, { color: shade.warning }]}>
                  Remove
                </Text>
              </ScalePressable>
            )}
          </View>

          <View
            style={[
              styles.heroAccountCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View style={styles.rowBetween}>
              <View style={styles.inlineRow}>
                <IconBadge
                  name={accountIcon}
                  size={16}
                  color={selectedCard ? shade.dopamine : shade.accent}
                  bg={shade.surface}
                  boxSize={34}
                />
                <Text style={[styles.heroAccountName, { color: shade.text }]}>
                  {accountTitle}
                </Text>
              </View>
              {selectedCard && (
                <View
                  style={[
                    styles.cutoffBadge,
                    { backgroundColor: shade.dopamineSoft },
                  ]}
                >
                  <Text style={[styles.cutoffText, { color: shade.dopamine }]}>
                    Cut-off: {formatOrdinal(selectedCard.cutoffDay)} (
                    {cardDaysLeft === 0 ? 'Today' : `${cardDaysLeft}d`})
                  </Text>
                </View>
              )}
            </View>

            {selectedCard ? (
              <View style={{ gap: 8 }}>
                <PopValueText valueTrigger={selectedCard.used}>
                  <Text style={[styles.bigTotal, { color: shade.text }]}>
                    {formatVisiblePeso(selectedCard.used)}{' '}
                    <Text
                      style={{
                        fontSize: 14,
                        color: shade.muted,
                        fontWeight: '600',
                      }}
                    >
                      / {formatVisiblePeso(selectedCard.limit)} limit
                    </Text>
                  </Text>
                </PopValueText>
                <AnimatedProgressBar
                  percentage={cardPct}
                  trackColor={shade.surface}
                  fillColor={cardPct > 80 ? shade.warning : shade.dopamine}
                  height={8}
                />
                <Text
                  style={[
                    styles.accountSub,
                    { color: shade.positive, fontWeight: '700' },
                  ]}
                >
                  Available Credit: {formatVisiblePeso(cardAvail)}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 2 }}>
                <Text style={[styles.kicker, { color: shade.muted }]}>
                  CURRENT BALANCE
                </Text>
                <PopValueText valueTrigger={currentBalance}>
                  <Text style={[styles.bigTotal, { color: shade.text }]}>
                    {formatVisiblePeso(currentBalance)}
                  </Text>
                </PopValueText>
              </View>
            )}

            <View style={styles.inOutRow}>
              <View style={[styles.inOutBox, { backgroundColor: shade.bg }]}>
                <Text style={[styles.inOutLabel, { color: shade.muted }]}>
                  Spent
                </Text>
                <Text style={[styles.inOutVal, { color: shade.text }]}>
                  {privacyMode ? '₱••••' : `-₱${totalOut.toLocaleString()}`}
                </Text>
              </View>
              <View style={[styles.inOutBox, { backgroundColor: shade.bg }]}>
                <Text style={[styles.inOutLabel, { color: shade.muted }]}>
                  {selectedCard ? 'Card Payments' : 'Added'}
                </Text>
                <Text style={[styles.inOutVal, { color: shade.positive }]}>
                  {privacyMode ? '₱••••' : `+₱${totalIn.toLocaleString()}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionTabsRow}>
            <ScalePressable
              onPress={() => openAccountActionModal('deposit')}
              style={[
                styles.actionTabBtn,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <AppIcon
                name={selectedCard ? 'credit-card' : 'arrow-down-left'}
                size={13}
                color={shade.positive}
              />
              <Text style={[styles.actionTabText, { color: shade.positive }]}>
                {selectedCard ? 'Pay Card' : 'Deposit'}
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() => openAccountActionModal('spend')}
              style={[
                styles.actionTabBtn,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <AppIcon name="arrow-up-right" size={13} color={shade.accent} />
              <Text style={[styles.actionTabText, { color: shade.accent }]}>
                Spend Here
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() => openAccountActionModal('adjust')}
              style={[
                styles.actionTabBtn,
                { backgroundColor: shade.card, borderColor: shade.border },
              ]}
            >
              <AppIcon name="edit-2" size={13} color={shade.dopamine} />
              <Text style={[styles.actionTabText, { color: shade.dopamine }]}>
                {selectedCard ? 'Set Used' : 'Set Balance'}
              </Text>
            </ScalePressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: shade.muted }]}>
              ACCOUNT LOGS ({accountEntries.length})
            </Text>

            {accountEntries.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: shade.card, borderColor: shade.border },
                ]}
              >
                <Text
                  style={{
                    color: shade.muted,
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  No logs yet. Use Deposit, Spend Here, or Set Balance above.
                </Text>
              </View>
            ) : (
              <View style={styles.listGap}>
                {accountEntries.map((entry) => {
                  const isDeposit = entry.type === 'wallet_deposit';
                  const isAdjust = entry.type === 'wallet_adjust';
                  const isBillPaid = entry.type === 'bill_paid';
                  const isEnvelopeSpend = entry.type === 'envelope_spend';
                  const adjPositive = (entry.signedDelta || 0) >= 0;

                  const deltaColor = isDeposit
                    ? shade.positive
                    : isAdjust
                    ? adjPositive
                      ? shade.positive
                      : shade.warning
                    : shade.text;

                  const deltaString = privacyMode
                    ? '₱••••'
                    : isDeposit
                    ? `+₱${entry.amount.toLocaleString()}`
                    : isAdjust
                    ? `${adjPositive ? '+' : '-'}₱${entry.amount.toLocaleString()}`
                    : `-₱${entry.amount.toLocaleString()}`;

                  const typeLabel = isDeposit
                    ? selectedCard
                      ? 'Card Payment'
                      : 'Added'
                    : isAdjust
                    ? 'Updated Balance'
                    : isBillPaid
                    ? 'Bill Paid'
                    : isEnvelopeSpend
                    ? 'Envelope Spend'
                    : 'Spent';

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.logRow,
                        {
                          backgroundColor: shade.card,
                          borderColor: isDeposit
                            ? shade.positive
                            : shade.border,
                        },
                      ]}
                    >
                      <View style={styles.logLeft}>
                        <IconBadge
                          name={entry.icon}
                          size={14}
                          color={deltaColor}
                          bg={shade.surface}
                          boxSize={32}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.logLabel, { color: shade.text }]}
                          >
                            {entry.label}
                          </Text>
                          <Text
                            style={[styles.accountSub, { color: shade.muted }]}
                          >
                            {entry.dateKey || ''} • {typeLabel}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.logRight}>
                        <Text style={[styles.logDelta, { color: deltaColor }]}>
                          {deltaString}
                        </Text>
                        <ScalePressable
                          onPress={() => undoEntry(entry.id)}
                          accessibilityLabel={`Undo ${entry.label}`}
                          hitSlop={6}
                          style={[
                            styles.undoMini,
                            { backgroundColor: shade.surface },
                          ]}
                        >
                          <Text
                            style={[styles.undoMiniText, { color: shade.muted }]}
                          >
                            Undo
                          </Text>
                        </ScalePressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </FadeSlideIn>

      <FormModal
        visible={actionMode !== null}
        title={
          actionMode === 'deposit'
            ? selectedCard
              ? `Pay ${accountTitle}`
              : `Deposit to ${accountTitle}`
            : actionMode === 'spend'
            ? `Spend from ${accountTitle}`
            : `Update ${accountTitle}`
        }
        subtitle="Enter exact peso amount"
        icon={
          actionMode === 'deposit'
            ? 'arrow-down-left'
            : actionMode === 'spend'
            ? 'arrow-up-right'
            : 'edit-2'
        }
        accentColor={
          actionMode === 'deposit'
            ? shade.positive
            : actionMode === 'adjust'
            ? shade.dopamine
            : shade.accent
        }
        onClose={() => setActionMode(null)}
      >
        <View
          style={[
            styles.fullAmountBox,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.pesoPrefix, { color: shade.accent }]}>₱</Text>
          <TextInput
            value={actionAmountText}
            onChangeText={(t) => setActionAmountText(formatPesoInput(t))}
            keyboardType="numeric"
            placeholder="Enter exact amount"
            placeholderTextColor={shade.muted}
            autoFocus
            style={[styles.amountInput, { color: shade.text }]}
          />
        </View>

        {actionMode === 'spend' && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.catLabel, { color: shade.muted }]}>
              CATEGORY
            </Text>
            <View style={styles.tagRow}>
              {SPEND_CATEGORIES.map((cat) => {
                const active = actionCategory === cat.key;
                return (
                  <ScalePressable
                    key={cat.key}
                    onPress={() => {
                      triggerLightHaptic();
                      setActionCategory(cat.key);
                      setActionIcon(cat.icon);
                    }}
                    style={[
                      styles.tagPill,
                      {
                        backgroundColor: active ? shade.accent : shade.surface,
                      },
                    ]}
                  >
                    <AppIcon
                      name={cat.icon}
                      size={12}
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
          </View>
        )}

        <TextInput
          value={actionNote}
          onChangeText={setActionNote}
          placeholder={
            actionMode === 'deposit'
              ? 'Note (e.g., Payroll, Cash-in)'
              : actionMode === 'spend'
              ? 'What did you buy? (e.g., Groceries)'
              : 'Reason (optional)'
          }
          placeholderTextColor={shade.muted}
          style={[
            styles.textInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />

        <ScalePressable
          disabled={actionMode !== 'adjust' && numericActionAmt <= 0}
          onPress={handleSubmitAccountAction}
          style={[
            styles.submitBtn,
            {
              backgroundColor:
                actionMode !== 'adjust' && numericActionAmt <= 0
                  ? shade.surface
                  : actionMode === 'deposit'
                  ? shade.positive
                  : actionMode === 'spend'
                  ? shade.accent
                  : shade.dopamine,
              opacity:
                actionMode !== 'adjust' && numericActionAmt <= 0 ? 0.65 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.submitText,
              {
                color:
                  actionMode !== 'adjust' && numericActionAmt <= 0
                    ? shade.muted
                    : actionMode === 'spend'
                    ? shade.accentText
                    : '#FFFFFF',
              },
            ]}
          >
            {actionMode === 'deposit'
              ? 'Confirm Deposit & Log'
              : actionMode === 'spend'
              ? 'Spend & Log Transaction'
              : 'Save Balance'}
          </Text>
        </ScalePressable>
      </FormModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 28,
    gap: 16,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  backPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deleteAccPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  deleteAccText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroAccountCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heroAccountName: {
    fontSize: 18,
    fontWeight: '800',
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
  accountSub: {
    fontSize: 11,
  },
  inOutRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inOutBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  inOutLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  inOutVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionTabsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  actionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 10,
  },
  actionTabText: {
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
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  listGap: {
    gap: 8,
  },
  logRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logDelta: {
    fontSize: 13,
    fontWeight: '800',
  },
  undoMini: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  undoMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fullAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pesoPrefix: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 5,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 1,
  },
  catLabel: {
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
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
