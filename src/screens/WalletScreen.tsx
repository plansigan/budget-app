import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { TransferModal } from '../components/TransferModal';
import { useBudget } from '../context/BudgetContext';
import { triggerLightHaptic } from '../utils/haptics';
import {
  AccountDetailView,
  WalletConfirmRequest,
} from './wallet/AccountDetailView';
import { WalletModals } from './wallet/WalletModals';
import { WalletOverview } from './wallet/WalletOverview';

/**
 * Wallet tab managing Cash, Bank Accounts, Credit Cards, and Installments.
 */
export const WalletScreen: React.FC = () => {
  const { banks, creditCards } = useBudget();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddInst, setShowAddInst] = useState(false);
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    fromId?: string | null;
    toId?: string | null;
  }>({ open: false });
  const [pendingConfirm, setPendingConfirm] =
    useState<WalletConfirmRequest | null>(null);

  useEffect(() => {
    if (selectedAccountId === null || selectedAccountId === 'cash') return;
    const exists =
      banks.some((b) => b.id === selectedAccountId) ||
      creditCards.some((c) => c.id === selectedAccountId);
    if (!exists) {
      setSelectedAccountId(null);
    }
  }, [selectedAccountId, banks, creditCards]);

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
          onOpenAccount={openAccountPage}
          onOpenAddBank={() => setShowAddBank(true)}
          onOpenAddCard={() => setShowAddCard(true)}
          onOpenAddInstallment={() => setShowAddInst(true)}
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
