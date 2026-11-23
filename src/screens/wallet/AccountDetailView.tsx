import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';
import {
  AnimatedProgressBar,
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { EditTransactionModal } from '../../components/EditTransactionModal';
import {
  useBudgetActions,
  useDailyBudget,
  useThemePrefs,
  useWallet,
} from '../../context/BudgetContext';
import { TransactionEntry, getDaysUntilDayOfMonth } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatOrdinal, formatPeso } from '../../utils/numberFormat';
import {
  AccountActionModal,
  AccountActionMode,
  EditAccountModal,
} from './AccountDetailModals';
import { AccountEntryRow } from './AccountEntryRow';

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

const AccountLogSeparator: React.FC = () => <View style={{ height: 8 }} />;

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({
  selectedAccountId,
  onBack,
  onOpenTransfer,
  onRequestConfirm,
}) => {
  const { shade, privacyMode, formatVisiblePeso } = useThemePrefs();
  const { cashOnHand, banks, creditCards } = useWallet();
  const { entries } = useDailyBudget();
  const { removeBank, removeCreditCard, undoEntry } = useBudgetActions();

  const [actionMode, setActionMode] = useState<AccountActionMode>(null);
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(
    null
  );
  const [showEditModal, setShowEditModal] = useState(false);

  const isCash = selectedAccountId === 'cash';
  const selectedBank = banks.find((b) => b.id === selectedAccountId);
  const selectedCard = creditCards.find((c) => c.id === selectedAccountId);
  const hasAccount = isCash || Boolean(selectedBank) || Boolean(selectedCard);

  const accountEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.paymentSourceId === selectedAccountId ||
          e.toPaymentSourceId === selectedAccountId
      ),
    [entries, selectedAccountId]
  );

  const { totalOut, totalIn } = useMemo(() => {
    const out = accountEntries
      .filter(
        (e) =>
          e.type === 'spend' ||
          e.type === 'bill_paid' ||
          e.type === 'envelope_spend' ||
          e.type === 'debt_outflow' ||
          (e.type === 'wallet_transfer' &&
            e.paymentSourceId === selectedAccountId)
      )
      .reduce((acc, e) => acc + e.amount, 0);
    const incoming = accountEntries
      .filter(
        (e) =>
          e.type === 'wallet_deposit' ||
          e.type === 'debt_inflow' ||
          (e.type === 'wallet_transfer' &&
            e.toPaymentSourceId === selectedAccountId)
      )
      .reduce((acc, e) => acc + e.amount, 0);
    return { totalOut: out, totalIn: incoming };
  }, [accountEntries, selectedAccountId]);

  const accountTitle = isCash
    ? 'Physical Cash'
    : selectedBank
    ? selectedBank.name
    : selectedCard
    ? selectedCard.name
    : '';

  const accountIcon = isCash
    ? 'dollar-sign'
    : selectedBank
    ? 'briefcase'
    : 'credit-card';

  const openAccountActionModal = useCallback(
    (mode: Exclude<AccountActionMode, null>) => {
      triggerLightHaptic();
      setActionMode(mode);
    },
    []
  );

  const openEditAccountModal = useCallback(() => {
    if (isCash) return;
    triggerLightHaptic();
    setShowEditModal(true);
  }, [isCash]);

  const handleRequestUndo = useCallback(
    (entry: TransactionEntry, deltaString: string) => {
      onRequestConfirm({
        title: 'Delete & Undo Entry?',
        message: `Remove "${entry.label}" (${deltaString}) and reverse its balance changes?`,
        confirmLabel: 'Yes, Delete',
        onConfirm: () => undoEntry(entry.id),
      });
    },
    [onRequestConfirm, undoEntry]
  );

  const currentBalance = isCash
    ? cashOnHand
    : selectedBank
    ? selectedBank.balance
    : selectedCard
    ? selectedCard.used
    : 0;

  const cardAvail = selectedCard
    ? Math.max(0, selectedCard.limit - selectedCard.used)
    : 0;
  const cardPct = selectedCard
    ? Math.min(
        100,
        Math.round(
          (selectedCard.used / Math.max(0.01, selectedCard.limit)) * 100
        )
      )
    : 0;
  const cardDaysLeft = selectedCard
    ? getDaysUntilDayOfMonth(selectedCard.cutoffDay)
    : 0;

  const renderAccountEntry = useCallback(
    ({ item: entry }: ListRenderItemInfo<TransactionEntry>) => (
      <AccountEntryRow
        entry={entry}
        selectedAccountId={selectedAccountId}
        isCreditCard={Boolean(selectedCard)}
        shade={shade}
        privacyMode={privacyMode}
        onEdit={setEditingEntry}
        onRequestUndo={handleRequestUndo}
      />
    ),
    [selectedAccountId, selectedCard, shade, privacyMode, handleRequestUndo]
  );

  const listHeader = useMemo(() => {
    if (!hasAccount) return null;
    return (
      <View style={styles.headerStack}>
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
              <View style={{ gap: 2 }}>
                <PopValueText valueTrigger={selectedCard.used}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={[
                      styles.bigTotal,
                      { fontSize: 30, color: shade.text },
                    ]}
                  >
                    {formatVisiblePeso(selectedCard.used)}
                  </Text>
                </PopValueText>
                <Text
                  style={[
                    styles.accountSub,
                    {
                      fontSize: 13,
                      color: shade.muted,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                >
                  of {formatVisiblePeso(selectedCard.limit)} credit limit
                </Text>
              </View>
              <AnimatedProgressBar
                percentage={cardPct}
                trackColor={shade.surface}
                fillColor={cardPct > 80 ? shade.warning : shade.dopamine}
                height={8}
              />
              <Text
                style={[
                  styles.accountSub,
                  {
                    color: shade.positive,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  },
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
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={[styles.bigTotal, { color: shade.text }]}
                >
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
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[styles.inOutVal, { color: shade.text }]}
              >
                {privacyMode ? '₱••••' : `-${formatPeso(totalOut)}`}
              </Text>
            </View>
            <View style={[styles.inOutBox, { backgroundColor: shade.bg }]}>
              <Text style={[styles.inOutLabel, { color: shade.muted }]}>
                {selectedCard ? 'Card Payments' : 'Added'}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[styles.inOutVal, { color: shade.positive }]}
              >
                {privacyMode ? '₱••••' : `+${formatPeso(totalIn)}`}
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

        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          ACCOUNT LOGS ({accountEntries.length})
        </Text>
      </View>
    );
  }, [
    hasAccount,
    shade,
    onBack,
    isCash,
    openEditAccountModal,
    selectedBank,
    selectedCard,
    onRequestConfirm,
    accountTitle,
    removeBank,
    removeCreditCard,
    accountIcon,
    cardDaysLeft,
    formatVisiblePeso,
    cardPct,
    cardAvail,
    currentBalance,
    privacyMode,
    totalOut,
    totalIn,
    banks.length,
    creditCards.length,
    openAccountActionModal,
    onOpenTransfer,
    selectedAccountId,
    accountEntries.length,
  ]);

  if (!hasAccount) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <FadeSlideIn
        triggerKey={selectedAccountId}
        direction="right"
        distance={16}
        style={{ flex: 1 }}
      >
        <FlatList<TransactionEntry>
          data={accountEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderAccountEntry}
          ItemSeparatorComponent={AccountLogSeparator}
          ListHeaderComponent={listHeader ?? undefined}
          ListEmptyComponent={
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
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
        />
      </FadeSlideIn>

      <AccountActionModal
        mode={actionMode}
        selectedAccountId={selectedAccountId}
        accountTitle={accountTitle}
        isCreditCard={Boolean(selectedCard)}
        onClose={() => setActionMode(null)}
      />

      <EditTransactionModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />

      <EditAccountModal
        visible={showEditModal}
        selectedBank={selectedBank}
        selectedCard={selectedCard}
        onClose={() => setShowEditModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 28,
  },
  headerStack: {
    gap: 13,
    marginBottom: 8,
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
    fontVariant: ['tabular-nums'],
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
    fontVariant: ['tabular-nums'],
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
});
