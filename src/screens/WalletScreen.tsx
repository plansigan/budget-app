import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  AddEditDebtModal,
  DebtPaymentModal,
} from '../components/DebtModals';
import { TransferModal } from '../components/TransferModal';
import { useBudget } from '../context/BudgetContext';
import { DebtDirection, DebtItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import {
  AccountDetailView,
  WalletConfirmRequest,
} from './wallet/AccountDetailView';
import { WalletModals } from './wallet/WalletModals';
import { WalletOverview } from './wallet/WalletOverview';

interface WalletScreenProps {
  focusDebtsKey?: number;
  selectedAccountId?: string | null;
  onSelectAccount?: (accountId: string | null) => void;
}

/**
 * Wallet tab managing Cash, Bank Accounts, Credit Cards, Installments, and Debts.
 */
export const WalletScreen: React.FC<WalletScreenProps> = ({
  focusDebtsKey = 0,
  selectedAccountId: controlledAccountId,
  onSelectAccount,
}) => {
  const { banks, creditCards } = useBudget();

  const [internalAccountId, setInternalAccountId] = useState<string | null>(
    null
  );
  const isControlled = controlledAccountId !== undefined;
  const selectedAccountId = isControlled
    ? controlledAccountId
    : internalAccountId;

  const setSelectedAccountId = useCallback(
    (accountId: string | null) => {
      if (onSelectAccount) {
        onSelectAccount(accountId);
      }
      if (!isControlled) {
        setInternalAccountId(accountId);
      }
    },
    [isControlled, onSelectAccount]
  );

  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddInst, setShowAddInst] = useState(false);
  const [debtModal, setDebtModal] = useState<{
    open: boolean;
    editingDebt: DebtItem | null;
    defaultDirection: DebtDirection;
  }>({ open: false, editingDebt: null, defaultDirection: 'i_owe' });
  const [payingDebt, setPayingDebt] = useState<DebtItem | null>(null);
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    fromId?: string | null;
    toId?: string | null;
  }>({ open: false });
  const [pendingConfirm, setPendingConfirm] =
    useState<WalletConfirmRequest | null>(null);

  useEffect(() => {
    if (focusDebtsKey > 0) {
      setSelectedAccountId(null);
    }
  }, [focusDebtsKey, setSelectedAccountId]);

  useEffect(() => {
    if (selectedAccountId === null || selectedAccountId === 'cash') return;
    const exists =
      banks.some((b) => b.id === selectedAccountId) ||
      creditCards.some((c) => c.id === selectedAccountId);
    if (!exists) {
      setSelectedAccountId(null);
    }
  }, [selectedAccountId, banks, creditCards, setSelectedAccountId]);

  const openAccountPage = (accountId: string) => {
    triggerLightHaptic();
    setSelectedAccountId(accountId);
  };

  const openTransferModal = (fromId?: string | null, toId?: string | null) => {
    triggerLightHaptic();
    setTransferModal({ open: true, fromId: fromId ?? null, toId: toId ?? null });
  };

  return (
    <View style={{ flex: 1 }}>
      {selectedAccountId !== null ? (
        <AccountDetailView
          selectedAccountId={selectedAccountId}
          onBack={() => setSelectedAccountId(null)}
          onOpenTransfer={(fromId, toId) => openTransferModal(fromId, toId)}
          onRequestConfirm={setPendingConfirm}
        />
      ) : (
        <WalletOverview
          focusDebtsKey={focusDebtsKey}
          onOpenAccount={openAccountPage}
          onOpenAddBank={() => setShowAddBank(true)}
          onOpenAddCard={() => setShowAddCard(true)}
          onOpenAddInstallment={() => setShowAddInst(true)}
          onOpenAddDebt={(dir = 'i_owe') =>
            setDebtModal({
              open: true,
              editingDebt: null,
              defaultDirection: dir,
            })
          }
          onEditDebt={(debt) =>
            setDebtModal({
              open: true,
              editingDebt: debt,
              defaultDirection: debt.direction,
            })
          }
          onPayDebt={(debt) => setPayingDebt(debt)}
          onOpenTransfer={() => openTransferModal()}
          onRequestConfirm={setPendingConfirm}
        />
      )}

      <WalletModals
        showAddBank={showAddBank}
        onCloseAddBank={() => setShowAddBank(false)}
        showAddCard={showAddCard}
        onCloseAddCard={() => setShowAddCard(false)}
        showAddInst={showAddInst}
        onCloseAddInst={() => setShowAddInst(false)}
      />

      <AddEditDebtModal
        visible={debtModal.open}
        editingDebt={debtModal.editingDebt}
        defaultDirection={debtModal.defaultDirection}
        onClose={() =>
          setDebtModal({
            open: false,
            editingDebt: null,
            defaultDirection: 'i_owe',
          })
        }
      />

      <DebtPaymentModal
        debt={payingDebt}
        onClose={() => setPayingDebt(null)}
      />

      <TransferModal
        visible={transferModal.open}
        initialFromId={transferModal.fromId}
        initialToId={transferModal.toId}
        onClose={() => setTransferModal({ open: false })}
      />

      <ConfirmModal
        visible={pendingConfirm !== null}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Delete'}
        destructive
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </View>
  );
};
