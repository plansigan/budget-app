import React from 'react';
import { AddEditInstallmentModal } from '../../components/AddEditInstallmentModal';
import { AddBankModal } from './AddBankModal';
import { AddCreditCardModal } from './AddCreditCardModal';

interface WalletModalsProps {
  showAddBank: boolean;
  onCloseAddBank: () => void;
  showAddCard: boolean;
  onCloseAddCard: () => void;
  showAddInst: boolean;
  onCloseAddInst: () => void;
}

/**
 * Coordinates creation modals opened from the Wallet overview tab.
 */
export const WalletModals: React.FC<WalletModalsProps> = ({
  showAddBank,
  onCloseAddBank,
  showAddCard,
  onCloseAddCard,
  showAddInst,
  onCloseAddInst,
}) => (
  <>
    <AddBankModal visible={showAddBank} onClose={onCloseAddBank} />
    <AddCreditCardModal visible={showAddCard} onClose={onCloseAddCard} />
    <AddEditInstallmentModal visible={showAddInst} onClose={onCloseAddInst} />
  </>
);
