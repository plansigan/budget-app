import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge, SPEND_CATEGORIES } from '../../components/AppIcon';
import { EditTransactionModal } from '../../components/EditTransactionModal';
import { FormModal } from '../../components/FormModal';
import { useBudget } from '../../context/BudgetContext';
import { isEditableEntryType } from '../../state/budgetReducer';
import {
  SpendCategoryKey,
  TransactionEntry,
  getDaysUntilDayOfMonth,
} from '../../types/budget';
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
  onOpenTransfer: (fromId?: string | null, toId?: string | null) => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({
  selectedAccountId,
  onBack,
  onOpenTransfer,
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
    transferBetweenAccounts,
    setAccountBalanceWithLog,
    logSpend,
    updateBank,
    updateCreditCard,
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
  const [payFromSourceId, setPayFromSourceId] = useState<string>('external');
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(
    null
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLimitText, setEditLimitText] = useState('');
  const [editCutoffText, setEditCutoffText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

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
    (e) =>
      e.paymentSourceId === selectedAccountId ||
      e.toPaymentSourceId === selectedAccountId
  );

  const totalOut = accountEntries
    .filter(
      (e) =>
        e.type === 'spend' ||
        e.type === 'bill_paid' ||
        e.type === 'envelope_spend' ||
        (e.type === 'wallet_transfer' &&
          e.paymentSourceId === selectedAccountId)
    )
    .reduce((acc, e) => acc + e.amount, 0);
  const totalIn = accountEntries
    .filter(
      (e) =>
        e.type === 'wallet_deposit' ||
        (e.type === 'wallet_transfer' &&
          e.toPaymentSourceId === selectedAccountId)
    )
    .reduce((acc, e) => acc + e.amount, 0);

  const numericActionAmt = parsePesoInput(actionAmountText);

  const openAccountActionModal = (mode: Exclude<AccountActionMode, null>) => {
    triggerLightHaptic();
    setActionAmountText('');
    setActionNote('');
    setActionCategory('food');
    setActionIcon('shopping-bag');
    if (mode === 'deposit' && selectedCard) {
      const fundedBank = banks.find((b) => b.balance > 0);
      if (fundedBank) {
        setPayFromSourceId(fundedBank.id);
      } else if (cashOnHand > 0) {
        setPayFromSourceId('cash');
      } else {
        setPayFromSourceId('external');
      }
    }
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
      if (selectedCard && payFromSourceId !== 'external') {
        transferBetweenAccounts(
          payFromSourceId,
          selectedCard.id,
          numericActionAmt,
          actionNote.trim() || undefined
        );
      } else {
        depositToWalletAccount(
          selectedAccountId,
          numericActionAmt,
          actionNote.trim() || undefined
        );
      }
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

  const openEditAccountModal = () => {
    if (isCash) return;
    triggerLightHaptic();
    setEditError(null);
    if (selectedBank) {
      setEditName(selectedBank.name);
      setEditLimitText('');
      setEditCutoffText('');
    } else if (selectedCard) {
      setEditName(selectedCard.name);
      setEditLimitText(formatPesoInput(String(Math.round(selectedCard.limit))));
      setEditCutoffText(String(selectedCard.cutoffDay));
    }
    setShowEditModal(true);
  };

  const handleSaveAccountEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(
        selectedCard
          ? 'Please enter a credit card name.'
          : 'Please enter a bank or e-wallet name.'
      );
      return;
    }
    if (selectedBank) {
      updateBank(selectedBank.id, trimmed);
      setShowEditModal(false);
      return;
    }
    if (selectedCard) {
      const limit = parsePesoInput(editLimitText);
      if (limit <= 0) {
        setEditError('Please enter a credit limit greater than ₱0.');
        return;
      }
      const cutoff = Math.max(
        1,
        Math.min(
          31,
          parseInt(editCutoffText.replace(/[^0-9]/g, ''), 10) ||
            selectedCard.cutoffDay
        )
      );
      updateCreditCard(selectedCard.id, trimmed, limit, cutoff);
      setShowEditModal(false);
    }
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
              <View style={styles.headerActions}>
                <ScalePressable
                  onPress={openEditAccountModal}
                  style={[
                    styles.editAccPill,
                    { backgroundColor: shade.surface, borderColor: shade.border },
                  ]}
                >
                  <AppIcon name="edit-2" size={12} color={shade.text} />
                  <Text style={[styles.editAccText, { color: shade.text }]}>
                    Edit
                  </Text>
                </ScalePressable>

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
              </View>
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

          {!selectedCard && 1 + banks.length + creditCards.length >= 2 ? (
            <View style={styles.actionGrid}>
              <View style={styles.actionTabsRow}>
                <ScalePressable
                  onPress={() => openAccountActionModal('deposit')}
                  style={[
                    styles.actionTabBtn,
                    { backgroundColor: shade.card, borderColor: shade.border },
                  ]}
                >
                  <AppIcon
                    name="arrow-down-left"
                    size={14}
                    color={shade.positive}
                  />
                  <Text
                    style={[styles.actionTabText, { color: shade.positive }]}
                  >
                    Deposit
                  </Text>
                </ScalePressable>

                <ScalePressable
                  onPress={() => onOpenTransfer(selectedAccountId)}
                  style={[
                    styles.actionTabBtn,
                    { backgroundColor: shade.card, borderColor: shade.border },
                  ]}
                >
                  <AppIcon name="repeat" size={14} color={shade.positive} />
                  <Text
                    style={[styles.actionTabText, { color: shade.positive }]}
                  >
                    Transfer
                  </Text>
                </ScalePressable>
              </View>

              <View style={styles.actionTabsRow}>
                <ScalePressable
                  onPress={() => openAccountActionModal('spend')}
                  style={[
                    styles.actionTabBtn,
                    { backgroundColor: shade.card, borderColor: shade.border },
                  ]}
                >
                  <AppIcon
                    name="arrow-up-right"
                    size={14}
                    color={shade.accent}
                  />
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
                  <AppIcon name="edit-2" size={14} color={shade.dopamine} />
                  <Text
                    style={[styles.actionTabText, { color: shade.dopamine }]}
                  >
                    Set Balance
                  </Text>
                </ScalePressable>
              </View>
            </View>
          ) : (
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
          )}

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
                  const isTransfer = entry.type === 'wallet_transfer';
                  const isIncomingTransfer =
                    isTransfer && entry.toPaymentSourceId === selectedAccountId;
                  const adjPositive = (entry.signedDelta || 0) >= 0;
                  const editable = isEditableEntryType(entry);

                  const deltaColor =
                    isDeposit || isIncomingTransfer
                      ? shade.positive
                      : isAdjust
                      ? adjPositive
                        ? shade.positive
                        : shade.warning
                      : shade.text;

                  const deltaString = privacyMode
                    ? '₱••••'
                    : isDeposit || isIncomingTransfer
                    ? `+₱${entry.amount.toLocaleString()}`
                    : isAdjust
                    ? `${adjPositive ? '+' : '-'}₱${entry.amount.toLocaleString()}`
                    : `-₱${entry.amount.toLocaleString()}`;

                  const typeLabel = isIncomingTransfer
                    ? selectedCard
                      ? `Paid from ${entry.paymentSourceLabel || 'Account'}`
                      : `From ${entry.paymentSourceLabel || 'Account'}`
                    : isTransfer
                    ? `To ${entry.toPaymentSourceLabel || 'Account'}`
                    : isDeposit
                    ? selectedCard
                      ? 'Card Payment'
                      : 'Added'
                    : isAdjust
                    ? 'Updated Balance'
                    : isBillPaid
                    ? 'Bill Paid'
                    : isEnvelopeSpend
                    ? 'Allowance Spend'
                    : 'Spent';

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.logRow,
                        {
                          backgroundColor: shade.card,
                          borderColor:
                            isDeposit || isIncomingTransfer
                              ? shade.positive
                              : shade.border,
                        },
                      ]}
                    >
                      <ScalePressable
                        disabled={!editable}
                        onPress={() => {
                          if (!editable) return;
                          triggerLightHaptic();
                          setEditingEntry(entry);
                        }}
                        style={styles.logTapArea}
                      >
                        <View style={styles.logLeft}>
                          <IconBadge
                            name={entry.icon}
                            size={14}
                            color={deltaColor}
                            bg={shade.surface}
                            boxSize={32}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              numberOfLines={1}
                              style={[styles.logLabel, { color: shade.text }]}
                            >
                              {entry.label}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.accountSub, { color: shade.muted }]}
                            >
                              {entry.dateKey || ''} • {typeLabel}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.logDelta, { color: deltaColor }]}>
                          {deltaString}
                        </Text>
                      </ScalePressable>

                      <ScalePressable
                        onPress={() => {
                          triggerLightHaptic();
                          onRequestConfirm({
                            title: 'Delete & Undo Entry?',
                            message: `Remove "${entry.label}" (${deltaString}) and reverse its balance changes?`,
                            confirmLabel: 'Yes, Delete',
                            onConfirm: () => undoEntry(entry.id),
                          });
                        }}
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

        {actionMode === 'deposit' && selectedCard && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.catLabel, { color: shade.muted }]}>
              PAY FROM ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.payFromScroll}
            >
              {banks.map((b) => {
                const active = payFromSourceId === b.id;
                return (
                  <ScalePressable
                    key={b.id}
                    onPress={() => {
                      triggerLightHaptic();
                      setPayFromSourceId(b.id);
                    }}
                    style={[
                      styles.payFromPill,
                      {
                        backgroundColor: active ? shade.positive : shade.surface,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.payFromTitle,
                        { color: active ? '#FFFFFF' : shade.text },
                      ]}
                    >
                      {b.name}
                    </Text>
                    <Text
                      style={[
                        styles.payFromSub,
                        { color: active ? '#FFFFFF' : shade.muted },
                      ]}
                    >
                      {formatVisiblePeso(b.balance)}
                    </Text>
                  </ScalePressable>
                );
              })}

              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  setPayFromSourceId('cash');
                }}
                style={[
                  styles.payFromPill,
                  {
                    backgroundColor:
                      payFromSourceId === 'cash' ? shade.positive : shade.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.payFromTitle,
                    {
                      color:
                        payFromSourceId === 'cash' ? '#FFFFFF' : shade.text,
                    },
                  ]}
                >
                  Cash
                </Text>
                <Text
                  style={[
                    styles.payFromSub,
                    {
                      color:
                        payFromSourceId === 'cash' ? '#FFFFFF' : shade.muted,
                    },
                  ]}
                >
                  {formatVisiblePeso(cashOnHand)}
                </Text>
              </ScalePressable>

              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  setPayFromSourceId('external');
                }}
                style={[
                  styles.payFromPill,
                  {
                    backgroundColor:
                      payFromSourceId === 'external'
                        ? shade.accent
                        : shade.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.payFromTitle,
                    {
                      color:
                        payFromSourceId === 'external'
                          ? shade.accentText
                          : shade.text,
                    },
                  ]}
                >
                  Track Only
                </Text>
                <Text
                  style={[
                    styles.payFromSub,
                    {
                      color:
                        payFromSourceId === 'external'
                          ? shade.accentText
                          : shade.muted,
                    },
                  ]}
                >
                  External
                </Text>
              </ScalePressable>
            </ScrollView>
          </View>
        )}

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
              ? selectedCard
                ? payFromSourceId !== 'external'
                  ? 'Confirm Card Payment'
                  : 'Log Card Payment'
                : 'Confirm Deposit & Log'
              : actionMode === 'spend'
              ? 'Spend & Log Transaction'
              : 'Save Balance'}
          </Text>
        </ScalePressable>
      </FormModal>

      <EditTransactionModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />

      <FormModal
        visible={showEditModal}
        title={selectedCard ? 'Edit Credit Card' : 'Edit Bank Account'}
        subtitle={
          selectedCard
            ? 'Update card name, credit limit, or cut-off date'
            : 'Rename this bank or e-wallet without losing logs'
        }
        icon="edit-2"
        accentColor={selectedCard ? shade.dopamine : shade.accent}
        onClose={() => {
          setEditError(null);
          setShowEditModal(false);
        }}
      >
        <Text style={[styles.catLabel, { color: shade.muted }]}>
          ACCOUNT NAME
        </Text>
        <TextInput
          value={editName}
          onChangeText={(t) => {
            setEditName(t);
            if (editError) setEditError(null);
          }}
          placeholder={
            selectedCard ? 'Card name (e.g., BDO Visa)' : 'Bank name (e.g., BPI)'
          }
          placeholderTextColor={shade.muted}
          autoFocus
          style={[
            styles.textInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />

        {selectedCard && (
          <View style={styles.editTwoCols}>
            <View style={{ flex: 2, minWidth: 0, gap: 4 }}>
              <Text style={[styles.catLabel, { color: shade.muted }]}>
                CREDIT LIMIT
              </Text>
              <View
                style={[
                  styles.fullAmountBox,
                  { backgroundColor: shade.surface, borderColor: shade.border },
                ]}
              >
                <Text style={[styles.pesoPrefix, { color: shade.dopamine }]}>
                  ₱
                </Text>
                <TextInput
                  value={editLimitText}
                  onChangeText={(t) => {
                    setEditLimitText(formatPesoInput(t));
                    if (editError) setEditError(null);
                  }}
                  keyboardType="numeric"
                  placeholder="Limit"
                  placeholderTextColor={shade.muted}
                  style={[styles.amountInput, { color: shade.text }]}
                />
              </View>
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.catLabel, { color: shade.muted }]}>
                CUT-OFF DAY
              </Text>
              <TextInput
                value={editCutoffText}
                onChangeText={(t) =>
                  setEditCutoffText(t.replace(/[^0-9]/g, '').slice(0, 2))
                }
                keyboardType="numeric"
                maxLength={2}
                placeholder="1–31"
                placeholderTextColor={shade.muted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: shade.surface,
                    color: shade.text,
                    borderColor: shade.border,
                    textAlign: 'center',
                    fontWeight: '800',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {editError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {editError}
          </Text>
        )}

        <ScalePressable
          onPress={handleSaveAccountEdit}
          style={[
            styles.submitBtn,
            {
              backgroundColor: selectedCard ? shade.dopamine : shade.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.submitText,
              { color: selectedCard ? '#FFFFFF' : shade.accentText },
            ]}
          >
            Save Changes
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editAccPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  editAccText: {
    fontSize: 11,
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
  actionGrid: {
    gap: 8,
  },
  actionTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 11,
  },
  actionTabText: {
    fontSize: 12,
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
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logTapArea: {
    flex: 1,
    minWidth: 0,
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
    minWidth: 0,
  },
  logLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  logDelta: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
  },
  horizontalScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  payFromScroll: {
    gap: 8,
  },
  payFromPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 92,
  },
  payFromTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  payFromSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
  editTwoCols: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
